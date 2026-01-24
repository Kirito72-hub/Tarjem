import fs from 'fs';
import crypto from 'crypto';

export class HashCalculator {
  /**
   * Calculates MD5 hash of a file for subtitle matching.
   * OpenSubtitles and other providers often use a specific hash of the first and last 64kb
   * but for general file identification we'll start with full MD5 or partial MD5.
   * 
   * For standard subtitle hashing (OpenSubtitles Hash), we need a specific algorithm.
   * But let's start with a standard MD5 stream for now, or just file size + name if typical hashing is too slow.
   */
  async calculateMD5(filePath: string, onProgress?: (percentage: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const stream = fs.createReadStream(filePath);
      const hash = crypto.createHash('md5');
      let readBytes = 0;

      stream.on('data', (chunk) => {
        readBytes += chunk.length;
        hash.update(chunk);
        if (onProgress) {
            onProgress(Math.round((readBytes / fileSize) * 100));
        }
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
}
