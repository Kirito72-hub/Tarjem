import { SubtitleProvider, SubtitleResult } from './types'
import { MetadataResult } from '../metadataApi'
import { OpenSubtitlesService, SubDLService } from '../subtitleApi'

export class OpenSubtitlesAdapter implements SubtitleProvider {
  readonly id = 'opensubtitles'
  readonly name = 'OpenSubtitles'

  constructor(private service: OpenSubtitlesService) {}

  async search(
    query: string,
    metadata: MetadataResult,
    language: string
  ): Promise<SubtitleResult[]> {
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

  async search(
    query: string,
    metadata: MetadataResult,
    language: string
  ): Promise<SubtitleResult[]> {
    try {
      const searchTitle = metadata.title || query
      const params: any = {
        query: searchTitle,
        language,
        type: metadata.type || 'movie',
        startSeason: metadata.season,
        startEpisode: metadata.episode,
        imdbId: metadata.imdbId,
        tmdbId: metadata.tmdbId
      }
      const res = await this.service.search(params)
      const results = res?.results || []

      // If search returned results, we're done
      if (results.length > 0) return results

      // If the metadata title differs from the original query (e.g., AniList romaji vs English),
      // retry with the original query as fallback
      if (searchTitle !== query && query && query.trim().length > 0) {
        console.log(`[SubDLAdapter] No results for "${searchTitle}", retrying with original query: "${query}"`)
        const fallbackRes = await this.service.search({ ...params, query })
        return fallbackRes?.results || []
      }

      return results
    } catch (e) {
      // If the primary search threw an error AND we have an alternative query, try it
      const searchTitle = metadata.title || query
      if (searchTitle !== query && query && query.trim().length > 0) {
        console.log(`[SubDLAdapter] Error with "${searchTitle}", retrying with original query: "${query}"`)
        try {
          const params: any = {
            query,
            language,
            type: metadata.type || 'movie',
            startSeason: metadata.season,
            startEpisode: metadata.episode
          }
          const fallbackRes = await this.service.search(params)
          return fallbackRes?.results || []
        } catch (e2) {
          console.error('[SubDLAdapter] Fallback also failed:', e2)
        }
      }
      console.error('[SubDLAdapter] Search Error:', e)
      return []
    }
  }

  async getDownloadLink(id: string): Promise<string> {
    // SubDL usually returns direct links in search results
    return id
  }
}
