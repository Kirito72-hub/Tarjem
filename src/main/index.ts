// DEBUG: Check execution context
console.log('--- DEBUG START ---')
console.log('ENV CHECK - ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE)
console.log('EXECUTABLE PATH:', process.execPath)
console.log('Running in:', process.versions.electron ? 'Electron' : 'Node')
console.log('Process Type:', process.type)
console.log('--- DEBUG END ---')

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
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
import { parseFilename } from './utils/filenameParser'
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
    mainWindow.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:unmaximized')
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
    providerRegistry.register(new SubSourceService(subSourceKey as string))
    
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
  ipcMain.handle('dialog:openFile', async (event, tab?: 'FILE_MATCH' | 'MERGER' | 'DIRECTORY') => {
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
  ipcMain.handle('subtitle:searchByHash', async (_event, hash, language, enabledSources?: string[]) => {
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
  })

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
                    title: result.title.romaji || result.title.english || result.title.native || metadata.title,
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
        let enrichedMetadata = finalMetadata ? { ...metadata, ...finalMetadata } : { ...metadata }

        // Fix logic: If we have AniList/MAL IDs, it IS anime, even if parser thinks otherwise or cache is old
        if (finalMetadata && (finalMetadata.anilistId || finalMetadata.malId)) {
          enrichedMetadata.isAnime = true
        }

        // Handle legacy cache: Title might be an object
        if (typeof enrichedMetadata.title === 'object' && enrichedMetadata.title !== null) {
          const t: any = enrichedMetadata.title
          enrichedMetadata.title = t.romaji || t.english || t.native || metadata.title
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

          // Helper to check if file matches requested episode
          const isMatchingEpisode = (filename: string): boolean => {
            if (!options?.startSeason || !options?.startEpisode) return false
            // Use the main filename parser to check internal files
            const parsed = parseFilename(filename)
            return parsed.season === options.startSeason && parsed.episode === options.startEpisode
          }

          // Find best subtitle file
          // 1. Exact Season/Episode match
          let subtitleEntry = zipEntries.find(
            (entry) =>
              (entry.entryName.toLowerCase().endsWith('.srt') ||
                entry.entryName.toLowerCase().endsWith('.ass')) &&
              isMatchingEpisode(entry.entryName)
          )

          if (subtitleEntry) {
            console.log(`Found matching episode in ZIP: ${subtitleEntry.entryName}`)
          } else {
            console.log('No exact episode match in ZIP, checking for generic/single files...')
            // 2. Fallback: standard check (first .srt then .ass)
            subtitleEntry = zipEntries.find((entry) =>
              entry.entryName.toLowerCase().endsWith('.srt')
            )
            if (!subtitleEntry) {
              subtitleEntry = zipEntries.find((entry) =>
                entry.entryName.toLowerCase().endsWith('.ass')
              )
            }
          }

          if (subtitleEntry) {
            console.log(`Extracting subtitle: ${subtitleEntry.entryName}`)
            // Extract to a temp dir
            const extractDir = join(os.tmpdir(), `tarjem_ext_${Date.now()}`)
            if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir)

            zip.extractEntryTo(subtitleEntry, extractDir, false, true)
            const extractedFilePath = join(extractDir, subtitleEntry.name)

            // Move to destination
            // Ensure destination directory exists
            const destDir = dirname(destination)
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

            fs.copyFileSync(extractedFilePath, destination)

            // Cleanup extraction
            try {
              fs.rmSync(extractDir, { recursive: true, force: true })
            } catch {}
            cleanupTemp()
            return true
          }
          // If valid zip but no subtitle found, fall through?
          // Or maybe throw? For now let's fall through and assume the file itself might be usable or user intervention needed.
          // But actually if it was a ZIP and we didn't search properly, moving the ZIP to .srt path is bad.
          // Let's assume if AdmZip didn't throw, it IS a zip.
          console.warn('ZIP found but no .srt/.ass inside. Moving original file.')
        } catch (zipError) {
          // Not a zip, ignore and proceed to move tempPath to destination
          // console.log('Not a zip file or error reading zip, treating as direct file:', zipError);
        }

        // Move temp file to destination (if not already handled by zip extraction)
        // Ensure destination directory exists
        const destDir = dirname(destination)
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

        fs.copyFileSync(tempPath, destination)
        cleanupTemp()

        return true
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
    return store.get(key)
  })

  ipcMain.handle('settings:set', (_event, key, value) => {
    store.set(key, value)
    return true
  })

  // Utility handlers
  ipcMain.handle('utils:parseFilename', (_event, filename) => {
    return parseFilename(filename)
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
