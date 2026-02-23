import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * 本地文件存储服务
 * 使用 Capacitor Filesystem API 管理设备上的乐谱、录音、头像文件
 * NOTE: 文件存储在 APP 私有目录（Documents/SML/）中
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
    try {
        await Filesystem.mkdir({
            path: dirPath,
            directory: Directory.Documents,
            recursive: true,
        });
    } catch (error: unknown) {
        // 目录已存在时会抛出错误，忽略即可
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

    await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Documents,
    });

    return filePath;
};

/**
 * 删除本地文件
 * @param filePath 文件路径（saveLocalFile 返回的路径）
 */
export const deleteLocalFile = async (filePath: string): Promise<void> => {
    if (!filePath) return;

    try {
        await Filesystem.deleteFile({
            path: filePath,
            directory: Directory.Documents,
        });
    } catch (error) {
        // 文件不存在时忽略错误
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

    try {
        const result = await Filesystem.getUri({
            path: filePath,
            directory: Directory.Documents,
        });
        // NOTE: Android WebView 需要 Capacitor 的 convertFileSrc 来访问本地文件
        // 但在 Capacitor 中，getUri 返回的路径已经可用
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
    const result = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Documents,
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
            const result = await Filesystem.readdir({
                path: dir,
                directory: Directory.Documents,
            });

            const files = result.files || [];
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
