import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron 预加载脚本
 * NOTE: 通过 contextBridge 安全暴露 IPC API 到渲染进程（React App）
 * 渲染进程通过 window.electronAPI 调用这些方法
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // =============================================
    // 平台标识
    // =============================================
    platform: 'electron' as const,

    // =============================================
    // SQLite 数据库操作
    // =============================================

    /** 执行查询 SQL（返回结果行） */
    dbQuery: (sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> =>
        ipcRenderer.invoke('db:query', sql, params),

    /** 执行写入 SQL（INSERT / UPDATE / DELETE） */
    dbRun: (sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> =>
        ipcRenderer.invoke('db:run', sql, params),

    /** 执行多条 SQL 语句（用于建表等） */
    dbExecute: (sql: string): Promise<void> =>
        ipcRenderer.invoke('db:execute', sql),

    // =============================================
    // 文件系统操作
    // =============================================

    /** 写入文件（base64 数据） */
    writeFile: (relativePath: string, base64Data: string): Promise<string> =>
        ipcRenderer.invoke('fs:writeFile', relativePath, base64Data),

    /** 读取文件（返回 base64） */
    readFile: (relativePath: string): Promise<string> =>
        ipcRenderer.invoke('fs:readFile', relativePath),

    /** 删除文件 */
    deleteFile: (relativePath: string): Promise<void> =>
        ipcRenderer.invoke('fs:deleteFile', relativePath),

    /** 获取文件的绝对路径（file:// URI） */
    getFileUri: (relativePath: string): Promise<string> =>
        ipcRenderer.invoke('fs:getUri', relativePath),

    /** 用系统默认应用打开文件 */
    openFile: (relativePath: string): Promise<void> =>
        ipcRenderer.invoke('fs:openWith', relativePath),

    /** 列出目录中的文件 */
    readdir: (relativePath: string): Promise<{ name: string; size: number }[]> =>
        ipcRenderer.invoke('fs:readdir', relativePath),

    /** 创建目录（递归） */
    mkdir: (relativePath: string): Promise<void> =>
        ipcRenderer.invoke('fs:mkdir', relativePath),

    // =============================================
    // 自动更新
    // =============================================

    /** 检查更新 */
    checkForUpdate: (): Promise<unknown> =>
        ipcRenderer.invoke('update:check'),

    /** 下载更新 */
    downloadUpdate: (): Promise<void> =>
        ipcRenderer.invoke('update:download'),

    /** 安装更新（重启应用） */
    installUpdate: (): Promise<void> =>
        ipcRenderer.invoke('update:install'),

    /** 监听更新事件 */
    onUpdateAvailable: (callback: (data: { version: string }) => void) =>
        ipcRenderer.on('update:available', (_event, data) => callback(data)),

    onUpdateProgress: (callback: (data: { percent: number }) => void) =>
        ipcRenderer.on('update:progress', (_event, data) => callback(data)),

    onUpdateDownloaded: (callback: () => void) =>
        ipcRenderer.on('update:downloaded', () => callback()),

    onUpdateError: (callback: (data: { message: string }) => void) =>
        ipcRenderer.on('update:error', (_event, data) => callback(data)),
});
