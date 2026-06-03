import { readdir, stat } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
const SUBTITLE_EXTENSIONS = ['.srt', '.ass', '.vtt', '.sub', '.ssa'];

export type ScannedMediaType = 'VIDEO' | 'SUBTITLE';

export interface ScannedFileInfo {
    id: string;
    filename: string;
    filePath: string;
    size: number;
    extension: string;
    fileType: ScannedMediaType;
}

function classifyFile(ext: string): ScannedMediaType | null {
    if (VIDEO_EXTENSIONS.includes(ext)) return 'VIDEO';
    if (SUBTITLE_EXTENSIONS.includes(ext)) return 'SUBTITLE';
    return null;
}

/**
 * Recursively scan a folder for video and subtitle files (Phase 4.1).
 */
export async function scanFolderForMedia(folderPath: string): Promise<ScannedFileInfo[]> {
    const results: ScannedFileInfo[] = [];

    async function scanDirectory(dirPath: string): Promise<void> {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await scanDirectory(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                const fileType = classifyFile(ext);
                if (!fileType) continue;

                const fileStat = await stat(fullPath);
                results.push({
                    id: randomUUID(),
                    filename: entry.name,
                    filePath: fullPath,
                    size: fileStat.size,
                    extension: ext,
                    fileType,
                });
            }
        }
    }

    await scanDirectory(folderPath);

    return results.sort((a, b) =>
        a.filePath.localeCompare(b.filePath, undefined, { sensitivity: 'base' })
    );
}
