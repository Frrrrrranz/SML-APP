import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { WEB_VERSION, GITHUB_REPO } from '../constants/app-version';

/**
 * OTA 热更新服务
 * NOTE: 利用 @capgo/capacitor-updater 在原生层实现 Web 资源热替换，
 * 通过 GitHub Releases API 检测更新并下载 web-bundle.zip。
 * 
 * 工作原理：
 * 1. 检查 GitHub Releases 中是否有 tag 以 "web-v" 开头且版本号更高的 release
 * 2. 如果有，下载其 web-bundle.zip 附件
 * 3. 使用 capacitor-updater 插件加载新的 Web 资源包
 * 4. 重载 WebView 以应用更新
 */

interface UpdateInfo {
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    isWebUpdate: boolean;
}

/**
 * 比较两个版本号（支持四位版本号如 1.0.2.1）
 * @returns 正数表示 remote 更新，0 相等，负数表示 current 更新
 */
const compareVersions = (current: string, remote: string): number => {
    const currentParts = current.split('.').map(Number);
    const remoteParts = remote.split('.').map(Number);
    const maxLength = Math.max(currentParts.length, remoteParts.length);

    for (let i = 0; i < maxLength; i++) {
        const c = currentParts[i] || 0;
        const r = remoteParts[i] || 0;
        if (r > c) return 1;
        if (r < c) return -1;
    }
    return 0;
};

/**
 * 从 GitHub Releases 检查是否有可用更新
 * NOTE: 查找 tag 名称以 "web-v" 开头的 release，这些是 Web 热更新
 */
export const checkForUpdate = async (): Promise<UpdateInfo | null> => {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/releases`,
            {
                headers: { Accept: 'application/vnd.github.v3+json' },
            }
        );

        if (!response.ok) {
            console.error('Failed to check for updates:', response.statusText);
            return null;
        }

        const releases = await response.json();
        if (!releases || releases.length === 0) return null;

        // 查找最新的 web 热更新 release（tag 以 "web-v" 开头）
        for (const release of releases) {
            const tag: string = release.tag_name || '';

            if (tag.startsWith('web-v')) {
                const remoteVersion = tag.replace('web-v', '');

                if (compareVersions(WEB_VERSION, remoteVersion) > 0) {
                    // 查找 web-bundle.zip 附件
                    const bundleAsset = release.assets?.find(
                        (a: Record<string, string>) =>
                            a.name === 'web-bundle.zip'
                    );

                    if (bundleAsset) {
                        return {
                            version: remoteVersion,
                            downloadUrl: bundleAsset.browser_download_url,
                            releaseNotes: release.body || '',
                            isWebUpdate: true,
                        };
                    }
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Update check failed:', error);
        return null;
    }
};

/**
 * 下载并应用 Web 热更新
 * NOTE: 使用 @capgo/capacitor-updater 的原生能力下载 zip 并切换 WebView 路径
 */
export const downloadAndApplyUpdate = async (
    downloadUrl: string,
    onProgress?: (progress: number) => void
): Promise<boolean> => {
    try {
        onProgress?.(10);

        // 通知插件准备应用更新（阻止自动回滚）
        await CapacitorUpdater.notifyAppReady();

        onProgress?.(20);

        // 使用 capacitor-updater 下载 zip bundle
        // NOTE: download 方法接受 url 参数，插件在原生层处理下载和解压
        const bundle = await CapacitorUpdater.download({
            url: downloadUrl,
            version: new Date().toISOString(), // 用时间戳作为内部标识
        });

        onProgress?.(80);

        // 设置下一次加载使用新 bundle
        await CapacitorUpdater.set({ id: bundle.id });

        onProgress?.(100);

        return true;
    } catch (error) {
        console.error('Failed to apply update:', error);
        return false;
    }
};

/**
 * 重新加载应用以应用更新
 */
export const reloadApp = (): void => {
    // NOTE: 使用 capacitor-updater 的 reload 来切换到新 bundle
    CapacitorUpdater.reload();
};

/**
 * 应用启动时通知插件当前版本运行正常
 * NOTE: 必须在每次启动时调用，否则插件会认为更新失败并自动回滚
 */
export const notifyAppReady = async (): Promise<void> => {
    try {
        await CapacitorUpdater.notifyAppReady();
    } catch (error) {
        console.error('Failed to notify app ready:', error);
    }
};
