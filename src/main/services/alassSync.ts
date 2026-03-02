import { spawn, spawnSync } from 'child_process'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

// ── Path helpers ──────────────────────────────────────────────────────────────

function getAlassBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'alass', 'bin', 'alass-cli.exe')
  }
  return path.join(__dirname, '..', '..', '..', 'alass-windows64', 'bin', 'alass-cli.exe')
}

function getFfmpegPath(): string {
  let p: string = ffmpegStatic as string
  if (app.isPackaged) p = p.replace('app.asar', 'app.asar.unpacked')
  return p
}

function getFfprobePath(): string {
  let p: string = ffprobeStatic.path
  if (app.isPackaged) p = p.replace('app.asar', 'app.asar.unpacked')
  return p
}

// ── Audio extraction ──────────────────────────────────────────────────────────

async function extractAudio(videoPath: string, ffmpegPath: string): Promise<string> {
  const tempDir = os.tmpdir()
  const tempAudio = path.join(tempDir, `alass_audio_${Date.now()}.mka`)

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      '-i', videoPath,
      '-vn', '-sn', '-dn',
      '-map', '0:a:0',
      '-c:a', 'copy',
      '-y',
      tempAudio
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[Alass] Extracted audio to: ${tempAudio}`)
        resolve(tempAudio)
      } else {
        reject(new Error(`[Alass] Audio extraction failed with code ${code}`))
      }
    })
    proc.on('error', (err) => {
      reject(new Error(`[Alass] Audio extraction spawn failed: ${err.message}`))
    })
  })
}

// ── Subtitle timestamp rescaling ──────────────────────────────────────────────

function assTimestampToMs(ts: string): number {
  const [h, m, rest] = ts.split(':')
  const [s, cs] = rest.split('.')
  return (
    parseInt(h) * 3_600_000 +
    parseInt(m) * 60_000 +
    parseInt(s) * 1_000 +
    parseInt(cs.padEnd(3, '0')) * 10
  )
}

function msToAssTimestamp(ms: number): string {
  const totalCs = Math.max(0, Math.round(ms / 10))
  const cs = totalCs % 100
  const totalS = Math.floor(totalCs / 100)
  const s = totalS % 60
  const totalM = Math.floor(totalS / 60)
  const m = totalM % 60
  const h = Math.floor(totalM / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

function srtTimestampToMs(ts: string): number {
  const [h, m, rest] = ts.split(':')
  const [s, ms] = rest.split(',')
  return (
    parseInt(h) * 3_600_000 +
    parseInt(m) * 60_000 +
    parseInt(s) * 1_000 +
    parseInt(ms)
  )
}

function msToSrtTimestamp(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms))
  const msPart = totalMs % 1000
  const totalS = Math.floor(totalMs / 1000)
  const s = totalS % 60
  const totalM = Math.floor(totalS / 60)
  const m = totalM % 60
  const h = Math.floor(totalM / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msPart).padStart(3, '0')}`
}

/**
 * Reads `sourcePath`, multiplies every timestamp by `factor`, writes to `destPath`.
 * Supports .srt and .ass/.ssa.
 */
function rescaleSubtitleToFile(sourcePath: string, destPath: string, factor: number): void {
  const ext = path.extname(sourcePath).toLowerCase()
  const content = fs.readFileSync(sourcePath, 'utf8')
  let rescaled: string

  if (ext === '.ass' || ext === '.ssa') {
    rescaled = content.replace(
      /^(Dialogue:\s*\d+,)([\d:.]+),([\d:.]+),/gm,
      (_match, prefix, start, end) => {
        const newStart = msToAssTimestamp(assTimestampToMs(start) * factor)
        const newEnd = msToAssTimestamp(assTimestampToMs(end) * factor)
        return `${prefix}${newStart},${newEnd},`
      }
    )
  } else if (ext === '.srt') {
    rescaled = content.replace(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/g,
      (_match, start, end) => {
        const newStart = msToSrtTimestamp(srtTimestampToMs(start) * factor)
        const newEnd = msToSrtTimestamp(srtTimestampToMs(end) * factor)
        return `${newStart} --> ${newEnd}`
      }
    )
  } else {
    console.log(`[Alass] FPS rescale: unsupported format "${ext}", skipping`)
    fs.copyFileSync(sourcePath, destPath)
    return
  }

  fs.writeFileSync(destPath, rescaled, 'utf8')
}

// ── FPS-ratio detection (Pass 1) ──────────────────────────────────────────────

/**
 * Parses the alass FPS ratio line from combined stdout+stderr.
 * Returns num/den as a float (e.g. 25/23.976 → 1.04271), or null if not found.
 *
 * Alass prints: info: 'reference file FPS/input file FPS' ratio is NUM/DEN
 */
