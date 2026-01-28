import fs from 'fs'

export class HashCalculator {
  /**
   * Calculates OpenSubtitles MovieHash (64k chunks).
   *
   * The hash is calculated by taking 64kb from the beginning and 64kb from the end of the file.
   * If the file is smaller than 64kb, the hash is calculated by reading the entire file.
   */
  async calculateHash(filePath: string): Promise<string> {
    const stats = await fs.promises.stat(filePath)
    const fileSize = stats.size
    const chunkSize = 65536

    const fd = await fs.promises.open(filePath, 'r')

    try {
      let hash = BigInt(fileSize)

      const processChunk = async (position: number) => {
        const buffer = Buffer.alloc(chunkSize)
        const { bytesRead } = await fd.read(buffer, 0, chunkSize, position)

        for (let i = 0; i < bytesRead; i += 8) {
          if (i + 8 > bytesRead) break
          const val = buffer.readBigUInt64LE(i)
          hash = (hash + val) & 0xffffffffffffffffn
        }
      }

      await processChunk(0)
      await processChunk(Math.max(0, fileSize - chunkSize))

      return hash.toString(16).padStart(16, '0')
    } finally {
      await fd.close()
    }
  }
}
