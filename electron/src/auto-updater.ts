import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

/**
 * Electron 桌面端自动更新服务
 * NOTE: 使用 electron-updater 从 GitHub Releases 检查和下载更新
 */
export const initAutoUpdater = (mainWindow: BrowserWindow): void => {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update:available', {
            version: info.version,
        });
    });

    autoUpdater.on('update-not-available', () => {
        mainWindow.webContents.send('update:not-available');
    });

    autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update:progress', {
            percent: Math.round(progress.percent),
        });
    });

    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update:downloaded');
    });

    autoUpdater.on('error', (error) => {
        console.error('[AutoUpdater] Error:', error);
        mainWindow.webContents.send('update:error', {
            message: error.message,
        });
    });

    ipcMain.handle('update:check', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return result?.updateInfo;
        } catch (error) {
            console.error('[AutoUpdater] Check failed:', error);
            return null;
        }
    });

    ipcMain.handle('update:download', async () => {
        try {
            await autoUpdater.downloadUpdate();
        } catch (error) {
            console.error('[AutoUpdater] Download failed:', error);
        }
    });

    ipcMain.handle('update:install', () => {
        autoUpdater.quitAndInstall(false, true);
    });
};
