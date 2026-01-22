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
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
