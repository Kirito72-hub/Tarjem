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

      ffmpeg().getAvailableFormats((err, formats) => {
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
        .outputOptions('-map 0:v') // Map all video streams
        .outputOptions('-map 0:a') // Map all audio streams
        // Map subtitle from input 1 (subtitle file)
        .outputOptions('-map 1:0') // Map the subtitle
        .outputOptions('-c:v copy') // Copy video without re-encoding
        .outputOptions('-c:a copy') // Copy audio without re-encoding
        // Subtitle codec handled below based on extension
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('Spawned Ffmpeg with command: ' + commandLine)
        })
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(Math.round(progress.percent))
          }
        })
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
        // MKV can handle any subtitle format - copy to preserve original styling
        command.outputOptions('-c:s copy')
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
