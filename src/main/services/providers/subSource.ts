import axios from 'axios'
import { SubtitleProvider, SubtitleResult } from './types'
import { MetadataResult } from '../metadata/types'

export class SubSourceService implements SubtitleProvider {
  readonly id = 'subsource'
  readonly name = 'SubSource'
  
  private baseUrl = 'https://api.subsource.net/api/v1'

  constructor(private apiKey: string) {}

  async search(
    query: string,
    metadata: MetadataResult,
    language: string
  ): Promise<SubtitleResult[]> {
    try {
      if (!this.apiKey) {
        console.warn('[SubSource] No API KEY provided')
        return []
      }

      // Use title from metadata if available, otherwise query
      const searchQuery = metadata.title || query
      const { imdbId, type, year } = metadata
      
      // Cast metadata to any to access potential season/episode if they exist at runtime
      // (Even if not in strict MetadataResult interface)
      const season = (metadata as any).season
      const episode = (metadata as any).episode

      // Prepare search params for /movies/search
      const searchParams: any = {
        searchType: 'text', // Default to text
        q: searchQuery,
      }

      if (imdbId && imdbId.startsWith('tt')) {
        searchParams.searchType = 'imdb'
        searchParams.imdb = imdbId
        delete searchParams.q
      }

      if (year) searchParams.year = year
      if (type === 'movie' || type === 'tv') {
        searchParams.type = type === 'tv' ? 'series' : 'movie'
      }
      if (season) searchParams.season = season

      console.log('[SubSource] Searching movies:', this.baseUrl + '/movies/search', searchParams)

      const response = await axios.get(`${this.baseUrl}/movies/search`, {
        params: searchParams,
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Tarjem/1.0 Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://subsource.net/'
        }
      })

      const movies = response.data.data || []
      console.log(`[SubSource] Found ${movies.length} movies/shows`)

      const subtitles: SubtitleResult[] = []

      // Try to get subtitles for the first few movie results
      for (const movie of movies.slice(0, 3)) {
        if ((!movie.movieId && !movie.imdbId) || !movie.imdbId) continue
        
        try {
           // Try to fetch subtitles using /subtitles endpoint
           // We'll try passing imdb_id if available, or just log.
           
           const subParams: any = {}
           // Try using correct parameter names based on error message: 'movieId'
           if (movie.movieId) subParams.movieId = movie.movieId
           // Error didn't mention imdbId but we can keep it just in case or remove if it conflicts.
           // Let's rely on movieId since we have it.
           if (movie.imdbId) subParams.imdbId = movie.imdbId
           
           if (season) subParams.season = season
           if (episode) subParams.episode = episode

           // Map language code to full name for API
           let targetName = language ? language.toLowerCase() : ''
           if (language && language !== 'all') {
               const langCode = language.toLowerCase()
               const langMap: Record<string, string> = {
                   'ar': 'arabic',
                   'en': 'english',
                   'es': 'spanish',
                   'fr': 'french',
                   'de': 'german',
                   'it': 'italian',
                   'pt': 'portuguese',
                   'ru': 'russian',
                   'tr': 'turkish',
                   'ja': 'japanese',
                   'ko': 'korean',
                   'zh': 'chinese',
                   'fa': 'farsi',
                   'vi': 'vietnamese',
                   'id': 'indonesian'
               }
               targetName = langMap[langCode] || langCode
               subParams.lang = targetName
               subParams.language = targetName // Try 'language' as well
           }

           // Try to increase limit to get more results
           // Note: API might not support it, but worth a try
           // Cast key to any to avoid TS error if not in defined type
           (subParams as any).limit = 100 

           console.log(`[SubSource] Fetching subtitles for movie: ${movie.title} (ID: ${movie.movieId})`)
           console.log('[SubSource] Request params:', JSON.stringify(subParams))
           
           const subResponse = await axios.get(`${this.baseUrl}/subtitles`, {
             params: subParams,
             headers: {
               'X-API-Key': this.apiKey,
               'Accept': 'application/json',
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Tarjem/1.0 Chrome/120.0.0.0 Safari/537.36',
             }
           })
           
           if (subResponse.data && Array.isArray(subResponse.data.data)) {
               if (subResponse.data.data.length > 0) {
                     const firstData = subResponse.data.data[0];
                     try {
                        const fs = require('fs');
                        const debugPath = 'C:\\Users\\Ahmed Saudi\\Documents\\vsCodeProjects\\Tarjem\\Tarjem\\debug_subsource_result.json';
                        fs.writeFileSync(debugPath, JSON.stringify(firstData, null, 2));
                        console.log('Written debug data to ' + debugPath);
                     } catch (err) {
                        console.error('Failed to write debug file:', err);
                     }
               }


               const rawSubs = subResponse.data.data.map((s: any) => {
                   const uniqueId = String(s.subtitleId || s.id || Math.random().toString(36))
                   
                   // Ensure URL is unique by appending ID as fragment
                   const baseUrl = String(s.link || s.url || s.downloadUrl || `subsource:${uniqueId}`)
                   const uniqueUrl = baseUrl.includes('#') ? baseUrl : `${baseUrl}#${uniqueId}`

                   // Map release name using releaseInfo (which is often an array) or other fields
                   const rawRelease = s.releaseInfo || s.releaseName || s.release_name || s.name || s.title || s.fileName || s.file_name
                   const releaseName = Array.isArray(rawRelease) ? rawRelease[0] : rawRelease

                   // Get owner from contributors
                   let ownerName = 'Unknown'
                   if (Array.isArray(s.contributors) && s.contributors.length > 0) {
                        ownerName = s.contributors[0].displayname || s.contributors[0].name || 'Unknown'
                   } else if (s.uploaderId) {
                        ownerName = `Uploader ${s.uploaderId}`
                   }

                   return {
                       id: uniqueId,
                       url: uniqueUrl,
                       source: 'SubSource',
                       language: String(s.lang || s.language || language || 'Unknown'),
                       format: String(s.format || 'srt'),
                       filename: String(releaseName || movie.title || 'Unknown'),
                       downloads: Number(s.downloads || s.downloadCount || 0),
                       rating: Number(s.rating?.total || s.rating || 0),
                       isAnime: !!metadata.isAnime,
                       owner: ownerName,
                       hi: !!(s.hearingImpaired || s.hi),
                       subtitleType: s.type || 'srt',
                       caption: s.commentary || s.comment || s.caption || s.note || ''
                   }
               })

               console.log('[SubSource] Mapped subtitles count (before filter):', rawSubs.length)

               // Client-side filtering
               let filteredSubs = rawSubs
               if (language && language !== 'all') {
                   const langCode = language.toLowerCase()
                   filteredSubs = rawSubs.filter((s) => {
                       const subLang = s.language.toLowerCase()
                       return subLang.includes(targetName) || subLang === langCode
                   })

                   const rejected = rawSubs.filter((s) => !filteredSubs.includes(s))
                   if (rejected.length > 0) {
                        const rejectedLangs = [...new Set(rejected.map((s) => s.language))]
                        console.log(`[SubSource] Rejected ${rejected.length} subtitles for '${language}'. Languages found:`, rejectedLangs)
                   }
                   console.log(`[SubSource] Filtered by language '${language}' ('${targetName}'): ${filteredSubs.length} kept`)
               }

               subtitles.push(...filteredSubs)
           }
        } catch (err: any) {
            console.error(`[SubSource] Failed to fetch subs for ${movie.title}:`, err.message)
            if (err.response) {
                console.error('[SubSource] Subtitle fetch error body:', err.response.data)
            }
        }
      }

      return subtitles

    } catch (error: any) {
      if (error.response) {
        console.error('[SubSource] Response:', error.response.status, error.response.data)
      } else {
        console.error('[SubSource] Error:', error.message)
      }
      return []
    }
  }

  async getDownloadLink(id: string): Promise<string> {
      // If the ID is a URL, return it
      if (id.startsWith('http')) return id
      
      // Otherwise, we might need to call /subtitles/{id}/download
      return id
  }
}
