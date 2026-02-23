import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { api } from '../api';
import { localApi, localUploadSheetMusic, localUploadAvatar, localUploadRecordingFile, localDeleteSheetMusic, localDeleteAvatar, localDeleteRecordingFile } from '../services/local-api';
import { uploadSheetMusic, uploadAvatar, uploadRecordingFile, deleteSheetMusic, deleteAvatar, deleteRecordingFile } from '../supabase';
import { initDatabase } from '../services/local-database';
import { Capacitor } from '@capacitor/core';

/**
 * 存储模式上下文
 * NOTE: 提供全局的存储模式切换能力，各页面通过 useStorage() 获取当前模式对应的 API
 */

type StorageMode = 'cloud' | 'local';

// 统一的存储操作接口（包括 API 和文件操作）
interface StorageOperations {
    // 数据 API（与 api.ts 接口一致）
    dataApi: typeof api;
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
    const [storageMode, setStorageModeState] = useState<StorageMode>('cloud');
    const [dbReady, setDbReady] = useState(false);
    const isNativeApp = Capacitor.isNativePlatform();

    // 初始化：从 Preferences 读取上次选择的存储模式
    useEffect(() => {
        const loadMode = async () => {
            try {
                const { value } = await Preferences.get({ key: STORAGE_MODE_KEY });
                if (value === 'local' && isNativeApp) {
                    setStorageModeState('local');
                    await initLocalDatabase();
                }
            } catch (error) {
                console.warn('Failed to load storage mode preference:', error);
            }
        };
        loadMode();
    }, [isNativeApp]);

    // 初始化本地数据库
    const initLocalDatabase = async () => {
        try {
            await initDatabase();
            setDbReady(true);
        } catch (error) {
            console.error('Failed to initialize local database:', error);
            // FIXME: 数据库初始化失败时回退到云端模式
            setStorageModeState('cloud');
        }
    };

    // 切换存储模式
    const setStorageMode = async (mode: StorageMode) => {
        if (mode === 'local' && !isNativeApp) {
            console.warn('Local storage mode is only available in native app');
            return;
        }

        if (mode === 'local' && !dbReady) {
            await initLocalDatabase();
        }

        setStorageModeState(mode);
        await Preferences.set({ key: STORAGE_MODE_KEY, value: mode });
    };

    // 根据当前模式返回对应的存储操作
    const storage: StorageOperations = storageMode === 'local' ? {
        dataApi: localApi as unknown as typeof api,
        uploadSheetMusic: localUploadSheetMusic,
        uploadAvatar: localUploadAvatar,
        uploadRecordingFile: localUploadRecordingFile,
        deleteSheetMusic: localDeleteSheetMusic,
        deleteAvatar: localDeleteAvatar,
        deleteRecordingFile: localDeleteRecordingFile,
    } : {
        dataApi: api,
        uploadSheetMusic,
        uploadAvatar,
        uploadRecordingFile,
        deleteSheetMusic,
        deleteAvatar,
        deleteRecordingFile,
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
