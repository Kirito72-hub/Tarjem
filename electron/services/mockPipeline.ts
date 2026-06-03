import type { BrowserWindow } from 'electron';
import type {
    FileMatchJob,
    MergeJob,
    ProcessingProgressEvent,
    ProcessingTab,
    WebSearchResult,
} from '../processingTypes';

function sendProgress(
    mainWindow: BrowserWindow | null,
    episodeId: string,
    tab: ProcessingTab,
    progress: number,
    stage: ProcessingProgressEvent['stage'],
    statusMessage: string
): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const payload: ProcessingProgressEvent = {
        episodeId,
        tab,
        progress,
        stage,
        statusMessage,
    };
    mainWindow.webContents.send('processing:progress', payload);
}

export async function runMockFileMatch(
    job: FileMatchJob,
    mainWindow: BrowserWindow | null
): Promise<void> {
    sendProgress(mainWindow, job.episodeId, 'FILE_MATCH', 5, 'HASHING', 'Calculating CRC32 hash...');

    let progress = 5;
    const interval = setInterval(() => {
        progress += Math.random() * 8 + 2;

        if (progress > 30 && progress <= 80) {
            sendProgress(
                mainWindow,
                job.episodeId,
                'FILE_MATCH',
                Math.min(progress, 80),
                'SEARCHING',
                'Searching databases (mock)...'
            );
        } else if (progress > 80) {
            clearInterval(interval);
            sendProgress(
                mainWindow,
                job.episodeId,
                'FILE_MATCH',
                100,
                'COMPLETED',
                'Subtitle downloaded (mock)'
            );
        } else {
            sendProgress(
                mainWindow,
                job.episodeId,
                'FILE_MATCH',
                Math.min(progress, 30),
                'HASHING',
                'Calculating CRC32 hash...'
            );
        }
    }, 400);
}

export async function runMockMerge(
    job: MergeJob,
    mainWindow: BrowserWindow | null
): Promise<void> {
    sendProgress(mainWindow, job.episodeId, 'MERGER', 5, 'MERGING', 'Initializing FFmpeg (mock)...');

    let progress = 5;
    const interval = setInterval(() => {
        progress += Math.random() * 8 + 2;
        let message = 'Cleaning streams...';
        if (progress > 60) message = 'Muxing container...';

        if (progress >= 95) {
            clearInterval(interval);
            sendProgress(mainWindow, job.episodeId, 'MERGER', 100, 'COMPLETED', 'Merge complete (mock)');
        } else {
            sendProgress(mainWindow, job.episodeId, 'MERGER', Math.min(progress, 94), 'MERGING', message);
        }
    }, 400);
}

export async function runMockWebSearch(query: string): Promise<WebSearchResult[]> {
    await new Promise((r) => setTimeout(r, 800));
    return [
        {
            id: 'mock-1',
            filename: `${query} - English (US).srt`,
            source: 'Subscene',
            language: 'English',
            downloads: 1240,
            rating: 5,
        },
        {
            id: 'mock-2',
            filename: `${query} - Arabic.ass`,
            source: 'OpenSubtitles',
            language: 'Arabic',
            downloads: 850,
            rating: 4.5,
        },
        {
            id: 'mock-3',
            filename: `${query} [1080p].srt`,
            source: 'YIFY',
            language: 'English',
            downloads: 2300,
            rating: 3,
        },
    ];
}
