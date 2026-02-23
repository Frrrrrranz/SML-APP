import {
    dbGetComposers,
    dbGetComposer,
    dbCreateComposer,
    dbUpdateComposer,
    dbDeleteComposer,
    dbCreateWork,
    dbUpdateWork,
    dbDeleteWork,
    dbUploadWorkFile,
    dbCreateRecording,
    dbUpdateRecording,
    dbDeleteRecording,
    dbUploadRecordingFileUrl,
} from './local-database';
import { saveLocalFile, deleteLocalFile, getLocalFileUri } from './local-file-storage';
import { Composer, Work, Recording } from '../types';

/**
 * 本地存储 API 层
 * NOTE: 接口签名与云端 api.ts 完全一致，实现存储模式无缝切换
 */
export const localApi = {
    // --- Composers ---
    getComposers: async (): Promise<Composer[]> => {
        return dbGetComposers() as Promise<Composer[]>;
    },

    getComposer: async (id: string): Promise<Composer> => {
        return dbGetComposer(id) as Promise<Composer>;
    },

    createComposer: async (composer: { name: string; period: string; image: string }): Promise<Composer> => {
        return dbCreateComposer(composer) as Promise<Composer>;
    },

    updateComposer: async (id: string, composer: Partial<Composer>): Promise<Composer> => {
        return dbUpdateComposer(id, composer as Record<string, unknown>) as Promise<Composer>;
    },

    deleteComposer: async (id: string): Promise<void> => {
        // NOTE: SQLite 外键 CASCADE 会自动删除关联的 works/recordings 记录
        // 但需要手动删除关联的本地文件
        try {
            const composerData = await dbGetComposer(id);

            // 删除作品文件
            if (composerData.works) {
                for (const work of composerData.works) {
                    if (work.fileUrl) await deleteLocalFile(work.fileUrl);
                }
            }

            // 删除录音文件
            if (composerData.recordings) {
                for (const rec of composerData.recordings) {
                    if (rec.fileUrl) await deleteLocalFile(rec.fileUrl);
                }
            }

            // 删除头像文件
            if (composerData.image) {
                await deleteLocalFile(composerData.image);
            }
        } catch {
            // 文件删除失败不阻塞数据库记录删除
            console.warn('Some files could not be deleted during composer removal');
        }

        await dbDeleteComposer(id);
    },

    // --- Works ---
    createWork: async (work: Record<string, unknown>): Promise<Work> => {
        return dbCreateWork(work) as unknown as Promise<Work>;
    },

    updateWork: async (id: string, work: Record<string, unknown>): Promise<Work> => {
        return dbUpdateWork(id, work) as Promise<Work>;
    },

    deleteWork: async (id: string): Promise<void> => {
        // 先查询文件路径再删除
        try {
            const composer = await findWorkComposer(id);
            if (composer) {
                const work = composer.works.find(w => w.id === id);
                if (work?.fileUrl) await deleteLocalFile(work.fileUrl);
            }
        } catch {
            console.warn('Could not delete work file');
        }
        await dbDeleteWork(id);
    },

    uploadWorkFile: async (workId: string, fileUrl: string): Promise<Work> => {
        return dbUploadWorkFile(workId, fileUrl) as Promise<Work>;
    },

    // --- Recordings ---
    createRecording: async (recording: Record<string, unknown>): Promise<Recording> => {
        return dbCreateRecording(recording) as unknown as Promise<Recording>;
    },

    updateRecording: async (id: string, recording: Record<string, unknown>): Promise<Recording> => {
        return dbUpdateRecording(id, recording) as Promise<Recording>;
    },

    deleteRecording: async (id: string): Promise<void> => {
        try {
            const composer = await findRecordingComposer(id);
            if (composer) {
                const rec = composer.recordings.find(r => r.id === id);
                if (rec?.fileUrl) await deleteLocalFile(rec.fileUrl);
            }
        } catch {
            console.warn('Could not delete recording file');
        }
        await dbDeleteRecording(id);
    },

    uploadRecordingFileUrl: async (recordingId: string, fileUrl: string): Promise<Recording> => {
        return dbUploadRecordingFileUrl(recordingId, fileUrl) as Promise<Recording>;
    },

    // --- Auth （本地模式使用 Supabase 认证，这些方法不需要本地实现）---
    getCurrentUser: async () => {
        // NOTE: 认证仍走云端 Supabase，此处仅保持接口一致
        const { supabase } = await import('../supabase');
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    getCurrentProfile: async () => {
        const { supabase } = await import('../supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        return data;
    },
};

/**
 * 本地文件上传函数（替代 supabase.ts 中的上传函数）
 * 与 supabase.ts 的 uploadSheetMusic/uploadAvatar/uploadRecordingFile 接口一致
 */
export const localUploadSheetMusic = async (file: File, workId: string): Promise<string> => {
    return saveLocalFile(file, 'sheets', workId);
};

export const localUploadAvatar = async (file: File, composerId: string): Promise<string> => {
    return saveLocalFile(file, 'avatars', composerId);
};

export const localUploadRecordingFile = async (file: File, recordingId: string): Promise<string> => {
    return saveLocalFile(file, 'recordings', recordingId);
};

export const localDeleteSheetMusic = async (filePath: string): Promise<void> => {
    await deleteLocalFile(filePath);
};

export const localDeleteAvatar = async (filePath: string): Promise<void> => {
    await deleteLocalFile(filePath);
};

export const localDeleteRecordingFile = async (filePath: string): Promise<void> => {
    await deleteLocalFile(filePath);
};

// =============================================
// 辅助函数
// =============================================

/**
 * 根据 work ID 查找所属的作曲家（用于删除文件时获取文件路径）
 */
const findWorkComposer = async (workId: string): Promise<Composer | null> => {
    const composers = await dbGetComposers() as unknown as Composer[];
    for (const c of composers) {
        const full = await dbGetComposer(c.id) as unknown as Composer;
        if (full.works?.some((w: Work) => w.id === workId)) {
            return full;
        }
    }
    return null;
};

const findRecordingComposer = async (recordingId: string): Promise<Composer | null> => {
    const composers = await dbGetComposers() as unknown as Composer[];
    for (const c of composers) {
        const full = await dbGetComposer(c.id) as unknown as Composer;
        if (full.recordings?.some((r: Recording) => r.id === recordingId)) {
            return full;
        }
    }
    return null;
};

