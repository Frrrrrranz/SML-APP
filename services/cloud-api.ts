import { supabase } from '../supabase';
import { Composer, Work, Recording } from '../types';
import {
    dbCreateComposer,
    dbCreateWork,
    dbCreateRecording,
    dbUploadWorkFile,
    dbUploadRecordingFileUrl,
} from './local-database';
import { readLocalFile, saveLocalFile, getLocalFileUri } from './local-file-storage';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * 云端 API 服务层
 * NOTE: 操作 Supabase 现有的 composers/works/recordings 表
 * 管理员推送本地数据到云端，用户从云端拉取到本地
 */

// =============================================
// 读取云端数据
// =============================================

/**
 * 获取云端所有作曲家列表（含作品/录音数量）
 */
export const getCloudComposers = async (): Promise<Composer[]> => {
    const { data: composers, error } = await supabase
        .from('composers')
        .select('*')
        .order('name');

    if (error) {
        console.error('Failed to fetch cloud composers:', error);
        throw new Error(`Failed to fetch cloud composers: ${error.message}`);
    }

    if (!composers || composers.length === 0) {
        return [];
    }

    // 批量查询各作曲家的作品和录音数量
    const { data: worksCounts } = await supabase
        .from('works')
        .select('composer_id');

    const { data: recordingsCounts } = await supabase
        .from('recordings')
        .select('composer_id');

    const worksMap: Record<string, number> = {};
    const recordingsMap: Record<string, number> = {};

    (worksCounts || []).forEach((w: Record<string, string>) => {
        worksMap[w.composer_id] = (worksMap[w.composer_id] || 0) + 1;
    });
    (recordingsCounts || []).forEach((r: Record<string, string>) => {
        recordingsMap[r.composer_id] = (recordingsMap[r.composer_id] || 0) + 1;
    });

    return composers.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        period: (c.period || '') as string,
        image: (c.image || '') as string,
        sheetMusicCount: worksMap[c.id as string] || 0,
        recordingCount: recordingsMap[c.id as string] || 0,
        works: [],
        recordings: [],
    }));
};

/**
 * 获取云端某作曲家的完整数据（含 works + recordings）
 */
export const getCloudComposer = async (id: string): Promise<Composer> => {
    const { data: composer, error: composerError } = await supabase
        .from('composers')
        .select('*')
        .eq('id', id)
        .single();

    if (composerError || !composer) {
        throw new Error(`Cloud composer not found: ${composerError?.message}`);
    }

    const { data: works } = await supabase
        .from('works')
        .select('*')
        .eq('composer_id', id);

    const { data: recordings } = await supabase
        .from('recordings')
        .select('*')
        .eq('composer_id', id);

    return {
        id: composer.id,
        name: composer.name,
        period: composer.period || '',
        image: composer.image || '',
        works: (works || []).map((w: Record<string, unknown>) => ({
            id: w.id as string,
            composerId: w.composer_id as string,
            title: w.title as string,
            edition: (w.edition || '') as string,
            year: (w.year || '') as string,
            fileUrl: (w.file_url || '') as string,
        })),
        recordings: (recordings || []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            composerId: r.composer_id as string,
            title: r.title as string,
            performer: (r.performer || '') as string,
            duration: (r.duration || '') as string,
            year: (r.year || '') as string,
            fileUrl: (r.file_url || '') as string,
        })),
    };
};

// =============================================
// 管理员推送：本地 → 云端
// =============================================

/**
 * 推送本地作曲家到 Supabase 云端
 * NOTE: 包括作曲家信息、关联的 works/recordings 以及文件
 * @param localComposer 本地完整的作曲家数据（含 works 和 recordings）
 * @param onProgress 进度回调 (0-100)
 */
