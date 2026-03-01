import { create } from 'zustand'

export interface LogStep {
  id: string
  timestamp: Date
  message: string
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING'
  detail?: string
}

export interface ProcessLog {
  id: string
  timestamp: Date
  filename: string
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'WARNING'
  steps: LogStep[]
}

interface LogState {
  logs: ProcessLog[]

  // Actions
  createLog: (id: string, filename: string) => void
  addStep: (logId: string, message: string, type?: LogStep['type'], detail?: string) => void
  updateStatus: (logId: string, status: ProcessLog['status']) => void
  clearLogs: () => void
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],

  createLog: (id, filename) =>
    set((state) => {
      // Prevent duplicates if already exists (restart it?)
      const existing = state.logs.find((l) => l.id === id)
      if (existing) {
        // Reset mostly
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

  addStep: (logId, message, type = 'INFO', detail) =>
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
                  detail
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

  clearLogs: () => set({ logs: [] })
}))
