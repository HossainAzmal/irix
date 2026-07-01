/**
 * Zigbee adapter (via an MQTT bridge such as zigbee2mqtt / ZHA).
 *
 * The public build keeps a disk-backed control-plane. To go live, connect an
 * MQTT client in {@link zigbeeHardwareSend} and publish to
 * `zigbee2mqtt/<friendly_name>/set` with the mapped payload
 * (e.g. { state: 'ON', brightness: 200 }).
 */
import { RegistryBackedAdapter, type HardwareSend } from '../registry'
import type { SmartDevice } from '../types'

const ZIGBEE_SEED: SmartDevice[] = [
  {
    id: 'zigbee:0x00124b:motion',
    name: 'Hallway Motion Sensor',
    kind: 'sensor',
    room: 'Hallway',
    protocol: 'zigbee',
    reachable: true,
    state: { status: 'clear', battery: 92 },
    capabilities: []
  },
  {
    id: 'zigbee:0x00124c:bulb',
    name: 'Bedroom Lamp',
    kind: 'light',
    room: 'Bedroom',
    protocol: 'zigbee',
    reachable: true,
    state: { power: false, brightness: 40 },
    capabilities: ['power', 'brightness']
  }
]

const zigbeeHardwareSend: HardwareSend = async () => {
  // TODO: publish to zigbee2mqtt over MQTT (mqtt://<broker>) here.
  return false
}

export function createZigbeeAdapter(): RegistryBackedAdapter {
  return new RegistryBackedAdapter('zigbee', 'Zigbee (MQTT)', ZIGBEE_SEED, zigbeeHardwareSend)
}
