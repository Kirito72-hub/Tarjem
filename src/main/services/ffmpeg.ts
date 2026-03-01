import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { app } from 'electron'
import path from 'path'

export class FFmpegService {
  private ffmpegPath: string | null = null

  constructor() {
    this.init()
  }

  private init() {
    try {
      // Determine FFmpeg path based on environment
      if (app.isPackaged) {
        // In production, ffmpeg-static is not available in node_modules usually
        // It should be bundled into extraResources or similar
        // For now, let's assume standard behavior of similar apps:
        // We'll trust ffmpeg-static if it returns a valid path, or fallback to a bundled location
        this.ffmpegPath = ffmpegStatic?.replace('app.asar', 'app.asar.unpacked') || null
      } else {
        // In development, use ffmpeg-static from node_modules
        this.ffmpegPath = ffmpegStatic
      }

      if (this.ffmpegPath) {
        ffmpeg.setFfmpegPath(this.ffmpegPath)
        console.log('FFmpeg initialized with path:', this.ffmpegPath)
      } else {
        console.error('FFmpeg binary not found!')
      }
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error)
    }
  }

  public getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) {
        reject(new Error('FFmpeg not initialized'))
        return
      }

      ffmpeg().getAvailableFormats((err, _formats) => {
        if (err) {
          reject(err)
        } else {
          resolve('FFmpeg is ready')
        }
      })
    })
  }

  // Helper to create a command instance
  public createCommand(): ffmpeg.FfmpegCommand {
    if (!this.ffmpegPath) {
      throw new Error('FFmpeg not initialized')
    }
    return ffmpeg()
  }

  public mergeMedia(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) {
        reject(new Error('FFmpeg not initialized'))
        return
      }

      console.log(`Starting merge: ${videoPath} + ${subtitlePath} -> ${outputPath}`)

      const command = this.createCommand()

      command
        .input(videoPath)
        .input(subtitlePath)
        // Map video and audio streams from input 0 (video file)
        // Map ALL streams from input 0 (video, audio, attachments/fonts)
        .outputOptions('-map 0')
        // But exclude existing subtitles from input 0
        .outputOptions('-map -0:s')

        // Map the new subtitle from input 1
        .outputOptions('-map 1:0')
        .outputOptions('-c copy') // Base: copy everything
        .outputOptions('-max_interleave_delta 0') // Fix potential buffering issues
        // Subtitle codec handled below based on extension
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('Spawned Ffmpeg with command: ' + commandLine)
        })
        .on(
          'progress',
          (() => {
            // Throttle progress updates to prevent UI flickering
            let lastProgress = -1
            let lastUpdate = 0
            return (progress: { percent?: number }) => {
              if (onProgress && progress.percent) {
                const now = Date.now()
                const currentProgress = Math.round(progress.percent)
                // Only update if progress changed by at least 1% or 100ms elapsed
                if (
                  currentProgress !== lastProgress &&
                  (currentProgress - lastProgress >= 1 || now - lastUpdate >= 100)
                ) {
                  lastProgress = currentProgress
                  lastUpdate = now
                  onProgress(currentProgress)
                }
              }
            }
          })()
        )
        .on('error', (err) => {
          console.error('An error occurred: ' + err.message)
          reject(err)
        })
        .on('end', () => {
          console.log('Processing finished !')
          resolve()
        })

      // Special logic for subtitle codec based on output container
      const outExt = path.extname(outputPath).toLowerCase()
      if (outExt === '.mp4') {
        // MP4 container usually prefers mov_text for soft subs
        command.outputOptions('-c:s mov_text')
        command.outputOptions('-metadata:s:s:0 language=ara') // Set Arabic language tag
      } else if (outExt === '.mkv') {
        // MKV container supports almost all subtitle formats
        // If input is .ass/.ssa, use copy to preserve advanced styling
        const subExt = path.extname(subtitlePath).toLowerCase()
        if (subExt === '.ass' || subExt === '.ssa') {
          command.outputOptions('-c:s copy')
        } else {
          // Default to subrip for SRT and others to ensure compatibility
          command.outputOptions('-c:s subrip')
        }
        command.outputOptions('-metadata:s:s:0 language=ara') // Set Arabic language tag
      } else {
        // Default fallback
        command.outputOptions('-c:s mov_text')
        command.outputOptions('-metadata:s:s:0 language=ara')
      }

      command.run()
    })
  }
}
