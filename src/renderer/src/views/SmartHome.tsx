import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Lightbulb,
  Power,
  Lock,
  Unlock,
  Thermometer,
  Fan,
  Blinds,
  Tv,
  Cctv,
  Radio,
  Home,
  RefreshCw,
  Sun,
  Moon,
  Film,
  Target,
  Zap
} from 'lucide-react'

type DeviceKind =
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

type StateValue = string | number | boolean

interface SmartDevice {
  id: string
  name: string
  kind: DeviceKind
  room: string
  protocol: string
  reachable: boolean
  state: Record<string, StateValue>
  capabilities: string[]
}

interface AdapterStatus {
  id: string
  label: string
  configured: boolean
  deviceCount: number
}

interface Scene {
  id: string
  name: string
  icon: string
  description: string
}

const ipc = (): (typeof window)['electron']['ipcRenderer'] => window.electron.ipcRenderer

const KIND_ICON: Record<DeviceKind, JSX.Element> = {
  light: <Lightbulb size={20} />,
  switch: <Power size={20} />,
  plug: <Zap size={20} />,
  thermostat: <Thermometer size={20} />,
  lock: <Lock size={20} />,
  sensor: <Radio size={20} />,
  fan: <Fan size={20} />,
  cover: <Blinds size={20} />,
  media: <Tv size={20} />,
  camera: <Cctv size={20} />,
  other: <Home size={20} />
}

const SCENE_ICON: Record<string, JSX.Element> = {
  sun: <Sun size={18} />,
  moon: <Moon size={18} />,
  film: <Film size={18} />,
  target: <Target size={18} />,
  lock: <Lock size={18} />
}

const glass = 'bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl'

