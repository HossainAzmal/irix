/**
 * SmartHomeManager — aggregates every protocol adapter into one control-plane
 * and exposes it to the renderer/voice layer over IPC.
 *
 * IPC channels (all via window.electron.ipcRenderer.invoke):
 *   smart-home-status              -> AdapterStatus[]
 *   smart-home-discover            -> SmartDevice[]
 *   smart-home-command   (cmd)     -> CommandResult
 *   smart-home-scenes              -> Scene[]
 *   smart-home-scene     (id)      -> { success, results }
 *   smart-home-voice     (text)    -> VoiceResult   (natural-language control)
 */
import { IpcMain } from 'electron'
import { HomeAssistantAdapter } from './adapters/home-assistant'
import { createMatterAdapter } from './adapters/matter'
import { createZigbeeAdapter } from './adapters/zigbee'
import { createGoogleHomeAdapter, createAlexaAdapter } from './adapters/cloud'
import { SCENES, type Scene } from './scenes'
import type {
  AdapterStatus,
  CommandResult,
  DeviceAction,
  DeviceCommand,
  ProtocolAdapter,
  SmartDevice
} from './types'

interface VoiceResult {
  matched: boolean
  command?: DeviceCommand
  device?: SmartDevice
  result?: CommandResult
  message: string
}

const ACTION_WORDS: { words: string[]; action: DeviceAction; needsValue?: boolean }[] = [
  { words: ['turn on', 'switch on', 'power on', 'enable'], action: 'on' },
  { words: ['turn off', 'switch off', 'power off', 'disable', 'kill'], action: 'off' },
  { words: ['toggle'], action: 'toggle' },
  { words: ['lock'], action: 'lock' },
  { words: ['unlock'], action: 'unlock' },
  { words: ['open'], action: 'open' },
  { words: ['close', 'shut'], action: 'close' },
  { words: ['dim', 'brightness', 'set brightness'], action: 'setBrightness', needsValue: true },
  {
    words: ['temperature', 'set temperature', 'heat', 'cool'],
    action: 'setTemperature',
    needsValue: true
  },
  { words: ['color', 'colour'], action: 'setColor', needsValue: true }
]

export class SmartHomeManager {
  private adapters: ProtocolAdapter[]

  constructor() {
    this.adapters = [
      new HomeAssistantAdapter(),
      createMatterAdapter(),
      createZigbeeAdapter(),
      createGoogleHomeAdapter(),
      createAlexaAdapter()
    ]
  }

  async status(): Promise<AdapterStatus[]> {
    return Promise.all(
      this.adapters.map(async (a) => {
        const configured = a.isConfigured()
        const deviceCount = configured ? (await a.discover().catch(() => [])).length : 0
        return { id: a.id, label: a.label, configured, deviceCount }
      })
    )
  }

  async discover(): Promise<SmartDevice[]> {
    const lists = await Promise.all(
      this.adapters.map((a) => (a.isConfigured() ? a.discover().catch(() => []) : []))
    )
    return lists.flat()
  }

  private adapterFor(deviceId: string, protocolHint?: string): ProtocolAdapter | undefined {
    if (protocolHint) return this.adapters.find((a) => a.id === protocolHint)
    const prefix = deviceId.includes(':') ? deviceId.split(':')[0] : ''
    if (prefix === 'matter') return this.adapters.find((a) => a.id === 'matter')
    if (prefix === 'zigbee') return this.adapters.find((a) => a.id === 'zigbee')
    if (prefix === 'google') return this.adapters.find((a) => a.id === 'google-home')
    if (prefix === 'alexa') return this.adapters.find((a) => a.id === 'alexa')
    // Home Assistant entity ids look like `light.kitchen`
    if (deviceId.includes('.')) return this.adapters.find((a) => a.id === 'home-assistant')
    return undefined
  }

  async command(cmd: DeviceCommand): Promise<CommandResult> {
    const adapter = this.adapterFor(cmd.deviceId)
    if (!adapter) return { success: false, message: `No adapter for ${cmd.deviceId}` }
    return adapter.command(cmd)
  }

