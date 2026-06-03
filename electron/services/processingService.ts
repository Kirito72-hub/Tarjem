import { stat } from 'fs/promises';
import type { BrowserWindow } from 'electron';
import type { FileMatchJob, MergeJob, ProcessingProgressEvent } from '../processingTypes';
import { computeOpenSubtitlesHash } from './videoHash';
import {
    isOpenSubtitlesConfigured,
    searchSubtitlesByHash,
} from './openSubtitlesClient';
import { runMockFileMatch, runMockMerge } from './mockPipeline';
import { mergeSubtitleIntoVideo } from './subtitleMerger';
import { isFfmpegAvailable } from './ffmpegPath';

const activeJobs = new Set<string>();

export function isMockPipelineEnabled(): boolean {
    return (
        process.env.TARJEM_MOCK_PIPELINE === '1' ||
        process.env.TARJEM_MOCK_PIPELINE === 'true' ||
        process.env.USE_MOCK_PIPELINE === '1' ||
        process.env.USE_MOCK_PIPELINE === 'true'
    );
}

function sendProgress(
    mainWindow: BrowserWindow | null,
    payload: ProcessingProgressEvent
): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('processing:progress', payload);
}

export async function runFileMatchJob(
    job: FileMatchJob,
    mainWindow: BrowserWindow | null
): Promise<{ ok: boolean; error?: string }> {
    if (activeJobs.has(job.episodeId)) {
        return { ok: false, error: 'Job already running for this episode' };
    }
    activeJobs.add(job.episodeId);

    try {
        if (isMockPipelineEnabled()) {
            await runMockFileMatch(job, mainWindow);
            return { ok: true };
        }

        sendProgress(mainWindow, {
            episodeId: job.episodeId,
            tab: 'FILE_MATCH',
            progress: 2,
            stage: 'HASHING',
            statusMessage: 'Starting hash...',
        });

        const fileStat = await stat(job.filePath);
        const hash = await computeOpenSubtitlesHash(job.filePath, job.episodeId, mainWindow);

        sendProgress(mainWindow, {
            episodeId: job.episodeId,
            tab: 'FILE_MATCH',
            progress: 40,
            stage: 'HASHING',
            statusMessage: `Hash: ${hash}`,
        });

        if (!isOpenSubtitlesConfigured()) {
            sendProgress(mainWindow, {
                episodeId: job.episodeId,
                tab: 'FILE_MATCH',
                progress: 100,
                stage: 'ERROR',
                statusMessage:
                    'OpenSubtitles API key missing. Set OPENSUBTITLES_API_KEY and restart the app.',
            });
            return { ok: false, error: 'API key not configured' };
        }

        sendProgress(mainWindow, {
            episodeId: job.episodeId,
            tab: 'FILE_MATCH',
            progress: 45,
            stage: 'SEARCHING',
            statusMessage: 'Searching OpenSubtitles by hash...',
        });

        const results = await searchSubtitlesByHash(hash, fileStat.size);

        if (results.length === 0) {
            sendProgress(mainWindow, {
                episodeId: job.episodeId,
                tab: 'FILE_MATCH',
                progress: 100,
                stage: 'COMPLETED',
                statusMessage: 'No Arabic/English subtitles found for this hash',
            });
            return { ok: true };
        }

        const best = results[0]!;
        sendProgress(mainWindow, {
            episodeId: job.episodeId,
            tab: 'FILE_MATCH',
            progress: 100,
            stage: 'COMPLETED',
            statusMessage: `Found ${results.length} match(es); best: ${best.filename}`,
        });
        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'File match failed';
        sendProgress(mainWindow, {
            episodeId: job.episodeId,
            tab: 'FILE_MATCH',
            progress: 100,
            stage: 'ERROR',
            statusMessage: message,
        });
        return { ok: false, error: message };
    } finally {
        activeJobs.delete(job.episodeId);
    }
}

export async function runMergeJob(
    job: MergeJob,
    mainWindow: BrowserWindow | null
): Promise<{ ok: boolean; error?: string }> {
    if (activeJobs.has(job.episodeId)) {
        return { ok: false, error: 'Job already running for this episode' };
    }
    activeJobs.add(job.episodeId);

    try {
        if (isMockPipelineEnabled()) {
            await runMockMerge(job, mainWindow);
            return { ok: true };
        }

        if (!isFfmpegAvailable()) {
            sendProgress(mainWindow, {
                episodeId: job.episodeId,
                tab: 'MERGER',
                progress: 100,
                stage: 'ERROR',
                statusMessage:
                    'FFmpeg not found. Add resources/ffmpeg/ffmpeg.exe (see resources/ffmpeg/README.md).',
            });
            return { ok: false, error: 'FFmpeg not bundled' };
        }

        sendProgress(mainWindow, {
            episodeId: job.episodeId,
            tab: 'MERGER',
            progress: 5,
            stage: 'MERGING',
            statusMessage: 'Preparing merge...',
        });

        const { outputPath } = await mergeSubtitleIntoVideo(job, (progress, statusMessage) => {
            sendProgress(mainWindow, {
                episodeId: job.episodeId,
                tab: 'MERGER',
                progress,
                stage: 'MERGING',
                statusMessage,
            });
        });

        sendProgress(mainWindow, {
            episodeId: job.episodeId,
            tab: 'MERGER',
            progress: 100,
            stage: 'COMPLETED',
            statusMessage: `Merged → ${outputPath}`,
        });
        return { ok: true };
    } finally {
        activeJobs.delete(job.episodeId);
    }
}
