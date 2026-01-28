export enum ProcessingStage {
  IDLE = 'IDLE',
  HASHING = 'HASHING',
  SEARCHING = 'SEARCHING',
  REVIEW = 'REVIEW',
  MERGING = 'MERGING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface EpisodeFile {
  id: string
  path: string // Absolute path to file
  filename: string
  size: string // Display string like "1.4 GB"
  progress: number // 0 to 100
  stage: ProcessingStage
  statusMessage: string
  thumbnailUrl?: string // Optional placeholder image
  selected: boolean
  fileType: 'VIDEO' | 'SUBTITLE'
  searchResults?: SubtitleResult[]
}

export interface SubtitleResult {
  id: string
  filename: string
  source: string
  language: string
  downloads: number
  rating: number // 0-5
  url: string
  owner?: string
  hi?: boolean
  subtitleType?: string
  caption?: string
}

export interface SubtitleSource {
  id: string
  name: string
  url: string
  enabled: boolean
}

export interface MergeOptions {
  removeOldSubs: boolean
  removeOtherAudio: boolean
  setDefaultSub: boolean
  embedFonts: boolean
}

export type View = 'DASHBOARD' | 'SETTINGS' | 'LOGS'
export type DashboardTab = 'FILE_MATCH' | 'WEB_SEARCH' | 'MERGER'

export interface ElectronAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    onWindowStateChange: (callback: (state: 'maximized' | 'normal') => void) => void
  }
  files: {
    selectFiles: (tab?: DashboardTab) => Promise<string[]>
    onFileDrop: (callback: (files: any[]) => void) => void
  }
  hashing: {
    calculateHash: (filePath: string) => Promise<string>
    onProgress: (callback: (progress: number) => void) => () => void
  }
  subtitles: {
    search: (query: string, language?: string, metadata?: any) => Promise<any>
    searchByHash: (hash: string, language?: string) => Promise<any>
    searchByQuery: (query: string, language?: string) => Promise<any>
    download: (downloadData: any, destination: string) => Promise<string>
  }
  utils: {
    parseFilename: (filename: string) => Promise<any>
  }
  subdl: {
    search: (query: string, language?: string) => Promise<any>
  }
  merger: {
    mergeMedia: (options: {
      videoPath: string
      subtitlePath: string
      outputPath: string
    }) => Promise<{ success: boolean }>
    onProgress: (callback: (progress: number) => void) => () => void
  }
  settings: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
  }
}
