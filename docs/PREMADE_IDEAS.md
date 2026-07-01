# 💡 Premade Ideas, Commands & Automations

Copy-paste starting points for getting value out of IRIS on day one. Say them
aloud, or wire them into macros/scenes.

## 🏠 Smart-home one-liners
- "Turn on the living room light."
- "Dim the bedroom lamp to 20 percent."
- "Set the thermostat to 22 degrees."
- "Lock the front door."
- "Run Movie Night." / "Good Night." / "Leaving Home."

## 🖥️ Desktop flow
- "Open VS Code and Chrome."
- "Run npm run dev in this folder."
- "Extract the code from the active window." (ScreenPeeler)
- "Type my email into this field." (Phantom Control)
- "Sort my Downloads folder."

## 📱 Phone
- "Connect to my phone."
- "Lock my phone." / "Go home." / "Open the camera."
- "Read my last notification."

## 🌐 Dev & network
- "Expose port 3000 to the public internet." (Wormhole)
- "Run git status." / "Run the test suite."
- "Index my src folder for search."

---

## 🎬 Premade scenes (ship-ready)
Already defined in [`scenes.ts`](../src/main/lib/smart-home/scenes.ts):

| Scene | What it does |
|---|---|
| **Good Morning** | Lights to 45%, thermostat to 22°, coffee plug on |
| **Movie Night** | Lights to 10%, covers closed, TV on |
| **Good Night** | Lights off, plugs off, doors locked, thermostat to 18° |
| **Leaving Home** | Lights off, media off, locks engaged |
| **Focus Mode** | Bright cool light, media off |

Add your own:
```ts
{
  id: 'workout',
  name: 'Workout',
  icon: 'target',
  description: 'Bright lights, energetic media, cooler room.',
  steps: [
    { match: 'light', action: 'setBrightness', value: 100 },
    { match: 'media', action: 'on' },
    { match: 'thermostat', action: 'setTemperature', value: 19 }
  ]
}
```

---

## 🔗 Macro ideas (chain across domains)
- **"Start work"** → open VS Code + Chrome, set Focus Mode lights, mute phone.
- **"Wrap up"** → run deploy macro, lock phone, Good Night scene.
- **"Presentation"** → close covers, dim lights, expose local port, open slides.

---

## 🧩 Feature ideas on the roadmap
- Companion QR pairing (phone app-free, WebRTC).
- Presence-based automations (auto-run Away when phone leaves Wi-Fi).
- Energy dashboard aggregating plug/thermostat telemetry.
- Multi-room audio follow ("move the music to the kitchen").
- Voice macros recorder ("remember these steps as 'morning'").
