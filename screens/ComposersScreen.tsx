import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Plus, Camera, Library, Loader2 } from 'lucide-react';
import { Composer } from '../types';
import { Modal } from '../components/Modal';
import { useStorage } from '../contexts/StorageContext';
import { staggerContainer, listItem, fabAnimation } from '../utils/animations';
import { useLanguage } from '../contexts/LanguageContext';

interface ComposersScreenProps {
  composers: Composer[];
  isLoading?: boolean;
  onComposerSelect: (id: string) => void;
  onAddComposer: (composer: Composer) => Promise<Composer | null>;
  onUpdateComposer?: (composer: Composer) => void;
}

export const ComposersScreen: React.FC<ComposersScreenProps> = ({ composers, isLoading = false, onComposerSelect, onAddComposer, onUpdateComposer }) => {
  const { t } = useLanguage();
  const { storage } = useStorage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('');

  // 头像上传相关状态
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 处理头像文件选择
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file'); // 简单提示可以保留英文或通过 t 函数扩展通用错误
        return;
      }
      // 验证文件大小 (最大 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size limit: 5MB');
        return;
      }
      setImageFile(file);
      // 创建预览 URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // 重置表单
  const resetForm = () => {
    setName('');
    setPeriod('');
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setIsUploading(false);
  };

  const handleSave = async () => {
    if (!name || !period) return;

    setIsUploading(true);
    try {
      // NOTE: 先用默认头像创建作曲家，获取 ID 后再上传自定义头像
      const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=256`;

      const newComposer = {
        name,
        period,
        image: defaultImage,
      };

      // 创建作曲家并获取返回的对象（包含 ID）
      const created = await onAddComposer(newComposer as Composer);

      if (!created) {
        throw new Error('Failed to create composer');
      }

      // 如果用户选择了头像图片，上传并更新
      if (imageFile && created.id) {
        const avatarUrl = await storage.uploadAvatar(imageFile, created.id);
        // 更新作曲家的头像 URL
        const updated = await storage.dataApi.updateComposer(created.id, { image: avatarUrl });
        // 通知父组件更新状态
        if (onUpdateComposer) {
          onUpdateComposer({ ...created, image: updated.image });
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save composer:', error);
      alert(t.auth.errors.genericError);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background pb-24 relative">
      {/* Header */}
      {/* Header - 沉浸式设计，适配刘海屏 */}
      {/* Header - 沉浸式设计，适配刘海屏 */}
      <header className="sticky top-0 z-10 bg-background/60 backdrop-blur-2xl backdrop-saturate-150 px-6 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-4 transition-all duration-300">
        <h1 className="text-4xl font-bold tracking-tight text-textMain font-serif">
          {t.composers.title}
        </h1>
      </header>

      <main className="px-4 py-2">
        {isLoading ? (
          <div className="space-y-0">
            {/* 骨架屏 — 借鉴 ShipSwift SWShimmer 的微光扫过概念 */}
            {[0.65, 0.45, 0.55, 0.4, 0.6, 0.5, 0.7, 0.35].map((nameWidth, i) => (
              <div key={i} className="flex items-center gap-5 p-4">
                {/* 圆形头像占位 */}
                <div className="skeleton-shimmer shrink-0 size-16 !rounded-full" />
                {/* 文字占位 */}
                <div className="flex-1 space-y-2.5 border-b border-divider pb-4">
                  <div className="skeleton-shimmer h-5" style={{ width: `${nameWidth * 100}%` }} />
                  <div className="skeleton-shimmer h-3.5 w-[40%]" />
                </div>
              </div>
            ))}
          </div>
        ) : composers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center pt-32"
          >
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#EBEAE6] text-oldGold shadow-soft">
              <Library size={48} strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-serif font-bold text-textMain mb-3">{t.composers.noComposers}</h3>
            <p className="text-textSub font-sans text-base leading-relaxed text-center max-w-[250px]">
              {t.composers.addFirst}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {composers.map((composer) => (
                <motion.div
                  key={composer.id}
                  variants={listItem}
                  layout
                  onClick={() => onComposerSelect(composer.id)}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
                  whileTap={{ scale: 0.98 }}
                  className="group flex items-center gap-5 p-4 cursor-pointer rounded-xl"
                >
                  {/* Image */}
                  <div className="shrink-0 relative">
                    <div className="bg-[#F0F0EB] aspect-square rounded-full size-16 overflow-hidden shadow-inner ring-1 ring-black/5">
                      <img
                        src={composer.image}
                        alt={composer.name}
                        className="h-full w-full object-cover grayscale sepia-[.3] contrast-[1.1] opacity-90 mix-blend-multiply"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col justify-center flex-1 border-b border-divider pb-4 group-hover:border-transparent transition-colors">
                    <p className="text-textMain text-[19px] font-bold leading-snug tracking-tight font-serif">
                      {composer.name}
                    </p>
                    <p className="text-textSub text-[13px] font-medium mt-1 font-sans tracking-wide">
                      {t.composers.sheetMusic.replace('{count}', (composer.sheetMusicCount || 0).toString())}
                      {' · '}
                      {t.composers.recordings.replace('{count}', (composer.recordingCount || 0).toString())}
                    </p>
                  </div>

                  {/* Arrow - 添加悬停动画 */}
                  <motion.div
                    className="shrink-0 pb-4 flex items-center justify-center"
                    whileHover={{ x: 3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <ChevronRight className="text-gray-300 group-hover:text-oldGold transition-colors" size={20} />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* FAB - Add Composer */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 size-14 bg-oldGold text-white rounded-full shadow-xl flex items-center justify-center z-30 ring-2 ring-white/20"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
        {...fabAnimation}
      >
        <Plus size={28} />
      </motion.button>

      {/* Add Composer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="bottom"
        title={t.composers.add}
      >
        <div className="px-6 pt-6 pb-6">
          {/* Avatar Upload */}
          <div className="flex justify-center mb-8">
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="h-32 w-32 bg-[#F2F2F7] rounded-full flex items-center justify-center shadow-inner ring-4 ring-white relative overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors group"
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={32} className="text-white" strokeWidth={1.5} />
                  </div>
                </>
              ) : (
                <Camera size={40} className="text-gray-400 opacity-50" strokeWidth={1.5} />
              )}
            </div>
          </div>

          <div className="space-y-8 font-sans">
            <div className="group relative">
              <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.composers.form.name}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                placeholder={t.composers.form.namePlaceholder}
                autoFocus
              />
            </div>

            <div className="group relative">
              <label className="ml-1 mb-1 block text-sm font-medium text-textSub">{t.composers.form.period}</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-xl font-medium text-textMain placeholder-gray-300 focus:border-oldGold focus:ring-0 transition-colors"
                placeholder={t.composers.form.periodPlaceholder}
              />
            </div>
          </div>

          {/* NOTE: 底部按钮使用 sticky 定位，在 Modal flex 容器内正常工作（fixed 在 transform 容器内会失效） */}
          <div className="sticky bottom-0 left-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent px-0 pb-8 pt-12 mt-8">
            <button
              onClick={handleSave}
              disabled={!name || !period || isUploading}
              className={`
                 flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold text-white shadow-lg transition-all
                 ${name && period && !isUploading
                  ? 'bg-oldGold shadow-oldGold/30 hover:bg-[#d4ac26] active:scale-[0.98]'
                  : 'bg-gray-300 cursor-not-allowed'}
               `}
            >
              {isUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {t.composers.creating}
                </>
              ) : (
                t.composers.add
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};