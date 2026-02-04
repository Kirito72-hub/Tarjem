/**
 * Unified Media Filename Parser using guessit-js (WASM)
 * Replaces the old regex-based filenameParser.ts
 *
 * Used for:
 * 1. Video filename parsing (for search queries)
 * 2. Subtitle filename parsing (for matching)
 * 3. ZIP entry parsing (for finding correct subtitle file)
 */

import { guessit } from 'guessit-js'
import { parseFileName } from 'anime-name-tool'

// ... (rest of imports)

export interface ParsedMedia {
  title: string
  cleanTitle: string // Normalized title for search
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
  // Original filename for reference
  originalFilename: string
}

// Anime release groups that indicate anime content
const ANIME_GROUPS = [
  'subsplease',
  'erai-raws',
  'horriblesubs',
  'commie',
  'doki',
  'coalgirls',
  'cleo',
  'judas',
  'ember',
  'anime time',
  'animetosho',
  'nyaa',
  'a-s',
  'asenshi',
  'chihiro',
  'dmonhiro',
  'elysium',
  'fff',
  'gg',
  'horrible',
  'kira',
  'mezashite',
  'mori',
  'nep',
  'ohys-raws',
  'piyoko',
  'saizen',
  'sakurablossom',
  'senketsu',
  'shitstainsubs',
  'thora',
  'underwater',
  'vivid',
  'watashi',
  'yabai',
  'zafkiel',
  'zentreya'
]

// Anime-style naming patterns
const ANIME_PATTERNS = [
  /^\[.*?\]/, // [SubGroup] at start
  /\[.*?(?:1080p|720p|480p).*?\]/, // [1080p] style tags
  /\[[A-F0-9]{8}\]$/i // CRC hash at end
]

/**
 * Detect if a filename is likely anime based on naming conventions
 */
function detectAnime(filename: string, releaseGroup?: string): boolean {
  // Check release group
  if (releaseGroup) {
    const groupLower = releaseGroup.toLowerCase()
    if (ANIME_GROUPS.some((g) => groupLower.includes(g))) {
      return true
    }
  }

  // Check naming patterns
  return ANIME_PATTERNS.some((pattern) => pattern.test(filename))
}

/**
 * Normalize title for search queries
 * - Lowercase
 * - Remove special characters
 * - Collapse whitespace
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[._-]/g, ' ') // Replace separators with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim()
}

/**
 * Parse a media filename using guessit-js
 *
 * @param filename - The filename to parse (with or without extension)
 * @param forceType - Optional: force parsing as 'movie' or 'episode'
 * @returns ParsedMedia object with extracted metadata
 */
export function parseMediaFilename(filename: string, forceType?: 'movie' | 'episode'): ParsedMedia {
  // Use guessit to parse
  const options: { type?: 'movie' | 'episode' } = {}
  if (forceType) {
    options.type = forceType
  }

  const result = guessit(filename, options)

  // Extract title - guessit returns it as 'title' (string or array)
  let rawTitle: string | undefined

  if (Array.isArray(result.title)) {
    rawTitle = result.title.join(' ')
  } else if (typeof result.title === 'string') {
    rawTitle = result.title
  }

  // Sanity check: if title looks like garbage (e.g. "with subtitles"), ignore it
  if (rawTitle && /^(with subtitles|subbed|hardsub|softsub)$/i.test(rawTitle)) {
    rawTitle = undefined
  }

  const title = rawTitle || extractFallbackTitle(filename)

  // Determine type
  let type: 'movie' | 'episode' | undefined
  if (result.type === 'episode' || result.season !== undefined || result.episode !== undefined) {
    type = 'episode'
  } else if (result.type === 'movie') {
    type = 'movie'
  }

  // Build ParsedMedia object
  const parsed: ParsedMedia = {
    title,
    cleanTitle: normalizeTitle(title || ''),
    originalFilename: filename,
    type
  }

  // Add optional fields if present
  if (result.year !== undefined) {
    parsed.year = result.year as number
  }

  if (result.season !== undefined) {
    // Handle array (multi-season) - take first
    parsed.season = Array.isArray(result.season)
      ? (result.season[0] as number)
      : (result.season as number)
  }

  if (result.episode !== undefined) {
    // Handle array (multi-episode) - take first
    parsed.episode = Array.isArray(result.episode)
      ? (result.episode[0] as number)
      : (result.episode as number)
  }

  if (result.episode_title) {
    parsed.episodeTitle = result.episode_title as string
  }

  // Handle release group (string or array)
  if (result.release_group) {
    if (Array.isArray(result.release_group)) {
      parsed.releaseGroup = result.release_group[0] // Take first if array
    } else if (typeof result.release_group === 'string') {
      parsed.releaseGroup = result.release_group
    }
  }

  if (result.source) {
    parsed.source = result.source as string
  }

  if (result.screen_size) {
    parsed.resolution = result.screen_size as string
  }

  if (result.container) {
    parsed.container = result.container as string
  }

  // Detect anime
  parsed.isAnime = detectAnime(filename, parsed.releaseGroup)

    // Fallback: If season/episode are missing, try anime-name-tool (specialized for Anime)
    if (parsed.episode === undefined) {
      try {
        const animeParsed = parseFileName(filename)
        if (animeParsed.episode !== null) {
          if (typeof animeParsed.episode === 'number') {
            parsed.episode = animeParsed.episode
          } else if (typeof animeParsed.episode === 'string') {
             parsed.episode = parseInt(animeParsed.episode, 10)
          } else if (Array.isArray(animeParsed.episode) && animeParsed.episode.length > 0) {
             parsed.episode = animeParsed.episode[0]
          }
        }
        // Also grab title if missing? No, guessit usually gets title.
      } catch (e) {
        // failed
      }
    }

    // Manual Regex Fallbacks (Last Resort)
    if (parsed.season === undefined || parsed.episode === undefined) {
        // Pattern: [S2 - 01] or S2 - 01
        const seasonEpMatch = filename.match(/S(\d+)\s*-\s*(\d+)/i)

    if (seasonEpMatch) {
       if (parsed.season === undefined) parsed.season = parseInt(seasonEpMatch[1], 10)
       if (parsed.episode === undefined) parsed.episode = parseInt(seasonEpMatch[2], 10)
    }

    // Pattern: S02 E03
    if (parsed.season === undefined || parsed.episode === undefined) {
      const s00e00 = filename.match(/S(\d+)\s*E(\d+)/i)
      if (s00e00) {
        if (parsed.season === undefined) parsed.season = parseInt(s00e00[1], 10)
        if (parsed.episode === undefined) parsed.episode = parseInt(s00e00[2], 10)
      }
    }
    
    // Pattern: SxEE
    if (parsed.season === undefined || parsed.episode === undefined) {
        const sxee = filename.match(/(\d+)x(\d+)/)
        if (sxee) {
            if (parsed.season === undefined) parsed.season = parseInt(sxee[1], 10)
            if (parsed.episode === undefined) parsed.episode = parseInt(sxee[2], 10)
        }
    }


  }

  return parsed
}

