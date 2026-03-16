import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
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
    /** 点击"立即更新" */
    onConfirm: () => void;
    /** 点击"稍后" */
    onDismiss: () => void;
    /** 更新成功后点击"立即重启" */
    onReload: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
    visible,
    version,
    status,
    progress,
    onConfirm,
    onDismiss,
    onReload,
}) => {
    const { t } = useLanguage();

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
                        className="bg-white rounded-2xl w-full max-w-[360px] shadow-2xl overflow-hidden"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 顶部图标区域 */}
                        <div className="flex justify-center pt-6 pb-2">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${status === 'success'
                                    ? 'bg-green-100'
                                    : status === 'error'
                                        ? 'bg-red-100'
                                        : 'bg-oldGold/10'
                                }`}>
                                {status === 'success' ? (
                                    <Check size={28} className="text-green-600" />
                                ) : status === 'error' ? (
                                    <AlertCircle size={28} className="text-red-500" />
                                ) : status === 'downloading' ? (
                                    <RefreshCw size={28} className="text-oldGold animate-spin" />
                                ) : (
                                    <Download size={28} className="text-oldGold" />
                                )}
                            </div>
                        </div>

                        {/* 内容区域 */}
                        <div className="px-6 pb-4 text-center">
                            <h3 className="text-lg font-bold text-textMain mb-1">
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
                                            ? t.update.failedDesc
                                            : `${t.update.newVersion} v${version} · OTA`}
                            </p>
                        </div>

                        {/* 进度条（下载中显示） */}
                        {status === 'downloading' && (
                            <div className="px-6 pb-4">
                                <div className="flex items-center justify-between text-xs text-textSub mb-1.5">
                                    <span>{t.update.downloading}</span>
                                    <span className="text-oldGold font-medium">{progress}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-oldGold rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 按钮区域 */}
                        <div className="px-6 pb-6">
                            {status === 'prompt' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={onDismiss}
                                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-textSub text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                    >
                                        {t.update.later}
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className="flex-1 py-2.5 rounded-xl bg-oldGold text-white text-sm font-medium hover:bg-oldGold/90 active:bg-oldGold/80 transition-colors"
                                    >
                                        {t.update.now}
                                    </button>
                                </div>
                            )}
                            {status === 'success' && (
                                <button
                                    onClick={onReload}
                                    className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
                                >
                                    {t.update.restart}
                                </button>
                            )}
                            {status === 'error' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={onDismiss}
                                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-textSub text-sm font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        {t.update.later}
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className="flex-1 py-2.5 rounded-xl bg-oldGold text-white text-sm font-medium hover:bg-oldGold/90 transition-colors"
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
