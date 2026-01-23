import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  
  // File operations (to be implemented)
  files: {
    selectFiles: () => ipcRenderer.invoke('dialog:openFile'),
    onFileDrop: (callback: (files: any[]) => void) => {
      ipcRenderer.on('file:drop', (_, files) => callback(files))
    }
  },
  
  // Hashing operations (to be implemented)
  hashing: {
    calculateHash: (filePath: string) => ipcRenderer.invoke('hash:calculate', filePath),
    onProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('hash:progress', (_, progress) => callback(progress))
    }
  },
  
  // Subtitle operations (to be implemented)
  subtitles: {
    search: (query: string, language?: string) => 
      ipcRenderer.invoke('subtitle:searchByQuery', query, language),
    searchByHash: (hash: string, language?: string) => 
      ipcRenderer.invoke('subtitle:searchByHash', hash, language),
    download: (url: string, destination: string) => 
      ipcRenderer.invoke('subtitle:download', url, destination)
  },
  
  // Merger operations (to be implemented)
  merger: {
    mergeMedia: (options: any) => ipcRenderer.invoke('merger:start', options),
    onProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('merger:progress', (_, progress) => callback(progress))
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