function parseFpsRatioFromOutput(combined: string): number | null {
  const m = /ratio\s+is\s+([\d.]+)\/([\d.]+)/i.exec(combined)
  if (!m) return null
  const num = parseFloat(m[1])
  const den = parseFloat(m[2])
  if (!num || !den || den === 0) return null
  return num / den
}

/**
 * Runs alass once on the original subtitle just to detect the FPS ratio.
 * The output file is written to a temp location and deleted immediately.
 * Returns the raw ratio (e.g. ~1.0427 for 25/23.976), or null if not detected.
 */
async function detectFpsRatioWithAlass(
  binaryPath: string,
  referencePath: string,
  inputSubPath: string,
  childEnv: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<number | null> {
  const ext = path.extname(inputSubPath)
  const tempOut = inputSubPath.replace(ext, `_fps_detect${ext}`)

  return new Promise((resolve) => {
    const proc = spawn(
      binaryPath,
      [referencePath, inputSubPath, tempOut, '--split-penalty', '30'],
      { stdio: ['ignore', 'pipe', 'pipe'], env: childEnv }
    )

    let combined = ''
    const onData = (chunk: Buffer) => { combined += chunk.toString() }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)

    const timer = setTimeout(() => { proc.kill('SIGKILL'); resolve(null) }, timeoutMs)

    proc.on('close', () => {
      clearTimeout(timer)
      try { fs.unlinkSync(tempOut) } catch { /* temp file may not exist */ }
      const ratio = parseFpsRatioFromOutput(combined)
      if (ratio) {
        console.log(`[Alass] Pass 1 detected FPS ratio: ${ratio.toFixed(6)}`)
      } else {
        console.log(`[Alass] Pass 1: no FPS ratio detected`)
      }
      resolve(ratio)
    })

    proc.on('error', () => { clearTimeout(timer); resolve(null) })
  })
}

// ── Video FPS helper (for logging) ───────────────────────────────────────────

function detectVideoFps(videoPath: string, ffprobePath: string): number | null {
  try {
    const result = spawnSync(ffprobePath, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=avg_frame_rate',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath
    ], { encoding: 'utf8', timeout: 10_000 })
    const raw = (result.stdout ?? '').trim()
    if (!raw) return null
    const [num, den] = raw.split('/').map(Number)
    if (!den || den === 0) return null
    const fps = num / den
    return fps > 0 ? fps : null
  } catch { return null }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Synchronizes subtitle timing to the video using a two-pass alass approach.
 *
 * Two-pass pipeline:
 *   1. Extract audio once (strips MKV attachment streams).
 *   2. Pass 1  — Run alass on the ORIGINAL subtitle to detect its FPS ratio.
 *      (Output is discarded.)
 *   3. If a significant FPS mismatch is detected (> 0.5%):
 *        a. Pre-rescale the original subtitle timestamps by the ratio.
 *           Stretching makes all timestamps LARGER → no negative timestamps
 *           after alass applies its alignment shift in Pass 2.
 *        b. Pass 2 — Run alass on the pre-rescaled subtitle.
 *           alass now sees correctly-timed content and only needs to find
 *           a small alignment offset — no clamping, no drift.
 *      Otherwise: Pass 1 output is used directly (no speed mismatch → no rescaling).
 *   4. Validate the shift is within threshold.
 *   5. Clean up all temp files.
 *
 * Why not post-rescale?  alass clamps negative timestamps to t=0 BEFORE we
 * can rescale them, permanently destroying early dialogue timing.
 * Pre-rescaling avoids this entirely.
 */
