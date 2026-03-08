import path from 'path'
import { parseWithGuessit } from './guessit.service'
import { parseWithAnitomy } from './anitomy.service'
import { parseWithAnimeTool } from './animeTool.service'
import { AniListService } from './anilistApi'
import type { ParsedMedia } from './parserTypes'

export type ParserMode = 'anime' | 'tv'

const anilist = new AniListService()

function toFull(partial: Partial<ParsedMedia>, originalFilename: string): ParsedMedia {
  return {
    title: partial.title ?? path.basename(originalFilename, path.extname(originalFilename)),
    cleanTitle: partial.cleanTitle ?? '',
    originalFilename,
    ...partial
  }
}

/**
 * Determines whether a filename parse result has a meaningful, search-ready title.
 * Returns false when the parser only found an episode number/code but no show name.
 *
 * Also returns false when the raw filename itself starts with an episode-code prefix
 * like "S01E08-Dungeon Expedition [hash].mkv" — in that pattern the part after the
 * dash is the *episode subtitle*, not the *series title*, so path context injection
 * should still be triggered to pull the real show title from the parent folder.
 */
function hasMeaningfulTitle(parsed: Partial<ParsedMedia>, rawFilename: string): boolean {
  const t = (parsed.title ?? '').trim()
  if (!t) return false

  // Title is episode-only when it starts with SxxExx / Exx / NxM
  const episodeOnlyRx = /^(s\d+e\d+|e\d+|\d+x\d+)\b/i
  if (episodeOnlyRx.test(t)) return false

  // Filename starts with episode-code prefix "S01E08-...": whatever follows the
  // dash/space is an episode subtitle, not the series title.
  const filenameEpisodePrefixRx = /^s\d+e\d+[-_ ]/i
  if (filenameEpisodePrefixRx.test(rawFilename)) return false

  return true
}

/**
 * "Richness" check — a folder name is considered a useful context source only when
 * the parser finds at least one media-specific tag alongside the title:
 * releaseGroup, resolution, or season.
 * This prevents generic folders like "Downloads" or "Videos" from polluting metadata.
 */
function isFolderRich(parsed: Partial<ParsedMedia>): boolean {
  return !!(parsed.releaseGroup || parsed.resolution || parsed.season !== undefined)
}

/**
 * Smart Path Context Injection
 *
 * When the base filename lacks a usable title (e.g. "S01E12-Loner & Loner.mkv"),
 * parse the parent folder name to extract the show title and merge it with the
 * episode info from the base filename.
 *
 * Steps:
 *   1. Parse the base filename to get episode/season info.
 *   2. If no meaningful title is extractable, parse the parent folder name.
 *   3. Validate "richness" — reject plain folder names like "Downloads".
 *   4. Verify the folder title via AniList (>80% similarity threshold).
 *   5. Merge: folder-derived title/season/releaseGroup + file-derived episode.
 *
 * @returns Merged ParsedMedia on success, or null if injection is not needed / fails.
 */
