import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { Capacitor } from '@capacitor/core';
import { isElectron } from './platform';

/**
 * 本地文件存储服务
 * 使用 Capacitor Filesystem API 管理设备上的乐谱、录音、头像文件
 * NOTE: 文件存储在 APP 私有目录（Data/SML/）中
 */

// 文件分类对应的子目录
const FILE_DIRS = {
    sheets: 'SML/sheets',
    recordings: 'SML/recordings',
    avatars: 'SML/avatars',
} as const;

type FileCategory = keyof typeof FILE_DIRS;

/**
 * 确保目录存在
 */
const ensureDir = async (dirPath: string): Promise<void> => {
    // Electron 分支
    if (isElectron()) {
        await window.electronAPI!.mkdir(dirPath);
        return;
    }
    // Android 分支 — 原有代码不变
    try {
        await Filesystem.mkdir({
            path: dirPath,
            directory: Directory.Data,
            recursive: true,
        });
    } catch (error: unknown) {
        const err = error as { message?: string };
        if (!err.message?.includes('exists')) {
            throw error;
        }
    }
};

/**
 * 保存文件到本地
 * @param file 要保存的文件（Web File 对象）
 * @param category 文件分类（sheets / recordings / avatars）
 * @param id 关联的实体 ID（用于文件命名，确保唯一）
 * @returns 本地文件路径（用于后续读取/删除）
 */
export const saveLocalFile = async (
    file: File,
    category: FileCategory,
    id: string
): Promise<string> => {
    const dir = FILE_DIRS[category];
    await ensureDir(dir);

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `${id}.${fileExt}`;
    const filePath = `${dir}/${fileName}`;

    // 将 File 对象转为 base64
    const base64Data = await fileToBase64(file);

    // Electron 分支
    if (isElectron()) {
        await window.electronAPI!.writeFile(filePath, base64Data);
        return filePath;
    }

    // Android 分支 — 原有代码不变
    await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Data,
    });

    return filePath;
};

/**
 * 删除本地文件
 * @param filePath 文件路径（saveLocalFile 返回的路径）
 */
export const deleteLocalFile = async (filePath: string): Promise<void> => {
    if (!filePath) return;

    // Electron 分支
    if (isElectron()) {
        try {
            await window.electronAPI!.deleteFile(filePath);
        } catch (error) {
            console.warn('Failed to delete local file (Electron):', filePath, error);
        }
        return;
    }

    // Android 分支 — 原有代码不变
    try {
        await Filesystem.deleteFile({
            path: filePath,
            directory: Directory.Data,
        });
    } catch (error) {
        console.warn('Failed to delete local file:', filePath, error);
    }
};

/**
 * 获取本地文件的可访问 URI
 * NOTE: Capacitor 返回的 URI 可以直接用于 <img src> 或 <audio src>
 * @param filePath 文件路径
 * @returns 文件 URI（如 file:///...）或空字符串
 */
export const getLocalFileUri = async (filePath: string): Promise<string> => {
    if (!filePath) return '';

    // Electron 分支：通过 IPC 获取 file:// URI
    if (isElectron()) {
        try {
            return await window.electronAPI!.getFileUri(filePath);
        } catch (error) {
            console.warn('Failed to get file URI (Electron):', filePath, error);
            return '';
        }
    }

    // Android 分支 — 原有代码不变
    try {
        const result = await Filesystem.getUri({
            path: filePath,
            directory: Directory.Data,
        });
        return result.uri;
    } catch (error) {
        console.warn('Failed to get file URI:', filePath, error);
        return '';
    }
};

/**
 * 读取本地文件内容（base64）
 * 用于需要直接操作文件内容的场景
 */
export const readLocalFile = async (filePath: string): Promise<string> => {
    // Electron 分支
    if (isElectron()) {
        return await window.electronAPI!.readFile(filePath);
    }
    // Android 分支 — 原有代码不变
    const result = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Data,
    });
    return result.data as string;
};

/**
 * 获取本地存储使用量
 * @returns 各分类的文件数量和总大小
 */
export const getStorageUsage = async (): Promise<{
    sheets: { count: number; size: number };
    recordings: { count: number; size: number };
    avatars: { count: number; size: number };
    total: number;
}> => {
    const usage = {
        sheets: { count: 0, size: 0 },
        recordings: { count: 0, size: 0 },
        avatars: { count: 0, size: 0 },
        total: 0,
    };

    for (const [category, dir] of Object.entries(FILE_DIRS)) {
        try {
            let files: { name: string; size: number }[] = [];

            // Electron 分支
            if (isElectron()) {
                files = await window.electronAPI!.readdir(dir);
            } else {
                // Android 分支 — 原有逻辑不变
                const result = await Filesystem.readdir({
                    path: dir,
                    directory: Directory.Data,
                });
                files = (result.files || []).map(f => ({ name: f.name, size: f.size || 0 }));
            }

            const categoryKey = category as FileCategory;
            usage[categoryKey].count = files.length;
            usage[categoryKey].size = files.reduce((sum, f) => sum + (f.size || 0), 0);
        } catch {
            // 目录不存在就跳过
        }
    }

    usage.total = usage.sheets.size + usage.recordings.size + usage.avatars.size;
    return usage;
};

// =============================================
// 工具函数
// =============================================

/**
 * 将 File 对象转换为 base64 字符串
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // 移除 data:xxx;base64, 前缀
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * 根据文件扩展名推断 MIME 类型
 */
const getMimeType = (ext: string): string => {
    const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        html: 'text/html',
        htm: 'text/html',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        mp4: 'video/mp4',
        m4a: 'audio/mp4',
        ogg: 'audio/ogg',
        aac: 'audio/aac',
        flac: 'audio/flac',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
    };
    return mimeMap[ext] || 'application/octet-stream';
};

/**
 * 使用系统应用打开本地文件（触发 Android Intent 选择器）
 * NOTE: 对于本地文件，通过 FileOpener 插件调用系统 Intent
 * 对于 HTTP URL，使用浏览器打开
 * @param filePath 本地相对路径（如 SML/sheets/xxx.pdf）或 HTTP URL
 */
export const openWithSystemApp = async (filePath: string): Promise<void> => {
    if (!filePath) {
        throw new Error('File path is empty');
    }

    console.log('[openWithSystemApp] Opening file:', filePath);

    // HTTP URL 用浏览器打开
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        console.log('[openWithSystemApp] Opening HTTP URL in browser');
        window.open(filePath, '_system');
        return;
    }

    // Electron 分支：通过 IPC 调用 shell.openPath
    if (isElectron()) {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        if (ext === 'html' || ext === 'htm') {
            const htmlUri = await getLocalFileUri(filePath);
            if (htmlUri) {
                window.open(htmlUri, '_blank');
                return;
            }
        }
        console.log('[openWithSystemApp] Opening via Electron IPC');
        await window.electronAPI!.openFile(filePath);
        return;
    }

    // Android 分支 — 原有代码不变
    const result = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Data,
    });
    const fileUri = result.uri;
    console.log('[openWithSystemApp] File URI:', fileUri);

    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (ext === 'html' || ext === 'htm') {
        const webViewUrl = Capacitor.convertFileSrc(fileUri);
        window.open(webViewUrl, '_blank');
        return;
    }
    const mimeType = getMimeType(ext);
    console.log('[openWithSystemApp] MIME type:', mimeType);

    await FileOpener.openFile({
        path: fileUri,
        mimeType,
    });
};
