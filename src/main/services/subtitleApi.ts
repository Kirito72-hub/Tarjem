import axios from 'axios'

export class OpenSubtitlesService {
  private baseUrl = 'https://api.opensubtitles.com/api/v1'
  private store: any

  constructor(store: any) {
    this.store = store
  }

  private token: string = ''

  private getApiKey(): string {
    return (this.store.get('opensubtitles_api_key') as string) || ''
  }

  private getCredentials(): { user: string; pass: string } {
    return {
      user: (this.store.get('opensubtitles_username') as string) || '',
      pass: (this.store.get('opensubtitles_password') as string) || ''
    }
  }

  private async getHeaders() {
    let headers: any = {
      'Api-Key': this.getApiKey(),
      'Content-Type': 'application/json',
      'User-Agent': 'Tarjem v1.0.0'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    } else {
      // Try to login if we have credentials
      await this.login()
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`
      }
    }
    return headers
  }

  async login() {
    const { user, pass } = this.getCredentials()
    const apiKey = this.getApiKey()

    if (!user || !pass || !apiKey) return

    try {
      console.log('Attempting OpenSubtitles login...')
      const response = await axios.post(
        `${this.baseUrl}/login`,
        {
          username: user,
          password: pass
        },
        {
          headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'Tarjem v1.0.0'
          }
        }
      )

      if (response.data.token) {
        this.token = response.data.token
        console.log('OpenSubtitles login successful')
      }
    } catch (error) {
      console.error('OpenSubtitles Login Failed:', error)
      // Don't throw, just continue as guest/anonymous if possible (though download will fail)
    }
  }

  async search(query: string, language: string = 'en', imdbId?: string | null) {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error('API Key missing')

    const headers = await this.getHeaders()

    try {
      const params: any = {
        languages: language
      }

      if (imdbId) {
        // Remove 'tt' prefix if present
        params.imdb_id = imdbId.replace(/^tt/, '')
      } else {
        params.query = query
      }

      const response = await axios.get(`${this.baseUrl}/subtitles`, {
        params,
        headers: headers
      })

      const keywords = (response.data?.data || [])
        .map((item: any) => {
          const attrs = item.attributes
          const fileId = attrs.files?.[0]?.file_id

          // DEBUG LOG
          // console.log('OpenSubtitles Item:', JSON.stringify(item, null, 2))

          return {
            id: item.id,
            filename: attrs.release || attrs.files?.[0]?.file_name || 'Unknown',
            source: 'OpenSubtitles',
            language: attrs.language,
            downloads: attrs.download_count || 0,
            rating: (attrs.ratings || 0) / 2,
            url: fileId ? `opensubtitles://${fileId}` : ''
          }
        })
        .filter((item) => item.url && item.url.trim() !== '')

      return { data: keywords }
    } catch (error) {
      console.error('OpenSubtitles Search Error:', error)
      throw error
    }
  }

  async searchByHash(hash: string, language: string = 'en') {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      console.log('OpenSubtitles API key not configured, skipping...')
      return { data: [] }
    }

    const headers = await this.getHeaders()

    try {
      console.log('Searching OpenSubtitles with hash:', hash)
      const response = await axios.get(`${this.baseUrl}/subtitles`, {
        params: {
          moviehash: hash,
          languages: language
        },
        headers: headers
      })
      console.log('OpenSubtitles results:', response.data?.data?.length || 0, 'subtitles')

      const keywords = (response.data?.data || [])
        .map((item: any) => {
          const attrs = item.attributes
          const fileId = attrs.files?.[0]?.file_id

          // DEBUG LOG
          // console.log('OpenSubtitles Item:', JSON.stringify(item, null, 2))

          return {
            id: item.id,
            filename: attrs.release || attrs.files?.[0]?.file_name || 'Unknown',
            source: 'OpenSubtitles',
            language: attrs.language,
            downloads: attrs.download_count || 0,
            rating: (attrs.ratings || 0) / 2,
            url: fileId ? `opensubtitles://${fileId}` : ''
          }
        })
        .filter((item) => item.url && item.url.trim() !== '')

      return { data: keywords }
    } catch (error) {
      console.error('OpenSubtitles Hash Search Error:', error)
      return { data: [] }
    }
  }

  async getDownloadLink(fileId: number) {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error('API Key missing')

    // Ensure we are logged in for download
    if (!this.token) {
      await this.login()
      if (!this.token) {
        throw new Error('Login required for OpenSubtitles download. Please check Settings.')
      }
    }

    const headers = await this.getHeaders()

    try {
      const response = await axios.post(
        `${this.baseUrl}/download`,
        {
          file_id: fileId
        },
        {
          headers: headers
        }
      )
      return response.data
    } catch (error) {
      console.error('OpenSubtitles Download Link Error:', error)
      throw error // Let the global error handler show the Toast
    }
  }
}

