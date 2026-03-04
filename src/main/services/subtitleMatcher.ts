/**
 * subtitleMatcher.ts
 *
 * Centralized episode-matching service for ZIP archive subtitle extraction.
 * Uses a 3-pass waterfall:
 *   Pass 1 – Anitomy  (best for anime: "[HorribleSubs] Show - 06 [720p].srt")
 *   Pass 2 – Guessit  (best for TV:    "Show.S01E06.720p.srt")
 *   Pass 3 – Strict Regex (boundary-checked, never matches digits inside years like 2016)
 *
 * Returns the best ZipEntry match, or null if nothing found.
 */

import { parseWithGuessit } from './guessit.service'
import { parseWithAnitomy } from './anitomy.service'

export interface ZipEntry {
  entryName: string
  isDirectory: boolean
  getData: () => Buffer
  name: string
}

export interface MatchOptions {
  season?: number
  episode?: number
  isAnime?: boolean
}

const VALID_SUBTITLE_EXTENSIONS = ['.srt', '.ass', '.ssa', '.vtt', '.sub', '.idx']

/**
 * Filter entries to only subtitle files (no directories).
 */
export function getSubtitleEntries(entries: ZipEntry[]): ZipEntry[] {
  return entries.filter(
    (e) =>
      !e.isDirectory &&
      VALID_SUBTITLE_EXTENSIONS.some((ext) => e.entryName.toLowerCase().endsWith(ext))
  )
}

/**
 * Pass 1: Anitomy — understands anime naming conventions.
 * "[HorribleSubs] Your Lie in April - 06 [720p].srt" → episode: 6
 */
async function matchWithAnitomy(subs: ZipEntry[], opts: MatchOptions): Promise<ZipEntry | null> {
  if (opts.episode === undefined) return null

  for (const entry of subs) {
    try {
      const parsed = await parseWithAnitomy(entry.entryName)
      if (parsed.episode === undefined) continue

      const epMatch = parsed.episode === opts.episode
      const seasonMatch =
        opts.season === undefined || parsed.season === undefined || parsed.season === opts.season

      if (epMatch && seasonMatch) {
        console.log(`[SubtitleMatcher] Pass 1 (Anitomy) matched: ${entry.entryName}`)
        return entry
      }
    } catch {
      // Anitomy failed for this entry, skip
    }
  }
  return null
}

/**
 * Pass 2: Guessit — understands standard TV naming conventions.
 * "Show.S01E06.720p.srt" → season: 1, episode: 6
 */
function matchWithGuessit(subs: ZipEntry[], opts: MatchOptions): ZipEntry | null {
  if (opts.episode === undefined) return null

  for (const entry of subs) {
    try {
      const parsed = parseWithGuessit(entry.entryName)
      if (parsed.episode === undefined) continue

      const epMatch = parsed.episode === opts.episode
      const seasonMatch =
        opts.season === undefined || parsed.season === undefined || parsed.season === opts.season

      if (epMatch && seasonMatch) {
        console.log(`[SubtitleMatcher] Pass 2 (Guessit) matched: ${entry.entryName}`)
        return entry
      }
    } catch {
      // Guessit failed for this entry, skip
    }
  }
  return null
}

/**
 * Pass 3: Strict regex — requires an explicit episode marker before the number.
 * Matches: E06, Ep06, Episode06, S01E06, - 06, _06, .06
 * Does NOT match bare digits inside years like "2016"
 */
function matchWithRegex(subs: ZipEntry[], opts: MatchOptions): ZipEntry | null {
  if (opts.episode === undefined) return null

  const ep = opts.episode
  const epPadded = ep.toString().padStart(2, '0')

  // Lookbehind ensures we require a non-digit word boundary before the number
  // Also matches S01E06-style directly
  const strictEpRegex = new RegExp(
    `(?:[Ee][Pp]?(?:isode)?[\\s._-]?|(?<=[\\s._\\[(-]))[0]?${ep}(?=[^0-9]|$)` +
      `|[Ss]\\d{1,2}[Ee]${epPadded}(?=[^0-9]|$)`,
    'i'
  )

  // Try with season compatibility first
  for (const entry of subs) {
    if (!strictEpRegex.test(entry.entryName)) continue

    if (opts.season !== undefined) {
      const seasonRegex = new RegExp(`[Ss]0?${opts.season}[Ee]`, 'i')
      if (!seasonRegex.test(entry.entryName)) {
        // Season marker present but doesn't match — skip
        const hasSeasonMarker = /[Ss]\d{1,2}[Ee]/i.test(entry.entryName)
        if (hasSeasonMarker) continue
      }
    }

    console.log(`[SubtitleMatcher] Pass 3 (Strict Regex) matched: ${entry.entryName}`)
    return entry
  }

  return null
}

/**
 * Main entry point. Returns the best-matching ZipEntry for the given episode,
 * or null if no match found across all 3 passes.
 *
 * Caller's responsibility:
 *   - If null returned and only 1 sub exists → use it (single-file pack)
 *   - If null returned and multiple subs exist → throw to try next candidate
 */
export async function findEpisodeInZip(
  entries: ZipEntry[],
  opts: MatchOptions
): Promise<ZipEntry | null> {
  const subs = getSubtitleEntries(entries)
  console.log(
    `[SubtitleMatcher] Scanning ${subs.length} subtitle(s) for S${opts.season ?? '?'}E${opts.episode ?? '?'} (anime=${opts.isAnime ?? false})`
  )

  if (subs.length === 0) return null

  // Single-file ZIPs still go through the waterfall when an episode is requested.
  // The old shortcut of "1 sub → use it directly" caused wrong movie subtitles to pass
  // through when a TV series ZIP contained only one (incorrect) file.
  // We only skip the waterfall for single-file packs when NO episode is known (e.g. movies).
  if (subs.length === 1 && opts.episode === undefined) {
    console.log(
      `[SubtitleMatcher] Single subtitle, no episode requested — using directly: ${subs[0].entryName}`
    )
    return subs[0]
  }

  // Pass 1: Anitomy (prioritized for anime content)
  if (opts.isAnime) {
    const anitomyMatch = await matchWithAnitomy(subs, opts)
    if (anitomyMatch) return anitomyMatch
  }

  // Pass 2: Guessit (for TV / standard filenames)
  const guessitMatch = matchWithGuessit(subs, opts)
  if (guessitMatch) return guessitMatch

  // Pass 1b: Anitomy for non-anime if guessit also failed
  if (!opts.isAnime) {
    const anitomyFallback = await matchWithAnitomy(subs, opts)
    if (anitomyFallback) return anitomyFallback
  }

  // Pass 3: Strict regex as final parser fallback
  const regexMatch = matchWithRegex(subs, opts)
  if (regexMatch) return regexMatch

  console.log(
    `[SubtitleMatcher] No match found for episode ${opts.episode} in ${subs.length} subtitle(s).`
  )
  console.log('[SubtitleMatcher] ZIP contents:')
  subs.forEach((e) => console.log(`  - ${e.entryName}`))

  return null
}
