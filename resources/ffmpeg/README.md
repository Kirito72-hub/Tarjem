# Bundled FFmpeg (P1-7)

Place platform binaries here before running `npm run build` or `npm run build:win`:

| Platform | File |
|----------|------|
| Windows x64 | `ffmpeg.exe` |
| macOS | `ffmpeg` (optional) |
| Linux | `ffmpeg` (optional) |

Download a static build from [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/) (e.g. `ffmpeg-release-essentials.zip`) and copy `ffmpeg.exe` into this folder.

At runtime the app resolves:

- **Development:** `<project>/resources/ffmpeg/ffmpeg.exe`
- **Packaged:** `process.resourcesPath/ffmpeg/ffmpeg.exe` (via `extraResources` in `electron-builder.yml`)

Without `ffmpeg.exe`, merge jobs fail with a clear error in the Merger tab.
