import { create } from 'zustand'

// ── Phase definitions ─────────────────────────────────────────────────────────

export type LogPhase = 'TITLE' | 'SEARCH' | 'DOWNLOAD' | 'SYNC' | 'MERGE'

export const PHASE_META: Record<LogPhase, { label: string; order: number }> = {
  TITLE:    { label: 'Title Resolution', order: 0 },
  SEARCH:   { label: 'Subtitle Search',  order: 1 },
  DOWNLOAD: { label: 'Download',         order: 2 },
  SYNC:     { label: 'Sync (Alass)',     order: 3 },
  MERGE:    { label: 'Merge',            order: 4 }
}

// ── Data types ────────────────────────────────────────────────────────────────

export interface LogStep {
  id: string
  timestamp: Date
  message: string
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING'
  detail?: string
  phase: LogPhase
}

export interface ProcessLogMetadata {
  title?: string
  episode?: number
  season?: number
  year?: number
  parserUsed?: string
  anilistId?: number
  malId?: number
  releaseGroup?: string
  resolution?: string
  source?: string
  anilistVerified?: boolean
  type?: string
}

export interface ProcessLogSyncInfo {
  fpsMismatch?: number    // e.g. 4.27  (percent)
  fpsRatio?: number       // e.g. 1.042709
  shiftSeconds?: number   // max block shift alass applied
  accepted: boolean       // did the sync pass the threshold?
  skipped?: boolean       // was sync skipped (no alass binary, corrupt sub, etc.)
  skipReason?: string
}

export interface ProcessLog {
  id: string
  timestamp: Date
  filename: string
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'WARNING'
  steps: LogStep[]
  metadata?: ProcessLogMetadata
  providerResults?: Record<string, number>  // provider name → result count
  syncInfo?: ProcessLogSyncInfo
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface LogState {
  logs: ProcessLog[]

  createLog: (id: string, filename: string) => void
  addStep: (
    logId: string,
    message: string,
    type?: LogStep['type'],
    detail?: string,
    phase?: LogPhase
  ) => void
  setMetadata: (logId: string, metadata: ProcessLogMetadata) => void
  setProviderResults: (logId: string, results: Record<string, number>) => void
  setSyncInfo: (logId: string, info: ProcessLogSyncInfo) => void
  updateStatus: (logId: string, status: ProcessLog['status']) => void
  clearLogs: () => void
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],

  createLog: (id, filename) =>
    set((state) => {
      const existing = state.logs.find((l) => l.id === id)
      if (existing) {
        return {
          logs: state.logs.map((l) =>
            l.id === id ? { ...l, timestamp: new Date(), status: 'IN_PROGRESS', steps: [] } : l
          )
        }
      }
      return {
        logs: [
          {
            id,
            timestamp: new Date(),
            filename,
            status: 'IN_PROGRESS',
            steps: []
          },
          ...state.logs
        ]
      }
    }),

  addStep: (logId, message, type = 'INFO', detail, phase = 'TITLE') =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId
          ? {
              ...log,
              steps: [
                ...log.steps,
                {
                  id: Math.random().toString(36).substr(2, 9),
                  timestamp: new Date(),
                  message,
                  type,
                  detail,
                  phase
                }
              ]
            }
          : log
      )
    })),

  updateStatus: (logId, status) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === logId ? { ...log, status } : log))
    })),

  setMetadata: (logId, metadata) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId ? { ...log, metadata: { ...log.metadata, ...metadata } } : log
      )
    })),

  setProviderResults: (logId, results) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId ? { ...log, providerResults: results } : log
      )
    })),

  setSyncInfo: (logId, info) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId ? { ...log, syncInfo: info } : log
      )
    })),

  clearLogs: () => set({ logs: [] })
}))
