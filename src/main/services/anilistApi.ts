import axios from 'axios'

interface AniListSearchResult {
  anilistId: number
  malId: number | null
  title: {
    romaji: string
    english: string | null
    native: string
  }
  type: 'ANIME'
  format: 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL'
  episodes: number | null
  year: number | null
}

export class AniListService {
  private readonly endpoint = 'https://graphql.anilist.co'
  private readonly rateLimit = 90 // requests per minute
  private requestCount = 0
  private resetTime = Date.now() + 60000

  /**
   * Search for anime by title and optional year
   */
  async searchByTitle(title: string, year?: number): Promise<AniListSearchResult | null> {
    try {
      await this.checkRateLimit()

      const query = `
        query ($search: String, $year: Int) {
          Media(search: $search, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            type
            format
            episodes
            startDate {
              year
            }
          }
        }
      `

      const variables: { search: string; year?: number } = {
        search: title
      }

      if (year) {
        variables.year = year
      }

      console.log(`[AniList] Searching for: "${title}"${year ? ` (${year})` : ''}`)

      const response = await axios.post(
        this.endpoint,
        {
          query,
          variables
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.data?.data?.Media) {
        const media = response.data.data.Media
        const result: AniListSearchResult = {
          anilistId: media.id,
          malId: media.idMal,
          title: {
            romaji: media.title.romaji,
            english: media.title.english,
            native: media.title.native
          },
          type: media.type,
          format: media.format,
          episodes: media.episodes,
          year: media.startDate?.year || null
        }

        console.log(
          `[AniList] Found: ${result.title.romaji} (AniList ID: ${result.anilistId}, MAL ID: ${result.malId})`
        )
        return result
      }

      console.log('[AniList] No results found')
      return null
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          console.error('[AniList] Rate limit exceeded')
        } else if (error.response?.status === 404) {
          console.log('[AniList] No anime found with that title')
        } else {
          console.error('[AniList] API error:', error.response?.data || error.message)
        }
      } else {
        console.error('[AniList] Unexpected error:', error)
      }
      return null
    }
  }

  /**
   * Check and enforce rate limiting (90 requests/minute)
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now()

    // Reset counter if minute has passed
    if (now >= this.resetTime) {
      this.requestCount = 0
      this.resetTime = now + 60000
    }

    // If at limit, wait until reset
    if (this.requestCount >= this.rateLimit) {
      const waitTime = this.resetTime - now
      console.log(`[AniList] Rate limit reached, waiting ${waitTime}ms`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.resetTime = Date.now() + 60000
    }

    this.requestCount++
  }

  /**
   * Search for multiple anime (batch query)
   */
  async searchMultiple(titles: string[]): Promise<Map<string, AniListSearchResult | null>> {
    const results = new Map<string, AniListSearchResult | null>()

    for (const title of titles) {
      const result = await this.searchByTitle(title)
      results.set(title, result)
    }

    return results
  }
}
