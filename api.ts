import { supabase, deleteAvatar, deleteSheetMusic, deleteRecordingFile } from './supabase';
import { Composer, Work, Recording } from './types';

// 我们不再需要 backend/main.py 或 localhost:8000
// 直接在前端使用 Supabase Client，这样 Vercel 部署就能直接工作

export const api = {
    // --- Composers (作曲家) ---
    getComposers: async (): Promise<Composer[]> => {
        const { data, error } = await supabase
            .from('composers')
            .select('*')
            .order('name');

        if (error) throw error;

        // 获取所有作曲家的作品 and 录音数量
        const composerIds = (data || []).map(c => c.id);

        // 批量查询作品数量
        const { data: worksCount } = await supabase
            .from('works')
            .select('composer_id')
            .in('composer_id', composerIds);

        // 批量查询录音数量
        const { data: recordingsCount } = await supabase
            .from('recordings')
            .select('composer_id')
            .in('composer_id', composerIds);

        // 统计每个作曲家的数量
        const worksCounts: Record<string, number> = {};
        const recordingsCounts: Record<string, number> = {};

        (worksCount || []).forEach(w => {
            worksCounts[w.composer_id] = (worksCounts[w.composer_id] || 0) + 1;
        });

        (recordingsCount || []).forEach(r => {
            recordingsCounts[r.composer_id] = (recordingsCounts[r.composer_id] || 0) + 1;
        });

        return (data || []).map(composer => ({
            ...composer,
            sheetMusicCount: worksCounts[composer.id] || 0,
            recordingCount: recordingsCounts[composer.id] || 0,
            works: [],
            recordings: []
        }));
    },


    getComposer: async (id: string): Promise<Composer> => {
        // 1. 获取作曲家基本信息
        const { data: composer, error: composerError } = await supabase
            .from('composers')
            .select('*')
            .eq('id', id)
            .single();

        if (composerError) throw composerError;

        // 2. 获取关联的作品
        const { data: works, error: worksError } = await supabase
            .from('works')
            .select('*')
            .eq('composer_id', id);

        if (worksError) throw worksError;

        // 3. 获取关联的录音
        const { data: recordings, error: recordingsError } = await supabase
            .from('recordings')
            .select('*')
            .eq('composer_id', id);

        if (recordingsError) throw recordingsError;

        // 组装数据，并将 file_url 转换为 fileUrl
        return {
            ...composer,
            works: (works || []).map((w: any) => ({
                ...w,
                fileUrl: w.file_url  // NOTE: 数据库使用 snake_case，前端使用 camelCase
            })),
            recordings: (recordings || []).map((r: any) => ({
                ...r,
                fileUrl: r.file_url  // NOTE: 数据库使用 snake_case，前端使用 camelCase
            }))
        };
    },

    createComposer: async (composer: { name: string; period: string; image: string }): Promise<Composer> => {
        // 移除 id，让数据库自动生成
        const { data, error } = await supabase
            .from('composers')
            .insert([composer])
            .select()
            .single();

        if (error) throw error;
        return { ...data, works: [], recordings: [] };
    },

    updateComposer: async (id: string, composer: Partial<Composer>): Promise<Composer> => {
        // 更新时排除关联数组，只更新字段
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { works, recordings, ...updates } = composer;

        const { data, error } = await supabase
            .from('composers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteComposer: async (id: string): Promise<void> => {
        // 1. 获取所有关联内容以删除文件
        const { data: composer } = await supabase.from('composers').select('image').eq('id', id).single();
        const { data: works } = await supabase.from('works').select('file_url').eq('composer_id', id);
        const { data: recordings } = await supabase.from('recordings').select('file_url').eq('composer_id', id);

        // 2. 删除作品文件
        if (works) {
            for (const work of works) {
                if (work.file_url) await deleteSheetMusic(work.file_url);
            }
        }

        // 3. 删除录音文件
        if (recordings) {
            for (const rec of recordings) {
                if (rec.file_url) await deleteRecordingFile(rec.file_url);
            }
        }

        // 4. 删除头像
        if (composer?.image) {
            await deleteAvatar(composer.image);
        }

        // 5. 删除数据库记录 (级联删除会自动处理 works 和 recordings 的 DB 记录)
        const { error } = await supabase
            .from('composers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Works (作品/乐谱) ---
    createWork: async (work: any): Promise<Work> => {
        // 你的数据库字段是 composer_id, title, edition, year, file_url
        // 前端传进来的 work 对象需要匹配这些字段
        const payload = {
            composer_id: work.composer_id,
            title: work.title,
            edition: work.edition,
            year: work.year,
            file_url: work.fileUrl || work.file_url, // 兼容两种写法
            // source_url: work.sourceUrl, // Reverted
            // source_credit: work.sourceCredit, // Reverted
            // license: work.license // Reverted
        };

        const { data, error } = await supabase
            .from('works')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        // NOTE: 转换 file_url 为 fileUrl 以匹配前端类型
        return { ...data, fileUrl: data.file_url };
    },

    updateWork: async (id: string, work: any): Promise<Work> => {
        const payload: any = {};
        if (work.title) payload.title = work.title;
        if (work.edition) payload.edition = work.edition;
        if (work.year) payload.year = work.year;
        if (work.fileUrl) payload.file_url = work.fileUrl;
        if (work.license !== undefined) payload.license = work.license;

        const { data, error } = await supabase
            .from('works')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        // NOTE: 转换 file_url 为 fileUrl 以匹配前端类型
        return { ...data, fileUrl: data.file_url };
    },

    deleteWork: async (id: string): Promise<void> => {
        // 1. 获取并删除文件
        const { data } = await supabase.from('works').select('file_url').eq('id', id).single();
        if (data?.file_url) {
            await deleteSheetMusic(data.file_url);
        }

        // 2. 删除 DB 记录
        const { error } = await supabase
            .from('works')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // 上传后更新数据库字段
    uploadWorkFile: async (workId: string, fileUrl: string): Promise<any> => {
        const { data, error } = await supabase
            .from('works')
            .update({ file_url: fileUrl })
            .eq('id', workId)
            .select()
            .single();

        if (error) throw error;
        // 返回统一格式，将 file_url 转换为 fileUrl 以匹配前端类型
        return { ...data, fileUrl: data.file_url };
    },

    // --- Recordings (录音) ---
    createRecording: async (recording: any): Promise<Recording> => {
        const payload = {
            composer_id: recording.composer_id,
            title: recording.title,
            performer: recording.performer,
            duration: recording.duration,
            year: recording.year,
            file_url: recording.fileUrl || recording.file_url // 兼容两种写法
        };

        const { data, error } = await supabase
            .from('recordings')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        // NOTE: 转换 file_url 为 fileUrl 以匹配前端类型
        return { ...data, fileUrl: data.file_url };
    },

    updateRecording: async (id: string, recording: any): Promise<Recording> => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, created_at, composer_id, fileUrl, ...updates } = recording;

        // 如果有 fileUrl，转换为 file_url
        if (fileUrl) {
            updates.file_url = fileUrl;
        }

        const { data, error } = await supabase
            .from('recordings')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        // NOTE: 转换 file_url 为 fileUrl 以匹配前端类型
        return { ...data, fileUrl: data.file_url };
    },

    deleteRecording: async (id: string): Promise<void> => {
        // 1. 获取并删除文件
        const { data } = await supabase.from('recordings').select('file_url').eq('id', id).single();
        if (data?.file_url) {
            await deleteRecordingFile(data.file_url);
        }

        // 2. 删除 DB 记录
        const { error } = await supabase
            .from('recordings')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // 上传后更新录音的 file_url 字段
    uploadRecordingFileUrl: async (recordingId: string, fileUrl: string): Promise<any> => {
        const { data, error } = await supabase
            .from('recordings')
            .update({ file_url: fileUrl })
            .eq('id', recordingId)
            .select()
            .single();

        if (error) throw error;
        // 返回统一格式，将 file_url 转换为 fileUrl 以匹配前端类型
        return { ...data, fileUrl: data.file_url };
    },

    // --- Auth (认证) ---
    getCurrentUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    getCurrentProfile: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        return data;
    }
};