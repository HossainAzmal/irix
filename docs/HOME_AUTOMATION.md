# 🏠 Home Automation & Smart Devices

IRIS ships a unified **Smart Home** control-plane (the **Home** tab) that speaks
to every major ecosystem through pluggable protocol adapters. You control lights,
plugs, thermostats, locks, covers, fans, media and sensors from one screen — or
by voice.

```
Voice / UI intent
      ↓
SmartHomeManager  (aggregates + routes)
      ↓
┌───────────────┬───────────────┬──────────────┬──────────────┬────────────┐
│ Matter/Thread │ Home Assistant│ Zigbee (MQTT)│ Google Home  │ Amazon     │
│  adapter      │  adapter      │  adapter     │  adapter     │ Alexa      │
└───────────────┴───────────────┴──────────────┴──────────────┴────────────┘
```

Source: [`src/main/lib/smart-home/`](../src/main/lib/smart-home).

---

## Supported ecosystems

| Ecosystem | Status | Transport |
|---|---|---|
| **Matter / Thread** | Control-plane + seed fabric; native controller hook | local (Wi-Fi/Thread) |
| **Home Assistant** | **Fully functional** via REST API | local network |
| **Zigbee** | Control-plane; MQTT (zigbee2mqtt) hook | local MQTT broker |
| **Google Home** | Control-plane; Smart Home intents hook | cloud |
| **Amazon Alexa** | Control-plane; Smart Home Skill hook | cloud |

> The public build keeps a disk-backed control-plane so the UI and voice layer
> work out of the box (with sample devices). Wiring a live transport is a matter
> of implementing the documented hardware hook in each adapter.

---

## Home Assistant (works today)

1. In Home Assistant create a **Long-Lived Access Token**
   (Profile → Security → Long-Lived Access Tokens).
2. Point IRIS at your instance with either:
   - Environment variables:
     ```bash
     export HASS_URL="http://homeassistant.local:8123"
     export HASS_TOKEN="<your-long-lived-token>"
     ```
   - or a config file at `<userData>/smart-home/home-assistant.config.json`:
     ```json
     { "baseUrl": "http://homeassistant.local:8123", "token": "<token>" }
     ```
3. Open the **Home** tab → **Sync**. Your entities (lights, switches, climate,
   locks, covers, media, sensors) appear grouped by area and are fully
   controllable.

---

## Matter / Thread

Matter is the local, cross-vendor standard backed by Apple, Google, Amazon and
Samsung. IRIS models a commissioned fabric and exposes On/Off, brightness,
color, thermostat and lock control.

To drive real hardware, implement `matterHardwareSend` in
[`adapters/matter.ts`](../src/main/lib/smart-home/adapters/matter.ts) with a
Matter controller (e.g. `@matter/node`): resolve the node/endpoint and invoke
the matching cluster command (`OnOff`, `LevelControl`, `ColorControl`,
`Thermostat`, `DoorLock`, `WindowCovering`).

---

## Zigbee (zigbee2mqtt)

Implement `zigbeeHardwareSend` in
[`adapters/zigbee.ts`](../src/main/lib/smart-home/adapters/zigbee.ts) to publish
to `zigbee2mqtt/<friendly_name>/set` on your MQTT broker, e.g.
`{ "state": "ON", "brightness": 200 }`.

---

## Google Home & Alexa

Implement the hardware hooks in
[`adapters/cloud.ts`](../src/main/lib/smart-home/adapters/cloud.ts):
- **Google** — OAuth + Smart Home `EXECUTE` intents (HomeGraph).
- **Alexa** — Smart Home Skill directives.

---

## Voice control

Any of these route through `smart-home-voice` and resolve to the right device
by name, room, or kind:

- "Turn **on** the **living room** light"
- "**Dim** the bedroom lamp to **20**"
- "Set the **thermostat** to **22**"
- "**Lock** the front door"
- "**Close** the covers"

Scenes are triggered by name: "Run **Movie Night**", "**Good Night**".

---

## Scenes (routines)

Built-in scenes in [`scenes.ts`](../src/main/lib/smart-home/scenes.ts) —
Good Morning, Movie Night, Good Night, Leaving Home, Focus Mode. Each step
matches devices by id/name/room/kind, so scenes adapt to whatever you own. Add
your own by appending to the `SCENES` array.

---

## IPC contract

| Channel | Args | Returns |
|---|---|---|
| `smart-home-status` | – | `AdapterStatus[]` |
| `smart-home-discover` | – | `SmartDevice[]` |
| `smart-home-command` | `{ deviceId, action, value? }` | `CommandResult` |
| `smart-home-scenes` | – | `Scene[]` |
| `smart-home-scene` | `sceneId` | `{ success, results }` |
| `smart-home-voice` | `text` | `{ matched, command?, result?, message }` |

Types: [`types.ts`](../src/main/lib/smart-home/types.ts).
