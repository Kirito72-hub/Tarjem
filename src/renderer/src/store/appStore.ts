import { create } from 'zustand'
import { FileInfo, TabType, UserSettings } from '../../../types'

interface AppState {
  files: FileInfo[]
  activeTab: TabType
  settings: UserSettings
  
  // Actions
  setActiveTab: (tab: TabType) => void
  addFiles: (files: FileInfo[]) => void
  removeFile: (id: string) => void
  updateFileStatus: (id: string, status: FileInfo['status'], progress?: number, error?: string) => void
  clearFiles: () => void
  updateSettings: (settings: Partial<UserSettings>) => void
}

export const useAppStore = create<AppState>((set) => ({
  files: [],
  activeTab: 'auto',
  settings: {
    preferredLanguages: ['en'],
    enabledSources: ['opensubtitles'],
    autoDownload: true,
    defaultOutputPath: ''
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  addFiles: (newFiles) => set((state) => ({
    files: [...state.files, ...newFiles]
  })),

  removeFile: (id) => set((state) => ({
    files: state.files.filter((file) => file.id !== id)
  })),

  updateFileStatus: (id, status, progress, error) => set((state) => ({
    files: state.files.map((file) =>
      file.id === id
        ? { ...file, status, progress, error }
        : file
    )
  })),

  clearFiles: () => set({ files: [] }),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  }))
}))
