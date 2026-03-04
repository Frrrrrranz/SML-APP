import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Plus, Camera, FileText, Music, Check,
    Trash2, Edit2, PlayCircle, AlertCircle, Upload, Loader2
} from 'lucide-react';
import { ViewMode, Composer, Work, Recording } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { fadeInUp, staggerContainer, listItemSlide, fabAnimation, tabContent } from '../utils/animations';
import {
    getCloudComposer,
    cloudCreateWork,
    cloudUpdateWork,
    cloudDeleteWork,
    cloudUploadWorkFile,
    cloudCreateRecording,
    cloudUpdateRecording,
    cloudDeleteRecording,
    cloudUploadRecordingFileUrl,
    cloudUpdateComposer,
    cloudDeleteComposer,
    cloudUploadSheetMusic,
    cloudUploadAvatar,
    cloudUploadRecordingFile,
    cloudDeleteAvatar,
} from '../services/cloud-api';

interface CloudComposerDetailScreenProps {
    composerId: string;
    onBack: () => void;
}

/**
 * 云端作曲家详情编辑页
 * NOTE: 仅 admin 可访问。直接操作 Supabase 云端数据，与本地 ComposerDetailScreen 对称
 */
export const CloudComposerDetailScreen: React.FC<CloudComposerDetailScreenProps> = ({
    composerId,
    onBack,
}) => {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    // 作曲家数据
    const [composer, setComposer] = useState<Composer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('Sheet Music');
    const [isAnimating, setIsAnimating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // 编辑模式下的本地输入状态（避免每次按键都调用 API）
    const [editName, setEditName] = useState('');
    const [editPeriod, setEditPeriod] = useState('');

    // Modal States
    const [showWorkModal, setShowWorkModal] = useState(false);
    const [showRecordingModal, setShowRecordingModal] = useState(false);
    const [showPortraitModal, setShowPortraitModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Work Form States
    const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
    const [workFormTitle, setWorkFormTitle] = useState('');
    const [workFormYear, setWorkFormYear] = useState('');
    const [workFormEdition, setWorkFormEdition] = useState('');
    const [workFormFile, setWorkFormFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Avatar Upload States
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Recording Form States
    const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
    const [recFormTitle, setRecFormTitle] = useState('');
    const [recFormPerformer, setRecFormPerformer] = useState('');
    const [recFormYear, setRecFormYear] = useState('');
    const [recFormDuration, setRecFormDuration] = useState('');
    const [recFormFile, setRecFormFile] = useState<File | null>(null);
    const [isRecUploading, setIsRecUploading] = useState(false);
    const recFileInputRef = useRef<HTMLInputElement>(null);

    // 加载云端作曲家详情
    useEffect(() => {
        window.scrollTo(0, 0);
        const loadComposer = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getCloudComposer(composerId);
                setComposer(data);
            } catch (err) {
                console.error('Failed to load cloud composer:', err);
                setError(t.cloud.loadError);
            } finally {
                setIsLoading(false);
            }
        };
        loadComposer();
    }, [composerId]);

    // --- 加载状态 ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-oldGold border-t-transparent rounded-full animate-spin" />
                    <p className="text-textSub">{t.cloud.loading}</p>
                </div>
            </div>
        );
    }

    if (error || !composer) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-textSub text-sm mb-4">{error || 'Composer not found'}</p>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-oldGold/10 text-oldGold rounded-lg text-sm font-medium"
                >
                    {t.cloud.cancel}
                </button>
            </div>
        );
    }

    // --- Handlers: General ---
    const handleToggleEdit = () => {
        if (!isEditing && composer) {
            // 进入编辑模式：初始化本地输入状态
            setEditName(composer.name);
            setEditPeriod(composer.period);
        }
        if (isEditing && composer) {
            // 退出编辑模式：保存未提交的修改
            saveInfoIfChanged();
        }
        setIsEditing(!isEditing);
    };

    // NOTE: 仅在失焦或退出编辑时调用 API，避免每次按键都发请求
    const saveInfoIfChanged = async () => {
        if (!composer) return;
        const updates: Record<string, string> = {};
        if (editName !== composer.name) updates.name = editName;
        if (editPeriod !== composer.period) updates.period = editPeriod;
        if (Object.keys(updates).length === 0) return;

        try {
            await cloudUpdateComposer(composer.id, updates);
            // 直接用本地值更新，不依赖 API 返回值覆盖其他字段
            setComposer({
                ...composer,
                name: editName,
                period: editPeriod,
            });
        } catch (err) {
            console.error('Failed to update cloud composer info:', err);
        }
    };

    const confirmDeleteComposer = async () => {
        try {
            await cloudDeleteComposer(composer.id);
            onBack();
        } catch (err) {
            console.error('Failed to delete cloud composer:', err);
        }
    };

    // --- Handlers: Avatar ---
    const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) return;

        setIsAvatarUploading(true);
        try {
            // 删除旧头像
            if (composer.image) {
                await cloudDeleteAvatar(composer.image);
            }

            // 上传新头像到 Supabase Storage
            const avatarUrl = await cloudUploadAvatar(file, composer.id);

            // 更新数据库
            const updated = await cloudUpdateComposer(composer.id, { image: avatarUrl });
            setComposer({
                ...composer,
                image: updated.image || avatarUrl,
                works: composer.works || [],
                recordings: composer.recordings || [],
            });
            setShowPortraitModal(false);
        } catch (err) {
            console.error('Failed to upload cloud avatar:', err);
        } finally {
            setIsAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    const handleRestoreDefaultAvatar = async () => {
        setIsAvatarUploading(true);
        try {
            if (composer.image) {
                await cloudDeleteAvatar(composer.image);
            }
            const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(composer.name)}&background=random&size=256`;
            const updated = await cloudUpdateComposer(composer.id, { image: defaultImage });
            setComposer({
                ...composer,
                image: updated.image || defaultImage,
                works: composer.works || [],
                recordings: composer.recordings || [],
            });
            setShowPortraitModal(false);
        } catch (err) {
            console.error('Failed to restore default avatar:', err);
        } finally {
            setIsAvatarUploading(false);
        }
    };

    // --- Handlers: Works ---
    const handleDeleteWork = async (workId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to remove this piece?')) {
            try {
                await cloudDeleteWork(workId);
                setComposer({
                    ...composer,
                    works: composer.works.filter(w => w.id !== workId),
                });
            } catch (err) {
                console.error('Failed to delete cloud work:', err);
            }
        }
    };

    const openAddWorkModal = () => {
        setEditingWorkId(null);
        setWorkFormTitle('');
        setWorkFormYear('');
        setWorkFormEdition('');
        setWorkFormFile(null);
        setShowWorkModal(true);
    };

    const openEditWorkModal = (work: Work, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingWorkId(work.id);
        setWorkFormTitle(work.title);
        setWorkFormYear(work.year);
        setWorkFormEdition(work.edition);
        setWorkFormFile(null);
        setShowWorkModal(true);
    };

    const handleSaveWork = async () => {
        if (!workFormTitle) return;
        setIsUploading(true);
        try {
            if (editingWorkId) {
                const updatedWork = await cloudUpdateWork(editingWorkId, {
                    title: workFormTitle,
                    year: workFormYear || 'Unknown',
                    edition: workFormEdition || 'Standard Edition',
                });
                if (workFormFile) {
                    const fileUrl = await cloudUploadSheetMusic(workFormFile, editingWorkId);
                    const workWithFile = await cloudUploadWorkFile(editingWorkId, fileUrl);
                    updatedWork.fileUrl = workWithFile.fileUrl;
                }
                setComposer({
                    ...composer,
                    works: composer.works.map(w => w.id === editingWorkId ? updatedWork : w),
                });
            } else {
                const newWork = await cloudCreateWork({
                    composer_id: composer.id,
                    title: workFormTitle,
                    year: workFormYear || 'Unknown',
                    edition: workFormEdition || 'Standard Edition',
                });
                if (workFormFile) {
                    const fileUrl = await cloudUploadSheetMusic(workFormFile, newWork.id);
                    const workWithFile = await cloudUploadWorkFile(newWork.id, fileUrl);
                    newWork.fileUrl = workWithFile.fileUrl;
                }
                setComposer({
                    ...composer,
                    works: [newWork, ...(composer.works || [])],
                });
            }
            setShowWorkModal(false);
            setEditingWorkId(null);
            setWorkFormTitle('');
            setWorkFormYear('');
            setWorkFormEdition('');
            setWorkFormFile(null);
        } catch (err) {
            console.error('Failed to save cloud work:', err);
        } finally {
            setIsUploading(false);
        }
    };

    // --- Handlers: Recordings ---
    const handleDeleteRecording = async (recId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to remove this recording?')) {
            try {
                await cloudDeleteRecording(recId);
                setComposer({
                    ...composer,
                    recordings: composer.recordings.filter(r => r.id !== recId),
                });
            } catch (err) {
                console.error('Failed to delete cloud recording:', err);
            }
        }
    };

    const openAddRecordingModal = () => {
        setEditingRecordingId(null);
        setRecFormTitle('');
        setRecFormPerformer('');
        setRecFormYear('');
        setRecFormDuration('');
        setRecFormFile(null);
        setShowRecordingModal(true);
    };

    const openEditRecordingModal = (rec: Recording, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingRecordingId(rec.id);
        setRecFormTitle(rec.title);
        setRecFormPerformer(rec.performer);
        setRecFormYear(rec.year);
        setRecFormDuration(rec.duration);
        setRecFormFile(null);
        setShowRecordingModal(true);
    };

    const handleSaveRecording = async () => {
        if (!recFormTitle) return;
        setIsRecUploading(true);
        try {
            if (editingRecordingId) {
                const updatedRec = await cloudUpdateRecording(editingRecordingId, {
                    title: recFormTitle,
                    performer: recFormPerformer,
                    year: recFormYear,
                    duration: recFormDuration || '0:00',
                });
                if (recFormFile) {
                    const fileUrl = await cloudUploadRecordingFile(recFormFile, editingRecordingId);
                    const recWithFile = await cloudUploadRecordingFileUrl(editingRecordingId, fileUrl);
                    updatedRec.fileUrl = recWithFile.fileUrl;
                }
                setComposer({
                    ...composer,
                    recordings: composer.recordings.map(r => r.id === editingRecordingId ? updatedRec : r),
                });
            } else {
                const newRec = await cloudCreateRecording({
                    composer_id: composer.id,
                    title: recFormTitle,
                    performer: recFormPerformer,
                    year: recFormYear,
                    duration: recFormDuration || '0:00',
                });
                if (recFormFile) {
                    const fileUrl = await cloudUploadRecordingFile(recFormFile, newRec.id);
                    const recWithFile = await cloudUploadRecordingFileUrl(newRec.id, fileUrl);
                    newRec.fileUrl = recWithFile.fileUrl;
                }
                setComposer({
                    ...composer,
                    recordings: [newRec, ...(composer.recordings || [])],
                });
            }
            setShowRecordingModal(false);
            setEditingRecordingId(null);
            setRecFormTitle('');
            setRecFormPerformer('');
            setRecFormYear('');
            setRecFormDuration('');
            setRecFormFile(null);
        } catch (err) {
            console.error('Failed to save cloud recording:', err);
        } finally {
            setIsRecUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col relative">
            {/* Top Nav */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-background/60 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300">
                <button
                    onClick={onBack}
                    className="flex size-10 items-center justify-center rounded-full text-oldGold hover:bg-black/5 transition-colors"
                >
                    <ChevronLeft size={28} />
                </button>
                {isAdmin && <button
                    onClick={handleToggleEdit}
                    className={`px-3 py-1 text-base font-semibold transition-colors duration-200 ${isEditing ? 'text-textMain' : 'text-oldGold hover:opacity-80'}`}
                >
                    {isEditing ? t.cloud.done : t.cloud.editComposer}
                </button>}
            </div>

            <div className="flex-1">
                {/* Hero Section */}
                <motion.div
                    className="flex flex-col items-center px-6 pt-2 pb-8"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                >
                    <div
                        className="relative mb-6 group cursor-pointer"
                        onClick={() => isEditing ? setShowPortraitModal(true) : null}
                    >
                        <div className="relative h-44 w-44 rounded-full shadow-lg overflow-hidden border-4 border-white bg-gray-200 ring-1 ring-black/5">
                            {composer.image ? (
                                <img
                                    src={composer.image}
                                    alt={composer.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-oldGold/10">
                                    <span className="text-5xl font-serif text-oldGold">
                                        {composer.name.charAt(0)}
                                    </span>
                                </div>
                            )}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center animate-in fade-in duration-200">
                                    <Camera className="text-white drop-shadow-md" size={32} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center space-y-2 w-full max-w-xs">
                        {isEditing ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={saveInfoIfChanged}
                                    className="w-full text-center text-3xl font-serif font-bold text-textMain bg-transparent border-b border-oldGold/50 focus:border-oldGold focus:outline-none pb-1"
                                    placeholder={t.cloud.form.namePlaceholder}
                                />
                                <input
                                    type="text"
                                    value={editPeriod}
                                    onChange={(e) => setEditPeriod(e.target.value)}
                                    onBlur={saveInfoIfChanged}
                                    className="w-full text-center text-xs font-sans font-bold tracking-widest text-textSub uppercase bg-transparent border-b border-oldGold/50 focus:border-oldGold focus:outline-none pb-1"
                                    placeholder={t.cloud.form.periodPlaceholder}
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl md:text-4xl font-serif font-bold text-textMain leading-tight">
                                    {composer.name}
                                </h1>
                                <p className="text-xs font-sans font-bold tracking-widest text-textSub uppercase pt-2">
                                    {composer.period}
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Segmented Control */}
                <div className="px-6 pb-6 sticky top-[64px] z-10 bg-background/70 backdrop-blur-2xl transition-all duration-200">
                    <div className="relative flex h-11 w-full items-center rounded-xl bg-black/[0.06] backdrop-blur-xl p-[3px] border border-white/30 shadow-sm shadow-black/5">
                        <div
                            className={`
                                absolute top-[3px] bottom-[3px] rounded-[10px]
                                bg-white/80 backdrop-blur-md border border-white/50 transition-all
                                ${isAnimating
                                    ? 'duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[1.02] shadow-[0_2px_12px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]'
                                    : 'duration-200 ease-out scale-100 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0px_2px_rgba(0,0,0,0.04)]'
                                }
                            `}
                            style={{
                                width: 'calc(50% - 3px)',
                                left: viewMode === 'Sheet Music' ? '3px' : 'calc(50%)',
                            }}
                        />
                        {(['Sheet Music', 'Recordings'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => {
                                    if (viewMode !== mode) {
                                        setIsAnimating(true);
                                        setViewMode(mode);
                                        setTimeout(() => setIsAnimating(false), 350);
                                    }
                                }}
                                className={`
                                    relative z-10 flex-1 h-full rounded-[10px] text-[13px] font-semibold transition-all duration-200
                                    ${viewMode === mode ? 'text-textMain' : 'text-textSub/70 hover:text-textSub active:scale-95'}
                                `}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content List */}
                <div className="flex flex-col px-0">
                    <AnimatePresence mode="wait">
                        {/* SHEET MUSIC VIEW */}
                        {viewMode === 'Sheet Music' && (
                            <motion.div
                                key="sheet-music"
                                variants={tabContent}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                            >
                                {composer.works && composer.works.map((work) => (
                                    <div
                                        key={work.id}
                                        className={`group flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative overflow-hidden ${work.fileUrl ? 'cursor-pointer' : ''}`}
                                        onClick={() => {
                                            // NOTE: 云端详情页点击乐谱直接在新标签页打开（如果有 URL）
                                            if (!isEditing && work.fileUrl) {
                                                window.open(work.fileUrl, '_blank');
                                            }
                                        }}
                                    >
                                        {isEditing ? (
                                            <button
                                                onClick={(e) => handleDeleteWork(work.id, e)}
                                                className="shrink-0 text-red-500 hover:bg-red-50 p-2 rounded-full -ml-2 transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        ) : (
                                            <div className="shrink-0 text-textSub opacity-70 group-hover:opacity-100 transition-opacity">
                                                <FileText size={24} strokeWidth={1.5} />
                                            </div>
                                        )}

                                        <div className="flex flex-1 flex-col justify-center min-w-0">
                                            <p className="text-textMain text-base font-bold leading-tight truncate font-sans">
                                                {work.title}
                                            </p>
                                            <p className="text-textSub text-sm leading-normal truncate font-medium mt-0.5">
                                                {work.edition} · {work.year}
                                            </p>
                                        </div>

                                        {isEditing && (
                                            <div className="shrink-0">
                                                <button
                                                    onClick={(e) => openEditWorkModal(work, e)}
                                                    className="flex size-8 items-center justify-center rounded-full text-textSub hover:text-oldGold hover:bg-black/5 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!composer.works || composer.works.length === 0) && (
                                    <div className="px-6 py-12 text-center text-gray-400 font-serif italic">
                                        No sheet music added yet.
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* RECORDINGS VIEW */}
                        {viewMode === 'Recordings' && (
                            <motion.div
                                key="recordings"
                                variants={tabContent}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                            >
                                {composer.recordings && composer.recordings.map((recording) => (
                                    <div
                                        key={recording.id}
                                        className={`group flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative ${recording.fileUrl ? 'cursor-pointer' : ''}`}
                                        onClick={() => {
                                            if (!isEditing && recording.fileUrl) {
                                                window.open(recording.fileUrl, '_blank');
                                            }
                                        }}
                                    >
                                        {isEditing ? (
                                            <button
                                                onClick={(e) => handleDeleteRecording(recording.id, e)}
                                                className="shrink-0 text-red-500 hover:bg-red-50 p-2 rounded-full -ml-2 transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        ) : (
                                            <div className={`shrink-0 opacity-80 group-hover:opacity-100 transition-opacity ${recording.fileUrl ? 'text-oldGold' : 'text-gray-400'}`}>
                                                <PlayCircle size={28} strokeWidth={1.5} />
                                            </div>
                                        )}

                                        <div className="flex flex-1 flex-col justify-center min-w-0">
                                            <p className="text-textMain text-base font-bold leading-tight truncate font-sans">
                                                {recording.title}
                                            </p>
                                            <p className="text-textSub text-sm leading-normal truncate font-medium mt-0.5">
                                                {recording.performer} · {recording.year}
                                            </p>
                                        </div>

                                        <div className="shrink-0">
                                            {isEditing ? (
                                                <button
                                                    onClick={(e) => openEditRecordingModal(recording, e)}
                                                    className="flex size-8 items-center justify-center rounded-full text-textSub hover:text-oldGold hover:bg-black/5 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            ) : (
                                                <div className="text-textSub text-xs font-semibold tracking-wide">
                                                    {recording.duration}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!composer.recordings || composer.recordings.length === 0) && (
                                    <div className="px-6 py-12 text-center text-gray-400 font-serif italic">
                                        No recordings available.
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Delete Composer Button */}
                {isEditing && (
                    <div className="px-6 py-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex w-full items-center justify-center rounded-xl bg-white border border-red-100 py-4 text-base font-bold text-red-600 shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all"
                        >
                            {t.cloud.deleteComposer}
                        </button>
                    </div>
                )}
            </div>

            {/* FAB - 仅 admin 显示 */}
            {isAdmin && <motion.button
                onClick={viewMode === 'Sheet Music' ? openAddWorkModal : openAddRecordingModal}
                className="fixed bottom-24 left-6 size-14 bg-oldGold text-white rounded-full shadow-xl flex items-center justify-center hover:bg-opacity-90 transition-all z-30 ring-2 ring-white/20"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
                {...fabAnimation}
            >
                <Plus size={28} />
            </motion.button>}

            {/* === MODALS === */}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                variant="center"
            >
                <div className="flex flex-col items-center text-center font-sans px-2">
                    <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                        <AlertCircle size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-textMain mb-2 font-serif">{t.cloud.deleteConfirmTitle}</h3>
                    <p className="text-textSub mb-8 text-[15px] leading-relaxed">
                        {t.cloud.deleteConfirmDesc.replace('{name}', composer.name)}
                    </p>
                    <div className="flex w-full gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-3.5 rounded-full font-bold text-textMain bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            {t.cloud.cancel}
                        </button>
                        <button
                            onClick={confirmDeleteComposer}
                            className="flex-1 py-3.5 rounded-full font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                        >
                            {t.cloud.confirmDelete}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Work Modal (Sheet Music) */}
            <Modal
                isOpen={showWorkModal}
                onClose={() => setShowWorkModal(false)}
                variant="bottom"
                title={editingWorkId ? t.cloud.editWork : t.cloud.addWork}
            >
                <div className="px-6 pt-4 pb-32 min-h-full">
                    {/* PDF Upload Section */}
                    <section className="mb-10">
                        <h3 className="mb-5 text-2xl font-bold tracking-tight text-textMain font-serif">{t.cloud.form.selectFile}</h3>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setWorkFormFile(file);
                            }}
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${workFormFile ? 'border-oldGold bg-oldGold/5' : 'border-gray-300 hover:border-oldGold/50'}`}
                        >
                            {workFormFile ? (
                                <>
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-oldGold/10 text-oldGold mb-3">
                                        <Check size={28} />
                                    </div>
                                    <p className="text-textMain font-semibold text-center">{workFormFile.name}</p>
                                    <p className="text-textSub text-sm mt-1">{t.cloud.form.changeFile}</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
                                        <Upload size={28} />
                                    </div>
                                    <p className="text-textMain font-semibold">{t.cloud.form.selectFile}</p>
                                    <p className="text-textSub text-sm mt-1">PDF</p>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Details Section */}
                    <section className="mb-10">
                        <div className="flex flex-col gap-6 font-sans">
                            <div className="group relative">
                                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.title}</label>
                                <input
                                    type="text"
                                    value={workFormTitle}
                                    onChange={(e) => setWorkFormTitle(e.target.value)}
                                    className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                    placeholder={t.cloud.form.titlePlaceholder}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="group relative">
                                    <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.year}</label>
                                    <input
                                        type="text"
                                        value={workFormYear}
                                        onChange={(e) => setWorkFormYear(e.target.value)}
                                        className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                        placeholder={t.cloud.form.yearPlaceholder}
                                    />
                                </div>
                                <div className="group relative">
                                    <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.edition}</label>
                                    <input
                                        type="text"
                                        value={workFormEdition}
                                        onChange={(e) => setWorkFormEdition(e.target.value)}
                                        className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                        placeholder={t.cloud.form.editionPlaceholder}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer CTA */}
                    <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent px-6 pb-8 pt-12 z-20">
                        <button
                            onClick={handleSaveWork}
                            disabled={!workFormTitle || isUploading}
                            className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98] ${workFormTitle && !isUploading ? 'bg-oldGold shadow-oldGold/30 hover:bg-[#d4ac26]' : 'bg-gray-300 cursor-not-allowed'}`}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    {t.cloud.uploading}
                                </>
                            ) : (
                                t.cloud.save
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Recording Modal */}
            <Modal
                isOpen={showRecordingModal}
                onClose={() => setShowRecordingModal(false)}
                variant="bottom"
                title={editingRecordingId ? t.cloud.editRecording : t.cloud.addRecording}
            >
                <div className="px-6 pt-6 pb-32 min-h-full">
                    {/* Audio Upload Section */}
                    <section className="mb-8">
                        <input
                            type="file"
                            ref={recFileInputRef}
                            accept="audio/*,.mp3,.wav,.flac,.m4a,.aac"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setRecFormFile(file);
                            }}
                        />
                        <div
                            onClick={() => recFileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${recFormFile ? 'border-oldGold bg-oldGold/5' : 'border-gray-300 hover:border-oldGold/50'}`}
                        >
                            {recFormFile ? (
                                <>
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-oldGold/10 text-oldGold mb-3">
                                        <Check size={28} />
                                    </div>
                                    <p className="text-textMain font-semibold text-center">{recFormFile.name}</p>
                                    <p className="text-textSub text-sm mt-1">{t.cloud.form.changeFile}</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
                                        <Music size={28} />
                                    </div>
                                    <p className="text-textMain font-semibold">{t.cloud.form.selectFile}</p>
                                    <p className="text-textSub text-sm mt-1">MP3, WAV, FLAC</p>
                                </>
                            )}
                        </div>
                    </section>

                    <div className="flex flex-col gap-6 font-sans">
                        <div className="group relative">
                            <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.title}</label>
                            <input
                                type="text"
                                value={recFormTitle}
                                onChange={(e) => setRecFormTitle(e.target.value)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                placeholder={t.cloud.form.titlePlaceholder}
                            />
                        </div>
                        <div className="group relative">
                            <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.performer}</label>
                            <input
                                type="text"
                                value={recFormPerformer}
                                onChange={(e) => setRecFormPerformer(e.target.value)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                placeholder={t.cloud.form.performerPlaceholder}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="group relative">
                                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.year}</label>
                                <input
                                    type="text"
                                    value={recFormYear}
                                    onChange={(e) => setRecFormYear(e.target.value)}
                                    className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                    placeholder={t.cloud.form.yearPlaceholder}
                                />
                            </div>
                            <div className="group relative">
                                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.duration}</label>
                                <input
                                    type="text"
                                    value={recFormDuration}
                                    onChange={(e) => setRecFormDuration(e.target.value)}
                                    className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                                    placeholder={t.cloud.form.durationPlaceholder}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent px-6 pb-8 pt-12 z-20">
                        <button
                            onClick={handleSaveRecording}
                            disabled={!recFormTitle || isRecUploading}
                            className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98] ${recFormTitle && !isRecUploading ? 'bg-oldGold shadow-oldGold/30 hover:bg-[#d4ac26]' : 'bg-gray-300 cursor-not-allowed'}`}
                        >
                            {isRecUploading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    {t.cloud.uploading}
                                </>
                            ) : (
                                t.cloud.save
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Update Portrait Modal */}
            <Modal
                isOpen={showPortraitModal}
                onClose={() => !isAvatarUploading && setShowPortraitModal(false)}
                variant="center"
            >
                <div className="flex flex-col items-center">
                    <h2 className="mb-8 text-2xl font-serif font-bold text-textMain tracking-tight">Update Portrait</h2>
                    <input
                        type="file"
                        ref={avatarInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileSelect}
                    />
                    <div className="relative mb-8 size-60 rounded-full overflow-hidden shadow-lg ring-1 ring-black/5">
                        {composer.image ? (
                            <img
                                src={composer.image}
                                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-oldGold/10">
                                <span className="text-6xl font-serif text-oldGold">{composer.name.charAt(0)}</span>
                            </div>
                        )}
                        {isAvatarUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 size={40} className="text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="flex w-full flex-col gap-3 font-sans">
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isAvatarUploading}
                            className={`flex w-full items-center justify-center rounded-full bg-oldGold py-3.5 text-[15px] font-bold text-white shadow-md transition-all ${isAvatarUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'}`}
                        >
                            {isAvatarUploading ? t.cloud.uploading : t.cloud.form.selectFile}
                        </button>
                        <button
                            onClick={handleRestoreDefaultAvatar}
                            disabled={isAvatarUploading}
                            className={`flex w-full items-center justify-center rounded-full py-2 text-[15px] font-medium text-oldGold transition-colors ${isAvatarUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-[0.98]'}`}
                        >
                            Restore Default
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
