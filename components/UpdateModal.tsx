import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface UpdateModalProps {
    /** 是否显示弹窗 */
    visible: boolean;
    /** 新版本号 */
    version: string;
    /** 更新状态 */
    status: 'prompt' | 'downloading' | 'success' | 'error';
    /** 下载进度 (0-100) */
    progress: number;
    /** 更新来源标签 */
    sourceLabel?: string;
    /** 更新来源类型，用于区分错误提示 */
    sourceType?: 'android-ota' | 'desktop-web' | 'desktop-app';
    /** 更新失败时展示的底层错误详情 */
    errorDetail?: string;
    /** 点击“立即更新” */
    onConfirm: () => void;
    /** 点击“稍后” */
    onDismiss: () => void;
    /** 更新成功后点击“立即重启” */
    onReload: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
    visible,
    version,
    status,
    progress,
    sourceLabel,
    sourceType,
    errorDetail,
    onConfirm,
    onDismiss,
    onReload,
}) => {
    const { t } = useLanguage();

    const failedDescription =
        sourceType === 'desktop-app'
            ? t.update.failedDesktopAppDesc
            : sourceType === 'desktop-web'
                ? t.update.failedDesktopWebDesc
                : t.update.failedDesc;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => status === 'prompt' && onDismiss()}
                >
                    <motion.div
                        className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-2xl"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-6 pb-2">
                            <div
                                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                                    status === 'success'
                                        ? 'bg-green-100'
                                        : status === 'error'
                                            ? 'bg-red-100'
                                            : 'bg-oldGold/10'
                                }`}
                            >
                                {status === 'success' ? (
                                    <Check size={28} className="text-green-600" />
                                ) : status === 'error' ? (
                                    <AlertCircle size={28} className="text-red-500" />
                                ) : status === 'downloading' ? (
                                    <RefreshCw size={28} className="animate-spin text-oldGold" />
                                ) : (
                                    <Download size={28} className="text-oldGold" />
                                )}
                            </div>
                        </div>

                        <div className="px-6 pb-4 text-center">
                            <h3 className="mb-1 text-lg font-bold text-textMain">
                                {status === 'success'
                                    ? t.update.success
                                    : status === 'error'
                                        ? t.update.failed
                                        : t.update.available}
                            </h3>
                            <p className="text-sm text-textSub">
                                {status === 'downloading'
                                    ? t.update.downloading
                                    : status === 'success'
                                        ? t.update.restartHint
                                        : status === 'error'
                                            ? failedDescription
                                            : `${t.update.newVersion} v${version}${sourceLabel ? ` · ${sourceLabel}` : ''}`}
                            </p>
                            {status === 'error' && errorDetail && (
                                <p className="mt-2 break-all text-xs text-textSub/80">
                                    {errorDetail}
                                </p>
                            )}
                        </div>

                        {status === 'downloading' && (
                            <div className="px-6 pb-4">
                                <div className="mb-1.5 flex items-center justify-between text-xs text-textSub">
                                    <span>{t.update.downloading}</span>
                                    <span className="font-medium text-oldGold">{progress}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                    <motion.div
                                        className="h-full rounded-full bg-oldGold"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="px-6 pb-6">
                            {status === 'prompt' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={onDismiss}
                                        className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-textSub transition-colors hover:bg-gray-50 active:bg-gray-100"
                                    >
                                        {t.update.later}
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className="flex-1 rounded-xl bg-oldGold py-2.5 text-sm font-medium text-white transition-colors hover:bg-oldGold/90 active:bg-oldGold/80"
                                    >
                                        {t.update.now}
                                    </button>
                                </div>
                            )}
                            {status === 'success' && (
                                <button
                                    onClick={onReload}
                                    className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800"
                                >
                                    {t.update.restart}
                                </button>
                            )}
                            {status === 'error' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={onDismiss}
                                        className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-textSub transition-colors hover:bg-gray-50"
                                    >
                                        {t.update.later}
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className="flex-1 rounded-xl bg-oldGold py-2.5 text-sm font-medium text-white transition-colors hover:bg-oldGold/90"
                                    >
                                        {t.update.retry}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