/**
 * Fallback title extraction when guessit fails
 */
function extractFallbackTitle(filename: string): string {
  let working = filename

  // Remove extension
  working = working.replace(/\.(mkv|mp4|avi|srt|ass|vtt|sub|ssa)$/i, '')

  // Remove release group at start [SubGroup]
  working = working.replace(/^\[.*?\]\s*/, '')

  // Remove quality tags and other noise at end
  working = working.replace(/\s*[\[(].*?[\])]\s*$/, '')

  // Normalize separators
  working = working.replace(/[._]/g, ' ')

  // Remove S01E01 style patterns
  working = working.replace(/\s*S\d{1,2}E\d{1,3}.*/i, '')

  // Remove " - 01" style patterns
  working = working.replace(/\s*-\s*\d{1,3}(?:\s|$).*/i, '')

  return working.trim() || filename
}

/**
 * Check if two parsed media objects match for subtitle pairing
 *
 * @param video - Parsed video metadata
 * @param subtitle - Parsed subtitle metadata
 * @returns Object with match result and score
 */
export function checkMediaMatch(
  video: ParsedMedia,
  subtitle: ParsedMedia
): { matches: boolean; score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // Episode match is critical for TV shows
  if (video.episode !== undefined && subtitle.episode !== undefined) {
    if (video.episode !== subtitle.episode) {
      return {
        matches: false,
        score: 0,
        reason: `Episode mismatch: video=${video.episode}, sub=${subtitle.episode}`
      }
    }
    score += 50
    reasons.push(`Episode match: ${video.episode}`)
  }

  // Season match
  if (video.season !== undefined && subtitle.season !== undefined) {
    if (video.season !== subtitle.season) {
      return {
        matches: false,
        score: 0,
        reason: `Season mismatch: video=${video.season}, sub=${subtitle.season}`
      }
    }
    score += 30
    reasons.push(`Season match: ${video.season}`)
  }

  // Title similarity (simple check for now)
  const videoTitleLower = video.cleanTitle.toLowerCase()
  const subTitleLower = subtitle.cleanTitle.toLowerCase()

  if (videoTitleLower === subTitleLower) {
    score += 20
    reasons.push('Exact title match')
  } else if (videoTitleLower.includes(subTitleLower) || subTitleLower.includes(videoTitleLower)) {
    score += 10
    reasons.push('Partial title match')
  }

  return {
    matches: score >= 50,
    score,
    reason: reasons.join(', ') || 'No strong match'
  }
}

/**
 * Find the best matching subtitle file from a list of candidates
 *
 * @param videoInfo - Parsed video metadata
 * @param subtitleFilenames - List of subtitle filenames to check
 * @returns Best matching filename or null
 */
export function findBestSubtitleMatch(
  videoInfo: ParsedMedia,
  subtitleFilenames: string[]
): { filename: string; parsed: ParsedMedia; score: number } | null {
  const candidates: { filename: string; parsed: ParsedMedia; score: number }[] = []

  for (const filename of subtitleFilenames) {
    const parsed = parseMediaFilename(filename, 'episode')
    const match = checkMediaMatch(videoInfo, parsed)

    if (match.matches) {
      candidates.push({
        filename,
        parsed,
        score: match.score
      })
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  return candidates[0]
}

// Re-export for compatibility
export type { ParsedMedia as ParsedFilename }
