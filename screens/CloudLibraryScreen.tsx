import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Download, CheckCircle, AlertCircle, Music, Disc3 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { staggerContainer, listItem } from '../utils/animations';
import { getCloudComposers, pullComposerToLocal } from '../services/cloud-api';
import { Composer } from '../types';

/**
 * 云端资源库屏幕
 * NOTE: 展示 Supabase 云端作曲家列表，用户可选择性拉取到本地
 */
export const CloudLibraryScreen: React.FC = () => {
    const { t } = useLanguage();
    const { profile } = useAuth();

    const [composers, setComposers] = useState<Composer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 追踪每个作曲家的拉取状态
    const [pullingIds, setPullingIds] = useState<Record<string, 'pulling' | 'done' | 'error'>>({});
    // 拉取进度
    const [pullProgress, setPullProgress] = useState<Record<string, number>>({});
    // 确认弹窗
    const [confirmPullId, setConfirmPullId] = useState<string | null>(null);

    const loadCloudComposers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getCloudComposers();
            setComposers(data);
        } catch (err) {
            console.error('Failed to load cloud composers:', err);
            setError(t.cloud.loadError);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadCloudComposers();
    }, [loadCloudComposers]);

    // 执行拉取
    const handlePull = async (composerId: string) => {
        setConfirmPullId(null);
        setPullingIds(prev => ({ ...prev, [composerId]: 'pulling' }));
        setPullProgress(prev => ({ ...prev, [composerId]: 0 }));

        try {
            await pullComposerToLocal(composerId, (progress) => {
                setPullProgress(prev => ({ ...prev, [composerId]: progress }));
            });
            setPullingIds(prev => ({ ...prev, [composerId]: 'done' }));
        } catch (err) {
            console.error('Failed to pull composer:', err);
            setPullingIds(prev => ({ ...prev, [composerId]: 'error' }));
        }
    };

    // Shimmer 骨架屏
    const renderShimmer = () => (
        <div className="space-y-3 px-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-soft">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gray-200 shimmer-animation" />
                        <div className="flex-1 space-y-2">
                            <div className="w-32 h-4 bg-gray-200 rounded shimmer-animation" />
                            <div className="w-24 h-3 bg-gray-200 rounded shimmer-animation" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-24 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/60 backdrop-blur-2xl backdrop-saturate-150 px-6 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-4 transition-all duration-300">
                <h1 className="text-4xl font-bold tracking-tight text-textMain font-serif">
                    {t.cloud.title}
                </h1>
                <p className="text-sm text-textSub mt-1">{t.cloud.subtitle}</p>
            </header>

            {/* Content */}
            {isLoading ? (
                renderShimmer()
            ) : error ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <p className="text-textSub text-sm">{error}</p>
                    <button
                        onClick={loadCloudComposers}
                        className="mt-4 px-4 py-2 bg-oldGold/10 text-oldGold rounded-lg text-sm font-medium"
                    >
                        {t.cloud.retry}
                    </button>
                </div>
            ) : composers.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <Cloud className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-textMain font-semibold text-lg mb-1">{t.cloud.empty}</p>
                    <p className="text-textSub text-sm">{t.cloud.emptyDesc}</p>
                </div>
            ) : (
                <motion.div
                    className="px-4 py-2 space-y-3"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    {composers.map((composer) => {
                        const pullState = pullingIds[composer.id];
                        const progress = pullProgress[composer.id] || 0;

                        return (
                            <motion.div
                                key={composer.id}
                                variants={listItem}
                                className="bg-white rounded-xl overflow-hidden shadow-soft border border-gray-100"
                            >
                                <div className="flex items-center gap-4 p-4">
                                    {/* 头像 */}
                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                        {composer.image ? (
                                            <img
                                                src={composer.image}
                                                alt={composer.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-oldGold/10">
                                                <span className="text-2xl font-serif text-oldGold">
                                                    {composer.name.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 信息 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-textMain truncate font-serif">
                                            {composer.name}
                                        </p>
                                        {composer.period && (
                                            <p className="text-xs text-textSub mt-0.5 truncate">
                                                {composer.period}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="flex items-center gap-1 text-xs text-textSub">
                                                <Music size={12} />
                                                {composer.sheetMusicCount || 0}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-textSub">
                                                <Disc3 size={12} />
                                                {composer.recordingCount || 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 拉取按钮 */}
                                    <div className="shrink-0">
                                        {pullState === 'done' ? (
                                            <div className="flex items-center gap-1 text-green-500">
                                                <CheckCircle size={20} />
                                            </div>
                                        ) : pullState === 'error' ? (
                                            <button
                                                onClick={() => setConfirmPullId(composer.id)}
                                                className="flex items-center gap-1 text-red-400 hover:text-red-500"
                                            >
                                                <AlertCircle size={20} />
                                            </button>
                                        ) : pullState === 'pulling' ? (
                                            <div className="relative w-9 h-9 flex items-center justify-center">
                                                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                                                    <circle
                                                        cx="18" cy="18" r="14"
                                                        fill="none" stroke="#e5e7eb" strokeWidth="3"
                                                    />
                                                    <circle
                                                        cx="18" cy="18" r="14"
                                                        fill="none" stroke="#B8860B" strokeWidth="3"
                                                        strokeDasharray={`${progress * 0.88} 88`}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-300"
                                                    />
                                                </svg>
                                                <span className="absolute text-[9px] font-bold text-oldGold">
                                                    {progress}%
                                                </span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmPullId(composer.id)}
                                                className="flex items-center justify-center w-9 h-9 rounded-full bg-oldGold/10 text-oldGold hover:bg-oldGold/20 active:bg-oldGold/30 transition-colors"
                                            >
                                                <Download size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 拉取中的进度条（底部线条样式） */}
                                {pullState === 'pulling' && (
                                    <div className="h-0.5 bg-gray-100">
                                        <div
                                            className="h-full bg-oldGold transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* 确认拉取弹窗 */}
            <AnimatePresence>
                {confirmPullId && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmPullId(null)}
                    >
                        <motion.div
                            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-textMain mb-2">
                                {t.cloud.pullConfirmTitle}
                            </h3>
                            <p className="text-sm text-textSub mb-6">
                                {t.cloud.pullConfirmDesc}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmPullId(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-textSub font-medium text-sm"
                                >
                                    {t.cloud.cancel}
                                </button>
                                <button
                                    onClick={() => handlePull(confirmPullId)}
                                    className="flex-1 py-2.5 rounded-xl bg-oldGold text-white font-medium text-sm"
                                >
                                    {t.cloud.confirmPull}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
