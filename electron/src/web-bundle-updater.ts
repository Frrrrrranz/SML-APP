import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import JSZip from 'jszip';

type GithubAsset = {
    name?: string;
    browser_download_url?: string;
};

type GithubRelease = {
    tag_name?: string;
    body?: string;
    assets?: GithubAsset[];
};

type CheckUpdateResult = {
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    isWebUpdate: true;
} | null;

const GITHUB_REPO = 'Frrrrrranz/SML-APP';
// Desktop OTA channel: tag=web-desktop-v<version>, asset=web-bundle-desktop.zip
const RELEASE_TAG_PREFIX = 'web-desktop-v';
const BUNDLE_ASSET_NAME = 'web-bundle-desktop.zip';

const DESKTOP_WEB_ROOT = path.join(app.getPath('userData'), 'desktop-web');
const ACTIVE_DIR = path.join(DESKTOP_WEB_ROOT, 'active');
const STAGED_DIR = path.join(DESKTOP_WEB_ROOT, 'staged');
const BACKUP_DIR = path.join(DESKTOP_WEB_ROOT, 'backup');
const ACTIVE_MANIFEST_PATH = path.join(ACTIVE_DIR, 'bundle-meta.json');
let progressWindow: BrowserWindow | null = null;
let handlersRegistered = false;

const ensureDir = (dirPath: string): void => {
    fs.mkdirSync(dirPath, { recursive: true });
};

const removeDirIfExists = (dirPath: string): void => {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
};

const compareVersion = (a: string, b: string): number => {
    const pa = a.split('.').map((s) => Number(s || 0));
    const pb = b.split('.').map((s) => Number(s || 0));
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i += 1) {
        const va = pa[i] || 0;
        const vb = pb[i] || 0;
        if (va > vb) return 1;
        if (va < vb) return -1;
    }
    return 0;
};

const getCoreVersion = (version: string): string =>
    version
        .split('.')
        .slice(0, 3)
        .map((s) => String(Number(s || 0)))
        .join('.');

const readInstalledVersion = (): string | null => {
    try {
        if (!fs.existsSync(ACTIVE_MANIFEST_PATH)) return null;
        const raw = fs.readFileSync(ACTIVE_MANIFEST_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as { version?: string };
        return parsed.version || null;
    } catch (error) {
        console.warn('[DesktopWebUpdate] Failed to read installed manifest:', error);
        return null;
    }
};

const shouldUseActiveBundle = (): boolean => {
    const activeIndex = path.join(ACTIVE_DIR, 'index.html');
    if (!fs.existsSync(activeIndex)) return false;

    const installed = readInstalledVersion();
    if (!installed) {
        console.warn('[DesktopWebUpdate] Active bundle found but manifest missing, fallback to built-in dist');
        return false;
    }

    const desktopVersion = app.getVersion();
    if (getCoreVersion(installed) !== getCoreVersion(desktopVersion)) {
        console.warn(
            `[DesktopWebUpdate] Ignore stale active bundle ${installed} for desktop ${desktopVersion}, fallback to built-in dist`
        );
        return false;
    }

    return true;
};

const writeManifest = (version: string, sha256: string): void => {
    const payload = JSON.stringify(
        {
            version,
            sha256,
            appliedAt: new Date().toISOString(),
        },
        null,
        2
    );
    fs.writeFileSync(ACTIVE_MANIFEST_PATH, payload, 'utf-8');
};

const safeJoin = (baseDir: string, entryName: string): string => {
    const normalized = entryName.replace(/\\/g, '/').replace(/^\/+/, '');
    const target = path.resolve(baseDir, normalized);
    if (!target.startsWith(baseDir)) {
        throw new Error(`Path traversal detected: ${entryName}`);
    }
    return target;
};

const emitProgress = (percent: number): void => {
    if (!progressWindow || progressWindow.isDestroyed()) return;
    progressWindow.webContents.send('desktop-web-update:progress', {
        percent: Math.max(0, Math.min(100, Math.round(percent))),
    });
};

const fetchLatestWebRelease = async (): Promise<CheckUpdateResult> => {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const releases = (await response.json()) as GithubRelease[];
    if (!Array.isArray(releases) || releases.length === 0) return null;

    for (const release of releases) {
        const tag = release.tag_name || '';
        if (!tag.startsWith(RELEASE_TAG_PREFIX)) continue;

        const version = tag.slice(RELEASE_TAG_PREFIX.length);
        const asset = release.assets?.find((item) => item.name === BUNDLE_ASSET_NAME);
        if (!version || !asset?.browser_download_url) continue;

        return {
            version,
            downloadUrl: asset.browser_download_url,
            releaseNotes: release.body || '',
            isWebUpdate: true,
        };
    }

    return null;
};

const downloadBuffer = async (
    url: string
): Promise<Buffer> => {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
        throw new Error(`Download failed: ${response.status}`);
    }

    const total = Number(response.headers.get('content-length') || 0);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    emitProgress(2);

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        chunks.push(value);
        received += value.byteLength;
        if (total > 0) {
            const p = 2 + (received / total) * 58;
            emitProgress(p);
        }
    }

    if (chunks.length === 0) {
        throw new Error('Downloaded bundle is empty');
    }

    const merged = Buffer.concat(chunks.map((u8) => Buffer.from(u8)));
    emitProgress(62);
    return merged;
};

