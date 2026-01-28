import { SubtitleProvider, SubtitleResult } from './types'
import { MetadataResult } from '../metadataApi'
import { OpenSubtitlesService, SubDLService } from '../subtitleApi'

export class OpenSubtitlesAdapter implements SubtitleProvider {
  readonly id = 'opensubtitles'
  readonly name = 'OpenSubtitles'
  
  constructor(private service: OpenSubtitlesService) {}

  async search(query: string, metadata: MetadataResult, language: string): Promise<SubtitleResult[]> {
    try {
      // Use metadata if available, otherwise just query
      const results = await this.service.search(query, language, metadata.imdbId)
      return results?.data || []
    } catch (e) {
      console.error('[OpenSubtitlesAdapter] Search Error:', e)
      return []
    }
  }

  async searchByHash(hash: string, language: string): Promise<SubtitleResult[]> {
    try {
      const results = await this.service.searchByHash(hash, language)
      return results?.data || []
    } catch (e) {
      console.error('[OpenSubtitlesAdapter] Hash Search Error:', e)
      return []
    }
  }

  async getDownloadLink(id: string): Promise<string> {
    const numericId = parseInt(id.replace('opensubtitles://', ''), 10)
    const data = await this.service.getDownloadLink(numericId)
    return data.link
  }
}

export class SubDLAdapter implements SubtitleProvider {
  readonly id = 'subdl'
  readonly name = 'SubDL'

  constructor(private service: SubDLService) {}

  async search(query: string, metadata: MetadataResult, language: string): Promise<SubtitleResult[]> {
    try {
      const params: any = {
          query: metadata.title || query,
          language,
          type: metadata.type || 'movie',
          startSeason: metadata.season,
          startEpisode: metadata.episode,
          imdbId: metadata.imdbId,
          tmdbId: metadata.tmdbId
      }
      const res = await this.service.search(params)
      return res?.results || []
    } catch (e) {
      console.error('[SubDLAdapter] Search Error:', e)
      return []
    }
  }
  
  async getDownloadLink(id: string): Promise<string> {
      // SubDL usually returns direct links in search results
      return id
  }
}
