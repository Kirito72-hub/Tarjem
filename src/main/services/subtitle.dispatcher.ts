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

export async function parseMediaFilenameDispatcher(
  filename: string,
  folderName?: string,
  mode: ParserMode = 'tv'
): Promise<ParsedMedia> {
  const contextualFilename =
    folderName && folderName.trim().length > 0 ? `${folderName.trim()} - ${filename}` : filename

  if (mode === 'tv') {
    const result = parseWithGuessit(contextualFilename)
    return toFull(result, filename)
  }

  const anitomyResult = await parseWithAnitomy(contextualFilename)
  if (anitomyResult.title) {
    const { verified, canonicalTitle } = await anilist.verifyTitle(anitomyResult.title)
    if (verified && canonicalTitle) {
      return toFull(
        { ...anitomyResult, canonicalTitle, anilistVerified: true, parserUsed: 'anitomy' },
        filename
      )
    }
  }

  const guessitResult = parseWithGuessit(contextualFilename)
  if (guessitResult.title) {
    const { verified, canonicalTitle } = await anilist.verifyTitle(guessitResult.title)
    if (verified && canonicalTitle) {
      return toFull(
        { ...guessitResult, canonicalTitle, anilistVerified: true, parserUsed: 'guessit' },
        filename
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
        filename
      )
    }
  }

  return toFull({ ...anitomyResult, anilistVerified: false }, filename)
}