const SmartHomeView = (): JSX.Element => {
  const [devices, setDevices] = useState<SmartDevice[]>([])
  const [adapters, setAdapters] = useState<AdapterStatus[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const [devs, stat, scn] = await Promise.all([
        ipc().invoke('smart-home-discover'),
        ipc().invoke('smart-home-status'),
        ipc().invoke('smart-home-scenes')
      ])
      setDevices(Array.isArray(devs) ? devs : [])
      setAdapters(Array.isArray(stat) ? stat : [])
      setScenes(Array.isArray(scn) ? scn : [])
    } catch {
      /* handled by empty state */
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    await load()
  }, [load])

  useEffect(() => {
    Promise.all([
      ipc().invoke('smart-home-discover'),
      ipc().invoke('smart-home-status'),
      ipc().invoke('smart-home-scenes')
    ])
      .then(([devs, stat, scn]) => {
        setDevices(Array.isArray(devs) ? devs : [])
        setAdapters(Array.isArray(stat) ? stat : [])
        setScenes(Array.isArray(scn) ? scn : [])
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const send = async (deviceId: string, action: string, value?: StateValue): Promise<void> => {
    setBusy(deviceId)
    try {
      const res = await ipc().invoke('smart-home-command', { deviceId, action, value })
      if (res?.device) {
        setDevices((prev) => prev.map((d) => (d.id === deviceId ? res.device : d)))
      } else {
        await refresh()
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(null)
    }
  }

  const runScene = async (id: string): Promise<void> => {
    setBusy(`scene:${id}`)
    try {
      await ipc().invoke('smart-home-scene', id)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const rooms = useMemo(() => {
    const map = new Map<string, SmartDevice[]>()
    for (const d of devices) {
      const list = map.get(d.room) ?? []
      list.push(d)
      map.set(d.room, list)
    }
    return Array.from(map.entries())
  }, [devices])

  return (
    <div className="flex-1 h-full overflow-y-auto scrollbar-small p-6 md:p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <Home className="text-emerald-400" size={22} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-[0.2em] uppercase">
              Smart Home
            </h2>
            <p className="text-[10px] text-zinc-500 font-mono">
              MATTER · HOME ASSISTANT · ZIGBEE · GOOGLE · ALEXA
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg px-3 py-2 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sync
        </button>
      </div>

      {/* Ecosystem status */}
      <div className="flex flex-wrap gap-2 mb-8">
        {adapters.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-mono tracking-wider ${
              a.configured
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-white/5 bg-white/[0.02] text-zinc-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${a.configured ? 'bg-emerald-400' : 'bg-zinc-600'}`}
            />
            {a.label}
            {a.configured && <span className="text-emerald-500/70">· {a.deviceCount}</span>}
          </div>
        ))}
      </div>

      {/* Scenes */}
      {scenes.length > 0 && (
        <div className="mb-10">
          <h3 className="text-[11px] font-bold text-zinc-400 tracking-[0.2em] uppercase mb-3">
            Scenes
          </h3>
          <div className="flex flex-wrap gap-3">
            {scenes.map((s) => (
              <button
                key={s.id}
                onClick={() => runScene(s.id)}
                disabled={busy === `scene:${s.id}`}
                title={s.description}
                className={`${glass} flex items-center gap-3 px-4 py-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group disabled:opacity-50`}
              >
                <span className="text-emerald-400 group-hover:scale-110 transition-transform">
                  {SCENE_ICON[s.icon] ?? <Zap size={18} />}
                </span>
                <div className="text-left">
                  <div className="text-xs font-bold text-zinc-200">{s.name}</div>
                  <div className="text-[9px] text-zinc-500 font-mono max-w-44 truncate">
                    {s.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Devices grouped by room */}
      {!loading && devices.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Home size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">No smart devices found.</p>
          <p className="text-[11px] font-mono mt-2 max-w-md mx-auto text-zinc-600">
            Connect Home Assistant (Settings) or commission Matter/Zigbee devices. Sample devices
            appear automatically once an ecosystem is active.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {rooms.map(([room, roomDevices]) => (
          <div key={room}>
            <h3 className="text-[11px] font-bold text-zinc-400 tracking-[0.2em] uppercase mb-3">
              {room}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomDevices.map((d) => (
                <DeviceCard key={d.id} device={d} busy={busy === d.id} onCommand={send} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DeviceCard = ({
  device,
  busy,
  onCommand
}: {
  device: SmartDevice
  busy: boolean
  onCommand: (id: string, action: string, value?: StateValue) => void
}): JSX.Element => {
  const on = device.state.power === true
  const locked = device.state.locked === true
  const brightness = Number(device.state.brightness ?? 0)
  const temperature = Number(device.state.temperature ?? 0)

  return (
    <div
      className={`${glass} p-4 transition-all ${busy ? 'opacity-60' : ''} ${
        on || locked ? 'border-emerald-500/30' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
              on
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-white/[0.02] border-white/5 text-zinc-500'
            }`}
          >
            {KIND_ICON[device.kind] ?? KIND_ICON.other}
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-200 leading-tight">{device.name}</div>
            <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">
              {device.protocol}
            </div>
          </div>
        </div>
        <span
          className={`h-1.5 w-1.5 rounded-full mt-1 ${
            device.reachable ? 'bg-emerald-400' : 'bg-amber-500'
          }`}
          title={device.reachable ? 'reachable' : 'stored locally (no live bridge)'}
        />
      </div>

      {/* Controls per capability */}
      {device.capabilities.includes('power') && (
        <button
          onClick={() => onCommand(device.id, on ? 'off' : 'on')}
          className={`w-full py-2 rounded-lg text-[11px] font-bold tracking-widest uppercase transition-all ${
            on
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
          }`}
        >
          {on ? 'On' : 'Off'}
        </button>
      )}

      {device.capabilities.includes('brightness') && (
        <div className="mt-3">
          <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-1">
            <span>BRIGHTNESS</span>
            <span className="text-emerald-400">{brightness}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={brightness}
            onChange={(e) => onCommand(device.id, 'setBrightness', Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>
      )}

      {device.capabilities.includes('temperature') && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] font-mono text-zinc-500">TEMPERATURE</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCommand(device.id, 'setTemperature', temperature - 1)}
              className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              −
            </button>
            <span className="text-sm font-bold text-emerald-400 font-mono w-12 text-center">
              {temperature}°
            </span>
            <button
              onClick={() => onCommand(device.id, 'setTemperature', temperature + 1)}
              className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              +
            </button>
          </div>
        </div>
      )}

      {device.capabilities.includes('lock') && (
        <button
          onClick={() => onCommand(device.id, locked ? 'unlock' : 'lock')}
          className={`w-full mt-1 py-2 rounded-lg text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all ${
            locked
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}
        >
          {locked ? <Lock size={13} /> : <Unlock size={13} />}
          {locked ? 'Locked' : 'Unlocked'}
        </button>
      )}

      {device.kind === 'sensor' && (
        <div className="text-[11px] font-mono text-zinc-400 mt-1">
          {String(device.state.status ?? '—')}
          {device.state.battery !== undefined && (
            <span className="text-zinc-600"> · {String(device.state.battery)}%</span>
          )}
        </div>
      )}
    </div>
  )
}

export default SmartHomeView
