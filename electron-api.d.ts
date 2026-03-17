/**
 * Electron API ç±»åž‹å£°æ˜Ž
 * NOTE: ç”?electron/src/preload.ts é€šè¿‡ contextBridge æ³¨å…¥åˆ?window ä¸?
 * Android / Web çŽ¯å¢ƒä¸?window.electronAPI ä¸?undefined
 */

interface ElectronAPI {
    /** å¹³å°æ ‡è¯† */
    readonly platform: 'electron';

    // SQLite
    dbQuery: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
    dbRun: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>;
    dbExecute: (sql: string) => Promise<void>;

    // æ–‡ä»¶ç³»ç»Ÿ
    writeFile: (relativePath: string, base64Data: string) => Promise<string>;
    readFile: (relativePath: string) => Promise<string>;
    deleteFile: (relativePath: string) => Promise<void>;
    getFileUri: (relativePath: string) => Promise<string>;
    openFile: (relativePath: string) => Promise<void>;
    readdir: (relativePath: string) => Promise<{ name: string; size: number }[]>;
    mkdir: (relativePath: string) => Promise<void>;

    // è‡ªåŠ¨æ›´æ–°
    checkForUpdate: () => Promise<unknown>;
    downloadUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    onUpdateAvailable: (callback: (data: { version: string }) => void) => (() => void);
    onUpdateProgress: (callback: (data: { percent: number }) => void) => (() => void);
    onUpdateDownloaded: (callback: () => void) => (() => void);
    onUpdateError: (callback: (data: { message: string }) => void) => (() => void);

    // ×ÀÃæ¶Ë Web ×ÊÔ´ÈÈ¸üÐÂ
    desktopWebCheckForUpdate: (currentVersion: string) => Promise<{
        version: string;
        downloadUrl: string;
        releaseNotes: string;
        isWebUpdate: true;
    } | null>;
    desktopWebDownloadUpdate: (downloadUrl: string, version: string) => Promise<boolean>;
    desktopWebApplyUpdate: () => Promise<void>;
    onDesktopWebUpdateProgress: (callback: (data: { percent: number }) => void) => (() => void);
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };

