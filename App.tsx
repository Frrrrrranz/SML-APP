import React, { useState, useEffect } from 'react';
import { useStorage } from './contexts/StorageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { HashRouter, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { App as CapApp } from '@capacitor/app';
import { BottomNav } from './components/BottomNav';
import { SideNav } from './components/SideNav';
import { UpdateModal } from './components/UpdateModal';
import { ComposersScreen } from './screens/ComposersScreen';
import { ComposerDetailScreen } from './screens/ComposerDetailScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AiChatScreen } from './screens/AiChatScreen';
import { AuthScreen } from './screens/AuthScreen';
import { CloudLibraryScreen } from './screens/CloudLibraryScreen';
import { CloudComposerDetailScreen } from './screens/CloudComposerDetailScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Composer } from './types';
import { pageTransition } from './utils/animations';
import { SplashScreen } from './screens/SplashScreen';
import { checkForUpdate, downloadUpdate, applyUpdateAndReload, notifyAppReady } from './services/ota-update';
import { isAndroid, isElectron } from './services/platform';
import { DESKTOP_WEB_VERSION } from './constants/app-version';
import { DEFAULT_DESKTOP_AUTO_UPDATE_ENABLED, DESKTOP_AUTO_UPDATE_KEY } from './constants/update-settings';