async function injectPathContext(
  filePath: string,
  baseFilename: string,
  mode: ParserMode
): Promise<ParsedMedia | null> {
  // Step 1 — Parse the raw base filename
  const baseParsed =
    mode === 'anime' ? await parseWithAnitomy(baseFilename) : parseWithGuessit(baseFilename)

  // Only inject when the base parse lacks a meaningful show title
  if (hasMeaningfulTitle(baseParsed, baseFilename)) return null

  console.log(
    `[PathContext] Base filename "${baseFilename}" has no meaningful title — attempting folder injection`
  )

  // Step 2 — Try parent folder, then grandparent folder if parent fails richness check.
  // This handles episodes stored in per-episode subfolders inside the series folder:
  //   .../Loner Life in Another World S01 1080p/.../S01E04-Headed to Town.mkv
  const parentDir = path.dirname(filePath)
  const grandparentDir = path.dirname(parentDir)

  const foldersToTry = [
    path.basename(parentDir),
    grandparentDir !== parentDir ? path.basename(grandparentDir) : null
  ].filter((f): f is string => !!f && f !== '.' && f !== '')

  let folderParsed: Partial<ParsedMedia> | null = null
  let chosenFolder = ''

  for (const folder of foldersToTry) {
    console.log(`[PathContext] Parsing folder: "${folder}"`)
    const parsed = mode === 'anime' ? await parseWithAnitomy(folder) : parseWithGuessit(folder)

    if (!parsed.title) continue

    if (isFolderRich(parsed)) {
      folderParsed = parsed
      chosenFolder = folder
      break
    }

    console.log(`[PathContext] Folder "${folder}" failed richness check — trying next level`)
  }

  if (!folderParsed) {
    console.log(`[PathContext] No rich folder found after checking ${foldersToTry.length} level(s)`)
    return null
  }

  // Step 4 — AniList verification
  // Strip season tokens (S01, S1, Season 2) that anitomy may leave inside the title
  // for folder names like "Loner Life in Another World S01 1080p...".
  const rawFolderTitle = folderParsed.title!
  const cleanFolderTitle = rawFolderTitle.replace(/\s+(?:Season\s+\d+|S0*\d+)\s*$/i, '').trim()

  if (cleanFolderTitle !== rawFolderTitle) {
    console.log(
      `[PathContext] Stripped season token from folder title: "${rawFolderTitle}" → "${cleanFolderTitle}"`
    )
  }

  const { verified, canonicalTitle } = await anilist.verifyTitle(cleanFolderTitle)
  if (!verified || !canonicalTitle) {
    console.log(`[PathContext] Folder title "${cleanFolderTitle}" failed AniList verification`)
    return null
  }

  console.log(
    `[PathContext] ✅ Folder title verified via "${chosenFolder}": "${canonicalTitle}" — merging with file episode info`
  )

  // Step 5 — Merge: folder context + file episode
  const merged: Partial<ParsedMedia> = {
    title: canonicalTitle,
    cleanTitle: canonicalTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
    canonicalTitle,
    anilistVerified: true,
    parserUsed: 'path-context',
    // From folder: series-level metadata
    season: folderParsed.season ?? baseParsed.season,
    releaseGroup: folderParsed.releaseGroup ?? baseParsed.releaseGroup,
    resolution: folderParsed.resolution ?? baseParsed.resolution,
    source: folderParsed.source ?? baseParsed.source,
    year: folderParsed.year ?? baseParsed.year,
    // From file: episode-level metadata (the file knows its own episode number best).
    // Anitomy may miss the episode for Western-format filenames like "S01E11-Title.mkv",
    // so fall back to guessit (which handles SxxExx perfectly) when anitomy returns undefined.
    episode: baseParsed.episode ?? parseWithGuessit(baseFilename).episode,
    isAnime: true,
    type: 'episode'
  }

  return toFull(merged, baseFilename)
}

/**
 * Main filename → metadata dispatcher.
 *
 * @param filename     Base filename (no directory) OR full path.
 * @param folderName   Optional: explicit parent folder name override.
 * @param mode         'anime' (anitomy waterfall + AniList) or 'tv' (guessit only).
 */
export async function parseMediaFilenameDispatcher(
  filename: string,
  folderName?: string,
  mode: ParserMode = 'tv'
): Promise<ParsedMedia> {
  // Derive the base filename (in case a full path was passed)
  const baseFilename = path.basename(filename)

  // ── Smart Path Context Injection ─────────────────────────────────────────
  // Only runs for anime mode and only when the full path is available (either
  // via the `filename` arg containing a directory component, or we construct one
  // from folderName for the richness check).
  if (mode === 'anime') {
    // If filename is a full path, we can extract the parent folder ourselves
    const hasDirectory = path.dirname(filename) !== '.'
    const filePath = hasDirectory
      ? filename
      : folderName
        ? path.join(folderName, baseFilename)
        : null

    if (filePath) {
      const injected = await injectPathContext(filePath, baseFilename, mode)
      if (injected) return injected
    }
  }

  // ── Normal parsing flow ──────────────────────────────────────────────────
  const contextualFilename =
    folderName && folderName.trim().length > 0
      ? `${folderName.trim()} - ${baseFilename}`
      : baseFilename

  if (mode === 'tv') {
    const result = parseWithGuessit(contextualFilename)
    return toFull(result, baseFilename)
  }

  const anitomyResult = await parseWithAnitomy(contextualFilename)
  if (anitomyResult.title) {
    const { verified, canonicalTitle } = await anilist.verifyTitle(anitomyResult.title)
    if (verified && canonicalTitle) {
      return toFull(
        { ...anitomyResult, canonicalTitle, anilistVerified: true, parserUsed: 'anitomy' },
        baseFilename
      )
    }
  }

  const guessitResult = parseWithGuessit(contextualFilename)
  if (guessitResult.title) {
    const { verified, canonicalTitle } = await anilist.verifyTitle(guessitResult.title)
    if (verified && canonicalTitle) {
      return toFull(
        { ...guessitResult, canonicalTitle, anilistVerified: true, parserUsed: 'guessit' },
        baseFilename
      )
    }
  }

  const animeToolResult = parseWithAnimeTool(contextualFilename)
  if (animeToolResult.title) {
    const { verified, canonicalTitle } = await anilist.verifyTitle(animeToolResult.title)
    if (verified && canonicalTitle) {
      return toFull(
        {
          ...animeToolResult,
          canonicalTitle,
          anilistVerified: true,
          parserUsed: 'anime-name-tool'
        },
        baseFilename
      )
    }
  }

  return toFull({ ...anitomyResult, anilistVerified: false }, baseFilename)
}
