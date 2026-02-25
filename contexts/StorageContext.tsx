import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { localApi, localUploadSheetMusic, localUploadAvatar, localUploadRecordingFile, localDeleteSheetMusic, localDeleteAvatar, localDeleteRecordingFile } from '../services/local-api';
import { initDatabase } from '../services/local-database';
import { Capacitor } from '@capacitor/core';
// NOTE: 云端存储暂时不开放，仅使用本地存储
// import { api } from '../api';
// import { uploadSheetMusic, uploadAvatar, ... } from '../supabase';

/**
 * 存储模式上下文
 * NOTE: 提供全局的存储模式切换能力，各页面通过 useStorage() 获取当前模式对应的 API
 */

type StorageMode = 'cloud' | 'local';

// 统一的存储操作接口（包括 API 和文件操作）
interface StorageOperations {
    // 数据 API（与 api.ts 接口一致）
    dataApi: typeof localApi;
    // 文件上传/删除操作
    uploadSheetMusic: (file: File, workId: string) => Promise<string>;
    uploadAvatar: (file: File, composerId: string) => Promise<string>;
    uploadRecordingFile: (file: File, recordingId: string) => Promise<string>;
    deleteSheetMusic: (fileUrl: string) => Promise<void>;
    deleteAvatar: (imageUrl: string) => Promise<void>;
    deleteRecordingFile: (fileUrl: string) => Promise<void>;
}

interface StorageContextType {
    storageMode: StorageMode;
    setStorageMode: (mode: StorageMode) => Promise<void>;
    storage: StorageOperations;
    isNativeApp: boolean;
    dbReady: boolean;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

const STORAGE_MODE_KEY = 'sml_storage_mode';

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // NOTE: 当前版本强制使用本地存储模式，云端功能暂未开放
    const [storageMode, setStorageModeState] = useState<StorageMode>('local');
    const [dbReady, setDbReady] = useState(false);
    const isNativeApp = Capacitor.isNativePlatform();

    // 初始化：启动本地数据库
    useEffect(() => {
        initLocalDatabase();
    }, []);

    // 初始化本地数据库
    const initLocalDatabase = async () => {
        try {
            await initDatabase();
            setDbReady(true);
        } catch (error) {
            console.error('Failed to initialize local database:', error);
        }
    };

    // NOTE: 切换存储模式（当前版本云端功能暂未开放，此函数保留备用）
    const setStorageMode = async (mode: StorageMode) => {
        // 当前强制本地模式，不允许切换到云端
        if (mode === 'cloud') {
            console.warn('Cloud storage is not available in this version');
            return;
        }

        if (!dbReady) {
            await initLocalDatabase();
        }

        setStorageModeState(mode);
        await Preferences.set({ key: STORAGE_MODE_KEY, value: mode });
    };

    // NOTE: 当前版本仅使用本地存储操作
    const storage: StorageOperations = {
        dataApi: localApi,
        uploadSheetMusic: localUploadSheetMusic,
        uploadAvatar: localUploadAvatar,
        uploadRecordingFile: localUploadRecordingFile,
        deleteSheetMusic: localDeleteSheetMusic,
        deleteAvatar: localDeleteAvatar,
        deleteRecordingFile: localDeleteRecordingFile,
    };

    return (
        <StorageContext.Provider value={{ storageMode, setStorageMode, storage, isNativeApp, dbReady }}>
            {children}
        </StorageContext.Provider>
    );
};

/**
 * 自定义 Hook：获取当前存储模式和操作
 */
export const useStorage = (): StorageContextType => {
    const context = useContext(StorageContext);
    if (context === undefined) {
        throw new Error('useStorage must be used within a StorageProvider');
    }
    return context;
};
