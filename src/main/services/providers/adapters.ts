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
      // String Sanitization. Prioritize canonical English title if mapped.
      const primaryTitle = (metadata as any).canonicalTitle || metadata.title || query
      const sanitizedQuery = primaryTitle.replace(/[-_]+$/, '').trim()
      let results = await this.service.search(sanitizedQuery, language, metadata.imdbId)

      // Fallback Search using raw query or fallbackTitle
      if (
        (!results || !results.data || results.data.length === 0) &&
        (metadata.fallbackTitle || query !== primaryTitle)
      ) {
        const fallback = (metadata.fallbackTitle || query).replace(/[-_]+$/, '').trim()
        console.log(
          `[OpenSubtitlesAdapter] No results for "${sanitizedQuery}", falling back to "${fallback}"`
        )
        results = await this.service.search(fallback, language, metadata.imdbId)
      }

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
      // String Sanitization. Prioritize canonical English title if mapped.
      const primaryTitle = (metadata as any).canonicalTitle || metadata.title || query
      const sanitizedQuery = primaryTitle.replace(/[-_]+$/, '').trim()

      const params: any = {
        query: sanitizedQuery,
        language,
        type: metadata.type || 'movie',
        startSeason: metadata.season ? Math.floor(metadata.season) : undefined,
        startEpisode: metadata.episode ? Math.floor(metadata.episode) : undefined,
        imdbId: metadata.imdbId,
        tmdbId: metadata.tmdbId
      }

      let res = await this.service.search(params)

      // Fallback Search
      if (
        (!res || !res.results || res.results.length === 0) &&
        (metadata.fallbackTitle || query !== primaryTitle)
      ) {
        const fallback = (metadata.fallbackTitle || query).replace(/[-_]+$/, '').trim()
        console.log(
          `[SubDLAdapter] No results for query "${sanitizedQuery}", falling back to "${fallback}"`
        )
        res = await this.service.search({ ...params, query: fallback })
      }
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
