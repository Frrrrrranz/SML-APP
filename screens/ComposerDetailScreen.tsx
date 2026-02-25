import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Camera, FileText, Music, Check, Trash2, Edit2, PlayCircle, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { ViewMode, Composer, Work, Recording } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorage } from '../contexts/StorageContext';
import { Modal } from '../components/Modal';
import { fadeInUp, staggerContainer, listItemSlide, fabAnimation, tabContent } from '../utils/animations';

interface ComposerDetailScreenProps {
  composerId: string;
  composers: Composer[];
  onUpdateComposer: (composer: Composer) => void;
  onDeleteComposer: (id: string) => void;
  onBack: () => void;
}

export const ComposerDetailScreen: React.FC<ComposerDetailScreenProps> = ({
  composerId,
  composers,
  onUpdateComposer,
  onDeleteComposer,
  onBack
}) => {
  const { user: authUser, profile: authProfile } = useAuth();
  const { t } = useLanguage();
  const { storage } = useStorage();

  // 管理员权限判断：基于角色
  const isAdmin = authProfile?.role === 'admin';

  const [viewMode, setViewMode] = useState<ViewMode>('Sheet Music');
  const [isAnimating, setIsAnimating] = useState(false); // 用于 Apple 风格滑块动画
  const [isEditing, setIsEditing] = useState(false);

  // Modal States
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<'pdf' | 'audio'>('pdf');

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

  const composer = composers.find(c => c.id === composerId);

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

  // --- Handlers: General ---
  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleUpdateInfo = async (field: 'name' | 'period', value: string) => {
    try {
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { [field]: value });
      // NOTE: API 返回的 updatedComposer 不包含 works/recordings，需要保留现有数据
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
    // NOTE: 管理员权限检查
    if (!isAdmin) {
      alert('只有管理员可以删除作曲家');
      setShowDeleteConfirm(false);
      return;
    }

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

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setIsAvatarUploading(true);
    try {
      // 删除旧头像（如果是自定义上传的）
      if (composer.image) {
        await storage.deleteAvatar(composer.image);
      }

      // 上传新头像
      const avatarUrl = await storage.uploadAvatar(file, composer.id);

      // 更新数据库
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { image: avatarUrl });

      // 更新本地状态
      onUpdateComposer({
        ...composer,
        image: updatedComposer.image
      });

      setShowPortraitModal(false);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('头像上传失败，请重试');
    } finally {
      setIsAvatarUploading(false);
      // 重置 input 以便可以重复选择同一文件
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleRestoreDefaultAvatar = async () => {
    setIsAvatarUploading(true);
    try {
      // 删除自定义头像（如果有）
      if (composer.image) {
        await storage.deleteAvatar(composer.image);
      }

      // 恢复默认头像
      const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(composer.name)}&background=random&size=256`;
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
    // NOTE: 管理员权限检查
    if (!isAdmin) {
      alert('只有管理员可以删除乐谱');
      return;
    }
    if (window.confirm('Are you sure you want to remove this piece?')) {
      try {
        await storage.dataApi.deleteWork(workId);
        const updatedWorks = composer.works.filter(w => w.id !== workId);
        onUpdateComposer({
          ...composer,
          works: updatedWorks
        });
      } catch (error) {
        console.error('Failed to delete work:', error);
      }
    }
  };

  const openAddWorkModal = () => {
    setEditingWorkId(null);
    setWorkFormTitle('');
    setWorkFormYear('');
    setWorkFormEdition('');
    setShowWorkModal(true);
  };

  const openEditWorkModal = (work: Work, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkId(work.id);
    setWorkFormTitle(work.title);
    setWorkFormYear(work.year);
    setWorkFormEdition(work.edition);
    setShowWorkModal(true);
  };

  const handleSaveWork = async () => {
    if (!workFormTitle) return;

    setIsUploading(true);
    try {
      if (editingWorkId) {
        // Update existing work
        const updatedWork = await storage.dataApi.updateWork(editingWorkId, {
          title: workFormTitle,
          year: workFormYear || 'Unknown',
          edition: workFormEdition || 'Standard Edition'
        });

        // 如果选择了新文件，上传并更新
        if (workFormFile) {
          const fileUrl = await storage.uploadSheetMusic(workFormFile, editingWorkId);
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
          year: workFormYear || 'Unknown',
          edition: workFormEdition || 'Standard Edition'
        };
        const newWork = await storage.dataApi.createWork(newWorkPayload);

        // 如果选择了文件，上传并更新
        if (workFormFile) {
          const fileUrl = await storage.uploadSheetMusic(workFormFile, newWork.id);
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
      setWorkFormFile(null);
      setShowWorkModal(false);
    } catch (error) {
      console.error('Failed to save work:', error);
      alert('保存失败，请检查文件格式或网络连接');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Handlers: Recordings ---
  const handleDeleteRecording = async (recId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // NOTE: 管理员权限检查
    if (!isAdmin) {
      alert('只有管理员可以删除录音');
      return;
    }
    if (window.confirm('Are you sure you want to remove this recording?')) {
      try {
        await storage.dataApi.deleteRecording(recId);
        const updatedRecordings = composer.recordings.filter(r => r.id !== recId);
        onUpdateComposer({
          ...composer,
          recordings: updatedRecordings
        });
      } catch (error) {
        console.error('Failed to delete recording:', error);
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

        // 如果选择了新文件，上传并更新
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

        // 如果选择了文件，上传并更新
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
      alert('保存失败，请检查文件格式或网络连接');
    } finally {
      setIsRecUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Top Nav - 沉浸式适配 */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-background/60 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300">
        <button
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-full text-oldGold hover:bg-black/5 transition-colors"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={handleToggleEdit}
          className={`
            px-3 py-1 text-base font-semibold transition-colors duration-200
            ${isEditing ? 'text-textMain' : 'text-oldGold hover:opacity-80'}
          `}
        >
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="flex-1">
        {/* Hero Section - 带 fadeInUp 进入动画 */}
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
              <img
                src={composer.image}
                alt={composer.name}
                className="w-full h-full object-cover"
              />
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
                  value={composer.name}
                  onChange={(e) => handleUpdateInfo('name', e.target.value)}
                  className="w-full text-center text-3xl font-serif font-bold text-textMain bg-transparent border-b border-oldGold/50 focus:border-oldGold focus:outline-none pb-1"
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

        {/* Segmented Control - Apple Music 风格毛玻璃滑动 Tab */}
        <div className="px-6 pb-6 sticky top-[64px] z-10 bg-background/70 backdrop-blur-2xl transition-all duration-200">
          <div className="relative flex h-11 w-full items-center rounded-xl bg-black/[0.06] backdrop-blur-xl p-[3px] border border-white/30 shadow-sm shadow-black/5">
            {/* 滑动指示器 - Apple Music 毛玻璃风格 */}
            <div
              className={`
                absolute top-[3px] bottom-[3px] rounded-[10px]
                bg-white/80 backdrop-blur-md
                border border-white/50
                transition-all
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
            {/* Tab 按钮 */}
            {(['Sheet Music', 'Recordings'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  if (viewMode !== mode) {
                    // 触发动画：先放大
                    setIsAnimating(true);
                    setViewMode(mode);
                    // 动画完成后恢复
                    setTimeout(() => setIsAnimating(false), 350);
                  }
                }}
                className={`
                  relative z-10 flex-1 h-full rounded-[10px] text-[13px] font-semibold 
                  transition-all duration-200
                  ${viewMode === mode
                    ? 'text-textMain'
                    : 'text-textSub/70 hover:text-textSub active:scale-95'
                  }
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
                    onClick={() => {
                      // NOTE: 非编辑模式下，点击条目打开 PDF 查看
                      if (!isEditing && work.fileUrl) {
                        if (isAdmin) {
                          window.open(work.fileUrl, '_blank');
                        } else {
                          setPendingFileUrl(work.fileUrl);
                          setShowCopyrightModal(true);
                        }
                      }
                    }}
                    className={`group flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative overflow-hidden ${!isEditing && work.fileUrl ? 'cursor-pointer' : ''
                      }`}
                  >
                    {/* NOTE: 删除按钮仅在编辑模式且为管理员时显示 */}
                    {isEditing && isAdmin ? (
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

                    {/* 只有编辑模式下显示编辑按钮 */}
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
                    onClick={() => {
                      // NOTE: 非编辑模式下，点击条目播放音频
                      if (!isEditing && recording.fileUrl) {
                        if (isAdmin) {
                          window.open(recording.fileUrl, '_blank');
                        } else {
                          setPendingFileUrl(recording.fileUrl);
                          setShowCopyrightModal(true);
                        }
                      }
                    }}
                    className={`group flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative ${!isEditing && recording.fileUrl ? 'cursor-pointer' : ''
                      }`}
                  >
                    {/* NOTE: 删除按钮仅在编辑模式且为管理员时显示 */}
                    {isEditing && isAdmin ? (
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
                    No recordings available.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete Composer Button (Edit Mode Only, Admin Only) */}
        {isEditing && isAdmin && (
          <div className="px-6 py-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center justify-center rounded-xl bg-white border border-red-100 py-4 text-base font-bold text-red-600 shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all"
            >
              Delete Composer
            </button>
          </div>
        )}
      </div>

      {/* Global Copyright Notice (Bottom of screen) */}
      <footer className="px-6 pt-4 pb-12 text-center">
        <p className="text-[11px] leading-relaxed text-textSub/40 font-sans mx-auto max-w-[280px]">
          本站乐谱由用户上传，仅供个人学习、练习与研究使用。如有侵权，请联系管理员处理。部分乐谱来源于第三方网站，版权归原作者所有。
        </p>
      </footer>

      {/* FAB - Shows for both modes now */}
      {/* FAB - 带弹入动画 */}
      <motion.button
        onClick={viewMode === 'Sheet Music' ? openAddWorkModal : openAddRecordingModal}
        className="fixed bottom-6 right-6 size-14 bg-oldGold text-white rounded-full shadow-xl flex items-center justify-center hover:bg-opacity-90 transition-all z-30 ring-2 ring-white/20"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
        {...fabAnimation}
      >
        <Plus size={28} />
      </motion.button>

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
          <h3 className="text-xl font-bold text-textMain mb-2 font-serif">Delete Composer?</h3>
          <p className="text-textSub mb-8 text-[15px] leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-textMain">{composer.name}</span>?
            <br />All associated sheet music and recordings will be permanently removed.
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3.5 rounded-full font-bold text-textMain bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteComposer}
              className="flex-1 py-3.5 rounded-full font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
            >
              Delete
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
              onClick={() => {
                if (pendingFileUrl) {
                  window.open(pendingFileUrl, '_blank');
                  setShowCopyrightModal(false);
                  setPendingFileUrl(null);
                }
              }}
              className="w-full py-4 rounded-full font-bold text-white bg-oldGold hover:bg-[#d4ac26] transition-colors shadow-lg shadow-oldGold/20"
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
        variant="bottom"
        title={editingWorkId ? "Edit Piece" : "Add New Piece"}
      >
        <div className="px-6 pt-4 pb-32">
          {/* PDF Upload Section */}
          <section className="mb-10">
            <h3 className="mb-5 text-2xl font-bold tracking-tight text-textMain font-serif">上传乐谱</h3>
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
              className={`
                flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                ${workFormFile ? 'border-oldGold bg-oldGold/5' : 'border-gray-300 hover:border-oldGold/50'}
              `}
            >
              {workFormFile ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-oldGold/10 text-oldGold mb-3">
                    <Check size={28} />
                  </div>
                  <p className="text-textMain font-semibold text-center">{workFormFile.name}</p>
                  <p className="text-textSub text-sm mt-1">点击更换文件</p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
                    <Upload size={28} />
                  </div>
                  <p className="text-textMain font-semibold">选择 PDF 文件</p>
                  <p className="text-textSub text-sm mt-1">支持 PDF 格式</p>
                </>
              )}
            </div>
          </section>

          {/* Details Section */}
          <section className="mb-10">
            <h3 className="mb-6 text-2xl font-bold tracking-tight text-textMain font-serif">Details</h3>
            <div className="flex flex-col gap-6 font-sans">
              <div className="group relative">
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Work Title</label>
                <input
                  type="text"
                  value={workFormTitle}
                  onChange={(e) => setWorkFormTitle(e.target.value)}
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  placeholder="e.g. Nocturne Op. 9 No. 2"
                />
              </div>
              <div className="group relative">
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Composer</label>
                <input
                  type="text"
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  defaultValue={composer.name}
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="group relative">
                  <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Year</label>
                  <input
                    type="text"
                    value={workFormYear}
                    onChange={(e) => setWorkFormYear(e.target.value)}
                    className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                    placeholder="Optional"
                  />
                </div>
                <div className="group relative">
                  <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Edition</label>
                  <input
                    type="text"
                    value={workFormEdition}
                    onChange={(e) => setWorkFormEdition(e.target.value)}
                    className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                    placeholder="e.g. Henle"
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
              className={`
                 flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98]
                 ${workFormTitle && !isUploading ? 'bg-oldGold shadow-oldGold/30 hover:bg-[#d4ac26]' : 'bg-gray-300 cursor-not-allowed'}
               `}
            >
              {isUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  上传中...
                </>
              ) : (
                editingWorkId ? "保存更改" : "保存到曲库"
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
        title={editingRecordingId ? "Edit Recording" : "Add Recording"}
      >
        <div className="px-6 pt-6 pb-32">
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
              className={`
                flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                ${recFormFile ? 'border-oldGold bg-oldGold/5' : 'border-gray-300 hover:border-oldGold/50'}
              `}
            >
              {recFormFile ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-oldGold/10 text-oldGold mb-3">
                    <Check size={28} />
                  </div>
                  <p className="text-textMain font-semibold text-center">{recFormFile.name}</p>
                  <p className="text-textSub text-sm mt-1">点击更换文件</p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
                    <Music size={28} />
                  </div>
                  <p className="text-textMain font-semibold">选择音频文件</p>
                  <p className="text-textSub text-sm mt-1">支持 MP3、WAV、FLAC 等格式</p>
                </>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-6 font-sans">
            <div className="group relative">
              <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Title</label>
              <input
                type="text"
                value={recFormTitle}
                onChange={(e) => setRecFormTitle(e.target.value)}
                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                placeholder="e.g. Ballade No. 1"
              />
            </div>
            <div className="group relative">
              <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Performer</label>
              <input
                type="text"
                value={recFormPerformer}
                onChange={(e) => setRecFormPerformer(e.target.value)}
                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                placeholder="e.g. Krystian Zimerman"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="group relative">
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Year</label>
                <input
                  type="text"
                  value={recFormYear}
                  onChange={(e) => setRecFormYear(e.target.value)}
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  placeholder="1987"
                />
              </div>
              <div className="group relative">
                <label className="ml-1 mb-1 block text-sm font-medium text-textSub">Duration</label>
                <input
                  type="text"
                  value={recFormDuration}
                  onChange={(e) => setRecFormDuration(e.target.value)}
                  className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                  placeholder="9:15"
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent px-6 pb-8 pt-12 z-20">
            <button
              onClick={handleSaveRecording}
              disabled={!recFormTitle || isRecUploading}
              className={`
                    flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98]
                    ${recFormTitle && !isRecUploading ? 'bg-oldGold shadow-oldGold/30 hover:bg-[#d4ac26]' : 'bg-gray-300 cursor-not-allowed'}
                `}
            >
              {isRecUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  上传中...
                </>
              ) : (
                editingRecordingId ? "保存更改" : "保存到曲库"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Portrait Modal (Center) */}
      <Modal
        isOpen={showPortraitModal}
        onClose={() => !isAvatarUploading && setShowPortraitModal(false)}
        variant="center"
      >
        <div className="flex flex-col items-center">
          <h2 className="mb-8 text-2xl font-serif font-bold text-textMain tracking-tight">Update Portrait</h2>

          {/* Hidden file input */}
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileSelect}
          />

          <div className="relative mb-8 size-60 rounded-full overflow-hidden shadow-lg ring-1 ring-black/5">
            <img
              src={composer.image}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
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
              {isAvatarUploading ? '上传中...' : 'Choose from Device'}
            </button>
            <button
              onClick={handleRestoreDefaultAvatar}
              disabled={isAvatarUploading}
              className={`flex w-full items-center justify-center rounded-full py-2 text-[15px] font-medium text-oldGold transition-colors ${isAvatarUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-[0.98]'
                }`}
            >
              Restore Default Sketch
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};