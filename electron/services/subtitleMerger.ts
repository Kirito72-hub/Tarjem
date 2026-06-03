import { access, readdir } from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import type { MergeJob } from '../processingTypes';
import { getFfmpegExecutablePath } from './ffmpegPath';

const SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.ssa', '.vtt', '.sub']);

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Find a sidecar subtitle next to the video (same basename or common language suffixes).
 */
export async function resolveSidecarSubtitlePath(
    videoPath: string
): Promise<string | null> {
    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath, path.extname(videoPath));

    const preferredNames = [
        `${base}.srt`,
        `${base}.ar.srt`,
        `${base}.ara.srt`,
        `${base}.en.srt`,
        `${base}.ass`,
        `${base}.ssa`,
        `${base}.vtt`,
    ];

    for (const name of preferredNames) {
        const candidate = path.join(dir, name);
        if (await fileExists(candidate)) {
            return candidate;
        }
    }

    try {
        const entries = await readdir(dir);
        for (const entry of entries) {
            const ext = path.extname(entry).toLowerCase();
            if (!SUBTITLE_EXTENSIONS.has(ext)) continue;
            if (!entry.toLowerCase().startsWith(base.toLowerCase())) continue;
            return path.join(dir, entry);
        }
    } catch {
        return null;
    }

    return null;
}

function buildOutputPath(videoPath: string): string {
    const ext = path.extname(videoPath);
    const base = path.basename(videoPath, ext);
    return path.join(path.dirname(videoPath), `${base}_merged${ext}`);
}

function buildMapOptions(job: MergeJob): string[] {
    if (job.removeOtherAudio) {
        return ['-map', '0:v', '-map', '1:s'];
    }
    return ['-map', '0:v', '-map', '0:a?', '-map', '1:s'];
}

export interface MergeProgressCallback {
    (progress: number, statusMessage: string): void;
}

export async function mergeSubtitleIntoVideo(
    job: MergeJob,
    onProgress?: MergeProgressCallback
): Promise<{ outputPath: string }> {
    const ffmpegPath = getFfmpegExecutablePath();
    if (!ffmpegPath) {
        throw new Error(
            'FFmpeg not found. Place ffmpeg.exe in resources/ffmpeg/ (see resources/ffmpeg/README.md).'
        );
    }

    const subtitlePath = await resolveSidecarSubtitlePath(job.videoPath);
    if (!subtitlePath) {
        throw new Error(
            `No sidecar subtitle found next to "${job.filename}". Add a matching .srt (same name as the video) or run File Match first.`
        );
    }

    const outputPath = buildOutputPath(job.videoPath);
    if (await fileExists(outputPath)) {
        throw new Error(
            `Output already exists: ${path.basename(outputPath)}. Remove it or rename before merging.`
        );
    }

    onProgress?.(5, 'Starting FFmpeg merge (stream copy)...');

    ffmpeg.setFfmpegPath(ffmpegPath);

    const mapOptions = buildMapOptions(job);
    const outputOptions = [
        ...mapOptions,
        '-c',
        'copy',
        '-c:s',
        'srt',
        ...(job.setDefaultSub ? ['-disposition:s:0', 'default'] : []),
    ];

    await new Promise<void>((resolve, reject) => {
        const command = ffmpeg()
            .input(job.videoPath)
            .input(subtitlePath)
            .outputOptions(outputOptions)
            .output(outputPath)
            .on('start', () => {
                onProgress?.(10, 'FFmpeg started...');
            })
            .on('progress', (p) => {
                if (typeof p.percent === 'number' && Number.isFinite(p.percent)) {
                    const pct = Math.min(95, Math.max(10, Math.round(p.percent)));
                    onProgress?.(pct, `Merging... ${pct}%`);
                }
            })
            .on('end', () => {
                onProgress?.(100, `Saved ${path.basename(outputPath)}`);
                resolve();
            })
            .on('error', (err, _stdout, stderr) => {
                const detail =
                    typeof stderr === 'string' && stderr.trim()
                        ? stderr.trim().slice(-500)
                        : err.message;
                reject(new Error(`FFmpeg failed: ${detail}`));
            });

        command.run();
    });

    return { outputPath };
}
