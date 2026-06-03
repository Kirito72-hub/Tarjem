import type { ProcessingProgressEvent } from './processingTypes';

export type ScannedMediaType = 'VIDEO' | 'SUBTITLE';

export interface ScannedFileInfo {
    id: string;
    filename: string;
    filePath: string;
    size: number;
    extension: string;
    fileType: ScannedMediaType;
}

export interface WebSearchResultDto {
    id: string;
    filename: string;
    source: string;
    language: string;
    downloads: number;
    rating: number;
}

export interface FileMatchJobDto {
    episodeId: string;
    filePath: string;
    filename: string;
}

export interface MergeJobDto {
    episodeId: string;
    videoPath: string;
    filename: string;
    removeOldSubs: boolean;
    removeOtherAudio: boolean;
    setDefaultSub: boolean;
}

export interface ElectronAPI {
    window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
    };
    dialog: {
        selectFolder: () => Promise<string | null>;
    };
    files: {
        scanFolder: (folderPath: string) => Promise<ScannedFileInfo[]>;
    };
    pipeline: {
        useMock: () => Promise<boolean>;
    };
    processing: {
        startFileMatch: (job: FileMatchJobDto) => Promise<{ started: boolean }>;
        startMerge: (job: MergeJobDto) => Promise<{ started: boolean }>;
        onProgress: (callback: (payload: ProcessingProgressEvent) => void) => () => void;
    };
    subtitles: {
        searchWeb: (query: string) => Promise<{ results: WebSearchResultDto[]; error: string | null }>;
    };
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
