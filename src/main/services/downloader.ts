import axios from 'axios'
import fs from 'fs'

import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

export class Downloader {
  async downloadFile(url: string, destinationPath: string) {
    try {
      const response = await axios.get(url, {
        responseType: 'stream'
      })

      await streamPipeline(response.data, fs.createWriteStream(destinationPath))

      return { success: true, headers: response.headers }
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
  }
}