export const pushComposerToCloud = async (
    localComposer: Composer,
    onProgress?: (progress: number) => void
): Promise<void> => {
    // 计算总步骤数用于进度条
    const totalSteps = 1 + (localComposer.works?.length || 0) + (localComposer.recordings?.length || 0);
    let currentStep = 0;

    const reportProgress = () => {
        currentStep++;
        onProgress?.(Math.round((currentStep / totalSteps) * 100));
    };

    // 1. 上传作曲家头像到 Supabase Storage（如果有本地文件）
    let cloudImageUrl = '';
    if (localComposer.image) {
        try {
            cloudImageUrl = await uploadLocalFileToCloud(
                localComposer.image, 'avatars', `composers/${localComposer.id}`
            );
        } catch {
            // 头像上传失败不阻塞
            console.warn('Failed to upload avatar to cloud, skipping');
        }
    }

    // 2. 插入作曲家记录到 Supabase（同步写入作品/录音计数）
    const { data: cloudComposer, error: composerError } = await supabase
        .from('composers')
        .insert({
            name: localComposer.name,
            period: localComposer.period,
            image: cloudImageUrl,
            sheet_music_count: localComposer.works?.length || 0,
            recording_count: localComposer.recordings?.length || 0,
        })
        .select()
        .single();

    if (composerError || !cloudComposer) {
        throw new Error(`Failed to push composer: ${composerError?.message}`);
    }

    reportProgress();

    // 3. 推送所有 works
    for (const work of localComposer.works || []) {
        let cloudFileUrl = '';
        if (work.fileUrl) {
            try {
                cloudFileUrl = await uploadLocalFileToCloud(
                    work.fileUrl, 'sheet-music', `sheets/${cloudComposer.id}_${work.id}`
                );
            } catch {
                console.warn(`Failed to upload work file: ${work.title}`);
            }
        }

        const { error: workError } = await supabase
            .from('works')
            .insert({
                composer_id: cloudComposer.id,
                title: work.title,
                edition: work.edition || '',
                year: work.year || '',
                file_url: cloudFileUrl,
            });

        if (workError) {
            console.error(`Failed to push work "${work.title}":`, workError);
        }
        reportProgress();
    }

    // 4. 推送所有 recordings
    for (const recording of localComposer.recordings || []) {
        let cloudFileUrl = '';
        if (recording.fileUrl) {
            try {
                cloudFileUrl = await uploadLocalFileToCloud(
                    recording.fileUrl, 'recordings', `audio/${cloudComposer.id}_${recording.id}`
                );
            } catch {
                console.warn(`Failed to upload recording file: ${recording.title}`);
            }
        }

        const { error: recError } = await supabase
            .from('recordings')
            .insert({
                composer_id: cloudComposer.id,
                title: recording.title,
                performer: recording.performer || '',
                duration: recording.duration || '',
                year: recording.year || '',
                file_url: cloudFileUrl,
            });

        if (recError) {
            console.error(`Failed to push recording "${recording.title}":`, recError);
        }
        reportProgress();
    }
};

// =============================================
// 用户拉取：云端 → 本地
// =============================================

/**
 * 从云端拉取作曲家到本地 SQLite
 * NOTE: 创建为新的本地作曲家，名称追加 (副本)，不做合并/覆盖
 * @param cloudComposerId 云端作曲家 ID
 * @param onProgress 进度回调 (0-100)
 */
