import { app } from 'electron';
import { existsSync } from 'fs';
import path from 'path';

function ffmpegFileName(): string {
    if (process.platform === 'win32') return 'ffmpeg.exe';
    return 'ffmpeg';
}

/**
 * Resolve bundled FFmpeg next to the app (dev) or under extraResources (packaged).
 */
export function getFfmpegExecutablePath(): string | null {
    const name = ffmpegFileName();
    const candidates = [
        path.join(process.cwd(), 'resources', 'ffmpeg', name),
        path.join(app.getAppPath(), 'resources', 'ffmpeg', name),
        path.join(process.resourcesPath, 'ffmpeg', name),
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

export function isFfmpegAvailable(): boolean {
    return getFfmpegExecutablePath() !== null;
}
