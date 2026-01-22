"use strict";
const electron = require("electron");
const { contextBridge, ipcRenderer } = electron;
contextBridge.exposeInMainWorld("electronAPI", {
  // Window Controls
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  // Dialogs
  selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
  selectFiles: () => ipcRenderer.invoke("dialog:selectFiles"),
  saveFile: (defaultPath) => ipcRenderer.invoke("dialog:saveFile", defaultPath),
  // File System (stub - Phase 3)
  scanFolder: (folderPath) => ipcRenderer.invoke("fs:scanFolder", folderPath),
  // Hashing (stub - Phase 3)
  hashFile: (filePath) => ipcRenderer.invoke("hash:compute", filePath),
  // Subtitles (stub - Phase 4)
  searchSubtitles: (hash, fileSize, language) => ipcRenderer.invoke("subtitles:search", hash, fileSize, language),
  downloadSubtitle: (url, savePath) => ipcRenderer.invoke("subtitles:download", url, savePath),
  // FFmpeg (stub - Phase 5)
  mergeSubtitles: (videoPath, subtitlePath, outputPath, options) => ipcRenderer.invoke("ffmpeg:merge", videoPath, subtitlePath, outputPath, options),
  // Event listeners
  onProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on("progress:update", handler);
    return () => ipcRenderer.removeListener("progress:update", handler);
  },
  onFFmpegProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on("ffmpeg:progress", handler);
    return () => ipcRenderer.removeListener("ffmpeg:progress", handler);
  }
});
