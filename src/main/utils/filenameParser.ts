export interface ParsedFilename {
  title: string
  year?: number
  season?: number
  episode?: number
  type?: 'movie' | 'tv'
  isAnime?: boolean
  cleanTitle: string // Title without tags and quality info
}

/**
 * Parse filename to extract metadata
 */
export function parseFilename(filename: string): ParsedFilename {
  let working = filename

  // Remove file extension
  working = working.replace(/\.(mkv|mp4|avi|mp3|wav|flac|aac|wma|wmv|mov|flv|webm)$/i, '')

  // Extract year (1900-2099)
  let year: number | undefined
  const yearMatch = working.match(/[\[\(. ]([12][09]\d{2})[\]\). ]/)
  if (yearMatch) {
    year = parseInt(yearMatch[1])
    working = working.replace(yearMatch[0], ' ')
  }

  // Extract season and episode
  let season: number | undefined
  let episode: number | undefined
  let type: 'movie' | 'tv' | undefined

  // Remove release group tags [Group], (Group) - DO THIS FIRST to avoid false positives
  working = working.replace(/\[.*?\]/g, ' ')
  working = working.replace(/\((?![\d]{4})[^\)]*\)/g, ' ') // Keep year in parentheses

  // Remove qualities and resolutions
  working = working.replace(/\d{3,4}x\d{3,4}/g, ' ') // 1920x1080
  working = working.replace(/\d{3,4}p/gi, ' ') // 1080p, 720p
  working = working.replace(
    /\b(BD|BluRay|WEB-?DL|HDTV|DVDRip|BRRip|x264|x265|HEVC|10bit|8bit|AAC|AC3|DTS|FLAC)\b/gi,
    ' '
  )

  // Pattern: S01E06, S1E6
  const s_e_match = working.match(/S(\d{1,2})E(\d{1,2})/i)
  if (s_e_match) {
    season = parseInt(s_e_match[1])
    episode = parseInt(s_e_match[2])
    type = 'tv'
    working = working.replace(s_e_match[0], ' ')
  }

  // Pattern: 1x06
  if (!season && !episode) {
    const x_match = working.match(/(\d{1,2})x(\d{1,2})/i)
    if (x_match) {
      season = parseInt(x_match[1])
      episode = parseInt(x_match[2])
      type = 'tv'
      working = working.replace(x_match[0], ' ')
    }
  }

  // Pattern: - 06 (at end, likely episode number)
  if (!episode) {
    const dash_ep_match = working.match(/\s*-\s*(\d{1,2})\s*$/)
    if (dash_ep_match) {
      episode = parseInt(dash_ep_match[1])
      type = 'tv'
      working = working.replace(dash_ep_match[0], '')
    }
  }

  // Pattern: Episode 06, EP 06, E06
  if (!episode) {
    const ep_match = working.match(/\b(?:Episode|EP|E)\s*(\d{1,2})\b/i)
    if (ep_match) {
      episode = parseInt(ep_match[1])
      type = 'tv'
      working = working.replace(ep_match[0], '')
    }
  }

  // Replace dots, underscores with spaces
  working = working.replace(/[._]/g, ' ')

  // Collapse multiple spaces
  working = working.replace(/\s+/g, ' ').trim()

  // If no type detected yet, leave as undefined (ambiguous)
  // This allows the caller (like manual search) to decide or search for 'all'
  // if (!type) {
  //   type = 'movie'
  // }

  // Detect if this is anime
  const isAnime = detectAnime(filename)

  const result = {
    title: working,
    year,
    season,
    episode,
    type,
    isAnime,
    cleanTitle: working
  }

  console.log(`[FilenameParser] Parsed "${filename}" ->`, JSON.stringify(result))
  return result
}

/**
 * Detect if filename is anime based on various patterns
 */
function detectAnime(filename: string): boolean {
  // Common anime release groups
  const animeGroups = [
    'SubsPlease',
    'Erai-raws',
    'HorribleSubs',
    'Commie',
    'FFF',
    'Underwater',
    'GJM',
    'Asenshi',
    'Doki',
    'UTW',
    'Coalgirls',
    'Tsundere',
    'Chihiro',
    'Vivid',
    'DameDesuYo',
    'Anime-Koi',
    'Kaitou',
    'Leopard-Raws',
    'Ohys-Raws',
    'ANK-Raws'
  ]

  // Check for anime release groups
  for (const group of animeGroups) {
    if (filename.includes(`[${group}]`) || filename.includes(`(${group})`)) {
      return true
    }
  }

  // Check for anime-specific patterns
  // Pattern: [1080p] or (1080p) in brackets (common in anime)
  if (/\[[0-9]{3,4}p\]/.test(filename) || /\(([0-9]{3,4}p)\)/.test(filename)) {
    return true
  }

  // Pattern: [HEVC] or [x265] in brackets (common in anime)
  if (/\[(HEVC|x265|10bit|Hi10P)\]/i.test(filename)) {
    return true
  }

  // Pattern: Episode numbering like "- 01" or "- 12" (very common in anime)
  if (/\s-\s\d{2}(?:\s|\.|$)/.test(filename)) {
    return true
  }

  // Pattern: Multiple bracketed tags (common in anime)
  const bracketCount = (filename.match(/\[.*?\]/g) || []).length
  if (bracketCount >= 3) {
    return true
  }

  return false
}

/**
 * Clean filename for simple text search (legacy)
 */
export function cleanFilename(filename: string): string {
  const parsed = parseFilename(filename)
  return parsed.cleanTitle
}
