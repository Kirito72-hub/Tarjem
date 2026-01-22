import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

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
}
