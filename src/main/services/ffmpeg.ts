import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { app } from 'electron';
import path from 'path';

export class FFmpegService {
  private ffmpegPath: string | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      // Determine FFmpeg path based on environment
      if (app.isPackaged) {
        // In production, ffmpeg-static is not available in node_modules usually
        // It should be bundled into extraResources or similar
        // For now, let's assume standard behavior of similar apps: 
        // We'll trust ffmpeg-static if it returns a valid path, or fallback to a bundled location
        this.ffmpegPath = ffmpegStatic?.replace('app.asar', 'app.asar.unpacked') || null;
      } else {
        // In development, use ffmpeg-static from node_modules
        this.ffmpegPath = ffmpegStatic;
      }

      if (this.ffmpegPath) {
        ffmpeg.setFfmpegPath(this.ffmpegPath);
        console.log('FFmpeg initialized with path:', this.ffmpegPath);
      } else {
        console.error('FFmpeg binary not found!');
      }
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
    }
  }

  public getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) {
        reject(new Error('FFmpeg not initialized'));
        return;
      }

      ffmpeg()
        .getAvailableFormats((err, formats) => {
          if (err) {
            reject(err);
          } else {
            resolve('FFmpeg is ready');
          }
        });
    });
  }

  // Helper to create a command instance
  public createCommand(): ffmpeg.FfmpegCommand {
    if (!this.ffmpegPath) {
      throw new Error('FFmpeg not initialized');
    }
    return ffmpeg();
  }

  public mergeMedia(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) {
        reject(new Error('FFmpeg not initialized'));
        return;
      }

      console.log(`Starting merge: ${videoPath} + ${subtitlePath} -> ${outputPath}`);

      const command = this.createCommand();

      command
        .input(videoPath)
        .input(subtitlePath)
        .outputOptions('-c copy') // Copy video and audio streams without re-encoding
        .outputOptions('-c:s mov_text') // Encode subtitles for compatibility (mp4 container usually needs mov_text)
        // If output is mkv, -c:s srt might be better, or just -c copy if srt
        // For now, let's play safe for mp4 output primarily or generic.
        // Actually, let's be smarter. If output is MKV, we can copy subs.
        // If MP4, we often need mov_text.
        // Let's check extension.
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(Math.round(progress.percent));
          }
        })
        .on('error', (err) => {
          console.error('An error occurred: ' + err.message);
          reject(err);
        })
        .on('end', () => {
          console.log('Processing finished !');
          resolve();
        });

      // Special logic for subtitle codec based on output container
      const outExt = path.extname(outputPath).toLowerCase();
      if (outExt === '.mp4') {
          // MP4 container usually prefers mov_text for soft subs
          command.outputOptions('-c:s mov_text'); 
      } else if (outExt === '.mkv') {
          // MKV can take almost anything, copy is safe
          command.outputOptions('-c:s copy');
      }

      command.run();
    });
  }
}
