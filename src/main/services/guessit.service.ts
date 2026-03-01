import { guessit } from 'guessit-js'
import type { ParsedMedia } from './parserTypes'

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export function parseWithGuessit(filename: string): Partial<ParsedMedia> {
  const result = guessit(filename, { type: 'episode' })

  let title = ''
  if (Array.isArray(result.title)) {
    title = result.title.join(' ')
  } else if (typeof result.title === 'string') {
    title = result.title
  }

  if (/^(with subtitles|subbed|hardsub|softsub)$/i.test(title)) {
    title = ''
  }

  const parsed: Partial<ParsedMedia> = {
    title: title || filename,
    cleanTitle: normalizeTitle(title || filename),
    parserUsed: 'guessit'
  }

  if (result.year !== undefined) parsed.year = result.year as number
  if (result.season !== undefined) {
    parsed.season = Array.isArray(result.season)
      ? (result.season[0] as number)
      : (result.season as number)
  }
  if (result.episode !== undefined) {
    parsed.episode = Array.isArray(result.episode)
      ? (result.episode[0] as number)
      : (result.episode as number)
  }

  if (result.release_group) {
    parsed.releaseGroup = Array.isArray(result.release_group)
      ? result.release_group[0]
      : (result.release_group as string)
  }

  if (result.screen_size) parsed.resolution = result.screen_size as string
  if (result.source) parsed.source = result.source as string
  if (result.container) parsed.container = result.container as string

  const rangeMatch = filename.match(/[\[（(]\s*(\d{1,4})\s*-\s*(\d{1,4})\s*[\]）)]/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    if (!isNaN(start) && !isNaN(end) && end > start) {
      if (parsed.episode === start || parsed.episode === end) {
        parsed.episode = undefined
      }
    }
  }

  return parsed
}
