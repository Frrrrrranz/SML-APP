import { ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

/**
 * Electron 桌面端自动更新服务
 * NOTE: 使用 electron-updater 从 GitHub Releases 检查和下载更新
 * 替代 Android 端的 @capgo/capacitor-updater
 */

/** 初始化自动更新 */
export const initAutoUpdater = (mainWindow: BrowserWindow): void => {
    // NOTE: 设置自动下载为 false，先通知用户再决定是否下载
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // 检查到可用更新
    autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update:available', {
            version: info.version,
        });
    });

    // 没有可用更新
    autoUpdater.on('update-not-available', () => {
        mainWindow.webContents.send('update:not-available');
    });

    // 下载进度
    autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update:progress', {
            percent: Math.round(progress.percent),
        });
    });

    // 下载完成
    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update:downloaded');
    });

    // 错误处理
    autoUpdater.on('error', (error) => {
        console.error('[AutoUpdater] Error:', error);
        mainWindow.webContents.send('update:error', {
            message: error.message,
        });
    });

    // IPC：渲染进程触发检查更新
    ipcMain.handle('update:check', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return result?.updateInfo;
        } catch (error) {
            console.error('[AutoUpdater] Check failed:', error);
            return null;
        }
    });

    // IPC：渲染进程触发下载更新
    ipcMain.handle('update:download', async () => {
        try {
            await autoUpdater.downloadUpdate();
        } catch (error) {
            console.error('[AutoUpdater] Download failed:', error);
        }
    });

    // IPC：渲染进程触发安装更新（重启应用）
    ipcMain.handle('update:install', () => {
        autoUpdater.quitAndInstall(false, true);
    });

    // 启动时自动检查更新（延迟 5 秒，避免阻塞启动）
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
            console.error('[AutoUpdater] Initial check failed:', err);
        });
    }, 5000);
};
