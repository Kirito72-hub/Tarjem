// DEBUG: Check execution context
console.log('--- DEBUG START ---')
console.log('ENV CHECK - ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE)
console.log('EXECUTABLE PATH:', process.execPath)
console.log('Running in:', process.versions.electron ? 'Electron' : 'Node')
console.log('Process Type:', process.type)
console.log('--- DEBUG END ---')

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, extname } from 'path'
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
import { parseMediaFilename } from './utils/guessitParser'
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
    ...(process.platform === 'linux' ? { icon } : {}),
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
  ipcMain.on('ping', () => console.log('pong'))

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
                      result.title.romaji ||
                      result.title.english ||
                      result.title.native ||
                      metadata.title,
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
      }
    ) => {
      console.log('Downloading subtitle:', url, 'to', destination)

      const tempPath = join(os.tmpdir(), `tarjem_dl_${Date.now()}`)
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
            const actualPath = await subSourceService.downloadSubtitle(id, destination, {
              startSeason: options?.startSeason,
              startEpisode: options?.startEpisode
            })
            // If the service returns a path (which it should now), use it. Fallback to destination.
            return actualPath || destination
          } else {
            throw new Error('SubSource service not initialized')
          }
        } else {
          downloadUrl = url
        }

        if (!downloadUrl) throw new Error('Could not resolve download URL')

        // Download to temp file
        await downloader.downloadFile(downloadUrl, tempPath)

        const cleanupTemp = () => {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
          } catch (err) {
            console.error('Failed to cleanup temp file:', err)
          }
        }

        try {
          // Try to open as ZIP
          const zip = new AdmZip(tempPath)
          const zipEntries = zip.getEntries()

          if (zipEntries.length === 0) {
            throw new Error(
              'Downloaded archive is empty or invalid (possibly RAR format which is not supported).'
            )
          }

          // Helper to check if file matches requested episode
          const isMatchingEpisode = (filename: string): boolean => {
            if (!options?.startSeason || !options?.startEpisode) return false
            // Use the main filename parser to check internal files
            const parsed = parseMediaFilename(filename)
            return parsed.season === options.startSeason && parsed.episode === options.startEpisode
          }

          const validExtensions = ['.srt', '.ass', '.ssa', '.vtt', '.sub', '.idx']

          // Find best subtitle file
          // 1. Exact Season/Episode match
          let subtitleEntry = zipEntries.find((entry) => {
            const lowerName = entry.entryName.toLowerCase()
            return (
              validExtensions.some((ext) => lowerName.endsWith(ext)) &&
              isMatchingEpisode(entry.entryName)
            )
          })

          if (subtitleEntry) {
            console.log(`Found matching episode in ZIP: ${subtitleEntry.entryName}`)
          } else {
            console.log('No exact episode match in ZIP, checking for generic/single files...')
            // 2. Fallback: find any valid subtitle file
            // But REJECT files that have a DIFFERENT season than requested
            
            // Refine requested Season/Episode using videoFilename if available (and if startEpisode is missing)
            let requestedSeason = options?.startSeason || 1
            let requestedEpisode = options?.startEpisode

            if (requestedEpisode === undefined && options?.videoFilename) {
               console.log('[DEBUG] startEpisode missing, attempting to parse videoFilename:', options.videoFilename)
               const videoParsed = parseMediaFilename(options.videoFilename)
               if (videoParsed.episode !== undefined) {
                 requestedEpisode = videoParsed.episode
                 console.log('[DEBUG] Extracted episode from videoFilename:', requestedEpisode)
               }
               if (videoParsed.season !== undefined) {
                 requestedSeason = videoParsed.season
                 console.log('[DEBUG] Extracted season from videoFilename:', requestedSeason)
               }
            }

            console.log(`[DEBUG] requestedSeason=${requestedSeason}, requestedEpisode=${requestedEpisode}`)

            const isSeasonCompatible = (filename: string): boolean => {
              const parsed = parseMediaFilename(filename)
              // If the subtitle has a season marker and it doesn't match, reject it
              if (parsed.season !== undefined && parsed.season !== requestedSeason) {
                console.log(
                  `Rejecting ${filename} (S${parsed.season}) - requested S${requestedSeason}`
                )
                return false
              }
              return true
            }

            // NEW: Episode matching for fallback
            const isEpisodeCompatible = (filename: string): boolean => {
              if (requestedEpisode === undefined) return true // No specific episode, accept all
              const parsed = parseMediaFilename(filename)
              // If subtitle has episode and it matches, accept it
              // If subtitle has no episode, accept it (might be a single-file or pack)
              if (parsed.episode === undefined) return true
              return parsed.episode === requestedEpisode
            }

            // DEBUG: List all .ass entries with their parsed episode numbers
            const assEntries = zipEntries.filter((e) => e.entryName.toLowerCase().endsWith('.ass'))
            console.log(`[DEBUG] ZIP contains ${assEntries.length} .ass files:`)
            assEntries.slice(0, 10).forEach((e) => {
              const parsed = parseMediaFilename(e.entryName)
              console.log(`  - ${e.entryName} -> Episode: ${parsed.episode}`)
            })

            // Priority 1: Try to find files matching BOTH season AND episode
            subtitleEntry = zipEntries.find(
              (entry) =>
                entry.entryName.toLowerCase().endsWith('.srt') &&
                isSeasonCompatible(entry.entryName) &&
                isEpisodeCompatible(entry.entryName)
            )

            if (!subtitleEntry) {
              subtitleEntry = zipEntries.find(
                (entry) =>
                  entry.entryName.toLowerCase().endsWith('.ass') &&
                  isSeasonCompatible(entry.entryName) &&
                  isEpisodeCompatible(entry.entryName)
              )
            }

            if (!subtitleEntry) {
              subtitleEntry = zipEntries.find((entry) => {
                const lowerName = entry.entryName.toLowerCase()
                return (
                  validExtensions.some((ext) => lowerName.endsWith(ext)) &&
                  isSeasonCompatible(entry.entryName) &&
                  isEpisodeCompatible(entry.entryName)
                )
              })
            }

            // Priority 2: If no episode match found...
            // If requestedEpisode is undefined (batch/pack), and we haven't found a match yet,
            // just pick the FIRST valid subtitle file we found (from the earlier filtering).
            if (!subtitleEntry && requestedEpisode === undefined) {
               const anySub = zipEntries.find(e => validExtensions.some(ext => e.entryName.toLowerCase().endsWith(ext)));
               if (anySub) {
                 console.log('No specific episode requested, picking first subtitle found:', anySub.entryName)
                 subtitleEntry = anySub
               }
            }

            if (!subtitleEntry) {
              console.log('No episode match found in ZIP, rejecting to try next candidate...')
              // Clean up the zip file before throwing
              try {
                if (fs.existsSync(destination)) fs.unlinkSync(destination)
              } catch {
                // ignore
              }
              throw new Error(`No episode ${options?.startEpisode || 'N/A'} found in ZIP archive`)
            }
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
               const stat = fs.statSync(destination);
               if (stat.size === fs.statSync(tempPath).size && extname(destination) === '.zip') {
                  // Should not happen, but sanity check
                  throw new Error('Verification failed: Destination is still the ZIP file');
               }
            } catch (e) {}

            return destination
          }
          
          // Should be unreachable due to check above, but for safety:
          throw new Error('No valid subtitle file found inside the downloaded ZIP archive.')

        } catch (zipError: unknown) {
          const errMsg = zipError instanceof Error ? zipError.message : String(zipError)
          console.log('ZIP Extraction Error:', errMsg)
          
          // CRITICAL: If we successfully opened as ZIP (entries > 0) but failed to find sub,
          // OR if extraction failed, we MUST FAIL. Do not fallback to copying the ZIP.
          // The fallback below is ONLY for when AdmZip fails to parse (i.e. not a zip).
          
          // If the error message indicates we looked inside and failed, re-throw.
          if (
            errMsg.includes('No valid subtitle') ||
            errMsg.includes('empty or invalid') ||
            errMsg.includes('found in ZIP archive') ||
            errMsg.includes('Verification failed')
          ) {
            throw zipError
          }
          
          // If we are here, AdmZip might have failed to parse headers (invalid zip).
          // Fallthrough to treat as single file.
        }

        // Move temp file to destination (if not already handled by zip extraction)
        // Ensure destination directory exists
        const destDir = dirname(destination)
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

        fs.copyFileSync(tempPath, destination)
        cleanupTemp()

        return destination
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

  // Settings
  ipcMain.handle('settings:get', (_event, key) => {
    return store?.get(key)
  })

  ipcMain.handle('settings:set', (_event, key, value) => {
    store?.set(key, value)
    return true
  })

  // Utility handlers
  ipcMain.handle('utils:parseFilename', (_event, filename) => {
    return parseMediaFilename(filename)
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
