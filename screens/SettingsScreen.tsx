import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Languages, ChevronRight, HardDrive, Upload, Cloud, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorage } from '../contexts/StorageContext';
import { staggerContainer, listItem } from '../utils/animations';
import { getStorageUsage } from '../services/local-file-storage';
import { pushComposerToCloud } from '../services/cloud-api';
import { Composer } from '../types';

export const SettingsScreen: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { storage } = useStorage();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'admin';

  // 本地存储用量
  const [localUsage, setLocalUsage] = useState<{
    sheets: { count: number; size: number };
    recordings: { count: number; size: number };
    avatars: { count: number; size: number };
    total: number;
  } | null>(null);

  // 推送相关状态
  const [showPushModal, setShowPushModal] = useState(false);
  const [localComposers, setLocalComposers] = useState<Composer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [pushResult, setPushResult] = useState<'success' | 'error' | null>(null);

  // 加载本地存储用量
  useEffect(() => {
    getStorageUsage().then(setLocalUsage).catch(console.error);
  }, []);

  // 生成基于昵称的默认头像 URL
  const avatarUrl = profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nickname || 'User')}&background=random&size=128`;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  // 格式化字节大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // 打开推送弹窗时加载本地作曲家列表
  const handleOpenPushModal = async () => {
    try {
      const composers = await storage.dataApi.getComposers();
      // 加载完整数据（含 works 和 recordings）
      const fullComposers = await Promise.all(
        composers.map((c: Composer) => storage.dataApi.getComposer(c.id))
      );
      setLocalComposers(fullComposers);
      setSelectedIds(new Set());
      setPushResult(null);
      setShowPushModal(true);
    } catch (error) {
      console.error('Failed to load local composers:', error);
    }
  };

  // 切换选中状态
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === localComposers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(localComposers.map(c => c.id)));
    }
  };

  // 执行推送
  const handlePush = async () => {
    if (selectedIds.size === 0) return;
    setIsPushing(true);
    setPushProgress(0);

    const selectedComposers = localComposers.filter(c => selectedIds.has(c.id));
    const totalComposers = selectedComposers.length;

    try {
      for (let i = 0; i < totalComposers; i++) {
        await pushComposerToCloud(selectedComposers[i], (itemProgress) => {
          // 综合进度：已完成的作曲家 + 当前作曲家的进度
          const overallProgress = Math.round(((i + itemProgress / 100) / totalComposers) * 100);
          setPushProgress(overallProgress);
        });
      }
      setPushProgress(100);
      setPushResult('success');
    } catch (error) {
      console.error('Push failed:', error);
      setPushResult('error');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/60 backdrop-blur-2xl backdrop-saturate-150 px-6 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-4 transition-all duration-300">
        <h1 className="text-4xl font-bold tracking-tight text-textMain font-serif">
          {t.settings.title}
        </h1>
      </header>

      <motion.div
        className="px-4 py-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Card */}
        <motion.div variants={listItem} className="mb-8 mt-2">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-soft border border-gray-100">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover border border-gray-100 shadow-sm"
              />
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <p className="text-xl font-bold leading-tight tracking-tight font-serif truncate">
                {profile?.nickname || 'User'}
              </p>
              <p className="text-textSub text-sm font-medium mt-1 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Storage Info Section */}
        <motion.div variants={listItem} className="mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2">
            {t.settings.storage.title}
          </h2>
          <div className="bg-white rounded-xl overflow-hidden shadow-soft border border-gray-100">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <div className="flex items-center justify-center rounded-lg shrink-0 size-8 bg-oldGold/20 text-oldGold">
                <HardDrive size={20} />
              </div>
              <div className="flex-1">
                <p className="text-base font-medium text-textMain">{t.settings.storage.local}</p>
                <p className="text-xs text-textSub mt-0.5">{t.settings.storage.localDesc}</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            </div>
          </div>

          {/* 本地存储用量 */}
          {localUsage && (
            <div className="mt-3 bg-white rounded-xl shadow-soft border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {t.settings.storage.localUsage}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-textSub">{t.settings.storage.sheets}</span>
                  <span className="text-textMain font-medium">{localUsage.sheets.count} ({formatSize(localUsage.sheets.size)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSub">{t.settings.storage.recordingsLabel}</span>
                  <span className="text-textMain font-medium">{localUsage.recordings.count} ({formatSize(localUsage.recordings.size)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSub">{t.settings.storage.avatarsLabel}</span>
                  <span className="text-textMain font-medium">{localUsage.avatars.count} ({formatSize(localUsage.avatars.size)})</span>
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-textMain">Total</span>
                  <span className="text-oldGold">{formatSize(localUsage.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 推送到云端按钮 */}
          <div className="mt-3 bg-white rounded-xl overflow-hidden shadow-soft border border-gray-100">
            <button
              onClick={isAdmin ? handleOpenPushModal : undefined}
              disabled={!isAdmin}
              className={`w-full flex items-center gap-4 px-4 py-3.5 transition-colors ${isAdmin
                  ? 'hover:bg-blue-50 active:bg-blue-100 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
                }`}
            >
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-8 ${isAdmin ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-200 text-gray-400'
                }`}>
                <Upload size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-base font-medium ${isAdmin ? 'text-textMain' : 'text-gray-400'}`}>
                  {t.cloud.push}
                </p>
                <p className="text-xs text-textSub mt-0.5">
                  {isAdmin ? t.cloud.pushDesc : t.cloud.adminOnly}
                </p>
              </div>
              {isAdmin && <ChevronRight size={18} className="text-gray-400" />}
            </button>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div variants={listItem} className="mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2">
            {t.settings.preferences.title}
          </h2>
          <div className="bg-white rounded-xl overflow-hidden shadow-soft border border-gray-100">
            <div
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="bg-oldGold/10 text-oldGold flex items-center justify-center rounded-lg shrink-0 size-8 group-hover:bg-oldGold/20 transition-colors">
                <Languages size={20} />
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium text-textMain">{t.common.language}</p>
                <p className="text-xs text-textSub mt-0.5">
                  {language === 'zh' ? '点击切换为 English' : 'Tap to switch to 中文'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <span className="text-base font-normal">{language === 'zh' ? t.common.chinese : t.common.english}</span>
                <ChevronRight size={20} className="opacity-60" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account Section */}
        <motion.div variants={listItem} className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2">
            {t.settings.data.title}
          </h2>
          <div className="bg-white rounded-xl overflow-hidden shadow-soft border border-gray-100">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center px-4 py-3.5 hover:bg-red-50 transition-colors active:bg-red-100"
            >
              <p className="text-lg font-medium text-red-600 flex items-center gap-2">
                <LogOut size={18} />
                {t.settings.data.logout}
              </p>
            </button>
          </div>
        </motion.div>

        {/* Copyright */}
        <motion.div variants={listItem} className="text-center pb-8">
          <p className="text-xs text-gray-400">
            © 2026 SML
          </p>
        </motion.div>
      </motion.div>

      {/* 推送弹窗 */}
      <AnimatePresence>
        {showPushModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isPushing && setShowPushModal(false)}
          >
            <motion.div
              className="bg-white rounded-t-2xl w-full max-w-[480px] max-h-[70vh] flex flex-col shadow-xl pb-[env(safe-area-inset-bottom)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 弹窗标题 */}
              <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-textMain">{t.cloud.selectComposers}</h3>
                  <p className="text-xs text-textSub mt-0.5">{t.cloud.pushDesc}</p>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-oldGold font-medium"
                >
                  {selectedIds.size === localComposers.length ? t.cloud.deselectAll : t.cloud.selectAll}
                </button>
              </div>

              {/* 作曲家勾选列表 */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {localComposers.length === 0 ? (
                  <p className="text-center text-textSub py-8 text-sm">{t.composers.noComposers}</p>
                ) : (
                  localComposers.map((composer) => (
                    <button
                      key={composer.id}
                      onClick={() => !isPushing && toggleSelect(composer.id)}
                      disabled={isPushing}
                      className="w-full flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {/* 勾选框 */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedIds.has(composer.id)
                          ? 'bg-oldGold border-oldGold'
                          : 'border-gray-300'
                        }`}>
                        {selectedIds.has(composer.id) && <Check size={14} className="text-white" />}
                      </div>
                      {/* 作曲家信息 */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-textMain truncate">{composer.name}</p>
                        <p className="text-xs text-textSub">
                          {composer.works?.length || 0} {t.settings.storage.sheets} · {composer.recordings?.length || 0} {t.settings.storage.recordingsLabel}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* 推送进度或按钮 */}
              <div className="px-6 py-4 border-t border-gray-100">
                {isPushing ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-textSub">{t.cloud.pushing}</span>
                      <span className="text-oldGold font-medium">{pushProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-oldGold rounded-full transition-all duration-300"
                        style={{ width: `${pushProgress}%` }}
                      />
                    </div>
                  </div>
                ) : pushResult === 'success' ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-green-600">
                    <Check size={20} />
                    <span className="font-medium">{t.cloud.pushSuccess}</span>
                  </div>
                ) : pushResult === 'error' ? (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-red-500">{t.cloud.pushError}</p>
                    <button
                      onClick={handlePush}
                      className="w-full py-2.5 rounded-xl bg-oldGold text-white font-medium text-sm"
                    >
                      {t.cloud.retry}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handlePush}
                    disabled={selectedIds.size === 0}
                    className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${selectedIds.size > 0
                        ? 'bg-oldGold text-white active:bg-oldGold/90'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    {selectedIds.size > 0
                      ? `${t.cloud.confirmPush} (${selectedIds.size})`
                      : t.cloud.noneSelected
                    }
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};