// DEBUG: Check execution context
console.log('--- DEBUG START ---');
console.log('ENV CHECK - ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);
console.log('EXECUTABLE PATH:', process.execPath);
console.log('Running in:', process.versions.electron ? 'Electron' : 'Node');
console.log('Process Type:', process.type);
console.log('--- DEBUG END ---');

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { OpenSubtitlesService, SubDLService } from './services/subtitleApi'
import { HashCalculator } from './services/hashCalculator'
import { Downloader } from './services/downloader'

let store: any;

function createWindow(): void {
  // Check if running in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

  console.log('App ready, initializing services...');
  // Initialize electron-store dynamically
  const { default: Store } = await import('electron-store');
  store = new Store();

  let subtitleService, subdlService, hashCalculator, downloader;

  try {
      subtitleService = new OpenSubtitlesService(store);
      subdlService = new SubDLService(store);
      hashCalculator = new HashCalculator();
      downloader = new Downloader();
      console.log('Services initialized successfully');
  } catch (err) {
      console.error('Failed to initialize services:', err);
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
  ipcMain.handle('dialog:openFile', async (event, tab?: 'FILE_MATCH' | 'MERGER') => {
    console.log('dialog:openFile called with tab:', tab);
    
    // Determine file filters based on the active tab
    const filters = tab === 'FILE_MATCH'
      ? [
          { name: 'Video Files', extensions: ['avi', 'mkv', 'mp4'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      : [
          { name: 'Media & Subtitles', extensions: ['mkv', 'mp4', 'avi', 'srt', 'ass', 'vtt', 'sub'] },
          { name: 'All Files', extensions: ['*'] }
        ];

    console.log('Using filters:', filters);

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
  ipcMain.handle('subtitle:searchByHash', async (_event, hash, language) => {
      try {
        console.log(`Searching for hash: ${hash}`);
        
        const results: any[] = [];
        
        // Try OpenSubtitles
        if (subtitleService) {
          try {
            const osResults = await subtitleService.searchByHash(hash, language);
            if (osResults?.data && Array.isArray(osResults.data)) {
              console.log(`OpenSubtitles found ${osResults.data.length} results`);
              results.push(...osResults.data);
            }
          } catch (error) {
            console.error('OpenSubtitles search failed:', error);
          }
        }
        
        // Try SubDL (if it supports hash search in the future)
        // SubDL currently doesn't support hash-based search, only query-based
        
        console.log(`Total results from all sources: ${results.length}`);
        
        if (results.length === 0) {
          console.log('No subtitles found from any configured API');
        }
        
        return results;
      } catch (error) {
        console.error('Subtitle Search Error:', error);
        throw error;
      }
  });
  
  ipcMain.handle('subdl:search', async (_event, query, language) => {
      if (!subdlService) throw new Error('SubDLService not initialized');
      return await subdlService.search(query, language);
  });

  ipcMain.handle('subtitle:download', async (_event, downloadData, destination) => {
      let downloadUrl = '';
      try {
          if (!subtitleService || !downloader) throw new Error('Services not initialized');

          if (typeof downloadData === 'string') {
              if (downloadData.startsWith('opensubtitles://')) {
                  const fileId = parseInt(downloadData.replace('opensubtitles://', ''), 10);
                  const linkData = await subtitleService.getDownloadLink(fileId);
                  downloadUrl = linkData.link;
              } else {
                  downloadUrl = downloadData;
              }
          } else if (downloadData.service === 'opensubtitles') {
              const linkData = await subtitleService.getDownloadLink(downloadData.file_id);
              downloadUrl = linkData.link;
          } else {
             throw new Error('Unknown download data format');
          }

          if (!downloadUrl) throw new Error('Could not resolve download URL');

          return await downloader.downloadFile(downloadUrl, destination);
      } catch (error) {
          console.error('Download Handler Error:', error);
          throw error;
      }
  });

  // Hashing operations
  ipcMain.handle('hash:calculate', async (event, filePath) => {
    try {
        console.log(`Calculating hash for: ${filePath}`);
        if (!hashCalculator) throw new Error('HashCalculator not initialized');

        // Validate file exists
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const hash = await hashCalculator.calculateMD5(filePath, (progress) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('hash:progress', progress);
            }
        });
        console.log(`Hash calculated: ${hash}`);
        return hash;
    } catch (error) {
        console.error('Hashing error in main process:', error);
        throw error;
    }
  });

  // Settings
  ipcMain.handle('settings:get', (_event, key) => {
    return store.get(key);
  });

  ipcMain.handle('settings:set', (_event, key, value) => {
    store.set(key, value);
    return true;
  });

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