export async function syncSubtitle(
  videoPath: string,
  inputSubPath: string,
  outputSubPath: string,
  timeoutMs = 120_000
): Promise<void> {
  const binaryPath = getAlassBinaryPath()
  const ffmpegPath = getFfmpegPath()
  const ffprobePath = getFfprobePath()
  const ffprobeBinDir = path.dirname(ffprobePath)
  const ffmpegBinDir = path.dirname(ffmpegPath)

  console.log(`[Alass] Binary:    ${binaryPath}`)
  console.log(`[Alass] ffprobe:   ${ffprobeBinDir}`)
  console.log(`[Alass] ffmpeg:    ${ffmpegBinDir}`)
  console.log(`[Alass] Video:     ${videoPath}`)
  console.log(`[Alass] Input:     ${inputSubPath}`)
  console.log(`[Alass] Output:    ${outputSubPath}`)

  const videoFps = detectVideoFps(videoPath, ffprobePath)
  if (videoFps) console.log(`[Alass] Video FPS: ${videoFps.toFixed(3)}`)

  // Step 1 — Extract audio (used for both passes)
  const tempAudio = await extractAudio(videoPath, ffmpegPath)

  const childEnv = {
    ...process.env,
    PATH: `${ffmpegBinDir}${path.delimiter}${ffprobeBinDir}${path.delimiter}${process.env.PATH ?? ''}`
  }

  let tempPreScaled: string | null = null

  try {
    // Step 2 — Pass 1: detect FPS ratio (output discarded)
    console.log(`[Alass] Pass 1: detecting FPS ratio...`)
    const fpsRatio = await detectFpsRatioWithAlass(
      binaryPath, tempAudio, inputSubPath, childEnv, timeoutMs
    )

    let subToSync = inputSubPath

    if (fpsRatio && Math.abs(fpsRatio - 1.0) > 0.005) {
      const mismatchPct = Math.abs(fpsRatio - 1.0) * 100
      console.log(
        `[Alass] FPS mismatch: ${mismatchPct.toFixed(2)}% (ratio ${fpsRatio.toFixed(6)}) ` +
        `→ pre-rescaling subtitle before Pass 2`
      )

      // Step 3a — Pre-rescale: stretch all timestamps by the ratio.
      // E.g. 25fps sub × 1.0428 → timestamps now match 23.976fps video speed.
      // All timestamps grow → none go negative when alass shifts later.
      const ext = path.extname(inputSubPath)
      tempPreScaled = inputSubPath.replace(ext, `_prescaled${ext}`)
      rescaleSubtitleToFile(inputSubPath, tempPreScaled, fpsRatio)
      subToSync = tempPreScaled
      console.log(`[Alass] Pre-rescaled subtitle: ${tempPreScaled}`)
    } else {
      console.log(`[Alass] No significant FPS mismatch — skipping pre-rescale`)
    }

    // Step 3b / fallback — Pass 2: real sync on (possibly pre-rescaled) subtitle
    console.log(`[Alass] Pass 2: syncing...`)
    await runAlass(binaryPath, tempAudio, subToSync, outputSubPath, childEnv, timeoutMs)

  } finally {
    try { fs.unlinkSync(tempAudio); console.log(`[Alass] Cleaned up temp audio: ${tempAudio}`) }
    catch { /* ignore */ }
    if (tempPreScaled) {
      try { fs.unlinkSync(tempPreScaled); console.log(`[Alass] Cleaned up pre-scaled sub: ${tempPreScaled}`) }
      catch { /* ignore */ }
    }
  }
}

// ── alass runner (Pass 2: no post-rescaling needed) ──────────────────────────

function runAlass(
  binaryPath: string,
  referencePath: string,
  inputSubPath: string,
  outputSubPath: string,
  childEnv: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<void> {
  const MAX_SHIFT_SECS = 30

  return new Promise((resolve, reject) => {
    const proc = spawn(
      binaryPath,
      [referencePath, inputSubPath, outputSubPath, '--split-penalty', '30'],
      { stdio: ['ignore', 'pipe', 'pipe'], env: childEnv }
    )

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (chunk: Buffer) => {
      const txt = chunk.toString()
      stdout += txt
      process.stdout.write(`[Alass] ${txt}`)
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      const txt = chunk.toString()
      stderr += txt
      process.stderr.write(`[Alass] ${txt}`)
    })

    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error(`[Alass] Process timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    proc.on('close', (code) => {
      clearTimeout(timer)

      if (code !== 0) {
        const msg = stderr.trim() || stdout.trim() || `exit code ${code}`
        reject(new Error(`[Alass] Process exited with ${code}: ${msg}`))
        return
      }

      const combined = stdout + stderr

      // Validate max block shift
      const shiftRegex = /by\s+(-?)(\d+):(\d{2}):(\d{2})/g
      let match: RegExpExecArray | null
      let maxShiftSecs = 0
      while ((match = shiftRegex.exec(combined)) !== null) {
        const total = parseInt(match[2]) * 3600 + parseInt(match[3]) * 60 + parseInt(match[4])
        if (total > maxShiftSecs) maxShiftSecs = total
      }

      if (maxShiftSecs > MAX_SHIFT_SECS) {
        console.warn(
          `[Alass] Sync rejected: max block shift ${maxShiftSecs}s exceeds ${MAX_SHIFT_SECS}s threshold. ` +
          `Subtitle and video are likely from different sources — falling back to unsynced.`
        )
        reject(new Error(
          `[Alass] Sync unreliable: max block shift ${maxShiftSecs}s > ${MAX_SHIFT_SECS}s limit`
        ))
        return
      }

      console.log(`[Alass] Sync accepted (max block shift: ${maxShiftSecs}s)`)
      resolve()
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`[Alass] Failed to spawn process: ${err.message}`))
    })
  })
}
