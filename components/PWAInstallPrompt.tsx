import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { backdropFade, scaleIn } from '../utils/animations';

// NOTE: localStorage key 用于持久化"以后不再提醒"的用户选择
const DISMISS_KEY = 'sml_pwa_prompt_dismissed';

/**
 * 检测当前设备平台
 * 返回 'ios' | 'android' | 'desktop'
 */
const detectPlatform = (): 'ios' | 'android' | 'desktop' => {
    const ua = navigator.userAgent || navigator.vendor;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
};

/**
 * 检测是否已经以 Standalone 模式运行（已添加到主屏幕）
 */
const isStandalone = (): boolean => {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
};

export const PWAInstallPrompt: React.FC = () => {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [dontRemind, setDontRemind] = useState(false);

    useEffect(() => {
        // NOTE: 三个条件都满足时才显示弹窗：
        // 1. 用户未选择"以后不再提醒"
        // 2. 应用不在 Standalone 模式下运行
        // 3. 当前设备为移动端（iOS 或 Android）
        const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
        const standalone = isStandalone();
        const platform = detectPlatform();

        if (!dismissed && !standalone && platform !== 'desktop') {
            // 延迟 800ms 显示，给用户一个加载缓冲
            const timer = setTimeout(() => setIsVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleConfirm = () => {
        if (dontRemind) {
            localStorage.setItem(DISMISS_KEY, 'true');
        }
        setIsVisible(false);
    };

    const platform = detectPlatform();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[70] flex items-center justify-center"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    {/* 背景遮罩 */}
                    <motion.div
                        variants={backdropFade}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleConfirm}
                    />

                    {/* 弹窗内容 */}
                    <motion.div
                        variants={scaleIn}
                        className="relative z-10 w-full max-w-sm mx-6 bg-background rounded-3xl p-6 shadow-2xl"
                    >
                        {/* 图标 */}
                        <div className="flex justify-center mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-oldGold/10 flex items-center justify-center">
                                <Smartphone className="w-7 h-7 text-oldGold" />
                            </div>
                        </div>

                        {/* 标题 */}
                        <h2 className="text-xl font-bold font-serif text-textMain text-center mb-2">
                            {t.pwa.title}
                        </h2>

                        {/* 描述 */}
                        <p className="text-sm text-textSub text-center mb-5">
                            {t.pwa.description}
                        </p>

                        {/* 平台差异化操作步骤 */}
                        <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                            <p className="text-sm text-textMain leading-relaxed">
                                {platform === 'ios' ? t.pwa.iosSteps : t.pwa.androidSteps}
                            </p>
                        </div>

                        {/* 以后不再提醒 */}
                        <label className="flex items-center justify-center gap-2 mb-5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={dontRemind}
                                onChange={(e) => setDontRemind(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-oldGold focus:ring-oldGold accent-oldGold"
                            />
                            <span className="text-sm text-textSub">{t.pwa.dontRemind}</span>
                        </label>

                        {/* 确定按钮 */}
                        <button
                            onClick={handleConfirm}
                            className="w-full py-3 rounded-xl bg-oldGold text-white font-semibold text-base
                         hover:bg-oldGold/90 active:scale-[0.98] transition-all duration-200"
                        >
                            {t.pwa.confirm}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
