/**
 * Electron API 类型声明
 * NOTE: 由 `electron/src/preload.ts` 通过 `contextBridge` 注入到 `window` 上
 * Android / Web 环境下 `window.electronAPI` 为 `undefined`
 */

interface ElectronAPI {
    /** 平台标识 */
    readonly platform: 'electron';

    // SQLite
    dbQuery: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
    dbRun: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>;
    dbExecute: (sql: string) => Promise<void>;

    // 文件系统
    writeFile: (relativePath: string, base64Data: string) => Promise<string>;
    readFile: (relativePath: string) => Promise<string>;
    deleteFile: (relativePath: string) => Promise<void>;
    getFileUri: (relativePath: string) => Promise<string>;
    openFile: (relativePath: string) => Promise<void>;
    readdir: (relativePath: string) => Promise<{ name: string; size: number }[]>;
    mkdir: (relativePath: string) => Promise<void>;

    // 自动更新
    checkForUpdate: () => Promise<unknown>;
    downloadUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    onUpdateAvailable: (callback: (data: { version: string }) => void) => (() => void);
    onUpdateProgress: (callback: (data: { percent: number }) => void) => (() => void);
    onUpdateDownloaded: (callback: () => void) => (() => void);
    onUpdateError: (callback: (data: { message: string }) => void) => (() => void);

    // 桌面端 Web 资源热更新
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
