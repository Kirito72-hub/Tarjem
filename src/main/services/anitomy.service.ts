import Anitomy from 'anitomyscript'
import type { ParsedMedia } from './parserTypes'

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export async function parseWithAnitomy(filename: string): Promise<Partial<ParsedMedia>> {
  try {
    const rawResult = await Anitomy(filename)
    const result = Array.isArray(rawResult) ? rawResult[0] : rawResult
    if (!result) return {}

    const anyRes = result as any

    const title = result.anime_title ?? ''
    const parsed: Partial<ParsedMedia> = {
      title: title || filename,
      cleanTitle: normalizeTitle(title || filename),
      parserUsed: 'anitomy'
    }

    if (result.episode_number) {
      const epStr = Array.isArray(result.episode_number)
        ? result.episode_number[0]
        : result.episode_number
      const epNum = parseFloat(String(epStr))
      if (!isNaN(epNum)) parsed.episode = Math.floor(epNum)
    }

    if (result.anime_season) {
      const sStr = Array.isArray(result.anime_season) ? result.anime_season[0] : result.anime_season
      const sNum = parseInt(String(sStr), 10)
      if (!isNaN(sNum)) parsed.season = sNum
    }

    if (result.release_group) {
      parsed.releaseGroup = String(result.release_group)
    }

    if (result.video_resolution) {
      parsed.resolution = String(result.video_resolution)
    }

    if (anyRes.anime_year) {
      const y = parseInt(String(anyRes.anime_year), 10)
      if (!isNaN(y)) parsed.year = y
    }

    return parsed
  } catch {
    return {}
  }
}
