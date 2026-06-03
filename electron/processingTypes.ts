/** Stages mirrored in renderer `ProcessingStage` enum (string values must match). */
export type ProcessingStageName =
    | 'IDLE'
    | 'HASHING'
    | 'SEARCHING'
    | 'MERGING'
    | 'COMPLETED'
    | 'ERROR';

export type ProcessingTab = 'FILE_MATCH' | 'MERGER';

export interface ProcessingProgressEvent {
    episodeId: string;
    tab: ProcessingTab;
    progress: number;
    stage: ProcessingStageName;
    statusMessage: string;
}

export interface FileMatchJob {
    episodeId: string;
    filePath: string;
    filename: string;
}

export interface MergeJob {
    episodeId: string;
    videoPath: string;
    filename: string;
    removeOldSubs: boolean;
    removeOtherAudio: boolean;
    setDefaultSub: boolean;
}

export interface WebSearchResult {
    id: string;
    filename: string;
    source: string;
    language: string;
    downloads: number;
    rating: number;
}
