import { Capacitor } from '@capacitor/core';

/**
 * 统一平台检测模块
 * NOTE: 替代散落各处的 Capacitor.isNativePlatform() 调用，
 * 提供统一的平台判断和分支逻辑
 */

export type Platform = 'android' | 'electron' | 'web';

/**
 * 获取当前运行平台
 * 检测优先级：Electron（window.electronAPI）> Android（Capacitor）> Web
 */
export const getPlatform = (): Platform => {
    // NOTE: Electron preload 脚本会在 window 上注入 electronAPI 对象
    if (typeof window !== 'undefined' && window.electronAPI) {
        return 'electron';
    }
    // Capacitor 原生平台（Android / iOS）
    if (Capacitor.isNativePlatform()) {
        return 'android';
    }
    return 'web';
};

/** 是否运行在 Electron 桌面端 */
export const isElectron = (): boolean => getPlatform() === 'electron';

/** 是否运行在 Android 原生端 */
export const isAndroid = (): boolean => getPlatform() === 'android';

/** 是否运行在原生环境（Android 或 Electron，非纯浏览器） */
export const isNative = (): boolean => getPlatform() !== 'web';
