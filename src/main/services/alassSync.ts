import { spawn } from 'child_process'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

/**
 * Resolves the alass-cli executable path.
 * - Development: uses the `alass-windows64` folder sibling to the Tarjem project.
 * - Production:  binary must be placed in extraResources/alass/bin/ and resolved via resourcesPath.
 *
 * __dirname in dev = out/main/  (3 levels up → vsCodeProjects/Tarjem/)
 */
function getAlassBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'alass', 'bin', 'alass-cli.exe')
  }
  return path.join(__dirname, '..', '..', '..', 'alass-windows64', 'bin', 'alass-cli.exe')
}

/**
 * Returns the ffmpeg executable path (from ffmpeg-static, with asar.unpacked fix for production).
 */
function getFfmpegPath(): string {
  let p: string = ffmpegStatic as string
  if (app.isPackaged) {
    p = p.replace('app.asar', 'app.asar.unpacked')
  }
  return p
}

/**
 * Returns the directory containing a modern ffprobe binary (from ffprobe-static).
 * This is prepended to PATH when spawning alass so it calls the correct ffprobe.
 * NOTE: We actually need to extract audio first to avoid MKV attachment streams
 *       that lack codec_long_name (a known alass/ffprobe compatibility issue).
 */
function getFfprobeBinDir(): string {
  let p: string = ffprobeStatic.path
  if (app.isPackaged) {
    p = p.replace('app.asar', 'app.asar.unpacked')
  }
  return path.dirname(p)
}

/**
 * Extracts the first audio stream from a video file to a temporary audio file.
 * This strips problematic attachment streams (e.g., embedded fonts in anime MKVs)
 * that cause alass to crash due to missing codec_long_name fields in ffprobe output.
 *
 * @returns Path to the extracted audio file (caller must delete after use)
 */
async function extractAudio(videoPath: string, ffmpegPath: string): Promise<string> {
  const tempDir = os.tmpdir()
  const tempAudio = path.join(tempDir, `alass_audio_${Date.now()}.mka`)

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      '-i', videoPath,
      '-vn',           // no video
      '-sn',           // no subtitle
      '-dn',           // no data streams
      '-map', '0:a:0', // first audio track only
      '-c:a', 'copy',  // copy audio codec (fast, no re-encode)
      '-y',            // overwrite if exists
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

/**
 * Synchronizes subtitle timing to the video using alass-cli.
 *
 * Runs: `alass-cli <audioPath> <inputSubPath> <outputSubPath>`
 * Pre-extracts audio to avoid MKV attachment stream incompatibility with alass.
 *
 * @param videoPath     - Source video file (used for timing reference)
 * @param inputSubPath  - Unsynchronized subtitle file
 * @param outputSubPath - Destination for the re-timed subtitle
 * @param timeoutMs     - Kill the alass process after this many ms (default 120 s)
 */
export async function syncSubtitle(
  videoPath: string,
  inputSubPath: string,
  outputSubPath: string,
  timeoutMs = 120_000
): Promise<void> {
  const binaryPath = getAlassBinaryPath()
  const ffmpegPath = getFfmpegPath()
  const ffprobeBinDir = getFfprobeBinDir()

  const ffmpegBinDir = path.dirname(ffmpegPath)

  console.log(`[Alass] Binary:    ${binaryPath}`)
  console.log(`[Alass] ffprobe:   ${ffprobeBinDir}`)
  console.log(`[Alass] ffmpeg:    ${ffmpegBinDir}`)
  console.log(`[Alass] Video:     ${videoPath}`)
  console.log(`[Alass] Input:     ${inputSubPath}`)
  console.log(`[Alass] Output:    ${outputSubPath}`)

  // Alass fails on MKV files with embedded font attachments (no codec_long_name).
  // Workaround: extract audio-only to a temp file — no attachment streams, alass works fine.
  const tempAudio = await extractAudio(videoPath, ffmpegPath)

  try {
    await runAlass(binaryPath, tempAudio, inputSubPath, outputSubPath, ffprobeBinDir, ffmpegBinDir, timeoutMs)
  } finally {
    // Always clean up the temp audio file
    try {
      fs.unlinkSync(tempAudio)
      console.log(`[Alass] Cleaned up temp audio: ${tempAudio}`)
    } catch {
      /* ignore */
    }
  }
}

/**
 * Runs alass-cli as a child process.
 * Uses --split-penalty 30 (vs default 10) to make alass more conservative about
 * splitting subtitle blocks — reduces wild multi-block divergence.
 * After completion, validates that no block has a shift > MAX_SHIFT_SECS;
 * if validation fails, rejects so the caller falls back to the unsynced subtitle.
 */
function runAlass(
  binaryPath: string,
  referencePath: string,
  inputSubPath: string,
  outputSubPath: string,
  ffprobeBinDir: string,
  ffmpegBinDir: string,
  timeoutMs: number
): Promise<void> {
  // If any single block shifts by more than this, treat sync as unreliable
  const MAX_SHIFT_SECS = 30

  // Alass calls both `ffprobe` AND `ffmpeg` by name — both dirs must be on PATH.
  const childEnv = {
    ...process.env,
    PATH: `${ffmpegBinDir}${path.delimiter}${ffprobeBinDir}${path.delimiter}${process.env.PATH ?? ''}`
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(
      binaryPath,
      [
        referencePath,
        inputSubPath,
        outputSubPath,
        '--split-penalty', '30'  // conservative: fewer, smaller blocks
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: childEnv
      }
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

      // Validate: scan stdout for block shift lines and reject if any shift > threshold.
      // Alass prints: "shifted block of N subtitles ... by ±H:MM:SS.mmm"
      const combined = stdout + stderr
      const shiftRegex = /by\s+(-?)(\d+):(\d{2}):(\d{2})/g
      let match: RegExpExecArray | null
      let maxShiftSecs = 0
      while ((match = shiftRegex.exec(combined)) !== null) {
        const h = parseInt(match[2])
        const m = parseInt(match[3])
        const s = parseInt(match[4])
        const total = h * 3600 + m * 60 + s
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
