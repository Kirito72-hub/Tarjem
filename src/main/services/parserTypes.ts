export interface ParsedMedia {
  title: string
  cleanTitle: string
  year?: number
  season?: number
  episode?: number
  episodeTitle?: string
  type?: 'movie' | 'episode'
  isAnime?: boolean
  releaseGroup?: string
  source?: string
  resolution?: string
  container?: string
  originalFilename: string
  parserUsed?: string
  anilistVerified?: boolean
  canonicalTitle?: string
}