// 主应用内容（需要登录）
const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { storage } = useStorage();

  // Lifted state for composers
  const [composers, setComposers] = useState<Composer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // OTA 热更新相关状态
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateDownloadUrl, setUpdateDownloadUrl] = useState('');
  const [updateSource, setUpdateSource] = useState<'android-ota' | 'desktop-web' | 'desktop-app'>('android-ota');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'prompt' | 'downloading' | 'success' | 'error'>('prompt');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateErrorDetail, setUpdateErrorDetail] = useState('');
  const shouldAutoCheckDesktopUpdates = isElectron()
    ? (() => {
        const stored = localStorage.getItem(DESKTOP_AUTO_UPDATE_KEY);
        return stored === null
          ? DEFAULT_DESKTOP_AUTO_UPDATE_ENABLED
          : stored === 'true';
      })()
    : false;

  // NOTE: 监听 Android 返回键/侧滑手势，实现原生导航体验
  // Electron 不需要此功能，桌面端有原生窗口关闭按钮
  useEffect(() => {
    if (!isAndroid()) return;
    const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && location.pathname !== '/') {
        navigate(-1);
      } else {
        // 在首页按返回键退出应用
        CapApp.exitApp();
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [navigate, location.pathname]);

  // NOTE: 当路由变化到主页时重新加载数据，确保统计数量正确
  useEffect(() => {
    if (location.pathname === '/') {
      loadComposers();
    }
  }, [location.pathname]);

  // NOTE: 应用启动时静默检查 OTA 更新（仅 Android）
  // Electron 使用 electron-updater 另行处理
  useEffect(() => {
    if (!isAndroid()) return;
    const doCheck = async () => {
      try {
        const update = await checkForUpdate();
        if (update && update.isWebUpdate) {
          setUpdateSource('android-ota');
          setUpdateVersion(update.version);
          setUpdateDownloadUrl(update.downloadUrl);
          setUpdateStatus('prompt');
          setUpdateProgress(0);
          setUpdateErrorDetail('');
          setShowUpdateModal(true);
        }
      } catch (error) {
        // 更新检查失败不影响正常使用
        console.error('OTA update check failed:', error);
      }
    };
    doCheck();
  }, []);

  useEffect(() => {
    if (!isElectron() || !window.electronAPI?.onDesktopWebUpdateProgress) return;
    const off = window.electronAPI.onDesktopWebUpdateProgress(({ percent }) => {
      setUpdateProgress(percent);
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (!isElectron() || !window.electronAPI?.desktopWebCheckForUpdate) return;
    if (!shouldAutoCheckDesktopUpdates) return;
    const doDesktopCheck = async () => {
      try {
        const update = await window.electronAPI!.desktopWebCheckForUpdate(DESKTOP_WEB_VERSION);
        if (update && update.isWebUpdate) {
          setUpdateSource('desktop-web');
          setUpdateVersion(update.version);
          setUpdateDownloadUrl(update.downloadUrl);
          setUpdateStatus('prompt');
          setUpdateProgress(0);
          setUpdateErrorDetail('');
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.error('Desktop web update check failed:', error);
      }
    };
    doDesktopCheck();
  }, [shouldAutoCheckDesktopUpdates]);

  useEffect(() => {
    if (!isElectron() || !window.electronAPI) return;
    if (!shouldAutoCheckDesktopUpdates) return;

    const offAvailable = window.electronAPI.onUpdateAvailable(({ version }) => {
      setUpdateSource('desktop-app');
      setUpdateVersion(version);
      setUpdateDownloadUrl('');
      setUpdateStatus('prompt');
      setUpdateProgress(0);
      setUpdateErrorDetail('');
      setShowUpdateModal(true);
    });

    const offProgress = window.electronAPI.onUpdateProgress(({ percent }) => {
      setUpdateStatus('downloading');
      setUpdateProgress(percent);
    });

    const offDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setUpdateStatus('success');
      setUpdateProgress(100);
      setUpdateErrorDetail('');
      setShowUpdateModal(true);
    });

    const offError = window.electronAPI.onUpdateError(({ message }) => {
      console.error('Desktop app update failed:', message);
      setUpdateStatus('error');
      setUpdateErrorDetail(message || '');
      setShowUpdateModal(true);
    });

    window.electronAPI.checkForUpdate?.().catch((error) => {
      console.error('Desktop app update check failed:', error);
    });

    return () => {
      offAvailable();
      offProgress();
      offDownloaded();
      offError();
    };
  }, [shouldAutoCheckDesktopUpdates]);

  // 处理用户确认更新（仅下载，不自动重载）
  const handleConfirmUpdate = async () => {
    setUpdateStatus('downloading');
    setUpdateProgress(0);
    setUpdateErrorDetail('');

    if (updateSource === 'desktop-app' && isElectron() && window.electronAPI?.downloadUpdate) {
      try {
        await window.electronAPI.downloadUpdate();
      } catch (error) {
        console.error('Desktop app update download failed:', error);
        setUpdateStatus('error');
        setUpdateErrorDetail(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    let success = false;
    if (isElectron() && window.electronAPI?.desktopWebDownloadUpdate) {
      success = await window.electronAPI.desktopWebDownloadUpdate(updateDownloadUrl, updateVersion);
    } else {
      success = await downloadUpdate(updateDownloadUrl, setUpdateProgress);
    }
    setUpdateStatus(success ? 'success' : 'error');
    if (!success) {
      setUpdateErrorDetail(
        updateSource === 'desktop-web'
          ? 'Desktop Web OTA bundle download or apply failed.'
          : ''
      );
    }
  };

  const handleApplyUpdate = async () => {
    if (updateSource === 'desktop-app' && isElectron() && window.electronAPI?.installUpdate) {
      await window.electronAPI.installUpdate();
      return;
    }

    if (isElectron() && window.electronAPI?.desktopWebApplyUpdate) {
      await window.electronAPI.desktopWebApplyUpdate();
      return;
    }
    await applyUpdateAndReload();
  };

  const loadComposers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await storage.dataApi.getComposers();
      setComposers(data);
    } catch (error) {
      console.error('Failed to load composers:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleAddComposer = async (newComposer: Composer): Promise<Composer | null> => {
    try {
      const created = await storage.dataApi.createComposer(newComposer);
      // NOTE: 使用非 silent 模式强制触发骨架屏→列表的完整渲染流程
      // 避免 framer-motion 空→非空分支切换时动画卡住
      await loadComposers();
      return { ...created, works: created.works || [], recordings: created.recordings || [] };
    } catch (error) {
      console.error('Failed to create composer:', error);
      return null;
    }
  };

  // NOTE: 这个函数只更新本地状态，不调用 API
  // 实际的数据库操作（如添加/删除作品）已经在 ComposerDetailScreen 中完成
  const handleUpdateComposer = (updatedComposer: Composer) => {
    setComposers((prev) =>
      prev.map(c => c.id === updatedComposer.id ? updatedComposer : c)
    );
  };

  const handleDeleteComposer = async (id: string) => {
    try {
      await storage.dataApi.deleteComposer(id);
      setComposers((prev) => prev.filter(c => c.id !== id));
      navigate('/');
    } catch (error) {
      console.error('Failed to delete composer:', error);
    }
  };

  // NOTE: Electron 桌面端使用全宽 + 侧边栏布局；Android 保留原有的居中 480px + 底部导航
  const electronMode = isElectron();

  return (
    <div className={electronMode ? 'flex bg-[#1a1a2e] min-h-screen' : 'flex justify-center bg-[#E5E5E5]'}>
      {/* Electron 侧边栏导航 */}
      {electronMode && (
        <SideNav
          currentPath={location.pathname}
          onNavigate={(path) => navigate(path)}
        />
      )}

      {/* 主内容区域 */}
      <div className={`
        ${electronMode
          ? 'flex-1 bg-background min-h-screen ml-[220px] overflow-x-hidden'
          : 'w-full max-w-[480px] bg-background min-h-screen shadow-2xl relative overflow-hidden'
        }
      `}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname.split('/')[1] || 'home'}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen"
          >
            <Routes location={location}>
              <Route
                path="/"
                element={
                  <ComposersScreen
                    composers={composers}
                    isLoading={isLoading}
                    onComposerSelect={(id) => navigate(`/composer/${id}`)}
                    onAddComposer={handleAddComposer}
                    onUpdateComposer={handleUpdateComposer}
                  />
                }
              />
              <Route
                path="/search"
                element={<SearchScreen composers={composers} />}
              />
              <Route
                path="/cloud"
                element={<CloudLibraryScreen />}
              />
              <Route
                path="/cloud/:id"
                element={<CloudDetailWrapper />}
              />
              <Route
                path="/ai-chat"
                element={<AiChatScreen />}
              />
              <Route
                path="/settings"
                element={<SettingsScreen />}
              />
              {/* Detail Routes */}
              <Route
                path="/composer/:id"
                element={
                  <DetailWrapper
                    composers={composers}
                    onUpdateComposer={handleUpdateComposer}
                    onDeleteComposer={handleDeleteComposer}
                  />
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>

        {/* Android 底部导航（Electron 不显示） */}
        {!electronMode && !location.pathname.includes('/composer/') && (
          <BottomNav
            currentPath={location.pathname}
            onNavigate={(path) => navigate(path)}
          />
        )}

        {/* OTA 更新弹窗 */}
        <UpdateModal
          visible={showUpdateModal}
          version={updateVersion}
          status={updateStatus}
          progress={updateProgress}
          sourceType={updateSource}
          sourceLabel={
            updateSource === 'desktop-app'
              ? 'Desktop App'
              : updateSource === 'desktop-web'
                ? 'Desktop OTA'
                : 'OTA'
          }
          errorDetail={updateErrorDetail}
          onConfirm={handleConfirmUpdate}
          onDismiss={() => setShowUpdateModal(false)}
          onReload={handleApplyUpdate}
        />

      </div>
    </div>
  );
};

// Wrapper to extract params and pass composers and update handler
const DetailWrapper = ({
  composers,
  onUpdateComposer,
  onDeleteComposer
}: {
  composers: Composer[],
  onUpdateComposer: (c: Composer) => void,
  onDeleteComposer: (id: string) => void
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <ComposerDetailScreen
      composerId={id || ''}
      composers={composers}
      onUpdateComposer={onUpdateComposer}
      onDeleteComposer={onDeleteComposer}
      onBack={() => navigate(-1)}
    />
  );
};

// 云端详情页路由包装器
const CloudDetailWrapper = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <CloudComposerDetailScreen
      composerId={id || ''}
      onBack={() => navigate('/cloud')}
    />
  );
};

// 认证路由守卫
const AuthGuard: React.FC = () => {
  const { session, loading } = useAuth();
  const { t } = useLanguage();

  // 加载中显示 loading 状态
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-oldGold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 未登录显示登录页
  if (!session) {
    return <AuthScreen />;
  }

  // 已登录显示主应用
  return <AppContent />;
};

import { StorageProvider } from './contexts/StorageContext';

const App: React.FC = () => {
  // NOTE: 必须在应用启动后立即通知 capacitor-updater 当前版本正常运行
  // 如果超时未调用（默认 10 秒），插件会自动回滚到上一个版本，导致白屏或卡住
  // 仅 Android 需要，Electron 使用 electron-updater 另行处理
  useEffect(() => {
    if (isAndroid()) {
      notifyAppReady();
    }
  }, []);

  return (
    <>
      <SplashScreen />
      <LanguageProvider>
        <StorageProvider>
          <AuthProvider>
            <HashRouter>
              <AuthGuard />
            </HashRouter>
          </AuthProvider>
        </StorageProvider>
      </LanguageProvider>
      <Analytics />
    </>
  );
};

export default App;