export interface SubDLSearchParams {
  query?: string
  tmdbId?: number
  imdbId?: string
  sdId?: number // Added sdId
  startSeason?: number // Added startSeason
  startEpisode?: number // Added startEpisode
  type?: 'movie' | 'tv' | 'all' // Support 'all' or undefined
  language?: string
  fullSeason?: boolean // Added fullSeason
  limit?: number // Added limit
}

export class SubDLService {
  private baseUrl = 'https://api.subdl.com/api/v1'
  private store: any

  constructor(store: any) {
    this.store = store
  }

  private getApiKey(): string {
    return (this.store.get('subdl_api_key') as string) || ''
  }

  /**
   * Search for subtitles with metadata support
   */
  async search(params: SubDLSearchParams) {
    const apiKey = this.getApiKey()
    if (!apiKey) return { results: [] }

    const { query, tmdbId, imdbId, sdId, type, language = 'en', startSeason, startEpisode } = params
    const languageUpper = language.toUpperCase()

    try {
      const requestParams: any = {
        api_key: apiKey,
        languages: languageUpper
      }

      if (startSeason) requestParams.season_number = startSeason
      if (startEpisode) requestParams.episode_number = startEpisode
      if (params.fullSeason) requestParams.full_season = 1
      if (params.limit) requestParams.subs_per_page = params.limit

      // Priority: sdId > tmdbId > imdbId > query
      if (sdId) {
        requestParams.sd_id = sdId
        console.log(`SubDL searching with SD ID: ${sdId}`)
      } else if (tmdbId) {
        requestParams.tmdb_id = tmdbId
        console.log(`SubDL searching with TMDb ID: ${tmdbId}`)
      } else if (imdbId) {
        requestParams.imdb_id = imdbId
        console.log(`SubDL searching with IMDb ID: ${imdbId}`)
      } else if (query) {
        requestParams.film_name = query
        console.log(`SubDL searching with query: "${query}"`)
      } else {
        console.warn('SubDL search: No search parameters provided')
        return { results: [] }
      }

      // Add type filter if provided
      if (type) {
        requestParams.type = type
      }

      console.log('SubDL Request:', {
        url: `${this.baseUrl}/subtitles`,
        params: { ...requestParams, api_key: 'HIDDEN' }
      })

      const response = await axios.get(`${this.baseUrl}/subtitles`, {
        params: requestParams
      })

      console.log('SubDL Response Status:', response.status)
      console.log('SubDL Response Keys:', Object.keys(response.data).join(', '))

      // Check for API errors (rate limiting, etc.)
      if (response.data.status === false || response.data.statusCode) {
        const errorCode = response.data.statusCode || 'UNKNOWN'
        const errorMsg = response.data.message || 'Unknown error'

        if (errorCode === 429) {
          console.error('SubDL Rate Limit Exceeded:', errorMsg)
          throw new Error(
            'SubDL daily rate limit exceeded. Please try again tomorrow or use a different API key.'
          )
        }

        console.error(`SubDL API Error (${errorCode}):`, errorMsg)
        throw new Error(`SubDL API Error: ${errorMsg}`)
      }

      let mappedResults: any[] = []

      // 1. Check for direct subtitles in response (Best case: search by S/E returned files)
      if (
        response.data.subtitles &&
        Array.isArray(response.data.subtitles) &&
        response.data.subtitles.length > 0
      ) {
        console.log(`SubDL found ${response.data.subtitles.length} direct subtitles`)
        mappedResults = response.data.subtitles
          .map((item: any) => {
            let url = item.download_url || item.url || ''
            if (url && url.startsWith('/')) {
              url = `https://dl.subdl.com${url}`
            }
            return {
              id: item.sd_id?.toString() || Math.random().toString(36),
              filename: item.release_name || item.name || 'Unknown',
              source: 'SubDL',
              language: item.language,
              downloads: 0,
              rating: 0,
              url: url
            }
          })
          .filter((item) => item.url && item.url.trim() !== '')

        if (mappedResults.length > 0) {
          console.log(
            `SubDL returning ${mappedResults.length} valid subtitle files from 'subtitles' field`
          )
          return { results: mappedResults }
        }
      }

      // 2. Fallback to 'results' (Shows/Movies metadata) processing if no direct subtitles found
      if (response.data.results) {
        console.log(`SubDL found ${response.data.results.length} metadata results`)

        const results = response.data.results
        if (results.length > 0) {
          // Log all candidates to see what we found
          console.log(
            'SubDL Candidates:',
            results
              .map((r: any) => `${r.name} (${r.type || 'unknown'}) [ID: ${r.tmdb_id}]`)
              .join(', ')
          )

          // Find best match:
          // 1. Exact match on name (case-insensitive)
          // 2. Or just take the first one if no exact match
          let bestMatch = results[0]

          if (query) {
            const exactMatch = results.find(
              (r: any) => r.name && r.name.toLowerCase() === query.toLowerCase()
            )
            if (exactMatch) {
              console.log(`Found exact match: ${exactMatch.name}`)
              bestMatch = exactMatch
            }
          }

          // Check if these are subtitles or movie details
          // If it has no download_url but has tmdb_id/imdb_id/sd_id, it's likely a movie result
          const isMovieResult =
            !bestMatch.download_url &&
            !bestMatch.url &&
            (bestMatch.tmdb_id || bestMatch.imdb_id || bestMatch.sd_id)

          if (isMovieResult && query && !tmdbId && !imdbId) {
            console.log(
              `SubDL returned metadata for "${bestMatch.name}". Recursively fetching subtitles...`
            )

            // If it's a TV show, we might need to specify Season 1 Episode 1 to get ANY results
            // if the API requires S/E for TV shows.
            const isTv = bestMatch.type === 'tv' || bestMatch.type === 'Tv'
            if (isTv) {
              console.log('Detected TV Show. If this fails, we will try fallback to S01E01.')
              // For the *first* recursive attempt, we try just the ID first.
              // But if THAT returns metadata again (handled by the caller re-calling this?),
              // actually, this function calls itself. So we need to be careful not to loop infinitely.

              // The recursive call below passes `tmdbId` but `query` is undefined.
              // So the recursive execution enters `if (tmdbId)` block above.
              // If THAT returns a result which is ALSO metadata (no url), this block `if (isMovieResult && query ...)` won't be entered
              // because `query` is undefined in the recursive call!

              // Wait, correct. The recursive call has `query: undefined`.
              // So we can't catch the failure of the recursive call HERE.
              // We need to check the result of the recursive call.
            }

            let recursiveResult
            if (bestMatch.tmdb_id) {
              recursiveResult = await this.search({
                ...params,
                query: undefined,
                tmdbId: bestMatch.tmdb_id
              })
            } else if (bestMatch.imdb_id) {
              recursiveResult = await this.search({
                ...params,
                query: undefined,
                imdbId: bestMatch.imdb_id
              })
            }

            // If TV show, ALSO try to fetch full season packs and merge
            if (isTv && recursiveResult) {
              console.log('Fetching Full Season packs for generic TV search...')
              try {
                const seasonParams = bestMatch.tmdb_id
                  ? { ...params, query: undefined, tmdbId: bestMatch.tmdb_id, fullSeason: true }
                  : { ...params, query: undefined, imdbId: bestMatch.imdb_id, fullSeason: true }

                const seasonResult = await this.search(seasonParams)
                if (seasonResult && seasonResult.results.length > 0) {
                  console.log(
                    `Merged ${seasonResult.results.length} Full Season packs into results`
                  )
                  recursiveResult.results = [...recursiveResult.results, ...seasonResult.results]
                }
              } catch (err) {
                console.error('Failed to fetch/merge season packs:', err)
              }
            }

            // Check if recursive result failed (empty or still metadata)
            const hasResults = recursiveResult && recursiveResult.results.length > 0

            if (isTv) {
              // If we have no valid results (likely filtered out because they were just metadata with no URL)
              // OR if we hav results but they look like metadata
              const firstRec = hasResults ? recursiveResult.results[0] : null
              const recIsMeta =
                firstRec &&
                !firstRec.url &&
                !firstRec.download_url &&
                (firstRec.tmdb_id || firstRec.sd_id)

              if (!hasResults || recIsMeta) {
                console.log('Recursive search yielded no valid subtitles. trying fallbacks...')

                // Fallback 1: Try SD ID if available (with S01E01)
                if (bestMatch.sd_id) {
                  console.log(`Fallback 1: Trying SD ID ${bestMatch.sd_id} with S01E01...`)
                  const sdResult = await this.search({
                    ...params,
                    query: undefined,
                    sdId: bestMatch.sd_id,
                    startSeason: 1,
                    startEpisode: 1,
                    tmdbId: undefined // clear other IDs to ensure SD ID is used
                  })

                  const hasSdRes = sdResult && sdResult.results.length > 0
                  // Check if result has URL
                  if (hasSdRes && sdResult.results.some((r: any) => r.url || r.download_url)) {
                    return sdResult
                  }
                }

                // Fallback 2: Try Query Name + S01E01
                console.log(`Fallback 2: Trying query "${bestMatch.name} S01E01"...`)
                const fallback2Result = await this.search({
                  ...params,
                  query: `${bestMatch.name} S01E01`,
                  tmdbId: undefined,
                  imdbId: undefined,
                  sdId: undefined,
                  startSeason: undefined,
                  startEpisode: undefined
                })

                if (fallback2Result && fallback2Result.results.length > 0) return fallback2Result

                // Fallback 4: Try "Name 01" WITHOUT language filter
                console.log(
                  `Fallback 4: Trying query "${bestMatch.name} 01" without language filter...`
                )
                const fallback4Result = await this.search({
                  ...params,
                  query: `${bestMatch.name} 01`,
                  language: '', // Clear language
                  tmdbId: undefined,
                  imdbId: undefined,
                  sdId: undefined,
                  startSeason: undefined,
                  startEpisode: undefined
                })

                if (fallback4Result && fallback4Result.results.length > 0) return fallback4Result

                return this.search({
                  ...params,
                  query: `${bestMatch.name} 01`,
                  tmdbId: undefined,
                  imdbId: undefined,
                  sdId: undefined,
                  startSeason: undefined,
                  startEpisode: undefined
                })
              }
            }

            return recursiveResult || { results: [] }
          }
        }

        // DEBUG: Log the results before mapping to see what the TMDB ID search returned
        if (response.data.results.length > 0) {
          const first = response.data.results[0]
          console.log('SubDL Recursive/Final Result Keys:', Object.keys(first).join(', '))
          console.log('SubDL Recursive/Final Result Sample (FULL):', JSON.stringify(first, null, 2))
        }

        // Map results to common format
        mappedResults = response.data.results
          .map((item: any) => ({
            id: item.sd_id?.toString() || Math.random().toString(36),
            filename: item.release_name || item.name || 'Unknown',
            source: 'SubDL',
            language: item.language,
            downloads: 0,
            rating: 0,
            url: item.download_url || item.url || ''
          }))
          .filter((item) => item.url && item.url.trim() !== '') // Filter out results with no URL

        console.log(`SubDL valid results after filtering: ${mappedResults.length}`)
        return { results: mappedResults }
      }

      return { results: [] }
    } catch (error: any) {
      console.error('SubDL Search Error:', error.message)
      if (error.response) {
        console.error('SubDL Error Response:', error.response.status, error.response.data)
      }
      return { results: [] }
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async searchByQuery(query: string, language: string = 'en') {
    return this.search({ query, language })
  }
}
