import axios from 'axios'

export interface OMDbMetadata {
  imdbId: string
  title: string
  year: number
  type: 'movie' | 'tv'
  plot?: string
  genre?: string
  rating?: string
}

export class OMDbService {
  private apiKey: string
  private baseUrl = 'http://www.omdbapi.com/'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ''
  }

  /**
   * Search for a movie or TV show by title
   */
  async searchByTitle(
    title: string,
    year?: number,
    type?: 'movie' | 'series'
  ): Promise<OMDbMetadata | null> {
    if (!this.apiKey) {
      console.warn('OMDb API key not configured')
      return null
    }

    try {
      const params: any = {
        apikey: this.apiKey,
        t: title
      }

      if (year) {
        params.y = year.toString()
      }

      if (type) {
        params.type = type
      }

      console.log('OMDb searching for:', { title, year, type })

      const response = await axios.get(this.baseUrl, { params })

      if (response.data.Response === 'False') {
        console.log('OMDb: Not found -', response.data.Error)
        return null
      }

      const metadata: OMDbMetadata = {
        imdbId: response.data.imdbID,
        title: response.data.Title,
        year: parseInt(response.data.Year),
        type: response.data.Type === 'series' ? 'tv' : 'movie',
        plot: response.data.Plot,
        genre: response.data.Genre,
        rating: response.data.imdbRating
      }

      console.log('OMDb found:', metadata)
      return metadata
    } catch (error) {
      console.error('OMDb search error:', error)
      return null
    }
  }

  /**
   * Get movie/TV show details by IMDb ID
   */
  async getByImdbId(imdbId: string): Promise<OMDbMetadata | null> {
    if (!this.apiKey) {
      console.warn('OMDb API key not configured')
      return null
    }

    try {
      const params = {
        apikey: this.apiKey,
        i: imdbId
      }

      const response = await axios.get(this.baseUrl, { params })

      if (response.data.Response === 'False') {
        console.log('OMDb: IMDb ID not found')
        return null
      }

      return {
        imdbId: response.data.imdbID,
        title: response.data.Title,
        year: parseInt(response.data.Year),
        type: response.data.Type === 'series' ? 'tv' : 'movie',
        plot: response.data.Plot,
        genre: response.data.Genre,
        rating: response.data.imdbRating
      }
    } catch (error) {
      console.error('OMDb getByImdbId error:', error)
      return null
    }
  }
}
