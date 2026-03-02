// DEBUG: Check execution context
console.log('--- DEBUG START ---')
console.log('ENV CHECK - ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE)
console.log('EXECUTABLE PATH:', process.execPath)
console.log('Running in:', process.versions.electron ? 'Electron' : 'Node')
console.log('Process Type:', process.type)
console.log('--- DEBUG END ---')

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, extname, basename } from 'path'
import fs from 'fs'
import os from 'os'
import AdmZip from 'adm-zip'

import icon from '../../resources/icon.png?asset'
import { OpenSubtitlesService, SubDLService } from './services/subtitleApi'
import { HashCalculator } from './services/hashCalculator'
import { Downloader } from './services/downloader'
// Import FFmpegService
import { FFmpegService } from './services/ffmpeg'
import { OMDbService } from './services/omdbApi'
import { MetadataCache } from './services/metadataCache'
import { AniListService } from './services/anilistApi'
import { parseMediaFilenameDispatcher } from './services/subtitle.dispatcher'
import type { ParserMode } from './services/subtitle.dispatcher'
import { findEpisodeInZip } from './services/subtitleMatcher'
import { syncSubtitle } from './services/alassSync'
import { cleanShowTitle } from './utils/titleCleaner'
import type ElectronStore from 'electron-store'
import { ProviderRegistry } from './services/providerRegistry'
import { OpenSubtitlesAdapter, SubDLAdapter } from './services/providers/adapters'
import { SubSourceService } from './services/providers/subSource'

let mainWindow: BrowserWindow | null = null
let store: ElectronStore | null = null
let subtitleService: OpenSubtitlesService | null = null
let subdlService: SubDLService | null = null
let hashCalculator: HashCalculator | null = null
let downloader: Downloader | null = null
let ffmpegService: FFmpegService | null = null
let omdbService: OMDbService | null = null
let anilistService: AniListService | null = null
let metadataCache: MetadataCache | null = null

let providerRegistry: ProviderRegistry | null = null
let subSourceService: SubSourceService | null = null

