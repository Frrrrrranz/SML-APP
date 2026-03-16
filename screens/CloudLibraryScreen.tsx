import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Download, CheckCircle, AlertCircle, Music, Disc3, Plus, Camera, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { staggerContainer, listItem, fabAnimation } from '../utils/animations';
import { getCloudComposers, pullComposerToLocal, cloudCreateComposer, cloudUploadAvatar } from '../services/cloud-api';
import { Composer } from '../types';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { getComposerAvatarUrl } from '../utils/avatar';

/**
 * 云端资源库屏幕
 * NOTE: 展示 Supabase 云端作曲家列表
 * - 普通用户：浏览 + 拉取到本地
 * - Admin：浏览 + 拉取 + 点击进入编辑详情 + 添加作曲家
 */
export const CloudLibraryScreen: React.FC = () => {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const isAdmin = profile?.role === 'admin';

    const [composers, setComposers] = useState<Composer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 追踪每个作曲家的拉取状态
    const [pullingIds, setPullingIds] = useState<Record<string, 'pulling' | 'done' | 'error'>>({});
    // 拉取进度
    const [pullProgress, setPullProgress] = useState<Record<string, number>>({});
    // 每个作曲家的拉取错误信息（用于可观测性与重试提示）
    const [pullErrors, setPullErrors] = useState<Record<string, string>>({});
    // 确认弹窗
    const [confirmPullId, setConfirmPullId] = useState<string | null>(null);

    // Admin: 添加作曲家 Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addFormName, setAddFormName] = useState('');
    const [addFormPeriod, setAddFormPeriod] = useState('');
    const [addFormAvatar, setAddFormAvatar] = useState<File | null>(null);
    const [addFormAvatarPreview, setAddFormAvatarPreview] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

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

    const getErrorMessage = (err: unknown): string => {
        if (err instanceof Error && err.message) return err.message;
        return t.cloud.loadError;
    };

    // 执行拉取
    const handlePull = async (composerId: string) => {
        setConfirmPullId(null);
        setPullingIds(prev => ({ ...prev, [composerId]: 'pulling' }));
        setPullProgress(prev => ({ ...prev, [composerId]: 0 }));
        setPullErrors(prev => {
            const next = { ...prev };
            delete next[composerId];
            return next;
        });

        try {
            await pullComposerToLocal(composerId, (progress) => {
                setPullProgress(prev => ({ ...prev, [composerId]: progress }));
            });
            setPullingIds(prev => ({ ...prev, [composerId]: 'done' }));
        } catch (err) {
            console.error('Failed to pull composer:', err);
            setPullingIds(prev => ({ ...prev, [composerId]: 'error' }));
            setPullErrors(prev => ({ ...prev, [composerId]: getErrorMessage(err) }));
        }
    };

    // Admin: 处理头像选择
    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        setAddFormAvatar(file);
        // 生成预览 URL
        const previewUrl = URL.createObjectURL(file);
        setAddFormAvatarPreview(previewUrl);
    };

    // Admin: 创建新的云端作曲家
    const handleCreateComposer = async () => {
        if (!addFormName.trim()) return;
        setIsCreating(true);
        try {
            const newComposer = await cloudCreateComposer({
                name: addFormName.trim(),
                period: addFormPeriod.trim(),
                image: '',
            });

            // 如果选择了头像文件，上传并更新
            if (addFormAvatar && newComposer.id) {
                try {
                    const avatarUrl = await cloudUploadAvatar(addFormAvatar, newComposer.id);
                    // NOTE: 不需要再次更新 composer 记录，cloudUploadAvatar 只是上传文件
                    // 需要更新数据库中的 image 字段
                    const { cloudUpdateComposer } = await import('../services/cloud-api');
                    await cloudUpdateComposer(newComposer.id, { image: avatarUrl });
                    newComposer.image = avatarUrl;
                } catch (err) {
                    console.warn('Avatar upload failed, skipping:', err);
                }
            }

            // 更新列表
            setComposers(prev => [...prev, { ...newComposer, sheetMusicCount: 0, recordingCount: 0 }]);

            // 重置表单
            setShowAddModal(false);
            setAddFormName('');
            setAddFormPeriod('');
            setAddFormAvatar(null);
            if (addFormAvatarPreview) {
                URL.revokeObjectURL(addFormAvatarPreview);
                setAddFormAvatarPreview(null);
            }
        } catch (err) {
            console.error('Failed to create cloud composer:', err);
        } finally {
            setIsCreating(false);
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
                                <div
                                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
                                    onClick={() => {
                                        // NOTE: 所有用户都可点击进入详情页，非 admin 为只读模式
                                        navigate(`/cloud/${composer.id}`);
                                    }}
                                >
                                    {/* 头像 - 与本地列表一致，统一使用 ui-avatars.com */}
                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                        <img
                                            src={
                                                composer.image && !composer.image.startsWith('/composer-placeholder')
                                                    ? composer.image
                                                    : getComposerAvatarUrl(composer.name)
                                            }
                                            alt={composer.name}
                                            className="w-full h-full object-cover"
                                        />
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

                                    {/* 拉取按钮 - 仅非 admin 或始终显示 */}
                                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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

                                {/* 拉取中的进度条 */}
                                {pullState === 'pulling' && (
                                    <div className="h-0.5 bg-gray-100">
                                        <div
                                            className="h-full bg-oldGold transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}

                                {pullState === 'error' && (
                                    <div className="px-4 pb-3 text-xs text-red-500">
                                        {pullErrors[composer.id] || t.cloud.loadError}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* Admin: FAB 添加作曲家 */}
            {isAdmin && (
                <motion.button
                    onClick={() => setShowAddModal(true)}
                    className="fixed bottom-24 left-6 size-14 bg-oldGold text-white rounded-full shadow-xl flex items-center justify-center hover:bg-opacity-90 transition-all z-30 ring-2 ring-white/20"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
                    {...fabAnimation}
                >
                    <Plus size={28} />
                </motion.button>
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

            {/* Admin: 添加作曲家 Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => {
                    if (!isCreating) {
                        setShowAddModal(false);
                        setAddFormName('');
                        setAddFormPeriod('');
                        setAddFormAvatar(null);
                        if (addFormAvatarPreview) {
                            URL.revokeObjectURL(addFormAvatarPreview);
                            setAddFormAvatarPreview(null);
                        }
                    }
                }}
                variant="center"
            >
                <div className="flex flex-col items-center font-sans">
                    <h2 className="text-2xl font-serif font-bold text-textMain mb-6">{t.cloud.addComposer}</h2>

                    {/* 头像选择 */}
                    <input
                        type="file"
                        ref={avatarInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                    />
                    <div
                        onClick={() => avatarInputRef.current?.click()}
                        className="relative mb-6 size-24 rounded-full overflow-hidden bg-gray-100 cursor-pointer group"
                    >
                        {addFormAvatarPreview ? (
                            <img src={addFormAvatarPreview} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors">
                                <Camera size={28} className="text-gray-400" />
                            </div>
                        )}
                    </div>

                    {/* 表单 */}
                    <div className="w-full space-y-4 mb-6">
                        <div>
                            <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.name}</label>
                            <input
                                type="text"
                                value={addFormName}
                                onChange={(e) => setAddFormName(e.target.value)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                placeholder={t.cloud.form.namePlaceholder}
                            />
                        </div>
                        <div>
                            <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.period}</label>
                            <input
                                type="text"
                                value={addFormPeriod}
                                onChange={(e) => setAddFormPeriod(e.target.value)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                placeholder={t.cloud.form.periodPlaceholder}
                            />
                        </div>
                    </div>

                    {/* 按钮 */}
                    <button
                        onClick={handleCreateComposer}
                        disabled={!addFormName.trim() || isCreating}
                        className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-base font-bold text-white shadow-md transition-all ${addFormName.trim() && !isCreating ? 'bg-oldGold hover:bg-[#d4ac26] active:scale-[0.98]' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {t.cloud.creating}
                            </>
                        ) : (
                            t.cloud.addComposer
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
};
