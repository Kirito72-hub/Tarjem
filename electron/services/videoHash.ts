import { open as fsOpen } from 'fs/promises';
import type { BrowserWindow } from 'electron';
import type { ProcessingProgressEvent } from '../processingTypes';

const CHUNK_SIZE = 65536; // 64KB

function emitHashProgress(
    mainWindow: BrowserWindow | null,
    episodeId: string,
    progress: number,
    statusMessage: string
): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const payload: ProcessingProgressEvent = {
        episodeId,
        tab: 'FILE_MATCH',
        progress,
        stage: 'HASHING',
        statusMessage,
    };
    mainWindow.webContents.send('processing:progress', payload);
}

/**
 * OpenSubtitles movie hash (64-bit sum of file size + first/last 64KB).
 * Minimum file size: 128KB.
 */
export async function computeOpenSubtitlesHash(
    filePath: string,
    episodeId: string,
    mainWindow: BrowserWindow | null
): Promise<string> {
    const fileHandle = await fsOpen(filePath, 'r');
    const { size: fileSize } = await fileHandle.stat();

    if (fileSize < CHUNK_SIZE * 2) {
        await fileHandle.close();
        throw new Error('File too small for OpenSubtitles hash (minimum 128KB)');
    }

    let hash = BigInt(fileSize);

    const firstChunk = Buffer.alloc(CHUNK_SIZE);
    await fileHandle.read(firstChunk, 0, CHUNK_SIZE, 0);

    const lastChunk = Buffer.alloc(CHUNK_SIZE);
    await fileHandle.read(lastChunk, 0, CHUNK_SIZE, fileSize - CHUNK_SIZE);
    await fileHandle.close();

    for (let i = 0; i < CHUNK_SIZE; i += 8) {
        hash += firstChunk.readBigUInt64LE(i);
        hash += lastChunk.readBigUInt64LE(i);

        if (i % 8192 === 0) {
            const pct = Math.min(35, Math.round((i / CHUNK_SIZE) * 35));
            emitHashProgress(mainWindow, episodeId, pct, 'Calculating OpenSubtitles hash...');
        }
    }

    const masked = hash & BigInt('0xFFFFFFFFFFFFFFFF');
    return masked.toString(16).padStart(16, '0');
}
