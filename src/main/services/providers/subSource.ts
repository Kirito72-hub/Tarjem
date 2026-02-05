import axios from 'axios'
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { SubtitleProvider, SubtitleResult } from './types'
import { MetadataResult } from '../metadataApi'
import { parseMediaFilename } from '../../utils/guessitParser'

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
        q: searchQuery
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
          Accept: 'application/json',
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
              ar: 'arabic',
              en: 'english',
              es: 'spanish',
              fr: 'french',
              de: 'german',
              it: 'italian',
              pt: 'portuguese',
              ru: 'russian',
              tr: 'turkish',
              ja: 'japanese',
              ko: 'korean',
              zh: 'chinese',
              fa: 'farsi',
              vi: 'vietnamese',
              id: 'indonesian'
            }
            targetName = langMap[langCode] || langCode
            subParams.lang = targetName
            subParams.language = targetName // Try 'language' as well
          }

          // Try to increase limit to get more results
          // Note: API might not support it, but worth a try
          // Cast key to any to avoid TS error if not in defined type
          ;(subParams as any).limit = 100

          console.log(
            `[SubSource] Fetching subtitles for movie: ${movie.title} (ID: ${movie.movieId})`
          )
          console.log('[SubSource] Request params:', JSON.stringify(subParams))

          const subResponse = await axios.get(`${this.baseUrl}/subtitles`, {
            params: subParams,
            headers: {
              'X-API-Key': this.apiKey,
              Accept: 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Tarjem/1.0 Chrome/120.0.0.0 Safari/537.36'
            }
          })

          if (subResponse.data && Array.isArray(subResponse.data.data)) {
            if (subResponse.data.data.length > 0) {
              const firstData = subResponse.data.data[0]
              try {
                const debugPath =
                  'C:\\Users\\Ahmed Saudi\\Documents\\vsCodeProjects\\Tarjem\\Tarjem\\debug_subsource_result.json'
                fs.writeFileSync(debugPath, JSON.stringify(firstData, null, 2))
                console.log('Written debug data to ' + debugPath)
              } catch (err) {
                console.error('Failed to write debug file:', err)
              }
            }

            const rawSubs = subResponse.data.data.map((s: any) => {
              const uniqueId = String(s.subtitleId || s.id || Math.random().toString(36))

              // Use subsource: protocol for download handler to intercept
              const uniqueUrl = `subsource:${uniqueId}`

              // We lose the web link in 'url', but 'link' might be useful if we update types later.
              // const webLink = s.link ? `https://subsource.net${s.link}` : ''

              // Map release name using releaseInfo (which is often an array) or other fields
              const rawRelease =
                s.releaseInfo ||
                s.releaseName ||
                s.release_name ||
                s.name ||
                s.title ||
                s.fileName ||
                s.file_name
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
                filename:
                  String(releaseName || movie.title || 'Unknown') + '.' + String(s.format || 'srt'),
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
                console.log(
                  `[SubSource] Rejected ${rejected.length} subtitles for '${language}'. Languages found:`,
                  rejectedLangs
                )
              }
              console.log(
                `[SubSource] Filtered by language '${language}' ('${targetName}'): ${filteredSubs.length} kept`
              )
            }

            // Episode-based filtering (since SubSource API doesn't filter by episode server-side)
            if (episode !== undefined && filteredSubs.length > 0) {
              const beforeCount = filteredSubs.length
              filteredSubs = filteredSubs.filter((sub) => {
                const parsed = parseMediaFilename(sub.filename)
                // Keep if: subtitle has same episode, OR subtitle has no episode detected (pack/batch)
                if (parsed.episode === undefined) {
                  // No episode in filename - could be a pack, keep it
                  return true
                }
                return parsed.episode === episode
              })
              console.log(
                `[SubSource] Filtered by episode ${episode}: ${filteredSubs.length} kept (was ${beforeCount})`
              )
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
    // But for SubSource, we return a special protocol URL to be handled by the main process
    return `subsource:${id}`
  }

  async downloadSubtitle(
    id: string,
    destination: string,
    options?: {
      startSeason?: number
      startEpisode?: number
    }
  ): Promise<{ path: string; wasZip: boolean; extractedFilename?: string }> {
    try {
      if (!this.apiKey) throw new Error('No API Key provided')

      console.log(`[SubSource] Downloading subtitle ID: ${id}`)

      const response = await axios.get(`${this.baseUrl}/subtitles/${id}/download`, {
        headers: {
          'X-API-Key': this.apiKey
        },
        responseType: 'arraybuffer'
      })

      // Detect the actual file extension from response headers
      let actualExtension = ''
      const contentDisposition = response.headers['content-disposition']
      const contentType = response.headers['content-type']

      // Try to get extension from Content-Disposition header
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1].replace(/['"]/g, '')
          const extMatch = filename.match(/\.([^.]+)$/)
          if (extMatch) {
            actualExtension = extMatch[1]
          }
        }
      }

      // Fallback to Content-Type if no extension found
      if (!actualExtension && contentType) {
        if (contentType.includes('zip')) {
          actualExtension = 'zip'
        } else if (contentType.includes('rar')) {
          actualExtension = 'rar'
        } else if (contentType.includes('x-subrip')) {
          actualExtension = 'srt'
        }
      }

      // Default to zip if still no extension (SubSource typically returns zip)
      if (!actualExtension) {
        actualExtension = 'zip'
      }

      // Adjust destination to use the correct extension
      let finalDestination = destination
      const currentExt = path.extname(destination).slice(1) // Remove the dot
      if (currentExt !== actualExtension) {
        // Replace the extension or append if missing
        const ext = path.extname(destination)
        if (ext) {
          finalDestination = destination.replace(/\.[^.]+$/, `.${actualExtension}`)
        } else {
          finalDestination = destination + `.${actualExtension}`
        }
      }

      // Save the file as-is without extraction
      // This preserves the original format (.zip, .rar, .ass, .srt, etc.)
      const destDir = path.dirname(finalDestination)
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      fs.writeFileSync(finalDestination, response.data)

      console.log(`[SubSource] Downloaded to: ${finalDestination}`)

      // If it's a zip file, extract the subtitle
      if (actualExtension === 'zip') {
        try {
          const zip = new AdmZip(finalDestination)
          const zipEntries = zip.getEntries()
          // console.log(`[SubSource] ZIP contains ${zipEntries.length} entries. Scanning...`)
          // zipEntries.forEach(e => {
          //     if (!e.isDirectory) console.log(` - ${e.entryName}`)
          // })

          // Helper to check if file matches requested episode
          const isMatchingEpisode = (filename: string): boolean => {
            if (!options?.startEpisode) return false

            const ep = options.startEpisode!

            // Use robust filename parser
            const parsed = parseMediaFilename(filename)
            if (parsed.episode === ep) {
              // If season is known, check it too
              if (options.startSeason && parsed.season && parsed.season !== options.startSeason) {
                return false
              }
              // console.log(`[SubSource] File "${filename}" MATCHED episode ${ep} (via FilenameParser)`)
              return true
            }

            // Fallback to simple regex if parser failed to extract episode
            const epStr = ep.toString().padStart(2, '0')
            const epNum = ep.toString()
            const regex = new RegExp(`(?:^|[^0-9])(?:${epStr}|${epNum})(?:[^0-9]|$)`, 'i')
            const isMatch = regex.test(filename)

            if (isMatch) {
              // console.log(`[SubSource] File "${filename}" MATCHED episode ${ep} (via Regex)`)
            }

            return isMatch
          }

          // Find best subtitle file
          // Priority 1: Exact season/episode match (if options provided)
          let subtitleEntry: any = null

          if (options?.startEpisode) {
            // console.log(`[SubSource] ZIP Extraction: Looking for episode ${options.startEpisode}`)
            subtitleEntry = zipEntries.find(
              (entry) =>
                !entry.isDirectory &&
                /\.(srt|ass|ssa|sub|vtt)$/i.test(entry.entryName) &&
                isMatchingEpisode(entry.entryName)
            )

            if (subtitleEntry) {
              console.log(`[SubSource] Found matching episode in ZIP: ${subtitleEntry.entryName}`)
            }
          }

          // Priority 2: If no match found, throw error (caller can retry with next result)
          if (!subtitleEntry) {
            // Delete the temp zip before throwing
            try {
              fs.unlinkSync(finalDestination)
              console.log(`[SubSource] Deleted temp zip: ${finalDestination}`)
            } catch (e) {
              // ignore
            }
            throw new Error(`No episode ${options?.startEpisode || 'N/A'} found in ZIP archive`)
          }

          if (subtitleEntry) {
            // Extract to the original requested destination path (which creates the .srt/.ass file)
            // We need to determine the correct extension for the destination
            const entryExt = path.extname(subtitleEntry.entryName)

            let extractedPath = destination
            if (path.extname(destination)) {
              extractedPath = destination.replace(/\.[^.]+$/, entryExt)
            } else {
              extractedPath = destination + entryExt
            }

            const extractedData = subtitleEntry.getData()
            // console.log(`[SubSource] Extracted data size: ${extractedData.length} bytes`)
            if (extractedData.length > 0) {
              const header = extractedData.slice(0, 4).toString('hex')
              // console.log(`[SubSource] Extracted file header (hex): ${header}`)
              if (header === '504b0304') {
                console.warn('[SubSource] WARNING: Extracted file appears to be a ZIP archive!')
              }
            }

            // Strip UTF-8 BOM if present to avoid FFmpeg issues
            if (
              extractedData.length >= 3 &&
              extractedData[0] === 0xef &&
              extractedData[1] === 0xbb &&
              extractedData[2] === 0xbf
            ) {
              console.log('[SubSource] Stripping UTF-8 BOM')
              fs.writeFileSync(extractedPath, extractedData.slice(3))
            } else {
              fs.writeFileSync(extractedPath, extractedData)
            }

            console.log(`[SubSource] Extracted subtitle to: ${extractedPath}`)

            // Delete the zip file
            try {
              fs.unlinkSync(finalDestination)
              console.log(`[SubSource] Deleted temp zip: ${finalDestination}`)
            } catch (e) {
              console.warn(`[SubSource] Failed to delete temp zip:`, e)
            }

            return {
              path: extractedPath,
              wasZip: true,
              extractedFilename: subtitleEntry.name
            }
          } else {
            console.warn(`[SubSource] No subtitle file found in zip archive`)
            return {
              path: finalDestination,
              wasZip: true,
              extractedFilename: undefined
            }
          }
        } catch (extractError: unknown) {
          const errMsg = extractError instanceof Error ? extractError.message : String(extractError)
          console.error(`[SubSource] Failed to extract zip:`, errMsg)
          
          // Cleanup the zip file before re-throwing or returning
          try {
             if (fs.existsSync(finalDestination)) {
                fs.unlinkSync(finalDestination)
                // console.log(`[SubSource] Cleanup on error: Deleted ${finalDestination}`)
             }
          } catch (e) {}

          // If it's an episode mismatch error, re-throw so caller can retry
          if (errMsg.includes('found in ZIP archive')) {
            throw extractError
          }
          // If other error, we deleted the zip, so we can't return generic path.
          // Fallback? Or throw?
          // If we deleted it, we must throw.
          throw extractError
        }
      }

      return {
        path: finalDestination,
        wasZip: false
      }
    } catch (error: any) {
      console.error('[SubSource] Download failed:', error.message)
      if (error.response) {
        console.error('[SubSource] Error details:', error.response.data.toString())
      }
      throw error
    }
  }
}
