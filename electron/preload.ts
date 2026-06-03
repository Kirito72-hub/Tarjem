import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { ProcessingProgressEvent } from './processingTypes';

const electronAPI = {
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    },

    dialog: {
        selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    },

    files: {
        scanFolder: (folderPath: string) => ipcRenderer.invoke('files:scan', folderPath),
    },

    pipeline: {
        useMock: () => ipcRenderer.invoke('pipeline:useMock'),
    },

    processing: {
        startFileMatch: (job: {
            episodeId: string;
            filePath: string;
            filename: string;
        }) => ipcRenderer.invoke('processing:startFileMatch', job),
        startMerge: (job: {
            episodeId: string;
            videoPath: string;
            filename: string;
            removeOldSubs: boolean;
            removeOtherAudio: boolean;
            setDefaultSub: boolean;
        }) => ipcRenderer.invoke('processing:startMerge', job),
        onProgress: (callback: (payload: ProcessingProgressEvent) => void) => {
            const listener = (_event: IpcRendererEvent, payload: ProcessingProgressEvent) => {
                callback(payload);
            };
            ipcRenderer.on('processing:progress', listener);
            return () => {
                ipcRenderer.removeListener('processing:progress', listener);
            };
        },
    },

    subtitles: {
        searchWeb: (query: string) =>
            ipcRenderer.invoke('subtitles:searchWeb', query) as Promise<{
                results: Array<{
                    id: string;
                    filename: string;
                    source: string;
                    language: string;
                    downloads: number;
                    rating: number;
                }>;
                error: string | null;
            }>,
    },
};

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    } catch (error) {
        console.error('Failed to expose electronAPI:', error);
    }
} else {
    (window as unknown as { electronAPI: typeof electronAPI }).electronAPI = electronAPI;
}
