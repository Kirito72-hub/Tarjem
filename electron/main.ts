import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanFolderForMedia } from './services/fileScanner';
import { runFileMatchJob, runMergeJob, isMockPipelineEnabled } from './services/processingService';
import { searchSubtitlesByQuery } from './services/openSubtitlesClient';
import { runMockWebSearch } from './services/mockPipeline';
import type { FileMatchJob, MergeJob } from './processingTypes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Window state persistence
interface WindowState {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized: boolean;
}

const defaultWindowState: WindowState = {
    width: 1400,
    height: 900,
    isMaximized: false,
};

function createWindow() {
    // Load saved window state or use defaults
    const windowState = { ...defaultWindowState };

    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 1024,
        minHeight: 700,
        frame: false, // Frameless for custom titlebar
        transparent: false,
        backgroundColor: '#0f1419',
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        show: false, // Don't show until ready
    });

    // Restore maximized state
    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Load the app
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    registerIpcHandlers();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
function registerIpcHandlers() {
    // Window control handlers
    ipcMain.handle('window:minimize', () => {
        mainWindow?.minimize();
    });

    ipcMain.handle('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
        return mainWindow?.isMaximized();
    });

    ipcMain.handle('window:close', () => {
        mainWindow?.close();
    });

    ipcMain.handle('window:isMaximized', () => {
        return mainWindow?.isMaximized();
    });

    // File/Folder selection
    ipcMain.handle('dialog:selectFolder', async () => {
        if (!mainWindow) return null;

        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Folder with Video Files',
        });

        if (result.canceled) {
            return null;
        }
        return result.filePaths[0];
    });

    ipcMain.handle('files:scan', async (_event, folderPath: string) => {
        if (!folderPath || typeof folderPath !== 'string') {
            return [];
        }
        try {
            return await scanFolderForMedia(folderPath);
        } catch (error) {
            console.error('files:scan failed:', error);
            throw error;
        }
    });

    ipcMain.handle('pipeline:useMock', () => isMockPipelineEnabled());

    ipcMain.handle('processing:startFileMatch', async (_event, job: FileMatchJob) => {
        void runFileMatchJob(job, mainWindow);
        return { started: true };
    });

    ipcMain.handle('processing:startMerge', async (_event, job: MergeJob) => {
        void runMergeJob(job, mainWindow);
        return { started: true };
    });

    ipcMain.handle('subtitles:searchWeb', async (_event, query: string) => {
        const q = typeof query === 'string' ? query.trim() : '';
        if (!q) return { results: [], error: 'Search query is empty' };

        if (isMockPipelineEnabled()) {
            try {
                const results = await runMockWebSearch(q);
                return { results, error: null };
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Mock search failed';
                return { results: [], error: message };
            }
        }

        try {
            const results = await searchSubtitlesByQuery(q);
            return { results, error: null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Search failed';
            return { results: [], error: message };
        }
    });
}
