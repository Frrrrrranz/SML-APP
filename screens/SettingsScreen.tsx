import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Languages, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { staggerContainer, listItem } from '../utils/animations';

export const SettingsScreen: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  // 生成基于昵称的默认头像 URL
  const avatarUrl = profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nickname || 'User')}&background=random&size=128`;

  const handleSignOut = async () => {
    try {
      await signOut();
      // 登出后 AuthGuard 会自动显示登录页
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Header - 与 ComposersScreen / SearchScreen 保持一致的静态标题 */}
      {/* Header - 沉浸式设计，适配刘海屏 */}
      {/* Header - 沉浸式设计，适配刘海屏 */}
      <header className="sticky top-0 z-10 bg-background/60 backdrop-blur-2xl backdrop-saturate-150 px-5 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-4 transition-all duration-300">
        <h1 className="text-4xl font-bold tracking-tight text-textMain font-serif">
          {t.settings.title}
        </h1>
      </header>

      {/* 使用与首页/搜索页相同的 staggerContainer + listItem 动画模式 */}
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

        {/* Preferences Section */}
        <motion.div variants={listItem} className="mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2">
            {t.settings.preferences.title}
          </h2>
          <div className="bg-white rounded-xl overflow-hidden shadow-soft border border-gray-100">
            {/* 语言切换选项 - 添加提示文字 */}
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
    </div>
  );
};