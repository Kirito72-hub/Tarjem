import { parseFileName } from 'anime-name-tool'
import type { ParsedMedia } from './parserTypes'

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export function parseWithAnimeTool(filename: string): Partial<ParsedMedia> {
  try {
    const result = parseFileName(filename)

    const title = typeof result.title === 'string' ? result.title.trim() : ''
    const parsed: Partial<ParsedMedia> = {
      title: title || filename,
      cleanTitle: normalizeTitle(title || filename),
      parserUsed: 'anime-name-tool'
    }

    if (result.episode !== null && result.episode !== undefined) {
      let epNum: number | undefined
      if (typeof result.episode === 'number') {
        epNum = result.episode
      } else if (typeof result.episode === 'string') {
        epNum = parseInt(result.episode, 10)
      } else if (Array.isArray(result.episode) && result.episode.length > 0) {
        epNum = result.episode[0]
      }
      if (epNum !== undefined && !isNaN(epNum)) parsed.episode = epNum
    }

    const season = (result as unknown as Record<string, unknown>).season
    if (typeof season === 'number' && !isNaN(season)) {
      parsed.season = season
    }

    return parsed
  } catch {
    return {}
  }
}
