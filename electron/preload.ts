import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
    // Window Controls
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    },

    // Dialog
    dialog: {
        selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    } catch (error) {
        console.error('Failed to expose electronAPI:', error);
    }
} else {
    // @ts-ignore (define in dts)
    window.electronAPI = electronAPI;
}
