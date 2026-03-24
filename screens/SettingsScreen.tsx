import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Languages, ChevronRight, HardDrive, Upload, Check } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ANDROID_WEB_VERSION, APP_VERSION, DESKTOP_WEB_VERSION } from '../constants/app-version';
import { DEFAULT_DESKTOP_AUTO_UPDATE_ENABLED, DESKTOP_AUTO_UPDATE_KEY } from '../constants/update-settings';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorage } from '../contexts/StorageContext';
import { getStorageUsage } from '../services/local-file-storage';
import { isAndroid, isElectron } from '../services/platform';
import { pushComposerToCloud } from '../services/cloud-api';
import { Composer } from '../types';
import { staggerContainer, listItem } from '../utils/animations';

export const SettingsScreen: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { storage } = useStorage();

  const isAdmin = profile?.role === 'admin';

  const [localUsage, setLocalUsage] = useState<{
    sheets: { count: number; size: number };
    recordings: { count: number; size: number };
    avatars: { count: number; size: number };
    total: number;
  } | null>(null);

  const [showPushModal, setShowPushModal] = useState(false);
  const [localComposers, setLocalComposers] = useState<Composer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [pushResult, setPushResult] = useState<'success' | 'error' | null>(null);
  const [desktopAutoUpdateEnabled, setDesktopAutoUpdateEnabled] = useState(DEFAULT_DESKTOP_AUTO_UPDATE_ENABLED);
  const versionDisplay = isAndroid()
    ? `android v${ANDROID_WEB_VERSION}`
    : isElectron()
      ? `desktop v${DESKTOP_WEB_VERSION}`
      : `web v${APP_VERSION}`;

  useEffect(() => {
    getStorageUsage().then(setLocalUsage).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isElectron()) return;
    const stored = localStorage.getItem(DESKTOP_AUTO_UPDATE_KEY);
    setDesktopAutoUpdateEnabled(
      stored === null ? DEFAULT_DESKTOP_AUTO_UPDATE_ENABLED : stored === 'true'
    );
  }, []);

  const avatarUrl = profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nickname || 'User')}&background=random&size=128`;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleToggleDesktopAutoUpdate = () => {
    const next = !desktopAutoUpdateEnabled;
    setDesktopAutoUpdateEnabled(next);
    localStorage.setItem(DESKTOP_AUTO_UPDATE_KEY, String(next));
  };

  const handleOpenPushModal = async () => {
    try {
      const composers = await storage.dataApi.getComposers();
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === localComposers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(localComposers.map((c) => c.id)));
    }
  };

  const handlePush = async () => {
    if (selectedIds.size === 0) return;
    setIsPushing(true);
    setPushProgress(0);

    const selectedComposers = localComposers.filter((c) => selectedIds.has(c.id));
    const totalComposers = selectedComposers.length;

    try {
      for (let i = 0; i < totalComposers; i++) {
        await pushComposerToCloud(selectedComposers[i], (itemProgress) => {
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
      <header className="sticky top-0 z-10 bg-background/60 px-6 pb-4 pt-[calc(env(safe-area-inset-top)+3.5rem)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-textMain">
          {t.settings.title}
        </h1>
      </header>

      <motion.div
        className="px-4 py-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={listItem} className="mb-8 mt-2">
          <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full border border-gray-100 object-cover shadow-sm"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <p className="truncate font-serif text-xl font-bold leading-tight tracking-tight">
                {profile?.nickname || 'User'}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-textSub">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItem} className="mb-6">
          <h2 className="ml-4 mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            {t.settings.storage.title}
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <div className="size-8 shrink-0 rounded-lg bg-oldGold/20 text-oldGold flex items-center justify-center">
                <HardDrive size={20} />
              </div>
              <div className="flex-1">
                <p className="text-base font-medium text-textMain">{t.settings.storage.local}</p>
                <p className="mt-0.5 text-xs text-textSub">{t.settings.storage.localDesc}</p>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            </div>
          </div>

          {localUsage && (
            <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                {t.settings.storage.localUsage}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-textSub">{t.settings.storage.sheets}</span>
                  <span className="font-medium text-textMain">{localUsage.sheets.count} ({formatSize(localUsage.sheets.size)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSub">{t.settings.storage.recordingsLabel}</span>
                  <span className="font-medium text-textMain">{localUsage.recordings.count} ({formatSize(localUsage.recordings.size)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSub">{t.settings.storage.avatarsLabel}</span>
                  <span className="font-medium text-textMain">{localUsage.avatars.count} ({formatSize(localUsage.avatars.size)})</span>
                </div>
                <div className="my-1 h-px bg-gray-100" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-textMain">Total</span>
                  <span className="text-oldGold">{formatSize(localUsage.total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft">
            <button
              onClick={isAdmin ? handleOpenPushModal : undefined}
              disabled={!isAdmin}
              className={`w-full flex items-center gap-4 px-4 py-3.5 transition-colors ${
                isAdmin
                  ? 'cursor-pointer hover:bg-blue-50 active:bg-blue-100'
                  : 'cursor-not-allowed opacity-50'
              }`}
            >
              <div
                className={`size-8 shrink-0 rounded-lg flex items-center justify-center ${
                  isAdmin ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Upload size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-base font-medium ${isAdmin ? 'text-textMain' : 'text-gray-400'}`}>
                  {t.cloud.push}
                </p>
                <p className="mt-0.5 text-xs text-textSub">
                  {isAdmin ? t.cloud.pushDesc : t.cloud.adminOnly}
                </p>
              </div>
              {isAdmin && <ChevronRight size={18} className="text-gray-400" />}
            </button>
          </div>
        </motion.div>

        <motion.div variants={listItem} className="mb-6">
          <h2 className="ml-4 mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            {t.settings.preferences.title}
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft">
            <div
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="group flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50"
            >
              <div className="size-8 shrink-0 rounded-lg bg-oldGold/10 text-oldGold flex items-center justify-center transition-colors group-hover:bg-oldGold/20">
                <Languages size={20} />
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium text-textMain">{t.common.language}</p>
                <p className="mt-0.5 text-xs text-textSub">
                  {language === 'zh' ? '点击切换为 English' : 'Tap to switch to 中文'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <span className="text-base font-normal">{language === 'zh' ? t.common.chinese : t.common.english}</span>
                <ChevronRight size={20} className="opacity-60" />
              </div>
            </div>
            {isElectron() && (
              <button
                onClick={handleToggleDesktopAutoUpdate}
                className="flex w-full items-center gap-4 border-t border-gray-100 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
              >
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  desktopAutoUpdateEnabled ? 'bg-green-500/10 text-green-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  <Check size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-textMain">{t.settings.preferences.desktopAutoUpdate}</p>
                  <p className="mt-0.5 text-xs text-textSub">
                    {desktopAutoUpdateEnabled
                      ? t.settings.preferences.desktopAutoUpdateOnDesc
                      : t.settings.preferences.desktopAutoUpdateOffDesc}
                  </p>
                </div>
                <div className={`relative h-7 w-12 rounded-full transition-colors ${
                  desktopAutoUpdateEnabled ? 'bg-oldGold' : 'bg-gray-300'
                }`}>
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${
                      desktopAutoUpdateEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </div>
              </button>
            )}
          </div>
        </motion.div>

        <motion.div variants={listItem} className="mb-8">
          <h2 className="ml-4 mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            {t.settings.data.title}
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center px-4 py-3.5 transition-colors hover:bg-red-50 active:bg-red-100"
            >
              <p className="flex items-center gap-2 text-lg font-medium text-red-600">
                <LogOut size={18} />
                {t.settings.data.logout}
              </p>
            </button>
          </div>
        </motion.div>

        <motion.div variants={listItem} className="pb-8 text-center">
          <p className="text-xs text-gray-400">
            &copy; 2026 SML
          </p>
          <p className="mt-1 text-[10px] text-gray-300">
            {versionDisplay}
          </p>
        </motion.div>
      </motion.div>

      <Modal
        isOpen={showPushModal}
        onClose={() => {
          if (!isPushing) {
            setShowPushModal(false);
          }
        }}
      >
        <div className="w-[min(100vw-3rem,36rem)] max-w-full">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 pr-10">
            <div>
              <h3 className="text-xl font-bold text-textMain">{t.cloud.selectComposers}</h3>
              <p className="mt-1 text-sm text-textSub">{t.cloud.pushDesc}</p>
            </div>
            <button
              onClick={toggleSelectAll}
              disabled={isPushing || localComposers.length === 0}
              className="shrink-0 text-sm font-medium text-oldGold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {selectedIds.size === localComposers.length ? t.cloud.deselectAll : t.cloud.selectAll}
            </button>
          </div>

          <div className="mt-4 max-h-[min(52vh,28rem)] overflow-y-auto pr-1">
            {localComposers.length === 0 ? (
              <p className="py-10 text-center text-sm text-textSub">{t.composers.noComposers}</p>
            ) : (
              <div className="space-y-2">
                {localComposers.map((composer) => (
                  <button
                    key={composer.id}
                    onClick={() => !isPushing && toggleSelect(composer.id)}
                    disabled={isPushing}
                    className="w-full rounded-xl border border-gray-100 px-3 py-3 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                          selectedIds.has(composer.id) ? 'border-oldGold bg-oldGold' : 'border-gray-300'
                        }`}
                      >
                        {selectedIds.has(composer.id) && <Check size={14} className="text-white" />}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium text-textMain">{composer.name}</p>
                        <p className="text-xs text-textSub">
                          {composer.works?.length || 0} {t.settings.storage.sheets} · {composer.recordings?.length || 0} {t.settings.storage.recordingsLabel}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            {isPushing ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-textSub">{t.cloud.pushing}</span>
                  <span className="font-medium text-oldGold">{pushProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-oldGold transition-all duration-300"
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
                  className="w-full rounded-xl bg-oldGold py-2.5 text-sm font-medium text-white"
                >
                  {t.cloud.retry}
                </button>
              </div>
            ) : (
              <button
                onClick={handlePush}
                disabled={selectedIds.size === 0}
                className={`w-full rounded-xl py-3 text-sm font-medium transition-colors ${
                  selectedIds.size > 0
                    ? 'bg-oldGold text-white hover:bg-oldGold/90'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                }`}
              >
                {selectedIds.size > 0 ? `${t.cloud.confirmPush} (${selectedIds.size})` : t.cloud.noneSelected}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
