/**
 * 动画配置工具
 * 使用 Framer Motion 的通用动画变体定义
 */
import { Variants, Transition } from 'framer-motion';

// =============================================
// 通用过渡配置
// =============================================

// 弹性过渡（适合弹出动画）
export const springTransition: Transition = {
    type: 'spring',
    stiffness: 400,
    damping: 30,
};

// 平滑过渡（适合淡入淡出）
export const easeTransition: Transition = {
    type: 'tween',
    ease: [0.25, 0.1, 0.25, 1], // 类似 ease-out
    duration: 0.3,
};

// 快速过渡
export const quickTransition: Transition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.2,
};

// =============================================
// 列表动画变体
// =============================================

// 列表容器（用于交错子元素动画）
export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05, // 每个子元素延迟 50ms
            delayChildren: 0.1,   // 首个子元素延迟 100ms
        },
    },
};

// 列表项（从下淡入）
export const listItem: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: easeTransition,
    },
    exit: {
        opacity: 0,
        x: -100,
        transition: quickTransition,
    },
};

// 列表项（从右滑入，适合详情页列表）
export const listItemSlide: Variants = {
    hidden: {
        opacity: 0,
        x: 30,
    },
    visible: {
        opacity: 1,
        x: 0,
        transition: easeTransition,
    },
    exit: {
        opacity: 0,
        x: -50,
        transition: quickTransition,
    },
};

// =============================================
// 卡片/弹窗动画变体
// =============================================

// 缩放淡入（适合 Modal 中心弹窗）
export const scaleIn: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: springTransition,
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: quickTransition,
    },
};

// 从底部滑入（适合 Bottom Sheet）
// NOTE: 纯 y 位移动画，不含 opacity 变化以避免重绘，GPU 加速更高效
export const slideUp: Variants = {
    hidden: {
        y: '100%',
    },
    visible: {
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 260,
            damping: 28,
            mass: 0.8,
        },
    },
    exit: {
        y: '100%',
        transition: {
            type: 'tween',
            ease: [0.32, 0, 0.67, 0],
            duration: 0.3,
        },
    },
};

// 背景遮罩淡入
export const backdropFade: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.2 },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 },
    },
};

// =============================================
// 点击/交互动画
// =============================================

// 点击缩放效果
export const tapScale = {
    whileTap: { scale: 0.95 },
    transition: { type: 'spring', stiffness: 400, damping: 17 },
};

// 悬停放大效果
export const hoverScale = {
    whileHover: { scale: 1.02 },
    transition: { type: 'spring', stiffness: 400, damping: 17 },
};

// FAB 按钮动画配置
export const fabAnimation = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.9 },
    transition: springTransition,
};

// =============================================
// 页面/区域动画
// =============================================

// 淡入上滑（通用页面内容）
export const fadeInUp: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: easeTransition,
    },
};

// 淡入下滑（适合从顶部出现的元素）
export const fadeInDown: Variants = {
    hidden: {
        opacity: 0,
        y: -20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: easeTransition,
    },
};

// =============================================
// 搜索结果动画
// =============================================

export const searchResultsContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.03,
            delayChildren: 0.05,
        },
    },
};

export const searchResultItem: Variants = {
    hidden: {
        opacity: 0,
        y: 10,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: quickTransition,
    },
};

// =============================================
// 页面过渡动画
// =============================================

// 路由切换过渡（淡入淡出）
export const pageTransition: Variants = {
    initial: {
        opacity: 0,
    },
    animate: {
        opacity: 1,
        transition: {
            duration: 0.25,
            ease: 'easeOut',
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.15,
            ease: 'easeIn',
        },
    },
};

// Tab 内容切换过渡（淡入 + 轻微位移）
export const tabContent: Variants = {
    initial: {
        opacity: 0,
        y: 8,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.25,
            ease: [0.25, 0.1, 0.25, 1],
        },
    },
    exit: {
        opacity: 0,
        y: -8,
        transition: {
            duration: 0.15,
            ease: 'easeIn',
        },
    },
};
