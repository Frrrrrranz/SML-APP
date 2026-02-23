import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
    onComplete?: () => void;
    minimumDisplayTime?: number; // 最小展示时间，防止闪烁
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
    onComplete,
    minimumDisplayTime = 2000
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, minimumDisplayTime);

        return () => clearTimeout(timer);
    }, [minimumDisplayTime]);

    // 当动画完成（退出）时触发 onComplete
    const handleExitComplete = () => {
        if (onComplete) {
            onComplete();
        }
    };

    return (
        <AnimatePresence onExitComplete={handleExitComplete}>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAFAFA]"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="flex flex-col items-center"
                    >
                        {/* 使用 CSS 绘制或 SVG 渲染 Logo，或者直接显示文字，避免图片加载闪烁 */}
                        {/* 这里使用与 Maskable Image 一致的衬线体 SML */}
                        <h1 className="text-6xl font-serif text-[#171611] tracking-widest font-bold">
                            SML
                        </h1>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
