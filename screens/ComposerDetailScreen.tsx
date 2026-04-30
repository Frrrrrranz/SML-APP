import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Camera, FileText, Music, Check, Trash2, Edit2, PlayCircle, AlertCircle, Upload, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { openWithSystemApp } from '../services/local-file-storage';
import { ViewMode, Composer, Work, Recording } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorage } from '../contexts/StorageContext';
import { Modal } from '../components/Modal';
import { fadeInUp, staggerContainer, listItemSlide, fabAnimation, tabContent } from '../utils/animations';
import { getComposerAvatarUrl } from '../utils/avatar';
import { isElectron } from '../services/platform';
import { SHEET_UPLOAD_ACCEPT, getSheetSelectionHint, prepareSheetUploadFile, validateSheetUploadFiles } from '../utils/sheet-upload';
import { formatWorkMetaForDisplay, getDefaultWorkEdition, getDefaultWorkYear } from '../utils/work-metadata';

interface ComposerDetailScreenProps {
  composerId: string;
  composers: Composer[];
  onUpdateComposer: (composer: Composer) => void;
  onDeleteComposer: (id: string) => void;
  onBack: () => void;
}

type PendingDeleteItem = {
  type: 'work' | 'recording';
  id: string;
  message: string;
};

export const ComposerDetailScreen: React.FC<ComposerDetailScreenProps> = ({
  composerId,
  composers,
  onUpdateComposer,
  onDeleteComposer,
  onBack
}) => {
  const { user: authUser, profile: authProfile } = useAuth();
  const { t, language } = useLanguage();
  const { storage } = useStorage();
  const desktopMode = isElectron();

  // 当前用户是否为管理员
  const isAdmin = authProfile?.role === 'admin';

  const [viewMode, setViewMode] = useState<ViewMode>('Sheet Music');
  const [isAnimating, setIsAnimating] = useState(false); // 切换 Tab 时的高亮滑块动画状态
  const [isEditing, setIsEditing] = useState(false);

  // Modal States
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<PendingDeleteItem | null>(null);
  // NOTE: 非管理员点击文件时先记录目标链接，待版权弹窗确认后再打开
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);

  // Work Form States
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workFormTitle, setWorkFormTitle] = useState('');
  const [workFormYear, setWorkFormYear] = useState('');
  const [workFormEdition, setWorkFormEdition] = useState('');
  const [workFormFiles, setWorkFormFiles] = useState<File[]>([]);
  const [sheetPickMode, setSheetPickMode] = useState<'replace' | 'append'>('replace');
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

  const composer = composers.find(c => c.id === composerId);

  /**
   * 打开乐谱或录音文件。
   * NOTE: 管理员直接打开，非管理员先弹版权确认。
   */
  const handleOpenFile = async (fileUrl: string) => {
    if (isAdmin) {
      try {
        await openWithSystemApp(fileUrl);
      } catch (error) {
        console.error('Failed to open file with system app:', error);
        alert('无法预览文件，请稍后重试。');
      }
    } else {
      setPendingFileUrl(fileUrl);
      setShowCopyrightModal(true);
    }
  };

  // Scroll to top on mount and fetch details
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchDetails = async () => {
      if (composerId) {
        try {
          const detailedComposer = await storage.dataApi.getComposer(composerId);
          onUpdateComposer(detailedComposer);
        } catch (error) {
          console.error('Failed to fetch composer details:', error);
        }
      }
    };
    fetchDetails();
  }, [composerId]);

  if (!composer) return <div className="p-8 text-center text-gray-500">Composer not found</div>;

  const formatRecordingMetaForDisplay = (performer?: string, year?: string) => {
    const performerText = performer?.trim() || '';
    const yearText = year?.trim() || '';
    if (performerText && yearText) return `${performerText} / ${yearText}`;
    return performerText || yearText;
  };

  // NOTE: 仅当头像不是默认占位图且不是 ui-avatars 生成图时，视为自定义头像
  const hasCustomAvatar = !!(composer.image && !composer.image.includes('ui-avatars.com') && composer.image !== '/composer-placeholder.png');

  // --- Handlers: General ---
  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleUpdateInfo = async (field: 'name' | 'period', value: string) => {
    try {
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { [field]: value });
      // NOTE: 更新作曲家基础信息时，保留当前 works/recordings，避免列表被覆盖
      onUpdateComposer({
        ...updatedComposer,
        works: composer.works || [],
        recordings: composer.recordings || []
      });
    } catch (error) {
      console.error('Failed to update info:', error);
    }
  };

  const confirmDeleteComposer = async () => {
    // NOTE: 删除作曲家会连带删除关联作品与录音（由数据层处理）
    try {
      await storage.dataApi.deleteComposer(composer.id);
      onDeleteComposer(composer.id);
    } catch (error) {
      console.error('Failed to delete composer:', error);
    }
  };

  // --- Handlers: Avatar ---
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    // 校验文件大小（<= 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setIsAvatarUploading(true);
    try {
      // 删除旧头像文件
      if (composer.image) {
        await storage.deleteAvatar(composer.image);
      }

      // 上传新头像
      const avatarUrl = await storage.uploadAvatar(file, composer.id);

      // 写入数据库
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { image: avatarUrl });

      // 更新页面状态
      onUpdateComposer({
        ...composer,
        image: updatedComposer.image
      });

      setShowPortraitModal(false);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('上传头像失败，请重试');
    } finally {
      setIsAvatarUploading(false);
      // 清空 input，保证可重复选择同一文件
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleRestoreDefaultAvatar = async () => {
    setIsAvatarUploading(true);
    try {
      // 删除当前头像文件
      if (composer.image) {
        await storage.deleteAvatar(composer.image);
      }

      // NOTE: 恢复为内置占位图路径，避免空头像带来的显示不一致
      const defaultImage = '/composer-placeholder.png';
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { image: defaultImage });

      onUpdateComposer({
        ...composer,
        image: updatedComposer.image
      });

      setShowPortraitModal(false);
    } catch (error) {
      console.error('Failed to restore default avatar:', error);
      alert('恢复默认头像失败，请重试');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // --- Handlers: Works (Sheet Music) ---
  const handleDeleteWork = async (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteItem({
      type: 'work',
      id: workId,
      message: t.cloud.deleteWorkConfirm
    });
  };

  const openAddWorkModal = () => {
    setEditingWorkId(null);
    setWorkFormTitle('');
    setWorkFormYear('');
    setWorkFormEdition('');
    setWorkFormFiles([]);
    setSheetPickMode('replace');
    setShowWorkModal(true);
  };

  const openEditWorkModal = (work: Work, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkId(work.id);
    setWorkFormTitle(work.title);
    setWorkFormYear(work.year);
    setWorkFormEdition(work.edition);
    setWorkFormFiles([]);
    setSheetPickMode('replace');
    setShowWorkModal(true);
  };

  const handleWorkFilesSelected = (selectedFiles: File[], mode: 'replace' | 'append') => {
    const nextFiles = mode === 'append' ? [...workFormFiles, ...selectedFiles] : selectedFiles;
    const validationError = validateSheetUploadFiles(nextFiles);
    if (validationError) {
      alert(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    setWorkFormFiles(nextFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const moveWorkFormFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= workFormFiles.length) return;
    setWorkFormFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSaveWork = async () => {
    if (!workFormTitle) return;

    setIsUploading(true);
    try {
      if (editingWorkId) {
        // Update existing work
        const updatedWork = await storage.dataApi.updateWork(editingWorkId, {
          title: workFormTitle,
          year: workFormYear || getDefaultWorkYear(language),
          edition: workFormEdition || getDefaultWorkEdition(language)
        });

        // 如有新文件则覆盖上传，并回写 fileUrl
        if (workFormFiles.length > 0) {
          const uploadFile = await prepareSheetUploadFile(workFormFiles, editingWorkId, workFormTitle);
          const fileUrl = await storage.uploadSheetMusic(uploadFile, editingWorkId);
          const workWithFile = await storage.dataApi.uploadWorkFile(editingWorkId, fileUrl);
          updatedWork.fileUrl = workWithFile.fileUrl;
        }

        const updatedWorks = composer.works.map(w =>
          w.id === editingWorkId ? updatedWork : w
        );
        onUpdateComposer({
          ...composer,
          works: updatedWorks
        });
      } else {
        // Add new work
        const newWorkPayload = {
          composer_id: composer.id,
          title: workFormTitle,
          year: workFormYear || getDefaultWorkYear(language),
          edition: workFormEdition || getDefaultWorkEdition(language)
        };
        const newWork = await storage.dataApi.createWork(newWorkPayload);

        // 新建后如选择了文件则上传并关联
        if (workFormFiles.length > 0) {
          const uploadFile = await prepareSheetUploadFile(workFormFiles, newWork.id, workFormTitle);
          const fileUrl = await storage.uploadSheetMusic(uploadFile, newWork.id);
          const workWithFile = await storage.dataApi.uploadWorkFile(newWork.id, fileUrl);
          newWork.fileUrl = workWithFile.fileUrl;
        }

        const updatedWorks = [newWork, ...(composer.works || [])];
        onUpdateComposer({
          ...composer,
          works: updatedWorks
        });
      }

      // Reset and Close
      setEditingWorkId(null);
      setWorkFormTitle('');
      setWorkFormYear('');
      setWorkFormEdition('');
      setWorkFormFiles([]);
      setShowWorkModal(false);
    } catch (error) {
      console.error('Failed to save work:', error);
      alert('保存失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Handlers: Recordings ---
  const handleDeleteRecording = async (recId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteItem({
      type: 'recording',
      id: recId,
      message: t.cloud.deleteRecordingConfirm
    });
  };

  const confirmDeleteItem = async () => {
    if (!pendingDeleteItem) return;

    try {
      if (pendingDeleteItem.type === 'work') {
        await storage.dataApi.deleteWork(pendingDeleteItem.id);
        const updatedWorks = composer.works.filter(w => w.id !== pendingDeleteItem.id);
        onUpdateComposer({
          ...composer,
          works: updatedWorks
        });
      } else {
        await storage.dataApi.deleteRecording(pendingDeleteItem.id);
        const updatedRecordings = composer.recordings.filter(r => r.id !== pendingDeleteItem.id);
        onUpdateComposer({
          ...composer,
          recordings: updatedRecordings
        });
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setPendingDeleteItem(null);
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
    setShowRecordingModal(true);
  };

  const handleSaveRecording = async () => {
    if (!recFormTitle) return;

    setIsRecUploading(true);
    try {
      if (editingRecordingId) {
        // Update existing recording
        const updatedRecording = await storage.dataApi.updateRecording(editingRecordingId, {
          title: recFormTitle,
          performer: recFormPerformer,
          year: recFormYear,
          duration: recFormDuration || '0:00'
        });

        // 编辑时若重新选择文件，则重新上传并更新链接
        if (recFormFile) {
          const fileUrl = await storage.uploadRecordingFile(recFormFile, editingRecordingId);
          const recWithFile = await storage.dataApi.uploadRecordingFileUrl(editingRecordingId, fileUrl);
          updatedRecording.fileUrl = recWithFile.fileUrl;
        }

        const updatedRecordings = composer.recordings.map(r =>
          r.id === editingRecordingId ? updatedRecording : r
        );
        onUpdateComposer({ ...composer, recordings: updatedRecordings });
      } else {
        // Create new recording
        const newRecPayload = {
          composer_id: composer.id,
          title: recFormTitle,
          performer: recFormPerformer,
          year: recFormYear,
          duration: recFormDuration || '0:00'
        };
        const newRec = await storage.dataApi.createRecording(newRecPayload);

        // 新建录音后如有文件则上传并绑定 fileUrl
        if (recFormFile) {
          const fileUrl = await storage.uploadRecordingFile(recFormFile, newRec.id);
          const recWithFile = await storage.dataApi.uploadRecordingFileUrl(newRec.id, fileUrl);
          newRec.fileUrl = recWithFile.fileUrl;
        }

        const updatedRecordings = [newRec, ...(composer.recordings || [])];
        onUpdateComposer({
          ...composer,
          recordings: updatedRecordings
        });
      }

      // Reset and Close
      setEditingRecordingId(null);
      setRecFormTitle('');
      setRecFormPerformer('');
      setRecFormYear('');
      setRecFormDuration('');
      setRecFormFile(null);
      setShowRecordingModal(false);
    } catch (error) {
      console.error('Failed to save recording:', error);
      alert('保存失败，请重试');
    } finally {
      setIsRecUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Top Nav - 濞屽韫堝蹇涒偓鍌炲帳 */}
      <div className={`sticky top-0 z-20 flex items-center justify-between ${desktopMode ? 'px-5 pb-2.5 pt-3' : 'px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]'} bg-background/60 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300`}>
        <button
          onClick={onBack}
          className={`flex ${desktopMode ? 'size-9' : 'size-10'} items-center justify-center rounded-full text-oldGold hover:bg-black/5 transition-colors`}
        >
          <ChevronLeft size={desktopMode ? 24 : 28} />
        </button>
        <button
          onClick={handleToggleEdit}
          className={`
            px-3 py-1 font-semibold transition-colors duration-200
            ${isEditing ? 'text-textMain' : 'text-oldGold hover:opacity-80'}
          `}
        >
          {isEditing ? t.composers.detail.done : t.composers.detail.edit}
        </button>
      </div>

      <div className="flex-1">
        {/* 顶部信息区 */}
        <motion.div
          className={`flex flex-col items-center ${desktopMode ? 'px-5 pt-1 pb-6' : 'px-6 pt-2 pb-8'}`}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          <div
            className="relative mb-6 group cursor-pointer"
            onClick={() => isEditing ? setShowPortraitModal(true) : null}
          >
            <div className={`relative ${desktopMode ? 'h-36 w-36' : 'h-44 w-44'} rounded-full shadow-lg overflow-hidden border-4 border-white bg-gray-200 ring-1 ring-black/5`}>
              {/* NOTE: 与列表页保持一致：无自定义头像时使用 ui-avatars 生成头像 */}
              <img
                src={hasCustomAvatar ? composer.image! : getComposerAvatarUrl(composer.name)}
                alt={composer.name}
                className="w-full h-full object-cover"
              />
              {/* NOTE: 编辑态覆盖半透明遮罩，提示头像可点击修改 */}
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in duration-200">
                  <Camera className="text-white drop-shadow-md" size={32} />
                </div>
              )}
            </div>
          </div>

          {/* NOTE: 预留最小高度，保证列表较短时底部文案不与内容重叠 */}
          <div className={`text-center w-full ${desktopMode ? 'max-w-sm min-h-[68px]' : 'max-w-xs min-h-[80px]'} flex flex-col items-center justify-center`}>
            {isEditing ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3 w-full">
                <input
                  type="text"
                  value={composer.name}
                  onChange={(e) => handleUpdateInfo('name', e.target.value)}
                  className={`w-full text-center ${desktopMode ? 'text-2xl' : 'text-3xl'} font-serif font-bold text-textMain bg-transparent border-b border-oldGold/50 focus:border-oldGold focus:outline-none pb-1`}
                  placeholder="Composer Name"
                />
                <input
                  type="text"
                  value={composer.period}
                  onChange={(e) => handleUpdateInfo('period', e.target.value)}
                  className="w-full text-center text-xs font-sans font-bold tracking-widest text-textSub uppercase bg-transparent border-b border-oldGold/50 focus:border-oldGold focus:outline-none pb-1"
                  placeholder="PERIOD"
                />
              </div>
            ) : (
              <>
                <h1 className={`${desktopMode ? 'text-[2.1rem]' : 'text-3xl md:text-4xl'} font-serif font-bold text-textMain leading-tight`}>
                  {composer.name}
                </h1>
                <p className="text-xs font-sans font-bold tracking-widest text-textSub uppercase pt-2">
                  {composer.period}
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* 分段切换：乐谱 / 录音 */}
        <div className={`${desktopMode ? 'px-5 pb-5' : 'px-6 pb-6'} sticky top-[64px] z-10 bg-background/70 backdrop-blur-2xl transition-all duration-200`}>
          <div className={`relative flex ${desktopMode ? 'h-10' : 'h-11'} ${desktopMode ? 'w-full max-w-[760px] mx-auto' : 'w-full'} items-center rounded-xl ${desktopMode ? 'bg-white/18 backdrop-blur-2xl backdrop-saturate-150' : 'bg-black/[0.06] backdrop-blur-xl'} ${desktopMode ? 'p-[3px]' : 'p-[3px]'} ${desktopMode ? 'border border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_30px_rgba(0,0,0,0.07)]' : 'border border-white/30 shadow-sm shadow-black/5'} ${desktopMode ? 'overflow-visible' : 'overflow-hidden'}`}>
            {desktopMode && (
              <div className="pointer-events-none absolute inset-[1px] rounded-[10px] bg-gradient-to-b from-white/35 via-white/8 to-transparent" />
            )}
            {/* 滑块高亮层 */}
            <div
              className={`
                absolute rounded-[10px]
                ${desktopMode
                  ? 'bg-gradient-to-b from-white/92 via-white/75 to-white/60 backdrop-blur-3xl border border-white/75 shadow-[0_8px_24px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.95)]'
                  : 'bg-white/80 backdrop-blur-md border border-white/50'
                }
                transition-all
                ${isAnimating
                  ? `${desktopMode ? 'duration-[320ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[1.015]' : 'duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[1.02]'} shadow-[0_2px_12px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]`
                  : 'duration-200 ease-out scale-100 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0px_2px_rgba(0,0,0,0.04)]'
                }
              `}
              style={{
                top: desktopMode ? '2px' : '3px',
                bottom: desktopMode ? '2px' : '3px',
                width: desktopMode ? 'calc(50% - 8px)' : 'calc(50% - 3px)',
                left: viewMode === 'Sheet Music'
                  ? (desktopMode ? '3px' : '3px')
                  : (desktopMode ? 'calc(50% + 5px)' : 'calc(50%)'),
              }}
            />
            {/* Tab 按钮 */}
            {(['Sheet Music', 'Recordings'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  if (viewMode !== mode) {
                    // 启动切换动画
                    setIsAnimating(true);
                    setViewMode(mode);
                    // 动画结束后复位状态
                    setTimeout(() => setIsAnimating(false), desktopMode ? 280 : 350);
                  }
                }}
                className={`
                  relative z-10 flex-1 h-full rounded-[10px] ${desktopMode ? 'text-[12px]' : 'text-[13px]'} ${desktopMode ? 'font-semibold' : 'font-semibold'} 
                  transition-all duration-200
                  ${viewMode === mode
                    ? 'text-textMain'
                    : `text-textSub/70 hover:text-textSub ${desktopMode ? '' : 'active:scale-95'}`
                  }
                `}
              >
                {mode === 'Sheet Music' ? t.cloud.sheetMusicTab : t.cloud.recordingsTab}
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
                    onClick={async () => {
                      // NOTE: 非编辑态且存在文件时，点击直接打开乐谱
                      if (!isEditing && work.fileUrl) {
                        await handleOpenFile(work.fileUrl);
                      }
                    }}
                    className={`group flex items-center gap-4 ${desktopMode ? 'px-5 py-3.5' : 'px-6 py-4'} hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative overflow-hidden ${!isEditing && work.fileUrl ? 'cursor-pointer' : ''
                      }`}
                  >
                    {/* 编辑态显示删除按钮，非编辑态显示文件图标 */}
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
                        {formatWorkMetaForDisplay(work.edition, work.year, language)}
                      </p>
                    </div>

                    {/* 编辑态右侧显示“编辑作品”入口 */}
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
                    {t.cloud.noSheetMusic}
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
                    onClick={async () => {
                      // NOTE: 非编辑态且存在文件时，点击直接打开录音
                      if (!isEditing && recording.fileUrl) {
                        await handleOpenFile(recording.fileUrl);
                      }
                    }}
                    className={`group flex items-center gap-4 ${desktopMode ? 'px-5 py-3.5' : 'px-6 py-4'} hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative ${!isEditing && recording.fileUrl ? 'cursor-pointer' : ''
                      }`}
                  >
                    {/* 录音图标：有文件高亮、无文件置灰 */}
                    <div className={`shrink-0 opacity-80 group-hover:opacity-100 transition-opacity ${recording.fileUrl ? 'text-oldGold' : 'text-gray-400'}`}>
                      <PlayCircle size={28} strokeWidth={1.5} />
                    </div>

                    <div className="flex flex-1 flex-col justify-center min-w-0">
                      <p className="text-textMain text-base font-bold leading-tight truncate font-sans">
                        {recording.title}
                      </p>
                      <p className="text-textSub text-sm leading-normal truncate font-medium mt-0.5">
                        {formatRecordingMetaForDisplay(recording.performer, recording.year)}
                      </p>
                    </div>

                    {/* Right Side: Edit or Duration */}
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
                    {t.cloud.noRecordings}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 编辑态下显示删除作曲家按钮 */}
        {isEditing ? (
          <div className="px-6 py-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center justify-center rounded-xl bg-white border border-red-100 py-4 text-base font-bold text-red-600 shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all"
            >
              {t.composers.detail.deleteComposer}
            </button>
          </div>
        ) : null}

      </div>

      {!isEditing && (
        <div
          className="fixed bottom-8 z-10 pointer-events-none px-6 text-center"
          style={{ left: desktopMode ? '220px' : '0', right: '0' }}
        >
          <p className="text-[11px] leading-relaxed text-textSub/40 font-sans mx-auto max-w-[320px]">
            {t.common.copyright.notice}
          </p>
        </div>
      )}

      {/* 悬浮新增按钮 */}
      <motion.button
        onClick={viewMode === 'Sheet Music' ? openAddWorkModal : openAddRecordingModal}
        className={`fixed size-14 bg-oldGold text-white rounded-full shadow-xl flex items-center justify-center hover:bg-opacity-90 transition-all z-30 ring-2 ring-white/20 ${desktopMode ? 'right-8 bottom-8' : 'bottom-24 left-6'}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        {...fabAnimation}
      >
        <Plus size={28} />
      </motion.button>

      {/* === MODALS === */}
      <Modal
        isOpen={!!pendingDeleteItem}
        onClose={() => setPendingDeleteItem(null)}
        variant="center"
      >
        <div className="flex flex-col items-center text-center font-sans px-2">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle size={32} strokeWidth={1.5} />
          </div>
          <p className="text-textSub mb-8 text-[15px] leading-relaxed">
            {pendingDeleteItem?.message}
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={() => setPendingDeleteItem(null)}
              className="flex-1 py-3.5 rounded-full font-bold text-textMain bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {t.cloud.cancel}
            </button>
            <button
              onClick={confirmDeleteItem}
              className="flex-1 py-3.5 rounded-full font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
            >
              {t.cloud.confirmDelete}
            </button>
          </div>
        </div>
      </Modal>

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
          <h3 className="text-xl font-bold text-textMain mb-2 font-serif">{t.composers.detail.deleteConfirmTitle}</h3>
          <p className="text-textSub mb-8 text-[15px] leading-relaxed">
            {t.composers.detail.deleteConfirmDesc.replace('{name}', composer.name)}
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3.5 rounded-full font-bold text-textMain bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {t.composers.detail.cancel}
            </button>
            <button
              onClick={confirmDeleteComposer}
              className="flex-1 py-3.5 rounded-full font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
            >
              {t.composers.detail.confirmDelete}
            </button>
          </div>
        </div>
      </Modal>

      {/* Copyright Disclaimer Modal */}
      <Modal
        isOpen={showCopyrightModal}
        onClose={() => setShowCopyrightModal(false)}
        variant="center"
      >
        <div className="flex flex-col items-center text-center font-sans px-2">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-oldGold/10 text-oldGold">
            <AlertCircle size={32} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-textMain mb-4 font-serif">
            {t.common.copyright.title}
          </h3>
          <div className="space-y-4 text-textSub text-[15px] leading-relaxed mb-8">
            <p>{t.common.copyright.notice}</p>
            <p className="font-semibold text-textMain">
              {t.common.copyright.warning}
            </p>
          </div>
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={async () => {
                if (pendingFileUrl) {
                  // NOTE: 用户同意后再打开目标文件
                  try {
                    await openWithSystemApp(pendingFileUrl);
                  } catch (error) {
                    console.error('Failed to open file:', error);
                    alert('无法预览文件，请稍后重试。');
                  }
                  setShowCopyrightModal(false);
                  setPendingFileUrl(null);
                }
              }}
              className="w-full py-4 rounded-full font-bold text-white bg-oldGold hover:bg-[#d4ac26] transition-colors shadow-lg shadow-oldGold/30"
            >
              {t.common.copyright.agree}
            </button>
            <button
              onClick={() => {
                setShowCopyrightModal(false);
                setPendingFileUrl(null);

              }}
              className="w-full py-4 rounded-full font-bold text-textSub hover:bg-gray-100 transition-colors"
            >
              {t.common.copyright.cancel}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Work Modal (Sheet Music) */}
      <Modal
        isOpen={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        variant="center"
      >
        <div className="flex flex-col font-sans">
          <h3 className="text-xl font-bold text-textMain mb-5 font-serif text-center">{editingWorkId ? t.cloud.editWork : t.cloud.addWork}</h3>

          {/* Sheet Upload (PDF or Images) */}
          <input
            type="file"
            ref={fileInputRef}
            accept={SHEET_UPLOAD_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              handleWorkFilesSelected(files, sheetPickMode);
            }}
          />
          <div
            onClick={() => {
              setSheetPickMode('replace');
              fileInputRef.current?.click();
            }}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-5 ${workFormFiles.length > 0 ? 'border-oldGold bg-oldGold/5' : 'border-gray-300 hover:border-oldGold/50'}`}
          >
            {workFormFiles.length > 0 ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-oldGold/10 text-oldGold mb-2">
                  <Check size={22} />
                </div>
                <p className="text-textMain font-semibold text-sm text-center truncate max-w-full">
                  {workFormFiles.length === 1 ? workFormFiles[0].name : `已选择 ${workFormFiles.length} 个文件`}
                </p>
                <p className="text-textSub text-xs mt-0.5">{t.cloud.form.changeFile}</p>
                <p className="text-textSub text-xs mt-0.5">{getSheetSelectionHint(workFormFiles)}</p>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
                  <Upload size={22} />
                </div>
                <p className="text-textMain font-semibold text-sm">{t.cloud.form.selectFile}</p>
                <p className="text-textSub text-xs mt-0.5">{t.cloud.form.sheetSelectHint}</p>
              </>
            )}
          </div>
          <div className="mb-5 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setSheetPickMode('append');
                fileInputRef.current?.click();
              }}
              className="rounded-full border border-oldGold/30 px-3 py-1.5 text-xs font-medium text-oldGold hover:bg-oldGold/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              disabled={workFormFiles.length > 0 && (workFormFiles[0].type === 'application/pdf' || workFormFiles[0].name.toLowerCase().endsWith('.pdf'))}
            >
              {t.cloud.form.addMoreImages}
            </button>
          </div>
          {workFormFiles.length > 1 && (
            <div className="mb-5 rounded-xl border border-gray-200 bg-white/80 p-3">
              <p className="mb-2 text-xs font-semibold text-textSub">{t.cloud.form.sheetOrderHint}</p>
              <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                {workFormFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-gray-100 px-2 py-1.5">
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-oldGold">{index + 1}</span>
                    <span className="flex-1 truncate text-xs text-textMain">{file.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveWorkFormFile(index, index - 1)}
                        disabled={index === 0}
                        className="rounded p-1 text-textSub hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWorkFormFile(index, index + 1)}
                        disabled={index === workFormFiles.length - 1}
                        className="rounded p-1 text-textSub hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.title}</label>
              <input
                type="text"
                value={workFormTitle}
                onChange={(e) => setWorkFormTitle(e.target.value)}
                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                placeholder={t.cloud.form.titlePlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.year}</label>
                <input
                  type="text"
                  value={workFormYear}
                  onChange={(e) => setWorkFormYear(e.target.value)}
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  placeholder={t.cloud.form.yearPlaceholder}
                />
              </div>
              <div>
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.edition}</label>
                <input
                  type="text"
                  value={workFormEdition}
                  onChange={(e) => setWorkFormEdition(e.target.value)}
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  placeholder={t.cloud.form.editionPlaceholder}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveWork}
            disabled={!workFormTitle || isUploading}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98] ${workFormTitle && !isUploading ? 'bg-oldGold shadow-oldGold/30 hover:bg-[#d4ac26]' : 'bg-gray-300 cursor-not-allowed'}`}
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
      </Modal>

      {/* Add/Edit Recording Modal */}
      <Modal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        variant="center"
      >
        <div className="flex flex-col font-sans">
          <h3 className="text-xl font-bold text-textMain mb-5 font-serif text-center">{editingRecordingId ? t.cloud.editRecording : t.cloud.addRecording}</h3>

          {/* Audio Upload */}
          <input
            type="file"
            ref={recFileInputRef}
            accept="audio/*,video/mp4,.mp3,.wav,.flac,.m4a,.aac,.mp4"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setRecFormFile(file);
            }}
          />
          <div
            onClick={() => recFileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-5 ${recFormFile ? 'border-oldGold bg-oldGold/5' : 'border-gray-300 hover:border-oldGold/50'}`}
          >
            {recFormFile ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-oldGold/10 text-oldGold mb-2">
                  <Check size={22} />
                </div>
                <p className="text-textMain font-semibold text-sm text-center truncate max-w-full">{recFormFile.name}</p>
                <p className="text-textSub text-xs mt-0.5">{t.cloud.form.changeFile}</p>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
                  <Music size={22} />
                </div>
                <p className="text-textMain font-semibold text-sm">{t.cloud.form.selectFile}</p>
                <p className="text-textSub text-xs mt-0.5">MP3, WAV, FLAC, MP4</p>
              </>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.title}</label>
              <input
                type="text"
                value={recFormTitle}
                onChange={(e) => setRecFormTitle(e.target.value)}
                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                placeholder={t.cloud.form.titlePlaceholder}
              />
            </div>
            <div>
              <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.performer}</label>
              <input
                type="text"
                value={recFormPerformer}
                onChange={(e) => setRecFormPerformer(e.target.value)}
                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                placeholder={t.cloud.form.performerPlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.year}</label>
                <input
                  type="text"
                  value={recFormYear}
                  onChange={(e) => setRecFormYear(e.target.value)}
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  placeholder={t.cloud.form.yearPlaceholder}
                />
              </div>
              <div>
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.cloud.form.duration}</label>
                <input
                  type="text"
                  value={recFormDuration}
                  onChange={(e) => setRecFormDuration(e.target.value)}
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-lg font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  placeholder={t.cloud.form.durationPlaceholder}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveRecording}
            disabled={!recFormTitle || isRecUploading}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98] ${recFormTitle && !isRecUploading ? 'bg-oldGold shadow-oldGold/30 hover:bg-[#d4ac26]' : 'bg-gray-300 cursor-not-allowed'}`}
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
      </Modal>

      {/* Update Portrait Modal (Center) */}
      <Modal
        isOpen={showPortraitModal}
        onClose={() => !isAvatarUploading && setShowPortraitModal(false)}
        variant="center"
      >
        <div className="flex flex-col items-center">
          <h2 className="mb-8 text-2xl font-serif font-bold text-textMain tracking-tight">{t.cloud.updatePortrait}</h2>

          {/* Hidden file input */}
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileSelect}
          />

          <div className="relative mb-8 size-60 rounded-full overflow-hidden shadow-lg ring-1 ring-black/5">
            {hasCustomAvatar ? (
              <img
                src={composer.image!}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-oldGold/10">
                <span className="text-6xl font-serif text-oldGold">{composer.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            {/* Loading overlay */}
            {isAvatarUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={40} className="text-white animate-spin" />
              </div>
            )}
            {/* Overlay grid effect similar to reference */}
            {!isAvatarUploading && (
              <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-overlay">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/50"></div>
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 font-sans">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isAvatarUploading}
              className={`flex w-full items-center justify-center rounded-full bg-oldGold py-3.5 text-[15px] font-bold text-white shadow-md transition-all ${isAvatarUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
                }`}
            >
              {isAvatarUploading ? t.cloud.uploading : t.cloud.chooseFromDevice}
            </button>
            <button
              onClick={handleRestoreDefaultAvatar}
              disabled={isAvatarUploading}
              className={`flex w-full items-center justify-center rounded-full py-2 text-[15px] font-medium text-oldGold transition-colors ${isAvatarUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-[0.98]'
                }`}
            >
              {t.cloud.restoreDefault}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};