  async runScene(sceneId: string): Promise<{ success: boolean; results: CommandResult[] }> {
    const scene = SCENES.find((s) => s.id === sceneId)
    if (!scene) return { success: false, results: [] }
    const devices = await this.discover()
    const results: CommandResult[] = []
    for (const step of scene.steps) {
      const term = step.match.toLowerCase()
      const matches = devices.filter(
        (d) =>
          d.id.toLowerCase().includes(term) ||
          d.name.toLowerCase().includes(term) ||
          d.room.toLowerCase().includes(term) ||
          d.kind.toLowerCase().includes(term)
      )
      for (const device of matches) {
        results.push(
          await this.command({ deviceId: device.id, action: step.action, value: step.value })
        )
      }
    }
    return { success: results.some((r) => r.success), results }
  }

  async handleVoice(text: string): Promise<VoiceResult> {
    const lower = text.toLowerCase()

    const scene = SCENES.find((s) => lower.includes(s.name.toLowerCase()))
    if (scene) {
      const res = await this.runScene(scene.id)
      return {
        matched: true,
        message: `Running scene "${scene.name}" (${res.results.length} device actions).`
      }
    }

    const actionSpec = ACTION_WORDS.find((a) => a.words.some((w) => lower.includes(w)))
    if (!actionSpec) return { matched: false, message: 'No smart-home action recognised.' }

    const devices = await this.discover()
    const device = this.pickDevice(lower, devices)
    if (!device) return { matched: false, message: 'Could not find a matching device.' }

    const value = actionSpec.needsValue ? extractValue(lower, actionSpec.action) : undefined
    const command: DeviceCommand = { deviceId: device.id, action: actionSpec.action, value }
    const result = await this.command(command)
    return {
      matched: true,
      command,
      device,
      result,
      message: `${actionSpec.action} → ${device.name}${value !== undefined ? ` (${value})` : ''}`
    }
  }

  private pickDevice(lower: string, devices: SmartDevice[]): SmartDevice | undefined {
    let best: SmartDevice | undefined
    let bestScore = 0
    for (const d of devices) {
      let score = 0
      if (lower.includes(d.name.toLowerCase())) score += 3
      if (lower.includes(d.room.toLowerCase())) score += 2
      if (lower.includes(d.kind.toLowerCase())) score += 1
      if (score > bestScore) {
        bestScore = score
        best = d
      }
    }
    return bestScore > 0 ? best : undefined
  }
}

function extractValue(text: string, action: DeviceAction): string | number | undefined {
  const num = text.match(/(\d+)/)
  if (action === 'setBrightness' || action === 'setTemperature') {
    return num ? Number(num[1]) : undefined
  }
  if (action === 'setColor') {
    const color = text.match(/\b(red|green|blue|white|warm|cool|purple|orange|yellow|pink)\b/)
    return color ? color[1] : undefined
  }
  return undefined
}

export default function registerSmartHomeHandlers(ipcMain: IpcMain): void {
  const manager = new SmartHomeManager()

  ipcMain.removeHandler('smart-home-status')
  ipcMain.handle('smart-home-status', () => manager.status())

  ipcMain.removeHandler('smart-home-discover')
  ipcMain.handle('smart-home-discover', () => manager.discover())

  ipcMain.removeHandler('smart-home-command')
  ipcMain.handle('smart-home-command', (_e, cmd: DeviceCommand) => manager.command(cmd))

  ipcMain.removeHandler('smart-home-scenes')
  ipcMain.handle('smart-home-scenes', (): Scene[] => SCENES)

  ipcMain.removeHandler('smart-home-scene')
  ipcMain.handle('smart-home-scene', (_e, id: string) => manager.runScene(id))

  ipcMain.removeHandler('smart-home-voice')
  ipcMain.handle('smart-home-voice', (_e, text: string) => manager.handleVoice(text))
}
