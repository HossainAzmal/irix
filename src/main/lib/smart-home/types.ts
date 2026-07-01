/**
 * Shared types for the IRIS Smart Home subsystem.
 *
 * The subsystem follows an "open control-plane" design: device discovery,
 * state and command routing live here (public), while the low-level protocol
 * transport for each ecosystem is isolated behind {@link ProtocolAdapter} so
 * production/native implementations can be plugged in without touching the UI.
 */

export type ProtocolId = 'matter' | 'home-assistant' | 'zigbee' | 'google-home' | 'alexa'

export type DeviceKind =
  | 'light'
  | 'switch'
  | 'plug'
  | 'thermostat'
  | 'lock'
  | 'sensor'
  | 'fan'
  | 'cover'
  | 'media'
  | 'camera'
  | 'other'

export type DeviceStateValue = string | number | boolean

export interface SmartDevice {
  id: string
  name: string
  kind: DeviceKind
  room: string
  protocol: ProtocolId
  reachable: boolean
  /** e.g. { power: true, brightness: 80, temperature: 21 } */
  state: Record<string, DeviceStateValue>
  /** e.g. ['power', 'brightness', 'color'] */
  capabilities: string[]
}

export type DeviceAction =
  | 'on'
  | 'off'
  | 'toggle'
  | 'setBrightness'
  | 'setColor'
  | 'setTemperature'
  | 'lock'
  | 'unlock'
  | 'open'
  | 'close'
  | 'setSpeed'

export interface DeviceCommand {
  deviceId: string
  action: DeviceAction
  value?: DeviceStateValue
}

export interface CommandResult {
  success: boolean
  message?: string
  device?: SmartDevice
}

export interface AdapterStatus {
  id: ProtocolId
  label: string
  configured: boolean
  deviceCount: number
  detail?: string
}

export interface ProtocolAdapter {
  readonly id: ProtocolId
  readonly label: string
  /** True when credentials / fabric / bridge are present for this ecosystem. */
  isConfigured(): boolean
  /** Enumerate devices this adapter currently knows about. */
  discover(): Promise<SmartDevice[]>
  /** Execute a command against one device. */
  command(cmd: DeviceCommand): Promise<CommandResult>
}
