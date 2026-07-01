/**
 * Home Assistant adapter — fully functional against a real Home Assistant
 * instance via its REST API.
 *
 * Configure with either:
 *   - env vars  HASS_URL and HASS_TOKEN, or
 *   - a JSON file  <userData>/smart-home/home-assistant.config.json
 *     { "baseUrl": "http://homeassistant.local:8123", "token": "<long-lived-token>" }
 */
import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type {
  CommandResult,
  DeviceCommand,
  DeviceKind,
  ProtocolAdapter,
  SmartDevice
} from '../types'

interface HassConfig {
  baseUrl: string
  token: string
}

interface HassState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
}

function readConfig(): HassConfig | null {
  const envUrl = process.env.HASS_URL
  const envToken = process.env.HASS_TOKEN
  if (envUrl && envToken) return { baseUrl: envUrl.replace(/\/$/, ''), token: envToken }

  const file = join(app.getPath('userData'), 'smart-home', 'home-assistant.config.json')
  if (!existsSync(file)) return null
  try {
    const cfg = JSON.parse(readFileSync(file, 'utf8')) as Partial<HassConfig>
    if (!cfg.baseUrl || !cfg.token) return null
    return { baseUrl: cfg.baseUrl.replace(/\/$/, ''), token: cfg.token }
  } catch {
    return null
  }
}

const DOMAIN_KIND: Record<string, DeviceKind> = {
  light: 'light',
  switch: 'switch',
  fan: 'fan',
  lock: 'lock',
  cover: 'cover',
  climate: 'thermostat',
  media_player: 'media',
  camera: 'camera',
  binary_sensor: 'sensor',
  sensor: 'sensor'
}

function toDevice(s: HassState): SmartDevice {
  const domain = s.entity_id.split('.')[0]
  const kind = DOMAIN_KIND[domain] ?? 'other'
  const attrs = s.attributes
  const state: SmartDevice['state'] = { status: s.state }
  const capabilities: string[] = []

  if (['light', 'switch', 'fan', 'media_player'].includes(domain)) {
    state.power = s.state === 'on' || s.state === 'playing'
    capabilities.push('power')
  }
  if (typeof attrs.brightness === 'number') {
    state.brightness = Math.round((attrs.brightness / 255) * 100)
    capabilities.push('brightness')
  }
  if (domain === 'lock') {
    state.locked = s.state === 'locked'
    capabilities.push('lock')
  }
  if (domain === 'climate' && typeof attrs.temperature === 'number') {
    state.temperature = attrs.temperature
    capabilities.push('temperature')
  }

  return {
    id: s.entity_id,
    name: (attrs.friendly_name as string) || s.entity_id,
    kind,
    room: (attrs.area as string) || 'Home',
    protocol: 'home-assistant',
    reachable: s.state !== 'unavailable',
    state,
    capabilities
  }
}

export class HomeAssistantAdapter implements ProtocolAdapter {
  readonly id = 'home-assistant' as const
  readonly label = 'Home Assistant'

  isConfigured(): boolean {
    return readConfig() !== null
  }

  private async api(path: string, init?: RequestInit): Promise<Response> {
    const cfg = readConfig()
    if (!cfg) throw new Error('Home Assistant is not configured')
    return fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    })
  }

  async discover(): Promise<SmartDevice[]> {
    if (!this.isConfigured()) return []
    try {
      const res = await this.api('/api/states')
      if (!res.ok) return []
      const states = (await res.json()) as HassState[]
      return states.filter((s) => DOMAIN_KIND[s.entity_id.split('.')[0]]).map(toDevice)
    } catch {
      return []
    }
  }

  async command(cmd: DeviceCommand): Promise<CommandResult> {
    const domain = cmd.deviceId.split('.')[0]
    const { service, data } = mapService(domain, cmd)
    try {
      const res = await this.api(`/api/services/${domain}/${service}`, {
        method: 'POST',
        body: JSON.stringify({ entity_id: cmd.deviceId, ...data })
      })
      if (!res.ok) return { success: false, message: `Home Assistant returned ${res.status}` }
      return { success: true }
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'request failed' }
    }
  }
}

function mapService(
  domain: string,
  cmd: DeviceCommand
): { service: string; data: Record<string, unknown> } {
  switch (cmd.action) {
    case 'on':
      return { service: 'turn_on', data: {} }
    case 'off':
      return { service: 'turn_off', data: {} }
    case 'toggle':
      return { service: 'toggle', data: {} }
    case 'setBrightness':
      return { service: 'turn_on', data: { brightness_pct: Number(cmd.value ?? 100) } }
    case 'setColor':
      return { service: 'turn_on', data: { color_name: String(cmd.value ?? 'white') } }
    case 'setTemperature':
      return { service: 'set_temperature', data: { temperature: Number(cmd.value ?? 21) } }
    case 'lock':
      return { service: 'lock', data: {} }
    case 'unlock':
      return { service: 'unlock', data: {} }
    case 'open':
      return { service: 'open_cover', data: {} }
    case 'close':
      return { service: 'close_cover', data: {} }
    case 'setSpeed':
      return { service: 'set_percentage', data: { percentage: Number(cmd.value ?? 50) } }
    default:
      return { service: 'toggle', data: {} }
  }
}