const extractZipToDir = async (
    zipBuffer: Buffer,
    targetDir: string
): Promise<void> => {
    const zip = await JSZip.loadAsync(zipBuffer);
    const files = Object.values(zip.files);
    const entries = files.filter((f) => !f.dir);

    removeDirIfExists(targetDir);
    ensureDir(targetDir);

    let index = 0;
    const total = Math.max(entries.length, 1);

    for (const entry of entries) {
        const filePath = safeJoin(targetDir, entry.name);
        ensureDir(path.dirname(filePath));
        const data = await entry.async('nodebuffer');
        fs.writeFileSync(filePath, data);

        index += 1;
        const p = 62 + (index / total) * 33;
        emitProgress(p);
    }

    const stagedIndex = path.join(targetDir, 'index.html');
    if (!fs.existsSync(stagedIndex)) {
        throw new Error('Invalid bundle: index.html not found');
    }
};

const switchActiveBundle = (version: string, sha256: string): void => {
    ensureDir(DESKTOP_WEB_ROOT);
    removeDirIfExists(BACKUP_DIR);

    if (fs.existsSync(ACTIVE_DIR)) {
        fs.renameSync(ACTIVE_DIR, BACKUP_DIR);
    }

    try {
        fs.renameSync(STAGED_DIR, ACTIVE_DIR);
        writeManifest(version, sha256);
        removeDirIfExists(BACKUP_DIR);
    } catch (error) {
        removeDirIfExists(ACTIVE_DIR);
        if (fs.existsSync(BACKUP_DIR)) {
            fs.renameSync(BACKUP_DIR, ACTIVE_DIR);
        }
        throw error;
    }
};

export const getPreferredRendererEntry = (): string => {
    if (shouldUseActiveBundle()) {
        return path.join(ACTIVE_DIR, 'index.html');
    }
    return path.join(__dirname, '..', '..', 'dist', 'index.html');
};

export const initDesktopWebBundleUpdater = (mainWindow: BrowserWindow): void => {
    progressWindow = mainWindow;
    if (handlersRegistered) return;
    handlersRegistered = true;

    ipcMain.handle('desktop-web-update:check', async (_event, currentVersion: string) => {
        try {
            const remote = await fetchLatestWebRelease();
            if (!remote) return null;

            const installed = readInstalledVersion();
            const baseline = installed || currentVersion;
            const hasNewer = compareVersion(remote.version, baseline) > 0;
            return hasNewer ? remote : null;
        } catch (error) {
            console.error('[DesktopWebUpdate] Check failed:', error);
            return null;
        }
    });

    ipcMain.handle(
        'desktop-web-update:download',
        async (_event, payload: { downloadUrl: string; version: string }) => {
            try {
                const zipBuffer = await downloadBuffer(payload.downloadUrl);
                const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');
                await extractZipToDir(zipBuffer, STAGED_DIR);
                switchActiveBundle(payload.version, sha256);
                emitProgress(100);
                return true;
            } catch (error) {
                console.error('[DesktopWebUpdate] Download/apply failed:', error);
                return false;
            }
        }
    );

    ipcMain.handle('desktop-web-update:apply', () => {
        app.relaunch();
        app.exit(0);
    });
};