function createWindow(): void {
  // Check if running in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  // Create the browser window.
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    ...(process.platform === 'linux'
      ? { icon }
      : { icon: join(__dirname, '../../build/icon.ico') }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:unmaximized')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  app.setAppUserModelId('com.tarjem.app')

  console.log('App ready, initializing services...')
  // Initialize electron-store dynamically
  // Initialize electron-store dynamically
  const { default: Store } = await import('electron-store')
  store = new Store()

  try {
    subtitleService = new OpenSubtitlesService(store)
    subdlService = new SubDLService(store)
    hashCalculator = new HashCalculator()
    downloader = new Downloader()
    ffmpegService = new FFmpegService() // Initialize FFmpeg service

    // Initialize OMDb Service
    const omdbApiKey = await store.get('omdb_api_key')
    omdbService = new OMDbService(omdbApiKey as string)
    anilistService = new AniListService()
    metadataCache = new MetadataCache(store)

    // Initialize Provider Registry
    providerRegistry = new ProviderRegistry(store)
    if (subtitleService) providerRegistry.register(new OpenSubtitlesAdapter(subtitleService))
    if (subdlService) providerRegistry.register(new SubDLAdapter(subdlService))

    // Register SubSource

    const subSourceKey = await store.get('subsource_api_key')
    subSourceService = new SubSourceService(subSourceKey as string)
    providerRegistry.register(subSourceService)

    console.log('Services initialized successfully')
  } catch (err) {
    console.error('Failed to initialize services:', err)
  }

  // IPC test
  // ipcMain.on('ping', () => console.log('pong'))

  // Window controls
  ipcMain.on('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) {
      window.unmaximize()
    } else {
      window?.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
  })

  // File Selection
  ipcMain.handle('dialog:openFile', async (_event, tab?: 'FILE_MATCH' | 'MERGER' | 'DIRECTORY') => {
    console.log('dialog:openFile called with tab:', tab)

    if (tab === 'DIRECTORY') {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      if (canceled) {
        return []
      } else {
        return filePaths
      }
    }

    // Determine file filters based on the active tab
    const filters =
      tab === 'FILE_MATCH'
        ? [
            { name: 'Video Files', extensions: ['avi', 'mkv', 'mp4'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        : [
            {
              name: 'Media & Subtitles',
              extensions: ['mkv', 'mp4', 'avi', 'srt', 'ass', 'vtt', 'sub']
            },
            { name: 'All Files', extensions: ['*'] }
          ]

    console.log('Using filters:', filters)

    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters
    })
    if (canceled) {
      return []
    } else {
      return filePaths
    }
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  // Subtitles Handlers
  ipcMain.handle(
    'subtitle:searchByHash',
    async (_event, hash, language, enabledSources?: string[]) => {
      try {
        console.log(`Searching for hash: ${hash}`)

        if (!providerRegistry) throw new Error('ProviderRegistry not initialized')

        const results = await providerRegistry.searchAllByHash(hash, language, enabledSources)

        console.log(`Total results from all sources: ${results.length}`)

        if (results.length === 0) {
          console.log('No subtitles found from any configured API')
        }

        return results
      } catch (error) {
        console.error('Subtitle Search Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'subtitle:searchByQuery',
    async (_event, query, language, metadata?, enabledSources?: string[]) => {
      try {
        console.log(`Searching for query: ${query}`)
        const results: any[] = []

        // Metadata Discovery
        let finalMetadata: any = null

        if (metadata && metadataCache) {
          // 1. Try AniList First (for anime detection)
          if (anilistService) {
            try {
              const animeCacheKey = `anime_${metadata.title}_${metadata.year || 'any'}`
              let anilistResult = metadataCache.get(animeCacheKey, metadata.year, 'tv')

              if (!anilistResult) {
                // Not in cache, query AniList API
                // We check AniList for all queries to determine if it's anime
                console.log(`Checking AniList for: "${metadata.title}"`)
                const result = await anilistService.searchByTitle(metadata.title, metadata.year)

                if (result) {
                  anilistResult = {
                    tmdbId: null,
                    imdbId: null, // AniList doesn't provide IMDb easily in search, mainly MAL
                    malId: result.malId,
                    anilistId: result.anilistId,
                    type: 'tv', // Anime is usually treated as TV in our flow for episodes
                    title:
                      result.title.english ||
                      result.title.romaji ||
                      result.title.native ||
                      metadata.title,
                    fallbackTitle:
                      result.title.english && result.title.romaji ? result.title.romaji : undefined,
                    year: result.year ?? undefined,
                    isAnime: true
                  }
                  metadataCache.set(animeCacheKey, anilistResult, metadata.year, 'tv')
                }
              }

              if (anilistResult) {
                console.log('Identified as Anime via AniList:', anilistResult.title)
                finalMetadata = anilistResult
              }
            } catch (error) {
              console.log('AniList lookup failed:', error)
            }
          }

          // 2. Fallback to OMDb (if not found in AniList)
          if (!finalMetadata && omdbService) {
            try {
              console.log('Not found in AniList, trying OMDb...')
              const omdbCacheKey = `omdb_${metadata.title}_${metadata.year || 'any'}_${metadata.type || 'any'}`
              let omdbResult = metadataCache.get(omdbCacheKey, metadata.year, metadata.type)

              if (!omdbResult) {
                console.log(`Looking up OMDb metadata for: "${metadata.title}"`)
                const result = await omdbService.searchByTitle(
                  metadata.title,
                  metadata.year,
                  metadata.type
                )

                if (result) {
                  omdbResult = {
                    imdbId: result.imdbId,
                    tmdbId: null,
                    type: result.type,
                    title: result.title,
                    year: result.year,
                    isAnime: false
                  }
                  metadataCache.set(omdbCacheKey, omdbResult, metadata.year, metadata.type)
                }
              }

              if (omdbResult) {
                console.log('Identified via OMDb:', omdbResult.title)
                finalMetadata = omdbResult
              }
            } catch (error) {
              console.log('OMDb lookup failed:', error)
            }
          }
        }

        // Merge discovered metadata with input metadata
        const enrichedMetadata = finalMetadata ? { ...metadata, ...finalMetadata } : { ...metadata }

        // Fix logic: If we have AniList/MAL IDs, it IS anime, even if parser thinks otherwise or cache is old
        if (finalMetadata && (finalMetadata.anilistId || finalMetadata.malId)) {
          enrichedMetadata.isAnime = true
        }

        // Handle legacy cache: Title might be an object
        if (typeof enrichedMetadata.title === 'object' && enrichedMetadata.title !== null) {
          const t: any = enrichedMetadata.title
          enrichedMetadata.title = t.romaji || t.english || t.native || metadata.title
        }

        // Clean title for better search results (remove "Season X" suffixes)
        if (enrichedMetadata.title && typeof enrichedMetadata.title === 'string') {
          // Only clean if it's a TV show/Anime or has season info
          if (
            enrichedMetadata.isAnime ||
            enrichedMetadata.type === 'tv' ||
            enrichedMetadata.type === 'series' ||
            enrichedMetadata.season
          ) {
            enrichedMetadata.title = cleanShowTitle(enrichedMetadata.title)
          }
        }

        console.log('Final Metadata used for search:', enrichedMetadata)

        // Use ProviderRegistry to search all sources
        if (providerRegistry) {
          const providerResults = await providerRegistry.searchAll(
            query,
            enrichedMetadata as any, // Cast to avoid strict type mismatch if any
            language,
            enabledSources
          )
          results.push(...providerResults)
        }

        console.log(`Total results from all sources: ${results.length}`)
        return results
      } catch (error) {
        console.error('Subtitle Query Search Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle('subdl:search', async (_event, query, language) => {
    // Legacy handler, can be removed later or kept for direct access
    if (!subdlService) throw new Error('SubDLService not initialized')
    return await subdlService.search({ query, language })
  })

  ipcMain.handle(
    'subtitle:download',
    async (
      _,
      url: string,
      destination: string,
      options?: {
        filename?: string
        seriesName?: string
        episodeName?: string
        startSeason?: number
        startEpisode?: number
        videoFilename?: string
        skipExtraction?: boolean
      }
    ) => {
      console.log('Downloading subtitle:', url, 'to', destination)

      const tempPath = join(os.tmpdir(), `tarjem_dl_${Date.now()}.zip`)
      let downloadUrl = ''

      try {
        if (!subtitleService || !downloader) throw new Error('Services not initialized')

        // Handle Fallback Destination
        if (!destination || destination.trim() === '') {
          if (options && options.filename) {
            destination = join(app.getPath('downloads'), options.filename)
          } else {
            throw new Error('Destination path required')
          }
        }

        // Resolve Download URL
        if (url.startsWith('opensubtitles://')) {
          const fileId = parseInt(url.replace('opensubtitles://', ''), 10)
          const linkData = await subtitleService.getDownloadLink(fileId)
          downloadUrl = linkData.link
        } else if (url.startsWith('subsource:')) {
          const id = url.split(':')[1]
          if (subSourceService) {
            const result = await subSourceService.downloadSubtitle(id, destination, {
              startSeason: options?.startSeason,
              startEpisode: options?.startEpisode,
              skipExtraction: options?.skipExtraction
            })
            // Return result directly as it matches DownloadResult shape (mostly)
            return {
              path: result.path,
              originalFilename: options?.filename || basename(result.path),
              wasZip: result.wasZip,
              extractedFilename: result.extractedFilename
            }
          } else {
            throw new Error('SubSource service not initialized')
          }
        } else {
          downloadUrl = url
        }

        if (!downloadUrl) throw new Error('Could not resolve download URL')

        // Download to temp file
        const downloadResult = await downloader.downloadFile(downloadUrl, tempPath)

        const cleanupTemp = () => {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
          } catch (err) {
            console.error('Failed to cleanup temp file:', err)
          }
        }

        let isDefinitelyZip = false

        // [NEW] Smart Download Handling: Check if URL clearly indicates a subtitle file
        const isDirectSubtitleUrl = /\.(srt|ass|vtt|ssa|sub)$/i.test(downloadUrl)

        // [NEW] Buffer Validation: Check if the file is a valid ZIP
        let isZipBuffer = false
        try {
          const fd = fs.openSync(tempPath, 'r')
          const buffer = Buffer.alloc(4)
          fs.readSync(fd, buffer, 0, 4, 0)
          fs.closeSync(fd)

          const hexSignature = buffer.toString('hex')
          if (
            hexSignature === '504b0304' ||
            hexSignature === '504b0506' ||
            hexSignature === '504b0708'
          ) {
            isZipBuffer = true
          }
        } catch (err) {
          console.error('[Extraction] Failed to read downloaded buffer signature:', err)
        }
        console.log(
          `[Extraction] Buffer signature indicates ZIP: ${isZipBuffer}, Direct URL: ${isDirectSubtitleUrl}`
        )

        try {
          // If skip extraction is requested, OR it's clearly a direct subtitle URL, OR the buffer is NOT a ZIP
          if (options?.skipExtraction || isDirectSubtitleUrl || !isZipBuffer) {
            console.log('Skipping extraction (either requested, direct URL, or not a ZIP buffer)')

            let finalDestination = destination
            const destExt = extname(destination).toLowerCase()

            // If destination has no extension, try to detect one
            if (!destExt || destExt === '.') {
              let detectedExt = ''

              // 1. Check if it's a direct url first
              if (isDirectSubtitleUrl) {
                const match = downloadUrl.match(/\.(srt|ass|vtt|ssa|sub)$/i)
                if (match) detectedExt = match[0].toLowerCase()
              }

              // 2. Try Content-Disposition
              if (
                !detectedExt &&
                downloadResult &&
                typeof downloadResult === 'object' &&
                downloadResult.headers
              ) {
                const disposition = downloadResult.headers['content-disposition']
                if (disposition) {
                  const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
                  if (filenameMatch && filenameMatch[1]) {
                    detectedExt = extname(filenameMatch[1]).toLowerCase()
                    console.log('[DEBUG] Detected extension from Content-Disposition:', detectedExt)
                  }
                }

                // 3. Try Content-Type if still unknown
                if (!detectedExt) {
                  const contentType = downloadResult.headers['content-type']
                  if (contentType) {
                    if (
                      contentType.includes('application/zip') ||
                      contentType.includes('application/x-zip-compressed')
                    )
                      detectedExt = '.zip'
                    else if (
                      contentType.includes('text/plain') ||
                      contentType.includes('application/x-subrip')
                    )
                      detectedExt = '.srt' // Guessing
                    else if (contentType.includes('application/x-ass')) detectedExt = '.ass'
                  }
                }
              }

              // 4. Fallback to URL extension — but only if buffer matches the extension type
              // If the URL says .zip but the buffer is NOT a zip, do NOT save as .zip
              if (!detectedExt) {
                const urlExt = extname(downloadUrl).toLowerCase()
                if (urlExt && urlExt !== '.zip') {
                  detectedExt = urlExt
                } else if (urlExt === '.zip' && !isZipBuffer) {
                  // URL claims zip but buffer says otherwise — treat as raw subtitle
                  detectedExt = '.srt'
                } else if (urlExt === '.zip' && isZipBuffer) {
                  detectedExt = '.zip'
                }
              }
              // Ultimate fallback
              if (!detectedExt) {
                detectedExt = isZipBuffer ? '.zip' : '.srt'
              }

              finalDestination = destination + detectedExt
              console.log(
                `[DEBUG] Added extension to destination: ${destination} -> ${finalDestination}`
              )
            }

            // Ensure destination directory exists
            const destDir = dirname(finalDestination)
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true })
            }

            fs.copyFileSync(tempPath, finalDestination)
            cleanupTemp()
            return {
              path: finalDestination,
              wasZip: false // Treated as single file (even if zip)
            }
          }

          // Try to open as ZIP
          let zip: any
          let zipEntries: any[] = []
          try {
            zip = new AdmZip(tempPath)
            zipEntries = zip.getEntries()
            if (zipEntries.length > 0) {
              isDefinitelyZip = true
            }
          } catch (e) {
            // Not a valid zip, will fall out of the outer try-catch and handle as single file later
            // But wait, we are INSIDE the try-catch for zip.
            // We should throw here to trigger the fallback, UNLESS we want to handle extraction errors differently.
            throw e
          }

          if (zipEntries.length === 0) {
            throw new Error(
              'Downloaded archive is empty or invalid (possibly RAR format which is not supported).'
            )
          }

          // --- Centralized episode matching via SubtitleMatcher waterfall ---
          // Passes: Anitomy → Guessit → Strict Regex (never matches year digits).
          // If only 1 subtitle in zip → used directly. If no match → throws.
          const isAnime = !!(options as any)?.isAnime
          let subtitleEntry = await findEpisodeInZip(zipEntries, {
            season: options?.startSeason,
            episode: options?.startEpisode,
            isAnime
          })

          // If no episode match and episode IS specified → try to derive from videoFilename
          if (subtitleEntry === null && options?.startEpisode === undefined && options?.videoFilename) {
            console.log('[Extraction] No episode in options, deriving from videoFilename...')
            const parserMode = (store?.get('parser_mode') ?? 'tv') as ParserMode
            const folderName = basename(dirname(options.videoFilename))
            const videoParsed = await parseMediaFilenameDispatcher(
              basename(options.videoFilename),
              folderName,
              parserMode
            )
            if (videoParsed.episode !== undefined || videoParsed.season !== undefined) {
              subtitleEntry = await findEpisodeInZip(zipEntries, {
                season: videoParsed.season ?? options?.startSeason,
                episode: videoParsed.episode,
                isAnime
              })
            }
          }

          // If we still have no match — log and throw to try next subtitle candidate
          if (subtitleEntry === null) {
            console.log('[Extraction] No subtitle match found in ZIP, trying next candidate...')
            throw new Error(`No episode ${options?.startEpisode ?? 'N/A'} found in ZIP archive`)
          }

          if (subtitleEntry) {
            console.log(`Extracting subtitle: ${subtitleEntry.entryName}`)
            // Extract to a temp dir
            const extractDir = join(os.tmpdir(), `tarjem_ext_${Date.now()}`)
            if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir)

            zip.extractEntryTo(subtitleEntry, extractDir, false, true)
            const extractedFilePath = join(extractDir, subtitleEntry.name)

            // Fix Extension Mismatch:
            // If the extracted file is .ass but destination is .srt (or generic),
            // update destination to match .ass so FFmpeg 'copy' logic works.
            const extractedExt = extname(subtitleEntry.name)
            const destExt = extname(destination)

            if (
              extractedExt &&
              (!destExt || extractedExt.toLowerCase() !== destExt.toLowerCase())
            ) {
              console.log(
                `Subtitle extension mismatch detected. Updating destination from '${destExt}' to '${extractedExt}'`
              )
              // Replace extension or append if missing
              if (destExt) {
                destination = destination.substring(0, destination.lastIndexOf('.')) + extractedExt
              } else {
                destination = destination + extractedExt
              }
            }

            // Move to destination
            const destDir = dirname(destination)
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

            fs.copyFileSync(extractedFilePath, destination)

            // Cleanup extraction
            try {
              fs.rmSync(extractDir, { recursive: true, force: true })
            } catch {}
            cleanupTemp()

            // Validate output file is not the ZIP
            try {
              const stat = fs.statSync(destination)
              if (stat.size === fs.statSync(tempPath).size && extname(destination) === '.zip') {
                // Should not happen, but sanity check
                throw new Error('Verification failed: Destination is still the ZIP file')
              }
            } catch (e) {}

            return {
              path: destination,
              originalFilename: options?.filename || 'unknown.zip',
              wasZip: true,
              extractedFilename: subtitleEntry.entryName
            }
          }

          // Should be unreachable due to check above, but for safety:
          throw new Error('No valid subtitle file found inside the downloaded ZIP archive.')
        } catch (zipError: unknown) {
          const errMsg = zipError instanceof Error ? zipError.message : String(zipError)
          console.log('ZIP Extraction Error:', errMsg)

          // CRITICAL: If the hex buffer check confirmed this was a ZIP (isZipBuffer=true),
          // or if we successfully opened it (isDefinitelyZip=true), we MUST throw.
          // Never silently fallthrough to copyFileSync for something declared as a ZIP.
          // Fallthrough is ONLY for content that was never a ZIP in the first place.
          if (
            isDefinitelyZip ||
            isZipBuffer ||
            errMsg.includes('No valid subtitle') ||
            errMsg.includes('empty or invalid') ||
            errMsg.includes('found in ZIP archive') ||
            errMsg.includes('Verification failed')
          ) {
            throw new Error(
              `Failed to extract subtitle from ZIP (corrupt or empty download): ${errMsg}`
            )
          }

          // If we are here, AdmZip failed AND buffer check said it wasn't a ZIP.
          // Fallthrough to treat it as a raw subtitle file.
          console.log('[Extraction] Not a ZIP buffer - treating downloaded file as raw subtitle.')
        }

        // Last resort: move temp file to destination as-is.
        // This only runs if buffer check said NOT a zip AND AdmZip also failed.
        const destDir = dirname(destination)
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

        // Give it a .srt extension if destination has none, since we believe it's raw text
        let rawDestination = destination
        if (!extname(destination)) {
          rawDestination = destination + '.srt'
        }

        fs.copyFileSync(tempPath, rawDestination)
        cleanupTemp()

        return {
          path: rawDestination,
          originalFilename: options?.filename || basename(rawDestination),
          wasZip: false
        }
      } catch (error) {
        console.error('Download Handler Error:', error)
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
        } catch {}
        throw error
      }
    }
  )

  // Hashing operations
  ipcMain.handle('hash:calculate', async (event, filePath) => {
    try {
      console.log(`Calculating hash for: ${filePath}`)
      if (!hashCalculator) throw new Error('HashCalculator not initialized')

      // Validate file exists
      const fs = require('fs')
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      // Use OpenSubtitles hash (fast)
      event.sender.send('hash:progress', 10)
      const hash = await hashCalculator.calculateHash(filePath)
      event.sender.send('hash:progress', 100)
      console.log(`Hash calculated: ${hash}`)
      return hash
    } catch (error) {
      console.error('Hashing error in main process:', error)
      throw error
    }
  })

  // Merger operations
  ipcMain.handle('merger:start', async (event, options) => {
    try {
      if (!ffmpegService) throw new Error('FFmpegService not initialized')

      const { videoPath, subtitlePath, outputPath } = options

      if (!videoPath || !subtitlePath || !outputPath) {
        throw new Error('Missing arguments for merge')
      }

      // FFmpeg Guard: Verify input files exist and subtitle is not empty
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file does not exist: ${videoPath}`)
      }
      if (!fs.existsSync(subtitlePath)) {
        throw new Error(`Subtitle file does not exist: ${subtitlePath}`)
      }

      const subStat = fs.statSync(subtitlePath)
      if (subStat.size < 500) {
        throw new Error(
          `Subtitle file is too small (${subStat.size} bytes), rejecting merge: ${subtitlePath}`
        )
      }

      console.log('Starting merge process...')
      console.log('Video:', videoPath)
      console.log('Subtitle:', subtitlePath)
      console.log('Output:', outputPath)

      // Ensure output directory exists from Main process
      const outputDir = dirname(outputPath)
      if (!fs.existsSync(outputDir)) {
        console.log(`Creating output directory: ${outputDir}`)
        fs.mkdirSync(outputDir, { recursive: true })
      }

      await ffmpegService.mergeMedia(videoPath, subtitlePath, outputPath, (progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('merger:progress', progress)
        }
      })

      console.log('Merge completed successfully')
      return { success: true }
    } catch (error) {
      console.error('Merge failed:', error)
      throw error
    }
  })

  // Alass subtitle sync
  ipcMain.handle('alass:sync', async (_event, options) => {
    const { videoPath, inputSubPath, outputSubPath } = options
    if (!videoPath || !inputSubPath || !outputSubPath) {
      throw new Error('[Alass] Missing required arguments: videoPath, inputSubPath, outputSubPath')
    }
    await syncSubtitle(videoPath, inputSubPath, outputSubPath)
    return { success: true, path: outputSubPath }
  })

  // Settings
  ipcMain.handle('settings:get', (_event, key) => {
    return store?.get(key)
  })

  ipcMain.handle('settings:set', (_event, key, value) => {
    store?.set(key, value)
    return true
  })

  // Utility handlers
  ipcMain.handle('utils:parseFilename', async (_event, filename, folderName) => {
    const parserMode = (store?.get('parser_mode') ?? 'tv') as ParserMode
    // Pass the full path (filename may be a full path from episode.path); the dispatcher
    // extracts path.dirname internally for Smart Path Context Injection.
    return parseMediaFilenameDispatcher(filename, folderName, parserMode)
  })

  ipcMain.handle('utils:deleteFile', async (_event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log('Deleted file:', filePath)
        return true
      }
      return false
    } catch (error: any) {
      console.error('Failed to delete file:', error.message)
      throw error
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
