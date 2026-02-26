import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { getLocalFileUri } from './local-file-storage';
import { Capacitor } from '@capacitor/core';

/**
 * 本地 SQLite 数据库服务
 * NOTE: 表结构与 Supabase 保持一致，便于未来数据同步
 */

const sqliteConnection = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

const DB_NAME = 'sml_local';

// 数据库初始化 SQL
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS composers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  period TEXT DEFAULT '',
  image TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  composer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  edition TEXT DEFAULT '',
  year TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (composer_id) REFERENCES composers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  composer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  performer TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  year TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (composer_id) REFERENCES composers(id) ON DELETE CASCADE
);
`;

// NOTE: 生成唯一 ID，替代 Supabase 自动生成的 UUID
const generateId = (): string => {
    return crypto.randomUUID();
};

/**
 * 初始化数据库连接并创建表
 */
export const initDatabase = async (): Promise<void> => {
    try {
        // 检查是否需要升级（首次运行或版本变更时自动创建表）
        const isConsistent = (await sqliteConnection.checkConnectionsConsistency()).result;
        const isConnection = (await sqliteConnection.isConnection(DB_NAME, false)).result;

        if (isConsistent && isConnection) {
            db = await sqliteConnection.retrieveConnection(DB_NAME, false);
        } else {
            db = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', 1, false);
        }

        await db.open();

        // 启用外键约束（SQLite 默认不启用）
        await db.execute('PRAGMA foreign_keys = ON;');
        await db.execute(CREATE_TABLES_SQL);

        console.log('Local database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize local database:', error);
        throw error;
    }
};

/**
 * 获取数据库连接（确保已初始化）
 */
const getDb = (): SQLiteDBConnection => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

// =============================================
// Composers CRUD
// =============================================

/**
 * 将本地相对路径转换为 WebView 可访问的 URL
 * NOTE: HTTP URL 直接返回；本地路径（如 SML/avatars/xxx.jpg）通过
 * Capacitor Filesystem API 获取 file:// URI，再转为 https://localhost/_capacitor_file_/... 格式
 */
const resolveImageUrl = async (imagePath: string): Promise<string> => {
    if (!imagePath || imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    try {
        const uri = await getLocalFileUri(imagePath);
        return uri ? Capacitor.convertFileSrc(uri) : imagePath;
    } catch {
        console.warn('Failed to resolve image URL:', imagePath);
        return imagePath;
    }
};

export const dbGetComposers = async () => {
    const database = getDb();
    const result = await database.query('SELECT * FROM composers ORDER BY name');
    const composers = result.values || [];

    // 批量查询各作曲家的作品和录音数量
    const worksResult = await database.query('SELECT composer_id, COUNT(*) as count FROM works GROUP BY composer_id');
    const recordingsResult = await database.query('SELECT composer_id, COUNT(*) as count FROM recordings GROUP BY composer_id');

    const worksCounts: Record<string, number> = {};
    const recordingsCounts: Record<string, number> = {};

    (worksResult.values || []).forEach((w: Record<string, unknown>) => {
        worksCounts[w.composer_id as string] = w.count as number;
    });
    (recordingsResult.values || []).forEach((r: Record<string, unknown>) => {
        recordingsCounts[r.composer_id as string] = r.count as number;
    });

    // NOTE: 批量解析所有头像路径，本地路径转为 WebView 可访问的 URL
    const resolvedComposers = await Promise.all(
        composers.map(async (c: Record<string, unknown>) => ({
            ...c,
            image: await resolveImageUrl(c.image as string),
            sheetMusicCount: worksCounts[c.id as string] || 0,
            recordingCount: recordingsCounts[c.id as string] || 0,
            works: [],
            recordings: [],
        }))
    );

    return resolvedComposers;
};

export const dbGetComposer = async (id: string) => {
    const database = getDb();

    const composerResult = await database.query('SELECT * FROM composers WHERE id = ?', [id]);
    if (!composerResult.values?.length) throw new Error('Composer not found');
    const composer = composerResult.values[0];

    // NOTE: 解析头像路径，本地路径转为 WebView 可访问的 URL
    const resolvedImage = await resolveImageUrl(composer.image as string);

    const worksResult = await database.query('SELECT * FROM works WHERE composer_id = ?', [id]);
    const recordingsResult = await database.query('SELECT * FROM recordings WHERE composer_id = ?', [id]);

    return {
        ...composer,
        image: resolvedImage,
        works: (worksResult.values || []).map((w: Record<string, unknown>) => ({
            ...w,
            fileUrl: w.file_url, // NOTE: 与云端 API 保持一致的字段映射
        })),
        recordings: (recordingsResult.values || []).map((r: Record<string, unknown>) => ({
            ...r,
            fileUrl: r.file_url,
        })),
    };
};

export const dbCreateComposer = async (composer: { name: string; period: string; image: string }) => {
    const database = getDb();
    const id = generateId();

    await database.run(
        'INSERT INTO composers (id, name, period, image) VALUES (?, ?, ?, ?)',
        [id, composer.name, composer.period, composer.image]
    );

    return { id, ...composer, works: [], recordings: [] };
};

export const dbUpdateComposer = async (id: string, updates: Record<string, unknown>) => {
    const database = getDb();
    // 动态构建 UPDATE 语句
    const fields = Object.keys(updates).filter(k => !['works', 'recordings', 'id', 'sheetMusicCount', 'recordingCount'].includes(k));
    if (fields.length === 0) {
        const result = await database.query('SELECT * FROM composers WHERE id = ?', [id]);
        return result.values?.[0];
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    await database.run(`UPDATE composers SET ${setClause} WHERE id = ?`, [...values, id]);

    const result = await database.query('SELECT * FROM composers WHERE id = ?', [id]);
    return result.values?.[0];
};

export const dbDeleteComposer = async (id: string) => {
    const database = getDb();
    // NOTE: 外键 CASCADE 会自动删除关联的 works 和 recordings
    await database.run('DELETE FROM composers WHERE id = ?', [id]);
};

// =============================================
// Works CRUD
// =============================================

export const dbCreateWork = async (work: Record<string, unknown>) => {
    const database = getDb();
    const id = generateId();
    const fileUrl = (work.fileUrl || work.file_url || '') as string;

    await database.run(
        'INSERT INTO works (id, composer_id, title, edition, year, file_url) VALUES (?, ?, ?, ?, ?, ?)',
        [id, work.composer_id, work.title, work.edition || '', work.year || '', fileUrl]
    );

    return { id, ...work, file_url: fileUrl, fileUrl };
};

export const dbUpdateWork = async (id: string, work: Record<string, unknown>) => {
    const database = getDb();
    const updates: Record<string, unknown> = {};

    if (work.title) updates.title = work.title;
    if (work.edition) updates.edition = work.edition;
    if (work.year) updates.year = work.year;
    if (work.fileUrl) updates.file_url = work.fileUrl;

    const fields = Object.keys(updates);
    if (fields.length === 0) {
        const result = await database.query('SELECT * FROM works WHERE id = ?', [id]);
        return { ...result.values?.[0], fileUrl: result.values?.[0]?.file_url };
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    await database.run(`UPDATE works SET ${setClause} WHERE id = ?`, [...values, id]);

    const result = await database.query('SELECT * FROM works WHERE id = ?', [id]);
    return { ...result.values?.[0], fileUrl: result.values?.[0]?.file_url };
};

export const dbDeleteWork = async (id: string) => {
    const database = getDb();
    await database.run('DELETE FROM works WHERE id = ?', [id]);
};

export const dbUploadWorkFile = async (workId: string, fileUrl: string) => {
    const database = getDb();
    await database.run('UPDATE works SET file_url = ? WHERE id = ?', [fileUrl, workId]);
    const result = await database.query('SELECT * FROM works WHERE id = ?', [workId]);
    return { ...result.values?.[0], fileUrl: result.values?.[0]?.file_url };
};

// =============================================
// Recordings CRUD
// =============================================

export const dbCreateRecording = async (recording: Record<string, unknown>) => {
    const database = getDb();
    const id = generateId();
    const fileUrl = (recording.fileUrl || recording.file_url || '') as string;

    await database.run(
        'INSERT INTO recordings (id, composer_id, title, performer, duration, year, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, recording.composer_id, recording.title, recording.performer || '', recording.duration || '', recording.year || '', fileUrl]
    );

    return { id, ...recording, file_url: fileUrl, fileUrl };
};

export const dbUpdateRecording = async (id: string, recording: Record<string, unknown>) => {
    const database = getDb();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, created_at, composer_id, fileUrl, ...rest } = recording;

    const updates = { ...rest } as Record<string, unknown>;
    if (fileUrl) {
        updates.file_url = fileUrl;
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) {
        const result = await database.query('SELECT * FROM recordings WHERE id = ?', [id]);
        return { ...result.values?.[0], fileUrl: result.values?.[0]?.file_url };
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    await database.run(`UPDATE recordings SET ${setClause} WHERE id = ?`, [...values, id]);

    const result = await database.query('SELECT * FROM recordings WHERE id = ?', [id]);
    return { ...result.values?.[0], fileUrl: result.values?.[0]?.file_url };
};

export const dbDeleteRecording = async (id: string) => {
    const database = getDb();
    await database.run('DELETE FROM recordings WHERE id = ?', [id]);
};

export const dbUploadRecordingFileUrl = async (recordingId: string, fileUrl: string) => {
    const database = getDb();
    await database.run('UPDATE recordings SET file_url = ? WHERE id = ?', [fileUrl, recordingId]);
    const result = await database.query('SELECT * FROM recordings WHERE id = ?', [recordingId]);
    return { ...result.values?.[0], fileUrl: result.values?.[0]?.file_url };
};
