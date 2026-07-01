# 📦 direct exe — Downloadable Dependent Executables

IRIS relies on a few native executables and model files at runtime (Android
`adb`, `scrcpy`, `ffmpeg`, and the offline Vosk speech model). These binaries
are **large and platform-specific**, so they are **not committed to the
repository**. Instead, this folder ships a small, zero-dependency downloader
that fetches the correct build for your OS on demand.

> Result: after running the downloader you get a ready-to-use `direct exe/bin/`
> folder containing every dependent `.exe` / binary IRIS needs — a "direct exe"
> bundle you can zip and hand to another machine.

---

## 🚀 Quick start

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File ".\direct exe\download-dependencies.ps1"
```

### macOS / Linux / Windows (Node ≥ 18)

```bash
node "direct exe/download-dependencies.mjs"
```

Download only specific tools:

```bash
node "direct exe/download-dependencies.mjs" android-platform-tools ffmpeg
# PowerShell:
powershell -File ".\direct exe\download-dependencies.ps1" -Only android-platform-tools,ffmpeg
```

Force a re-download (ignore cache):

```bash
node "direct exe/download-dependencies.mjs" --force
```

---

## 📁 Output layout

```
direct exe/
├── manifest.json                # what to download, per platform
├── download-dependencies.mjs    # cross-platform Node downloader
├── download-dependencies.ps1    # Windows PowerShell downloader
└── bin/                         # (generated, git-ignored)
    ├── android-platform-tools/platform-tools/adb(.exe)
    ├── scrcpy/scrcpy.exe
    ├── ffmpeg/bin/ffmpeg(.exe)
    └── vosk-model-small-en/vosk-model-small-en-us-0.15/
```

Point IRIS at these paths (Settings → Paths, or the `IRIS_BIN_DIR` env var) if
you keep them outside the system `PATH`.

---

## 🧩 What each dependency is for

| Dependency | Used by | Why |
|---|---|---|
| **Android Platform Tools (`adb`)** | Mobile tab | Wireless/USB phone pairing, telemetry, remote input, mirroring |
| **scrcpy** | Mobile tab | Low-latency phone screen streaming & control |
| **FFmpeg** | Voice pipeline, Gallery | Audio capture/transcode for WebRTC, media processing |
| **Vosk small EN model** | Wake word | Offline "Hey, IRIS" detection & local speech recognition |

---

## 🔧 Manual fallback

If a download fails (corporate proxy, changed release URL, etc.), grab the
build manually and drop it into the matching `bin/<id>/` folder:

- Android Platform Tools — <https://developer.android.com/tools/releases/platform-tools>
- scrcpy — <https://github.com/Genymobile/scrcpy/releases>
- FFmpeg — <https://ffmpeg.org/download.html>
- Vosk models — <https://alphacephei.com/vosk/models>

Then re-run the downloader; already-present tools are detected and skipped.

---

## ➕ Adding a new dependency

Edit [`manifest.json`](./manifest.json) and add an entry:

```jsonc
{
  "id": "my-tool",
  "name": "My Tool",
  "reason": "What feature needs it",
  "extract": true,
  "targets": {
    "win32":  { "url": "https://.../my-tool-win.zip",   "check": "my-tool.exe" },
    "linux":  { "url": "https://.../my-tool-linux.tar.xz", "check": "my-tool" }
  }
}
```

- `targets` keys: `win32`, `darwin`, `linux`, or `all`.
- `check` is a relative path used to detect an existing install and verify layout.
- `extract: true` auto-unzips `.zip` / `.tar.*` archives.
