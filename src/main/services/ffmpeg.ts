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
}
