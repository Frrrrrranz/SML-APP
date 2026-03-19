import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Camera, FileText, Music, Check, Trash2, Edit2, PlayCircle, AlertCircle, Upload, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { openWithSystemApp, getLocalFileUri } from '../services/local-file-storage';
import { Capacitor } from '@capacitor/core';
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

  // 绠＄悊鍛樻潈闄愬垽鏂細鍩轰簬瑙掕壊
  const isAdmin = authProfile?.role === 'admin';

  const [viewMode, setViewMode] = useState<ViewMode>('Sheet Music');
  const [isAnimating, setIsAnimating] = useState(false); // 鐢ㄤ簬 Apple 椋庢牸婊戝潡鍔ㄧ敾
  const [isEditing, setIsEditing] = useState(false);

  // Modal States
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  // NOTE: 闈炵鐞嗗憳鐐瑰嚮鏂囦欢鏃讹紝鍏堝脊鐗堟潈纭锛岀‘璁ゅ悗鐢ㄧ郴缁熷簲鐢ㄦ墦寮€
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);

  // Work Form States
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workFormTitle, setWorkFormTitle] = useState('');
  const [workFormYear, setWorkFormYear] = useState('');
  const [workFormEdition, setWorkFormEdition] = useState('');
  const [workFormFiles, setWorkFormFiles] = useState<File[]>([]);
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
   * 澶勭悊鏂囦欢鎵撳紑锛堢敤绯荤粺搴旂敤鎴栫増鏉冪‘璁ゅ悗鐢ㄧ郴缁熷簲鐢級
   * NOTE: 绠＄悊鍛樼洿鎺ユ墦寮€锛岄潪绠＄悊鍛橀渶鍏堢‘璁ょ増鏉冨０鏄?
   */
  const handleOpenFile = async (fileUrl: string) => {
    if (isAdmin) {
      try {
        await openWithSystemApp(fileUrl);
      } catch (error) {
        console.error('Failed to open file with system app:', error);
        alert('鏃犳硶鎵撳紑鏂囦欢锛岃纭鏂囦欢鏄惁瀛樺湪');
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

  // NOTE: 灞呬腑灞曠ず棣栧瓧姣嶅ご鍍忥紝涓庝簯绔繚鎸佷竴鑷淬€傝嫢瀛樺湪鑷畾涔夊ご鍍?URL 鍒欏睍绀哄浘鐗囷紝鍚﹀垯灞曠ず棣栧瓧姣嶃€?
  const hasCustomAvatar = !!(composer.image && !composer.image.includes('ui-avatars.com') && composer.image !== '/composer-placeholder.png');

  // --- Handlers: General ---
  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleUpdateInfo = async (field: 'name' | 'period', value: string) => {
    try {
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { [field]: value });
      // NOTE: API 杩斿洖鐨?updatedComposer 涓嶅寘鍚?works/recordings锛岄渶瑕佷繚鐣欑幇鏈夋暟鎹?
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
    // NOTE: 鎵€鏈夌敤鎴峰潎鍙垹闄や綔鏇插锛堟湰鍦版暟鎹級
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

    // 楠岃瘉鏂囦欢绫诲瀷
    if (!file.type.startsWith('image/')) {
      alert('璇烽€夋嫨鍥剧墖鏂囦欢');
      return;
    }
    // 楠岃瘉鏂囦欢澶у皬 (鏈€澶?5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('鍥剧墖澶у皬涓嶈兘瓒呰繃 5MB');
      return;
    }

    setIsAvatarUploading(true);
    try {
      // 鍒犻櫎鏃уご鍍忥紙濡傛灉鏄嚜瀹氫箟涓婁紶鐨勶級
      if (composer.image) {
        await storage.deleteAvatar(composer.image);
      }

      // 涓婁紶鏂板ご鍍?
      const avatarUrl = await storage.uploadAvatar(file, composer.id);

      // 鏇存柊鏁版嵁搴?
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { image: avatarUrl });

      // NOTE: dbUpdateComposer 杩斿洖鐨勬槸 SQLite 涓殑鐩稿璺緞锛堝 SML/avatars/xxx.jpg锛夛紝
      // 闇€瑕佽浆鎹负 WebView 鍙闂殑 URI 鎵嶈兘鍦?<img> 涓樉绀?
      let resolvedImage = updatedComposer.image;
      if (resolvedImage && !resolvedImage.startsWith('http')) {
        const fileUri = await getLocalFileUri(resolvedImage);
        if (fileUri) resolvedImage = Capacitor.convertFileSrc(fileUri);
      }

      // 鏇存柊鏈湴鐘舵€?
      onUpdateComposer({
        ...composer,
        image: resolvedImage
      });

      setShowPortraitModal(false);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('澶村儚涓婁紶澶辫触锛岃閲嶈瘯');
    } finally {
      setIsAvatarUploading(false);
      // 閲嶇疆 input 浠ヤ究鍙互閲嶅閫夋嫨鍚屼竴鏂囦欢
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleRestoreDefaultAvatar = async () => {
    setIsAvatarUploading(true);
    try {
      // 鍒犻櫎鑷畾涔夊ご鍍忥紙濡傛灉鏈夛級
      if (composer.image) {
        await storage.deleteAvatar(composer.image);
      }

      // NOTE: 浣跨敤鍥哄畾鍗犱綅绗﹀浘鐗囷紝閬垮厤鍩轰簬鍚嶅瓧鐨勫ご鍍忓湪鏀瑰悕鍚庝笉鍚屾
      const defaultImage = '/composer-placeholder.png';
      const updatedComposer = await storage.dataApi.updateComposer(composer.id, { image: defaultImage });

      onUpdateComposer({
        ...composer,
        image: updatedComposer.image
      });

      setShowPortraitModal(false);
    } catch (error) {
      console.error('Failed to restore default avatar:', error);
      alert('鎭㈠榛樿澶村儚澶辫触锛岃閲嶈瘯');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // --- Handlers: Works (Sheet Music) ---
  const handleDeleteWork = async (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // NOTE: 鎵€鏈夌敤鎴峰潎鍙湪鏈湴鍒犻櫎涔愯氨锛屼笉褰卞搷浜戠鏁版嵁
    if (window.confirm(t.cloud.deleteWorkConfirm)) {
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
    setWorkFormFiles([]);
    setShowWorkModal(true);
  };

  const openEditWorkModal = (work: Work, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkId(work.id);
    setWorkFormTitle(work.title);
    setWorkFormYear(work.year);
    setWorkFormEdition(work.edition);
    setWorkFormFiles([]);
    setShowWorkModal(true);
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

        // 濡傛灉閫夋嫨浜嗘柊鏂囦欢锛屼笂浼犲苟鏇存柊
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

        // 濡傛灉閫夋嫨浜嗘枃浠讹紝涓婁紶骞舵洿鏂?
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
      alert('淇濆瓨澶辫触锛岃妫€鏌ユ枃浠舵牸寮忔垨缃戠粶杩炴帴');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Handlers: Recordings ---
  const handleDeleteRecording = async (recId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // NOTE: 鎵€鏈夌敤鎴峰潎鍙湪鏈湴鍒犻櫎褰曢煶锛屼笉褰卞搷浜戠鏁版嵁
    if (window.confirm(t.cloud.deleteRecordingConfirm)) {
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

        // 濡傛灉閫夋嫨浜嗘柊鏂囦欢锛屼笂浼犲苟鏇存柊
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

        // 濡傛灉閫夋嫨浜嗘枃浠讹紝涓婁紶骞舵洿鏂?
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
      alert('淇濆瓨澶辫触锛岃妫€鏌ユ枃浠舵牸寮忔垨缃戠粶杩炴帴');
    } finally {
      setIsRecUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Top Nav - 娌夋蹈寮忛€傞厤 */}
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
        {/* Hero Section - 甯?fadeInUp 杩涘叆鍔ㄧ敾 */}
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
              {/* NOTE: 涓庤缃〉涓€鑷达紝缁熶竴浣跨敤 ui-avatars.com 鐢熸垚棣栧瓧姣嶅ご鍍?*/}
              <img
                src={hasCustomAvatar ? composer.image! : getComposerAvatarUrl(composer.name)}
                alt={composer.name}
                className="w-full h-full object-cover"
              />
              {/* NOTE: 缂栬緫妯″紡涓嬪彔鍔犲崐閫忔槑榛戣壊閬僵锛屼繚鐣欏ご鍍忓唴瀹瑰彲瑙?*/}
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in duration-200">
                  <Camera className="text-white drop-shadow-md" size={32} />
                </div>
              )}
            </div>
          </div>

          {/* NOTE: min-h 淇濊瘉缂栬緫鎬佷笌闈炵紪杈戞€佺瓑楂橈紝闃叉鍒囨崲鏃堕〉闈㈤珮搴﹁烦鍙?*/}
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

        {/* Segmented Control - Apple Music 椋庢牸姣涚幓鐠冩粦鍔?Tab */}
        <div className={`${desktopMode ? 'px-5 pb-5' : 'px-6 pb-6'} sticky top-[64px] z-10 bg-background/70 backdrop-blur-2xl transition-all duration-200`}>
          <div className={`relative flex ${desktopMode ? 'h-10' : 'h-11'} ${desktopMode ? 'w-full max-w-[760px] mx-auto' : 'w-full'} items-center rounded-xl ${desktopMode ? 'bg-white/18 backdrop-blur-2xl backdrop-saturate-150' : 'bg-black/[0.06] backdrop-blur-xl'} ${desktopMode ? 'p-[3px]' : 'p-[3px]'} ${desktopMode ? 'border border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_30px_rgba(0,0,0,0.07)]' : 'border border-white/30 shadow-sm shadow-black/5'} ${desktopMode ? 'overflow-visible' : 'overflow-hidden'}`}>
            {desktopMode && (
              <div className="pointer-events-none absolute inset-[1px] rounded-[10px] bg-gradient-to-b from-white/35 via-white/8 to-transparent" />
            )}
            {/* 婊戝姩鎸囩ず鍣?- Apple Music 姣涚幓鐠冮鏍?*/}
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
            {/* Tab 鎸夐挳 */}
            {(['Sheet Music', 'Recordings'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  if (viewMode !== mode) {
                    // 瑙﹀彂鍔ㄧ敾锛氬厛鏀惧ぇ
                    setIsAnimating(true);
                    setViewMode(mode);
                    // 鍔ㄧ敾瀹屾垚鍚庢仮澶?
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
                      // NOTE: 闈炵紪杈戞ā寮忎笅锛岀偣鍑绘潯鐩敤绯荤粺搴旂敤鎵撳紑 PDF
                      if (!isEditing && work.fileUrl) {
                        await handleOpenFile(work.fileUrl);
                      }
                    }}
                    className={`group flex items-center gap-4 ${desktopMode ? 'px-5 py-3.5' : 'px-6 py-4'} hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative overflow-hidden ${!isEditing && work.fileUrl ? 'cursor-pointer' : ''
                      }`}
                  >
                    {/* NOTE: 鍒犻櫎鎸夐挳浠呭湪缂栬緫妯″紡涓斾负绠＄悊鍛樻椂鏄剧ず */}
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

                    {/* 鍙湁缂栬緫妯″紡涓嬫樉绀虹紪杈戞寜閽?*/}
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
                      // NOTE: 闈炵紪杈戞ā寮忎笅锛岀偣鍑绘潯鐩敤绯荤粺搴旂敤鎾斁闊抽
                      if (!isEditing && recording.fileUrl) {
                        await handleOpenFile(recording.fileUrl);
                      }
                    }}
                    className={`group flex items-center gap-4 ${desktopMode ? 'px-5 py-3.5' : 'px-6 py-4'} hover:bg-black/5 transition-colors border-b border-divider last:border-0 relative ${!isEditing && recording.fileUrl ? 'cursor-pointer' : ''
                      }`}
                  >
                    {/* NOTE: 褰曢煶涓嶅厑璁稿垹闄わ紝濮嬬粓鏄剧ず鎾斁鍥炬爣 */}
                    <div className={`shrink-0 opacity-80 group-hover:opacity-100 transition-opacity ${recording.fileUrl ? 'text-oldGold' : 'text-gray-400'}`}>
                      <PlayCircle size={28} strokeWidth={1.5} />
                    </div>

                    <div className="flex flex-1 flex-col justify-center min-w-0">
                      <p className="text-textMain text-base font-bold leading-tight truncate font-sans">
                        {recording.title}
                      </p>
                      <p className="text-textSub text-sm leading-normal truncate font-medium mt-0.5">
                        {recording.performer} / {recording.year}
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

        {/* Delete Composer Button - 缂栬緫妯″紡涓嬫樉绀?*/}
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

      {/* FAB - 甯﹀脊鍏ュ姩鐢?*/}
      <motion.button
        onClick={viewMode === 'Sheet Music' ? openAddWorkModal : openAddRecordingModal}
        className={`fixed size-14 bg-oldGold text-white rounded-full shadow-xl flex items-center justify-center hover:bg-opacity-90 transition-all z-30 ring-2 ring-white/20 ${desktopMode ? 'right-8 bottom-8' : 'bottom-24 left-6'}`}
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
                  // NOTE: 鐗堟潈纭鍚庤皟鐢ㄧ郴缁熷簲鐢ㄦ墦寮€鏂囦欢
                  try {
                    await openWithSystemApp(pendingFileUrl);
                  } catch (error) {
                    console.error('Failed to open file:', error);
                    alert('鏃犳硶鎵撳紑鏂囦欢锛岃纭鏂囦欢鏄惁瀛樺湪');
                  }
                  setShowCopyrightModal(false);
                  setPendingFileUrl(null);
                }
              }}
              className="w-full py-4 rounded-full font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
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
          <h3 className="text-xl font-bold text-textMain mb-5 font-serif text-center">{editingWorkId ? '缂栬緫涔愯氨' : '娣诲姞涔愯氨'}</h3>

          {/* Sheet Upload (PDF or Images) */}
          <input
            type="file"
            ref={fileInputRef}
            accept={SHEET_UPLOAD_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              const validationError = validateSheetUploadFiles(files);
              if (validationError) {
                alert(validationError);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                return;
              }
              setWorkFormFiles(files);
            }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
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
                <p className="text-textSub text-xs mt-0.5">点击更换文件</p>
                <p className="text-textSub text-xs mt-0.5">{getSheetSelectionHint(workFormFiles)}</p>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
                  <Upload size={22} />
                </div>
                <p className="text-textMain font-semibold text-sm">选择 PDF 或图片</p>
                <p className="text-textSub text-xs mt-0.5">图片可多选，上传后自动合成 PDF</p>
              </>
            )}
          </div>
          {workFormFiles.length > 1 && (
            <div className="mb-5 rounded-xl border border-gray-200 bg-white/80 p-3">
              <p className="mb-2 text-xs font-semibold text-textSub">页序确认（将按以下顺序合成）</p>
              <div className="space-y-2">
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
          <h3 className="text-xl font-bold text-textMain mb-5 font-serif text-center">{editingRecordingId ? '缂栬緫褰曢煶' : '娣诲姞褰曢煶'}</h3>

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
                <p className="text-textSub text-xs mt-0.5">鐐瑰嚮鏇存崲鏂囦欢</p>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
                  <Music size={22} />
                </div>
                <p className="text-textMain font-semibold text-sm">閫夋嫨闊抽鏂囦欢</p>
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

