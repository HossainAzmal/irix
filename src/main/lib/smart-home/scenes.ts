/**
 * Premade smart-home scenes (routines). Each step targets devices by a match
 * expression (device id, name fragment, room, or kind) so scenes work across
 * whatever devices the user actually has.
 */
import type { DeviceAction, DeviceStateValue } from './types'

export interface SceneStep {
  /** matches device id, name, room, or kind (case-insensitive substring) */
  match: string
  action: DeviceAction
  value?: DeviceStateValue
}

export interface Scene {
  id: string
  name: string
  icon: string
  description: string
  steps: SceneStep[]
}

export const SCENES: Scene[] = [
  {
    id: 'good-morning',
    name: 'Good Morning',
    icon: 'sun',
    description: 'Lights to a gentle level, thermostat comfy, coffee plug on.',
    steps: [
      { match: 'light', action: 'setBrightness', value: 45 },
      { match: 'thermostat', action: 'setTemperature', value: 22 },
      { match: 'coffee', action: 'on' }
    ]
  },
  {
    id: 'movie-night',
    name: 'Movie Night',
    icon: 'film',
    description: 'Dim the lights, close covers, power the TV.',
    steps: [
      { match: 'light', action: 'setBrightness', value: 10 },
      { match: 'cover', action: 'close' },
      { match: 'tv', action: 'on' }
    ]
  },
  {
    id: 'good-night',
    name: 'Good Night',
    icon: 'moon',
    description: 'Everything off, doors locked, thermostat lowered.',
    steps: [
      { match: 'light', action: 'off' },
      { match: 'plug', action: 'off' },
      { match: 'lock', action: 'lock' },
      { match: 'thermostat', action: 'setTemperature', value: 18 }
    ]
  },
  {
    id: 'away',
    name: 'Leaving Home',
    icon: 'lock',
    description: 'Secure the house: lights off, locks engaged, media off.',
    steps: [
      { match: 'light', action: 'off' },
      { match: 'media', action: 'off' },
      { match: 'lock', action: 'lock' }
    ]
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    icon: 'target',
    description: 'Bright cool light, media muted, notifications quieted.',
    steps: [
      { match: 'light', action: 'setBrightness', value: 90 },
      { match: 'media', action: 'off' }
    ]
  }
]
