import axios from 'axios'

interface TMDbSearchResult {
  id: number
  media_type: 'movie' | 'tv'
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  overview: string
  poster_path?: string
}

interface TMDbMovieDetails {
  id: number
  imdb_id: string
  title: string
  release_date: string
  overview: string
  poster_path?: string
}

interface TMDbTVDetails {
  id: number
  name: string
  first_air_date: string
  overview: string
  poster_path?: string
  external_ids?: {
    imdb_id?: string
  }
}

export interface MetadataResult {
  tmdbId?: number | null
  imdbId?: string | null
  anilistId?: number | null
  malId?: number | null
  title: string
  year?: number | null
  type: 'movie' | 'tv'
  overview?: string
  posterUrl?: string
  isAnime?: boolean
}

export class TMDbService {
  private baseUrl = 'https://api.themoviedb.org/3'
  private store: any
  private imageBaseUrl = 'https://image.tmdb.org/t/p/w500'

  constructor(store: any) {
    this.store = store
  }

  private getApiKey(): string {
    return (this.store.get('tmdb_api_key') as string) || ''
  }

  /**
   * Search for a movie or TV show by title
   */
  async searchByTitle(
    title: string,
    year?: number,
    type?: 'movie' | 'tv'
  ): Promise<MetadataResult | null> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      console.log('TMDb API key not configured, skipping metadata lookup')
      return null
    }

    try {
      console.log(`Searching TMDb for: "${title}"${year ? ` (${year})` : ''}`)

      // Use multi search if type not specified, otherwise use specific endpoint
      const endpoint = type ? `/search/${type}` : '/search/multi'

      const params: any = {
        api_key: apiKey,
        query: title,
        include_adult: false
      }

      if (year) {
        params[type === 'tv' ? 'first_air_date_year' : 'year'] = year
      }

      const response = await axios.get(`${this.baseUrl}${endpoint}`, { params })

      if (!response.data.results || response.data.results.length === 0) {
        console.log('No TMDb results found')
        return null
      }

      // Get the first result (most relevant)
      const result: TMDbSearchResult = response.data.results[0]

      // Filter by type if specified
      if (type && result.media_type !== type) {
        console.log(`Result type mismatch: expected ${type}, got ${result.media_type}`)
        return null
      }

      const mediaType = result.media_type
      const tmdbId = result.id

      // Get detailed info including IMDb ID
      const details = await this.getDetails(tmdbId, mediaType)

      console.log(
        `TMDb match found: ${details?.title} (${details?.type}, TMDb: ${details?.tmdbId})`
      )
      return details
    } catch (error: any) {
      console.error('TMDb search error:', error.message)
      return null
    }
  }

  /**
   * Get detailed information including IMDb ID
   */
  async getDetails(tmdbId: number, type: 'movie' | 'tv'): Promise<MetadataResult | null> {
    const apiKey = this.getApiKey()
    if (!apiKey) return null

    try {
      if (type === 'movie') {
        const response = await axios.get<TMDbMovieDetails>(`${this.baseUrl}/movie/${tmdbId}`, {
          params: { api_key: apiKey }
        })

        const data = response.data
        return {
          tmdbId: data.id,
          imdbId: data.imdb_id,
          title: data.title,
          year: data.release_date ? parseInt(data.release_date.split('-')[0]) : undefined,
          type: 'movie',
          overview: data.overview,
          posterUrl: data.poster_path ? `${this.imageBaseUrl}${data.poster_path}` : undefined
        }
      } else {
        // For TV shows, we need to get external IDs separately
        const [detailsResponse, externalIdsResponse] = await Promise.all([
          axios.get<TMDbTVDetails>(`${this.baseUrl}/tv/${tmdbId}`, {
            params: { api_key: apiKey }
          }),
          axios.get<{ imdb_id?: string }>(`${this.baseUrl}/tv/${tmdbId}/external_ids`, {
            params: { api_key: apiKey }
          })
        ])

        const data = detailsResponse.data
        const externalIds = externalIdsResponse.data

        return {
          tmdbId: data.id,
          imdbId: externalIds.imdb_id,
          title: data.name,
          year: data.first_air_date ? parseInt(data.first_air_date.split('-')[0]) : undefined,
          type: 'tv',
          overview: data.overview,
          posterUrl: data.poster_path ? `${this.imageBaseUrl}${data.poster_path}` : undefined
        }
      }
    } catch (error: any) {
      console.error('TMDb details error:', error.message)
      return null
    }
  }
}