export const pullComposerToLocal = async (
    cloudComposerId: string,
    onProgress?: (progress: number) => void
): Promise<void> => {
    // 获取云端完整数据
    const cloudComposer = await getCloudComposer(cloudComposerId);

    const totalSteps = 1 + (cloudComposer.works?.length || 0) + (cloudComposer.recordings?.length || 0);
    let currentStep = 0;

    const reportProgress = () => {
        currentStep++;
        onProgress?.(Math.round((currentStep / totalSteps) * 100));
    };

    // 1. 下载头像到本地（如果有）
    let localImagePath = '';
    if (cloudComposer.image) {
        try {
            localImagePath = await downloadCloudFileToLocal(
                cloudComposer.image, 'avatars', crypto.randomUUID()
            );
        } catch {
            console.warn('Failed to download avatar, skipping');
        }
    }

    // 2. 在本地 SQLite 创建作曲家（名称追加副本标识）
    const localComposer = await dbCreateComposer({
        name: `${cloudComposer.name} (副本)`,
        period: cloudComposer.period,
        image: localImagePath,
    });

    reportProgress();

    // 3. 拉取所有 works
    for (const work of cloudComposer.works || []) {
        let localFilePath = '';
        if (work.fileUrl) {
            try {
                const newWorkId = crypto.randomUUID();
                localFilePath = await downloadCloudFileToLocal(
                    work.fileUrl, 'sheets', newWorkId
                );
            } catch {
                console.warn(`Failed to download work file: ${work.title}`);
            }
        }

        await dbCreateWork({
            composer_id: localComposer.id,
            title: work.title,
            edition: work.edition || '',
            year: work.year || '',
            fileUrl: localFilePath,
        });

        reportProgress();
    }

    // 4. 拉取所有 recordings
    for (const recording of cloudComposer.recordings || []) {
        let localFilePath = '';
        if (recording.fileUrl) {
            try {
                const newRecId = crypto.randomUUID();
                localFilePath = await downloadCloudFileToLocal(
                    recording.fileUrl, 'recordings', newRecId
                );
            } catch {
                console.warn(`Failed to download recording file: ${recording.title}`);
            }
        }

        await dbCreateRecording({
            composer_id: localComposer.id,
            title: recording.title,
            performer: recording.performer || '',
            duration: recording.duration || '',
            year: recording.year || '',
            fileUrl: localFilePath,
        });

        reportProgress();
    }
};

// =============================================
// 文件传输辅助函数
// =============================================

/**
 * 将本地文件上传到 Supabase Storage
 * 读取本地文件的 base64 内容，转为 Blob 后上传
 */
const uploadLocalFileToCloud = async (
    localPath: string,
    bucket: string,
    remotePath: string
): Promise<string> => {
    // 读取本地文件的 base64 数据
    const base64Data = await readLocalFile(localPath);

    // 从路径推断文件扩展名
    const ext = localPath.split('.').pop()?.toLowerCase() || 'bin';
    const fullRemotePath = `${remotePath}.${ext}`;

    // 将 base64 转为 Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // 推断 MIME 类型
    const mimeType = getMimeType(ext);

    const { error } = await supabase.storage
        .from(bucket)
        .upload(fullRemotePath, bytes, {
            contentType: mimeType,
            upsert: true,
        });

    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fullRemotePath);

    return urlData.publicUrl;
};

/**
 * 从 Supabase Storage（公开 URL）下载文件到本地
 */
const downloadCloudFileToLocal = async (
    cloudUrl: string,
    category: 'sheets' | 'recordings' | 'avatars',
    fileId: string
): Promise<string> => {
    // 从 URL 推断扩展名
    const urlPath = new URL(cloudUrl).pathname;
    const ext = urlPath.split('.').pop()?.toLowerCase() || 'bin';

    // 下载文件内容
    const response = await fetch(cloudUrl);
    if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();

    // 转为 base64
    const base64 = await blobToBase64(blob);

    // 保存到本地文件系统
    const dirMap = {
        sheets: 'SML/sheets',
        recordings: 'SML/recordings',
        avatars: 'SML/avatars',
    };

    const filePath = `${dirMap[category]}/${fileId}.${ext}`;

    // 确保目录存在
    try {
        await Filesystem.mkdir({
            path: dirMap[category],
            directory: Directory.Data,
            recursive: true,
        });
    } catch {
        // 目录已存在
    }

    await Filesystem.writeFile({
        path: filePath,
        data: base64,
        directory: Directory.Data,
    });

    return filePath;
};

/**
 * 将 Blob 转为 base64 字符串（不含 data: 前缀）
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // 移除 data:xxx;base64, 前缀
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * 根据文件扩展名获取 MIME 类型
 */
const getMimeType = (ext: string): string => {
    const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        ogg: 'audio/ogg',
    };
    return mimeMap[ext] || 'application/octet-stream';
};
