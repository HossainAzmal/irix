/**
 * Matter adapter.
 *
 * Matter is the cross-ecosystem IoT standard (backed by Apple, Google, Amazon,
 * Samsung) that runs locally over Thread / Wi-Fi. The public build ships a
 * disk-backed control-plane seeded with a typical commissioned fabric so the
 * UI and voice layer are fully usable out of the box.
 *
 * To drive real hardware, wire a Matter controller (e.g. `@matter/node`) into
 * the {@link matterHardwareSend} hook: resolve the device's node/endpoint and
 * invoke the matching cluster command (OnOff, LevelControl, ColorControl,
 * Thermostat, DoorLock, WindowCovering).
 */
import { RegistryBackedAdapter, type HardwareSend } from '../registry'
import type { SmartDevice } from '../types'

const MATTER_SEED: SmartDevice[] = [
  {
    id: 'matter:0x1a2b:light',
    name: 'Living Room Ceiling',
    kind: 'light',
    room: 'Living Room',
    protocol: 'matter',
    reachable: true,
    state: { power: true, brightness: 70, color: 'warm-white' },
    capabilities: ['power', 'brightness', 'color']
  },
  {
    id: 'matter:0x2c3d:plug',
    name: 'Coffee Machine Plug',
    kind: 'plug',
    room: 'Kitchen',
    protocol: 'matter',
    reachable: true,
    state: { power: false },
    capabilities: ['power']
  },
  {
    id: 'matter:0x3e4f:thermostat',
    name: 'Hallway Thermostat',
    kind: 'thermostat',
    room: 'Hallway',
    protocol: 'matter',
    reachable: true,
    state: { temperature: 21, power: true },
    capabilities: ['temperature', 'power']
  },
  {
    id: 'matter:0x5a6b:lock',
    name: 'Front Door Lock',
    kind: 'lock',
    room: 'Entrance',
    protocol: 'matter',
    reachable: true,
    state: { locked: true },
    capabilities: ['lock']
  }
]

const matterHardwareSend: HardwareSend = async (_device, _cmd) => {
  // TODO: bridge to a real Matter controller (@matter/node).
  //   const node = controller.getNode(nodeIdFor(_device))
  //   await node.getDevices()[endpoint].getClusterClient(OnOff.Complete).on()
  // Returning false keeps the command in the local control-plane until a
  // controller is connected, so the UI reflects intent without a live fabric.
  return false
}

export function createMatterAdapter(): RegistryBackedAdapter {
  return new RegistryBackedAdapter('matter', 'Matter / Thread', MATTER_SEED, matterHardwareSend)
}
