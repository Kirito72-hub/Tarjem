import { MetadataResult } from '../metadataApi'

export interface SubtitleResult {
  id: string
  url: string
  source: string
  language: string
  format: string // 'srt' | 'ass'
  filename?: string
  downloads?: number
  rating?: number
  isAnime?: boolean
  owner?: string
  hi?: boolean
  subtitleType?: string
  caption?: string
}

export interface SubtitleProvider {
  /**
   * Unique identifier for the provider (e.g., 'opensubtitles', 'subdl', 'animeslayer')
   */
  readonly id: string

  /**
   * Display name of the provider
   */
  readonly name: string

  /**
   * Search for subtitles based on query, metadata, and language
   */
  search(
    query: string,
    metadata: MetadataResult,
    language: string
  ): Promise<SubtitleResult[]>

  /**
   * Resolve a detailed download link given a subtitle ID (if necessary)
   */
  getDownloadLink(id: string): Promise<string>

  /**
   * Search by file hash (optional)
   */
  searchByHash?(hash: string, language: string): Promise<SubtitleResult[]>
}
