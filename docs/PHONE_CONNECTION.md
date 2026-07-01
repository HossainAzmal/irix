# 📱 Connecting Your Phone to IRIS

IRIS can pair with your Android phone to mirror the screen, read telemetry
(battery, storage, network), relay notifications to the voice engine, and run
remote quick-actions (wake, lock, home, camera). Pairing uses **wireless ADB**
over your local network and is managed entirely from the **Mobile** tab.

> Prerequisite: run the dependency downloader once so `adb` is available —
> see [`direct exe/README.md`](../direct%20exe/README.md).
> ```bash
> node "direct exe/download-dependencies.mjs" android-platform-tools
> ```

---

## 1. One-time device setup (USB)

1. **Enable Developer Options** — On your phone open
   `Settings → About phone` and tap **Build number** 7 times.
2. **Enable USB debugging** — `Settings → Developer options → USB debugging`.
3. **Plug in via USB** and accept the *"Allow USB debugging?"* prompt on the
   phone (tick *Always allow from this computer*).
4. **Open the TCP/IP port** — in a terminal on your PC run:
   ```bash
   adb tcpip 5555
   ```
   (The Mobile tab shows this command with a one-click **copy** button.)
5. **Unplug the USB cable.** The phone is now listening for wireless connections.

---

## 2. Connect wirelessly (in IRIS)

1. Open the **Mobile** tab in IRIS.
2. Find your phone's Wi-Fi IP in `Settings → About phone → Status → IP address`
   (both devices must be on the **same network**).
3. Choose one of:
   - **New Device** → enter the **IP** and **Port** (`5555`) → **Establish Connection**.
   - **Neural Archive** → tap a previously paired device to instantly re-link.

On success IRIS streams the phone screen, shows live telemetry, and begins
watching notifications. The device is remembered for one-tap reconnection, and
IRIS auto-connects to the most recent device on launch.

---

## 3. What you can do once connected

| Capability | How |
|---|---|
| **Live screen mirror** | Automatic in the Mobile tab (frame stream). |
| **Telemetry** | Model, OS, battery + temperature, storage — refreshed every 3s. |
| **Notification relay** | New phone notifications are spoken aloud by IRIS. |
| **Quick actions** | Wake, Lock, Home, Camera buttons (also voice-driven). |
| **Voice control** | "Lock my phone", "Open the camera on my phone", "Go home". |

---

## 4. Android 11+ Wireless Debugging (pairing code)

Newer Android versions support cable-free pairing:

1. `Settings → Developer options → Wireless debugging → Pair device with pairing code`.
2. Note the **IP:port** and **6-digit code** shown.
3. On your PC:
   ```bash
   adb pair <IP>:<pair_port>      # enter the 6-digit code when prompted
   adb connect <IP>:<connect_port>
   ```
4. Then connect in the Mobile tab using the **connect** IP:port.

---

## 5. Companion QR pairing (roadmap-ready)

For a phone-app-free flow, IRIS can display a **QR code** encoding a one-time
pairing token + the desktop's LAN address. A future IRIS companion app (or the
web companion) scans it and opens a WebRTC data channel directly to the
desktop — no `adb`, works over Wi-Fi Direct or LAN. The control-plane and
telemetry contracts used by the Mobile tab are transport-agnostic, so the same
UI drives either ADB or the companion channel.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `Connection refused` | Re-run `adb tcpip 5555` over USB; phone may have reset the daemon after reboot. |
| Device not found | Confirm both devices share the same Wi-Fi subnet; disable client isolation on the router. |
| `adb: command not found` | Run the dependency downloader, or add `platform-tools` to your `PATH`. |
| Screen stream frozen | Toggle disconnect/reconnect; some ROMs throttle screencap when the screen is off. |
| Pairing drops after reboot | Wireless ADB resets on reboot — repeat the USB `adb tcpip 5555` step. |
