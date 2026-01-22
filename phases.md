# 🎬 AnimeSubMatcher (Tarjem) - Implementation Phases

> A comprehensive step-by-step development guide for building a premium anime subtitle matching desktop application.

---

## 📋 Table of Contents

1. [Phase 1: Foundation & Design System](#phase-1-foundation--design-system)
2. [Phase 2: UI Architecture & Component Library](#phase-2-ui-architecture--component-library)
3. [Phase 3: Electron Backend & IPC Layer](#phase-3-electron-backend--ipc-layer)
4. [Phase 4: Core Feature Implementation](#phase-4-core-feature-implementation)
5. [Phase 5: Subtitle Search & Download Pipeline](#phase-5-subtitle-search--download-pipeline)
6. [Phase 6: FFmpeg Integration & Merging](#phase-6-ffmpeg-integration--merging)
7. [Phase 7: Polish, Animations & UX Refinement](#phase-7-polish-animations--ux-refinement)
8. [Phase 8: Testing, Packaging & Distribution](#phase-8-testing-packaging--distribution)
9. [Suggested Future Features](#-suggested-future-features)

---

# Phase 1: Foundation & Design System

> **Goal:** Set up the project structure, configure build tools, and establish the core design system that matches the reference aesthetic.

## Step 1.1: Project Initialization

- [ ] Initialize Electron + Vite + React + TypeScript project
- [ ] Configure `package.json` with proper scripts
- [ ] Set up ESLint + Prettier for code consistency
- [ ] Configure TypeScript with strict mode

```bash
# Key dependencies to install
npm install electron electron-builder vite @vitejs/plugin-react
npm install react react-dom framer-motion
npm install -D typescript @types/react @types/node
npm install tailwindcss postcss autoprefixer
npm install fluent-ffmpeg @types/fluent-ffmpeg
```

## Step 1.2: Tailwind CSS Configuration

- [ ] Initialize Tailwind CSS
- [ ] Create custom color palette matching reference design
- [ ] Configure custom border-radius, shadows, and spacing
- [ ] Set up dark mode as default

```javascript
// tailwind.config.js - Reference Design Color Scheme
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core Background Colors (from reference #14181B)
        'app-bg': '#0f1419',
        'card-bg': '#1a1f2e',
        'card-hover': '#242937',
        'sidebar-bg': '#141821',
        
        // Accent Colors (Premium Streaming Vibe)
        'accent-primary': '#6366f1',    // Indigo
        'accent-secondary': '#8b5cf6',  // Purple
        'accent-success': '#10b981',    // Emerald
        'accent-warning': '#f59e0b',    // Amber
        'accent-error': '#ef4444',      // Red
        'accent-info': '#3b82f6',       // Blue
        
        // Text Colors
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        
        // Border & Divider
        'border-subtle': '#2d3548',
        'border-active': '#4f46e5',
        
        // Glass Effect
        'glass-bg': 'rgba(26, 31, 46, 0.8)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'badge': '8px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(99, 102, 241, 0.2)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.4)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)' },
        },
      },
    },
  },
  plugins: [],
};
```

## Step 1.3: Global Styles & CSS Variables

- [ ] Create `globals.css` with base styles
- [ ] Implement custom scrollbar styling
- [ ] Set up CSS custom properties for dynamic theming
- [ ] Configure font imports (Inter/Outfit)

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-primary: 'Inter', sans-serif;
  --font-display: 'Outfit', sans-serif;
}

* {
  scrollbar-width: thin;
  scrollbar-color: #2d3548 transparent;
}

*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: #2d3548;
  border-radius: 4px;
}

*::-webkit-scrollbar-thumb:hover {
  background: #4f46e5;
}

body {
  font-family: var(--font-primary);
  background-color: #0f1419;
  color: #f8fafc;
  overflow: hidden;
}

/* Glass Effect Utility */
.glass {
  background: rgba(26, 31, 46, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## Step 1.4: Electron Main Process Setup

- [ ] Create `electron/main.ts` with window configuration
- [ ] Implement frameless window with custom titlebar
- [ ] Configure window position persistence
- [ ] Set up dev/prod environment detection

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
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
    icon: path.join(__dirname, '../resources/icon.png'),
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

// Window control IPC handlers
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
```

---

# Phase 2: UI Architecture & Component Library

> **Goal:** Build the core UI components that match the premium streaming dashboard aesthetic.

## Step 2.1: Custom Titlebar Component

- [ ] Create draggable titlebar region
- [ ] Implement minimize/maximize/close buttons
- [ ] Add app logo and title
- [ ] Style with glass effect

## Step 2.2: Sidebar Navigation

- [ ] Build collapsible sidebar structure
- [ ] Create navigation items with icons
- [ ] Implement active state indicators
- [ ] Add folder selection trigger button

## Step 2.3: Episode Card Component (Core Component)

- [ ] Design card layout matching reference
- [ ] Implement thumbnail placeholder/poster
- [ ] Add status badge component
- [ ] Create progress bar with animation
- [ ] Implement hover effects with Framer Motion

```tsx
// components/EpisodeCard.tsx - With Framer Motion Animation
import { motion } from 'framer-motion';
import { FileVideo, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface EpisodeCardProps {
  id: string;
  filename: string;
  thumbnail?: string;
  status: 'pending' | 'hashing' | 'searching' | 'ready' | 'merging' | 'complete' | 'error';
  progress?: number;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

const statusConfig = {
  pending: { color: 'bg-text-muted', icon: FileVideo, label: 'Pending' },
  hashing: { color: 'bg-accent-info', icon: Loader2, label: 'Hashing...', animate: true },
  searching: { color: 'bg-accent-warning', icon: Loader2, label: 'Searching...', animate: true },
  ready: { color: 'bg-accent-success', icon: CheckCircle, label: 'Ready' },
  merging: { color: 'bg-accent-primary', icon: Loader2, label: 'Merging...', animate: true },
  complete: { color: 'bg-accent-success', icon: CheckCircle, label: 'Complete' },
  error: { color: 'bg-accent-error', icon: AlertCircle, label: 'Error' },
};

export function EpisodeCard({ 
  id, filename, thumbnail, status, progress = 0, index, isSelected, onSelect 
}: EpisodeCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        relative overflow-hidden rounded-card bg-card-bg 
        border transition-colors duration-200 cursor-pointer
        ${isSelected ? 'border-accent-primary shadow-glow' : 'border-border-subtle hover:border-border-active'}
      `}
    >
      {/* Thumbnail Area */}
      <div className="aspect-video bg-sidebar-bg relative overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={filename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileVideo className="w-12 h-12 text-text-muted" />
          </div>
        )}
        
        {/* Status Badge */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            absolute top-3 right-3 px-2.5 py-1 rounded-badge 
            flex items-center gap-1.5 text-xs font-medium
            ${config.color} text-white
          `}
        >
          <Icon className={`w-3.5 h-3.5 ${config.animate ? 'animate-spin' : ''}`} />
          {config.label}
        </motion.div>

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 left-3 w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="text-text-primary font-medium text-sm truncate mb-2">
          {filename}
        </h3>

        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <div className="h-1.5 bg-sidebar-bg rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
              style={{
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
              }}
            />
          </div>
        )}
      </div>

      {/* Hover Glow Effect */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-accent-primary/10 to-transparent"
      />
    </motion.div>
  );
}
```

## Step 2.4: Dashboard Grid Layout

- [ ] Implement responsive grid system
- [ ] Create animated list with stagger effect
- [ ] Add drag-and-drop zone
- [ ] Build empty state component

## Step 2.5: Status Badge System

- [ ] Create reusable StatusBadge component
- [ ] Define color variants for each state
- [ ] Add pulse animation for active states

## Step 2.6: Modal Components

- [ ] File selection modal
- [ ] Merge options modal
- [ ] Subtitle source selection modal
- [ ] Settings modal

---

# Phase 3: Electron Backend & IPC Layer

> **Goal:** Set up secure communication between renderer and main process.

## Step 3.1: Preload Script & Context Bridge

- [ ] Create `preload.ts` with typed API
- [ ] Expose safe IPC methods
- [ ] Implement file system access API
- [ ] Add window control methods

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Window Controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  
  // File System
  files: {
    selectFolder: () => ipcRenderer.invoke('files:select-folder'),
    scanFolder: (folderPath: string) => ipcRenderer.invoke('files:scan', folderPath),
    getVideoInfo: (filePath: string) => ipcRenderer.invoke('files:video-info', filePath),
  },
  
  // Video Hashing
  hash: {
    computeHash: (filePath: string) => ipcRenderer.invoke('hash:compute', filePath),
    onProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('hash:progress', (_, progress) => callback(progress));
    },
  },
  
  // Subtitle Operations
  subtitles: {
    search: (hash: string, filename: string) => ipcRenderer.invoke('subtitles:search', hash, filename),
    download: (subtitleId: string, savePath: string) => ipcRenderer.invoke('subtitles:download', subtitleId, savePath),
  },
  
  // FFmpeg Operations
  ffmpeg: {
    merge: (videoPath: string, subtitlePath: string, outputPath: string) => 
      ipcRenderer.invoke('ffmpeg:merge', videoPath, subtitlePath, outputPath),
    onProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('ffmpeg:progress', (_, progress) => callback(progress));
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

## Step 3.2: TypeScript Declarations

- [ ] Create `types/electron.d.ts`
- [ ] Define all IPC method types
- [ ] Export type-safe window.electronAPI

```typescript
// types/electron.d.ts
interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  files: {
    selectFolder: () => Promise<string | null>;
    scanFolder: (folderPath: string) => Promise<VideoFileInfo[]>;
    getVideoInfo: (filePath: string) => Promise<VideoMetadata>;
  };
  hash: {
    computeHash: (filePath: string) => Promise<string>;
    onProgress: (callback: (progress: number) => void) => void;
  };
  subtitles: {
    search: (hash: string, filename: string) => Promise<SubtitleResult[]>;
    download: (subtitleId: string, savePath: string) => Promise<string>;
  };
  ffmpeg: {
    merge: (videoPath: string, subtitlePath: string, outputPath: string) => Promise<void>;
    onProgress: (callback: (progress: number) => void) => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
```

## Step 3.3: IPC Handler Registration

- [ ] Create modular handler files
- [ ] Implement error handling wrapper
- [ ] Add logging for debugging
- [ ] Set up handler registration in main.ts

---

# Phase 4: Core Feature Implementation

> **Goal:** Implement video file scanning and the OpenSubtitles hash algorithm.

## Step 4.1: Video File Scanner

- [ ] Implement recursive folder scanning
- [ ] Filter for video extensions (.mkv, .mp4, .avi, .mov)
- [ ] Extract basic file metadata
- [ ] Return array of VideoFileInfo objects

```typescript
// electron/services/fileScanner.ts
import { readdir, stat } from 'fs/promises';
import path from 'path';

const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];

export interface VideoFileInfo {
  id: string;
  filename: string;
  filePath: string;
  size: number;
  extension: string;
}

export async function scanFolderForVideos(folderPath: string): Promise<VideoFileInfo[]> {
  const videos: VideoFileInfo[] = [];
  
  async function scanDirectory(dirPath: string) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.includes(ext)) {
          const fileStat = await stat(fullPath);
          videos.push({
            id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            filename: entry.name,
            filePath: fullPath,
            size: fileStat.size,
            extension: ext,
          });
        }
      }
    }
  }
  
  await scanDirectory(folderPath);
  return videos;
}
```

## Step 4.2: OpenSubtitles Hash Algorithm

- [ ] Implement the 64KB byte-offset hash
- [ ] Handle files smaller than 128KB
- [ ] Add progress reporting for large files
- [ ] Create hash worker for background processing

```typescript
// electron/services/videoHash.ts
import { open as fsOpen } from 'fs/promises';
import { BrowserWindow } from 'electron';

/**
 * OpenSubtitles Video Hash Algorithm
 * 
 * The hash is computed by:
 * 1. Taking the file size as a 64-bit number
 * 2. Reading the first 64KB of the file
 * 3. Reading the last 64KB of the file
 * 4. Summing all 64-bit words from both chunks + file size
 * 5. Returning the result as a 16-character hex string
 */
export async function computeOpenSubtitlesHash(
  filePath: string, 
  mainWindow?: BrowserWindow
): Promise<string> {
  const CHUNK_SIZE = 65536; // 64KB
  
  const fileHandle = await fsOpen(filePath, 'r');
  const { size: fileSize } = await fileHandle.stat();
  
  if (fileSize < CHUNK_SIZE * 2) {
    await fileHandle.close();
    throw new Error('File too small for OpenSubtitles hash (minimum 128KB)');
  }
  
  // Initialize hash with file size
  let hash = BigInt(fileSize);
  
  // Read first 64KB
  const firstChunk = Buffer.alloc(CHUNK_SIZE);
  await fileHandle.read(firstChunk, 0, CHUNK_SIZE, 0);
  
  // Read last 64KB
  const lastChunk = Buffer.alloc(CHUNK_SIZE);
  await fileHandle.read(lastChunk, 0, CHUNK_SIZE, fileSize - CHUNK_SIZE);
  
  await fileHandle.close();
  
  // Process chunks as 64-bit little-endian integers
  for (let i = 0; i < CHUNK_SIZE; i += 8) {
    hash += firstChunk.readBigUInt64LE(i);
    hash += lastChunk.readBigUInt64LE(i);
    
    // Report progress
    if (mainWindow && i % 8192 === 0) {
      const progress = Math.round((i / CHUNK_SIZE) * 100);
      mainWindow.webContents.send('hash:progress', progress);
    }
  }
  
  // Mask to 64-bit and convert to hex
  const maskedHash = hash & BigInt('0xFFFFFFFFFFFFFFFF');
  return maskedHash.toString(16).padStart(16, '0');
}
```

## Step 4.3: Background Worker for Hashing

- [ ] Create worker thread for CPU-intensive hashing
- [ ] Implement message passing between main and worker
- [ ] Add cancellation support
- [ ] Keep UI thread responsive

```typescript
// electron/workers/hashWorker.ts
import { parentPort, workerData } from 'worker_threads';
import { computeOpenSubtitlesHash } from '../services/videoHash';

async function run() {
  const { filePath } = workerData;
  
  try {
    const hash = await computeOpenSubtitlesHash(filePath);
    parentPort?.postMessage({ type: 'complete', hash });
  } catch (error) {
    parentPort?.postMessage({ type: 'error', error: (error as Error).message });
  }
}

run();
```

---

# Phase 5: Subtitle Search & Download Pipeline

> **Goal:** Integrate with OpenSubtitles API to search and download Arabic subtitles.

## Step 5.1: OpenSubtitles API Client

- [ ] Create API client class
- [ ] Implement authentication (API key)
- [ ] Add hash-based search endpoint
- [ ] Add filename fallback search
- [ ] Filter results for Arabic language

```typescript
// electron/services/openSubtitlesClient.ts
import axios from 'axios';

const API_BASE = 'https://api.opensubtitles.com/api/v1';

interface SubtitleSearchResult {
  id: string;
  filename: string;
  language: string;
  downloadCount: number;
  rating: number;
  uploadDate: string;
  downloadUrl: string;
}

export class OpenSubtitlesClient {
  private apiKey: string;
  private token?: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchByHash(hash: string, fileSize: number): Promise<SubtitleSearchResult[]> {
    try {
      const response = await axios.get(`${API_BASE}/subtitles`, {
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        params: {
          moviehash: hash,
          languages: 'ar',
          order_by: 'download_count',
          order_direction: 'desc',
        },
      });

      return this.mapResults(response.data.data);
    } catch (error) {
      console.error('Hash search failed:', error);
      return [];
    }
  }

  async searchByFilename(filename: string): Promise<SubtitleSearchResult[]> {
    try {
      // Extract anime name and episode number from filename
      const cleanName = this.extractAnimeName(filename);
      
      const response = await axios.get(`${API_BASE}/subtitles`, {
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        params: {
          query: cleanName,
          languages: 'ar',
          order_by: 'download_count',
          order_direction: 'desc',
        },
      });

      return this.mapResults(response.data.data);
    } catch (error) {
      console.error('Filename search failed:', error);
      return [];
    }
  }

  private extractAnimeName(filename: string): string {
    // Remove common patterns: [SubGroup], resolution, codecs, etc.
    return filename
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\d{3,4}p/gi, '')
      .replace(/x264|x265|HEVC|AAC|FLAC/gi, '')
      .replace(/\.mkv|\.mp4|\.avi/gi, '')
      .trim();
  }

  private mapResults(data: any[]): SubtitleSearchResult[] {
    return data.map(item => ({
      id: item.id,
      filename: item.attributes.files[0]?.file_name || 'Unknown',
      language: item.attributes.language,
      downloadCount: item.attributes.download_count,
      rating: item.attributes.ratings,
      uploadDate: item.attributes.upload_date,
      downloadUrl: item.attributes.files[0]?.file_id,
    }));
  }
}
```

## Step 5.2: Download Manager

- [ ] Implement subtitle file download
- [ ] Handle compressed subtitles (.zip, .gz)
- [ ] Extract to temporary directory
- [ ] Clean up temporary files

## Step 5.3: Search Result UI

- [ ] Display search results in modal
- [ ] Show rating, download count, upload date
- [ ] Allow manual selection
- [ ] Implement "Best Match" auto-selection

---

# Phase 6: FFmpeg Integration & Merging

> **Goal:** Bundle FFmpeg and implement subtitle merging pipeline.

## Step 6.1: FFmpeg Binary Bundling

- [ ] Add `ffmpeg.exe` to `resources/` folder
- [ ] Configure electron-builder to include binary
- [ ] Create path resolver for bundled vs dev FFmpeg
- [ ] Verify FFmpeg availability on app start

```typescript
// electron/services/ffmpegService.ts
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { app } from 'electron';

function getFFmpegPath(): string {
  if (app.isPackaged) {
    // Production: use bundled binary
    return path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe');
  } else {
    // Development: use local binary or system PATH
    return path.join(__dirname, '../../resources/ffmpeg/ffmpeg.exe');
  }
}

// Set FFmpeg path
ffmpeg.setFfmpegPath(getFFmpegPath());

export { ffmpeg };
```

## Step 6.2: Soft-Sub Merge Function

- [ ] Implement MKV/MP4 subtitle track addition
- [ ] Set Arabic as subtitle language metadata
- [ ] Add "Default" flag for auto-display
- [ ] Report progress to renderer

```typescript
// electron/services/subtitleMerger.ts
import { ffmpeg } from './ffmpegService';
import { BrowserWindow } from 'electron';
import path from 'path';

interface MergeOptions {
  videoPath: string;
  subtitlePath: string;
  outputPath?: string;
  setDefault?: boolean;
  subtitleTitle?: string;
}

export async function mergeSubtitle(
  options: MergeOptions,
  mainWindow?: BrowserWindow
): Promise<string> {
  const { 
    videoPath, 
    subtitlePath, 
    outputPath,
    setDefault = true,
    subtitleTitle = 'Arabic'
  } = options;

  const outputFile = outputPath || generateOutputPath(videoPath);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(subtitlePath)
      .outputOptions([
        '-map', '0',           // Copy all streams from video
        '-map', '1:s',         // Add subtitle stream
        '-c', 'copy',          // No re-encoding
        '-c:s', 'srt',         // Subtitle codec
        '-metadata:s:s:0', `language=ara`,
        '-metadata:s:s:0', `title=${subtitleTitle}`,
        ...(setDefault ? ['-disposition:s:0', 'default'] : []),
      ])
      .output(outputFile)
      .on('progress', (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('ffmpeg:progress', Math.round(progress.percent || 0));
        }
      })
      .on('end', () => resolve(outputFile))
      .on('error', (err) => reject(err))
      .run();
  });
}

