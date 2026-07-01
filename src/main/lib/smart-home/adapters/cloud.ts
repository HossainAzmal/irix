/**
 * Cloud ecosystem adapters (Google Home & Amazon Alexa).
 *
 * These bridge to the vendor smart-home cloud APIs. The public build keeps a
 * disk-backed control-plane; production wires OAuth + the vendor intent APIs
 * into the hardware hooks:
 *   - Google: HomeGraph / Smart Home intents (EXECUTE)
 *   - Alexa:  Smart Home Skill directives
 */
import { RegistryBackedAdapter, type HardwareSend } from '../registry'
import type { SmartDevice } from '../types'

const GOOGLE_SEED: SmartDevice[] = [
  {
    id: 'google:tv:living',
    name: 'Living Room TV',
    kind: 'media',
    room: 'Living Room',
    protocol: 'google-home',
    reachable: true,
    state: { power: false, volume: 12 },
    capabilities: ['power']
  }
]

const ALEXA_SEED: SmartDevice[] = [
  {
    id: 'alexa:echo:kitchen',
    name: 'Kitchen Echo',
    kind: 'media',
    room: 'Kitchen',
    protocol: 'alexa',
    reachable: true,
    state: { power: true, volume: 5 },
    capabilities: ['power']
  }
]

const noopSend: HardwareSend = async () => false

export function createGoogleHomeAdapter(): RegistryBackedAdapter {
  return new RegistryBackedAdapter('google-home', 'Google Home', GOOGLE_SEED, noopSend)
}

export function createAlexaAdapter(): RegistryBackedAdapter {
  return new RegistryBackedAdapter('alexa', 'Amazon Alexa', ALEXA_SEED, noopSend)
}
