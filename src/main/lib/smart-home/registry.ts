/**
 * Disk-backed device registry used by protocol adapters that do not have a
 * live cloud API in the public build (Matter fabric, Zigbee bridge, cloud
 * ecosystems). It persists the last-known device list and state to userData so
 * the UI and voice layer have a consistent control-plane to operate on.
 *
 * The native/production transport plugs in via the `send` hook passed to
 * {@link RegistryBackedAdapter}; by default commands only mutate local state.
 */
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type {
  CommandResult,
  DeviceCommand,
  ProtocolAdapter,
  ProtocolId,
  SmartDevice
} from './types'

function storeFile(protocol: ProtocolId): string {
  const dir = join(app.getPath('userData'), 'smart-home')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, `${protocol}.json`)
}

function load(protocol: ProtocolId): SmartDevice[] {
  const file = storeFile(protocol)
  if (!existsSync(file)) return []
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown
    return Array.isArray(parsed) ? (parsed as SmartDevice[]) : []
  } catch {
    return []
  }
}

function save(protocol: ProtocolId, devices: SmartDevice[]): void {
  writeFileSync(storeFile(protocol), JSON.stringify(devices, null, 2), 'utf8')
}

function applyAction(device: SmartDevice, cmd: DeviceCommand): SmartDevice {
  const state = { ...device.state }
  switch (cmd.action) {
    case 'on':
      state.power = true
      break
    case 'off':
      state.power = false
      break
    case 'toggle':
      state.power = !state.power
      break
    case 'setBrightness':
      state.brightness = Number(cmd.value ?? state.brightness ?? 100)
      state.power = Number(state.brightness) > 0
      break
    case 'setColor':
      if (cmd.value !== undefined) state.color = String(cmd.value)
      break
    case 'setTemperature':
      state.temperature = Number(cmd.value ?? state.temperature ?? 21)
      break
    case 'lock':
      state.locked = true
      break
    case 'unlock':
      state.locked = false
      break
    case 'open':
      state.position = 100
      break
    case 'close':
      state.position = 0
      break
    case 'setSpeed':
      state.speed = Number(cmd.value ?? state.speed ?? 1)
      break
    default:
      break
  }
  return { ...device, state }
}

export type HardwareSend = (device: SmartDevice, cmd: DeviceCommand) => Promise<boolean>

/**
 * Base adapter that keeps device state on disk and delegates the actual
 * on-the-wire delivery to a pluggable {@link HardwareSend} hook.
 */
export class RegistryBackedAdapter implements ProtocolAdapter {
  constructor(
    public readonly id: ProtocolId,
    public readonly label: string,
    private readonly seed: SmartDevice[] = [],
    private readonly send: HardwareSend = async () => true
  ) {}

  isConfigured(): boolean {
    return load(this.id).length > 0 || this.seed.length > 0
  }

  async discover(): Promise<SmartDevice[]> {
    let devices = load(this.id)
    if (devices.length === 0 && this.seed.length > 0) {
      devices = this.seed
      save(this.id, devices)
    }
    return devices
  }

  async command(cmd: DeviceCommand): Promise<CommandResult> {
    const devices = await this.discover()
    const idx = devices.findIndex((d) => d.id === cmd.deviceId)
    if (idx === -1) return { success: false, message: `Unknown device ${cmd.deviceId}` }

    const delivered = await this.send(devices[idx], cmd).catch(() => false)
    const updated = applyAction(devices[idx], cmd)
    updated.reachable = delivered
    devices[idx] = updated
    save(this.id, devices)

    return {
      success: delivered,
      device: updated,
      message: delivered ? undefined : 'Command stored locally; hardware bridge not connected'
    }
  }
}