function generateOutputPath(videoPath: string): string {
  const dir = path.dirname(videoPath);
  const ext = path.extname(videoPath);
  const name = path.basename(videoPath, ext);
  return path.join(dir, `${name}_ar${ext}`);
}
```

## Step 6.3: Batch Processing Queue

- [ ] Implement processing queue manager
- [ ] Add pause/resume functionality
- [ ] Handle errors gracefully (skip or retry)
- [ ] Report overall progress

---

# Phase 7: Polish, Animations & UX Refinement

> **Goal:** Add premium animations, transitions, and micro-interactions.

## Step 7.1: Framer Motion Animation System

- [ ] Define shared animation variants
- [ ] Create stagger animation for lists
- [ ] Implement page transitions
- [ ] Add presence animations for modals

```typescript
// lib/animations.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const cardHover = {
  rest: { scale: 1, boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)' },
  hover: { 
    scale: 1.02, 
    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.25)',
    transition: { duration: 0.2, ease: 'easeOut' }
  },
};

export const progressPulse = {
  animate: {
    boxShadow: [
      '0 0 10px rgba(99, 102, 241, 0.3)',
      '0 0 20px rgba(99, 102, 241, 0.6)',
      '0 0 10px rgba(99, 102, 241, 0.3)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};
```

## Step 7.2: Loading States & Skeletons

- [ ] Create skeleton loader components
- [ ] Add shimmer animation effect
- [ ] Implement smooth state transitions

## Step 7.3: Toast Notifications

- [ ] Build toast notification system
- [ ] Add success/error/info variants
- [ ] Implement auto-dismiss with progress
- [ ] Stack multiple notifications

## Step 7.4: Drag & Drop Enhancement

- [ ] Add visual drop zone indicator
- [ ] Implement hover glow effect
- [ ] Show file count preview
- [ ] Add shake animation on invalid drop

## Step 7.5: Custom Scrollbars

- [ ] Style scrollbars to match theme
- [ ] Add smooth scroll behavior
- [ ] Implement scroll fade indicators

---

# Phase 8: Testing, Packaging & Distribution

> **Goal:** Prepare the application for production release.

## Step 8.1: Unit Testing

- [ ] Set up Vitest for unit tests
- [ ] Test hash algorithm accuracy
- [ ] Test file scanner
- [ ] Test API client

## Step 8.2: Integration Testing

- [ ] Test IPC communication
- [ ] Test FFmpeg integration
- [ ] Test full workflow

## Step 8.3: Electron Builder Configuration

- [ ] Configure `electron-builder.json`
- [ ] Set up Windows installer (NSIS)
- [ ] Include FFmpeg binary
- [ ] Configure auto-update

```json
// electron-builder.json
{
  "appId": "com.tarjem.animesubmatcher",
  "productName": "Tarjem",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "extraResources": [
    {
      "from": "resources/ffmpeg",
      "to": "ffmpeg"
    }
  ],
  "win": {
    "target": ["nsis"],
    "icon": "resources/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "installerIcon": "resources/icon.ico",
    "uninstallerIcon": "resources/icon.ico"
  }
}
```

## Step 8.4: Build & Package

- [ ] Run production build
- [ ] Test Windows installer
- [ ] Verify FFmpeg bundling
- [ ] Test on fresh Windows install

## Step 8.5: Documentation

- [ ] Update README with screenshots
- [ ] Write user guide
- [ ] Document build process

---

# 💡 Suggested Future Features

> Enhancements to consider after core functionality is complete.

## 🌟 High Priority

### 1. **Batch Season Processing**
- Detect anime seasons automatically
- Display episodes in organized groups
- Process entire seasons with one click

### 2. **Subtitle Preview**
- Preview subtitle sync before merging
- Adjust timing offset (+/- seconds)
- Side-by-side video/subtitle preview

### 3. **Multiple Subtitle Sources**
- Integrate Subscene API
- Add Addic7ed support
- Allow custom subtitle source plugins

### 4. **Download History & Cache**
- Cache downloaded subtitles
- Reuse for same video hash
- History view with re-download option

## ✨ Medium Priority

### 5. **Custom Subtitle Styling**
- Font family selection
- Font size adjustment
- Color customization
- Position override (top/bottom)

### 6. **Video Player Integration**
- Built-in preview player (libmpv)
- Quick subtitle check before merge
- Scrubbing with subtitle display

### 7. **Cloud Sync**
- Sync settings across devices
- Share processed file list
- Backup API credentials

### 8. **Notification System**
- Windows native notifications
- "Processing complete" alerts
- Error alerts with details

## 🔮 Future Considerations

### 9. **Multi-Language Support**
- UI localization (Arabic, English, more)
- Multiple subtitle language selection
- Priority language ordering

### 10. **Machine Translation**
- Translate subtitles to Arabic
- Use AI translation APIs
- Review/edit translated text

### 11. **CLI Mode**
- Headless processing
- Script automation support
- Scheduled folder watching

### 12. **Watch Folder Mode**
- Monitor folders for new videos
- Auto-process on file add
- Background service mode

### 13. **Advanced Matching**
- Fuzzy filename matching
- Manual subtitle file selection
- Drag-drop external .srt files

### 14. **Statistics Dashboard**
- Files processed count
- Subtitles downloaded
- Storage saved (no re-encoding)

### 15. **Theme Customization**
- Accent color picker
- Custom background images
- Import/export themes

---

## 📊 Project Timeline Estimate

| Phase | Estimated Duration | Dependencies |
|-------|-------------------|--------------|
| Phase 1 | 2-3 days | None |
| Phase 2 | 4-5 days | Phase 1 |
| Phase 3 | 2-3 days | Phase 1 |
| Phase 4 | 3-4 days | Phase 3 |
| Phase 5 | 3-4 days | Phase 4 |
| Phase 6 | 3-4 days | Phase 4, Phase 5 |
| Phase 7 | 3-4 days | Phase 2 |
| Phase 8 | 2-3 days | All phases |

**Total Estimated Time:** 22-30 days

---

## ✅ Definition of Done (Per Phase)

- [ ] All step checkboxes completed
- [ ] Code compiles without errors
- [ ] Manual testing passed
- [ ] No console errors in DevTools
- [ ] UI matches reference aesthetic
- [ ] Animations are smooth (60fps)
- [ ] Code reviewed for best practices
