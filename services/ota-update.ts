import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { WEB_VERSION, GITHUB_REPO } from '../constants/app-version';

/**
 * OTA 热更新服务
 * NOTE: 利用 @capgo/capacitor-updater 在原生层实现 Web 资源热替换，
 * 通过 GitHub Releases API 检测更新并下载 Android 通道资源（web-bundle-android.zip）。
 * ⚠️ 打包 zip 必须使用 capgo CLI（npx @capgo/cli bundle zip dist），
 * PowerShell Compress-Archive 生成的格式不兼容。
 *
 * NOTE: 此模块中所有涉及 CapacitorUpdater 的调用（notifyAppReady、download、set 等）
 * 必须保持静态 import，不得改为动态 import。
 * 原因：@capgo/capacitor-updater 原生层在 App 启动后启动 10 秒倒计时，
 * 必须在超时前调用 notifyAppReady()。动态 import 引入的异步延迟会导致超时触发回滚，
 * 表现为 App 启动后白屏。
 * 该模块仅在安卓端被实际调用（App.tsx 中通过 isAndroid() 守卫）。
 * Electron 不调用任何 OTA 函数，因此静态 import 不会影响桌面端。
 */

// BundleInfo 类型：download() 的返回值结构
type BundleInfo = Awaited<ReturnType<typeof CapacitorUpdater.download>>;

interface UpdateInfo {
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    isWebUpdate: boolean;
}

const ANDROID_WEB_RELEASE_TAG_PREFIX = 'web-android-v';
const ANDROID_WEB_BUNDLE_ASSET_NAME = 'web-bundle-android.zip';

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
 * NOTE: 查找 tag 名称以 "web-android-v" 开头的 release
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
            console.error('[OTA] GitHub API error:', response.status);
            return null;
        }

        const releases = await response.json();
        if (!releases || releases.length === 0) return null;

        for (const release of releases) {
            const tag: string = release.tag_name || '';

            if (tag.startsWith(ANDROID_WEB_RELEASE_TAG_PREFIX)) {
                const remoteVersion = tag.replace(ANDROID_WEB_RELEASE_TAG_PREFIX, '');
                const cmp = compareVersions(WEB_VERSION, remoteVersion);

                if (cmp > 0) {
                    const bundleAsset = release.assets?.find(
                        (a: Record<string, string>) =>
                            a.name === ANDROID_WEB_BUNDLE_ASSET_NAME
                    );

                    if (bundleAsset) {
                        console.log('[OTA] Update available:', remoteVersion);
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
        console.error('[OTA] Update check failed:', error);
        return null;
    }
};

// NOTE: 缓存下载好的 bundle 信息，供用户确认重启时使用
let pendingBundle: BundleInfo | null = null;

/**
 * 下载 Web 热更新 bundle（仅下载，不立即应用）
 * NOTE: 不调用 set()，因为 set() 会立即重载 WebView
 * 下载完成后等用户手动点击"重启"再应用
 */
export const downloadUpdate = async (
    downloadUrl: string,
    onProgress?: (progress: number) => void
): Promise<boolean> => {
    try {
        onProgress?.(10);

        const bundle = await CapacitorUpdater.download({
            url: downloadUrl,
            version: new Date().toISOString(),
        });

        console.log('[OTA] Download complete, bundle id:', bundle.id);
        onProgress?.(100);

        // 缓存 bundle，等用户确认后再应用
        pendingBundle = bundle;
        return true;
    } catch (error) {
        console.error('[OTA] Download failed:', error);
        return false;
    }
};

/**
 * 应用已下载的更新并重新加载
 * NOTE: set() 传入完整 BundleInfo 对象后会切换 bundle 并异步重载 WebView。
 * set() 的 promise 先 resolve，然后异步触发重载，因此后续代码仍会短暂执行。
 * 添加 next() + exitApp() 作为保险降级方案。
 */
export const applyUpdateAndReload = async (): Promise<void> => {
    if (!pendingBundle) {
        console.error('[OTA] No pending bundle to apply');
        return;
    }

    try {
        // NOTE: set() 必须传入完整 BundleInfo 对象（download 返回值）
        await CapacitorUpdater.set(pendingBundle);
        // set() 会异步重载 WebView，后续代码作为降级保险
        await CapacitorUpdater.next({ id: pendingBundle.id });
        const { App: CapacitorApp } = await import('@capacitor/app');
        await CapacitorApp.exitApp();
    } catch (error) {
        console.error('[OTA] Failed to apply update:', error);
    }
};

/**
 * 应用启动时立即通知插件当前版本运行正常
 * NOTE: 必须在应用启动后尽快调用（10 秒内），
 * 否则插件会认为更新导致应用崩溃并自动回滚到上一个版本，表现为白屏。
 * 在 App.tsx 中通过 isAndroid() 守卫确保仅安卓端调用此函数。
 */
export const notifyAppReady = async (): Promise<void> => {
    try {
        await CapacitorUpdater.notifyAppReady();
    } catch (error) {
        // 首次安装或无 bundle 更新时可能报错，忽略即可
        console.warn('[OTA] notifyAppReady skipped:', error);
    }
};
