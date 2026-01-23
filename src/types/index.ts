export enum ProcessingStage {
  IDLE = 'IDLE',
  HASHING = 'HASHING',
  SEARCHING = 'SEARCHING',
  MERGING = 'MERGING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface EpisodeFile {
  id: string;
  path: string; // Absolute path to file
  filename: string;
  size: string; // Display string like "1.4 GB"
  progress: number; // 0 to 100
  stage: ProcessingStage;
  statusMessage: string;
  thumbnailUrl?: string; // Optional placeholder image
  selected: boolean;
  fileType: 'VIDEO' | 'SUBTITLE';
}

export interface SubtitleResult {
  id: string;
  filename: string;
  source: string;
  language: string;
  downloads: number;
  rating: number; // 0-5
}

export interface SubtitleSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface MergeOptions {
  removeOldSubs: boolean;
  removeOtherAudio: boolean;
  setDefaultSub: boolean;
  embedFonts: boolean;
}

export type View = 'DASHBOARD' | 'SETTINGS' | 'LOGS';
export type DashboardTab = 'FILE_MATCH' | 'WEB_SEARCH' | 'MERGER';