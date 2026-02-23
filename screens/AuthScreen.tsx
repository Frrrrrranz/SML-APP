import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, CheckCircle, AlertCircle, Shield, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fadeInUp, fadeInDown } from '../utils/animations';

type AuthMode = 'login' | 'register';

export const AuthScreen: React.FC = () => {
    const { signIn, signUp } = useAuth();
    const { t, language, setLanguage } = useLanguage();

    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [isFirstVisit, setIsFirstVisit] = useState(false);
    const [consentChecked, setConsentChecked] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    // 检查是否是首次访问
    React.useEffect(() => {
        const visited = localStorage.getItem('sml_has_visited');
        if (!visited) {
            setIsFirstVisit(true);
            localStorage.setItem('sml_has_visited', 'true');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        // NOTE: 提交前校验隐私政策勾选状态
        if (!consentChecked) {
            setError(t.auth.consentRequired);
            setLoading(false);
            return;
        }

        try {
            if (mode === 'login') {
                await signIn(email, password);
                // 登录成功后，App.tsx 会自动跳转到主页
            } else {
                // 注册
                if (!nickname.trim()) {
                    setError(t.auth.errors.nicknameRequired);
                    setLoading(false);
                    return;
                }

                const result = await signUp(email, password, nickname);

                if (result.needsVerification) {
                    // 显示验证邮件提示
                    setShowVerificationMessage(true);
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            // 处理常见错误信息
            if (err.message?.includes('Invalid login credentials')) {
                setError(t.auth.errors.invalidCredentials);
            } else if (err.message?.includes('Email not confirmed')) {
                setError(t.auth.errors.emailNotConfirmed);
            } else if (err.message?.includes('User already registered')) {
                setError(t.auth.errors.userAlreadyRegistered);
            } else if (err.message?.includes('Password should be at least')) {
                setError(t.auth.errors.passwordTooShort);
            } else {
                setError(err.message || t.auth.errors.genericError);
            }
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError(null);
        setShowVerificationMessage(false);
        setConsentChecked(false);
    };

    // 验证邮件发送成功提示
    if (showVerificationMessage) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
                <motion.div
                    className="w-full max-w-sm text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                    <div className="flex justify-center mb-6">
                        <motion.div
                            className="size-20 bg-green-100 rounded-full flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <CheckCircle className="text-green-600" size={40} />
                        </motion.div>
                    </div>

                    <h1 className="text-2xl font-bold font-serif text-textMain mb-3">
                        {t.auth.verifySentTitle}
                    </h1>

                    <p className="text-textSub mb-8 leading-relaxed">
                        {t.auth.verifySentDesc.replace('{email}', email)}
                        <br />
                        {t.auth.verifySentAction}
                    </p>

                    <button
                        onClick={() => {
                            setShowVerificationMessage(false);
                            setMode('login');
                        }}
                        className="text-oldGold font-semibold hover:underline"
                    >
                        {t.auth.backToLogin}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                {/* Logo / Brand - fadeInDown 动画 */}
                <motion.div
                    className="mb-10 text-center"
                    variants={fadeInDown}
                    initial="hidden"
                    animate="visible"
                >
                    <h1 className="text-4xl font-bold font-serif text-textMain tracking-tight">
                        SML
                    </h1>
                    <p className="text-textSub text-sm mt-2 tracking-wide">
                        Sheet Music Library
                    </p>
                </motion.div>

                {/* Form Card - fadeInUp 动画 */}
                <motion.div
                    className="w-full max-w-sm"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    layout
                >
                    {/* 标题带 AnimatePresence 切换过渡 */}
                    <div className="h-10 mb-8 overflow-hidden relative">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.h2
                                key={mode}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="text-2xl font-bold font-serif text-textMain text-center absolute w-full left-0 top-0"
                            >
                                {mode === 'login'
                                    ? (isFirstVisit ? t.auth.welcome : t.auth.welcomeBack)
                                    : t.auth.join
                                }
                            </motion.h2>
                        </AnimatePresence>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col">
                        {/* Nickname (Register Only) - 带过渡动画 */}
                        <AnimatePresence initial={false}>
                            {mode === 'register' && (
                                <motion.div
                                    className="relative overflow-hidden"
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                >
                                    <div className="absolute left-0 top-3 text-gray-400">
                                        <User size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder={t.auth.nickname}
                                        className="w-full pl-8 pr-4 py-3 border-b-2 border-gray-200 bg-transparent text-textMain placeholder-gray-400 focus:border-oldGold focus:outline-none transition-colors text-lg"
                                        autoComplete="name"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email */}
                        <div className="relative mb-6">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400">
                                <Mail size={20} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t.auth.email}
                                className="w-full pl-8 pr-4 py-3 border-b-2 border-gray-200 bg-transparent text-textMain placeholder-gray-400 focus:border-oldGold focus:outline-none transition-colors text-lg"
                                autoComplete="email"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="relative mb-6">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400">
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t.auth.password}
                                className="w-full pl-8 pr-4 py-3 border-b-2 border-gray-200 bg-transparent text-textMain placeholder-gray-400 focus:border-oldGold focus:outline-none transition-colors text-lg"
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                required
                                minLength={6}
                            />
                        </div>

                        {/* 隐私政策勾选框 */}
                        <div className="flex items-start gap-2.5 mb-6 mt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setConsentChecked(!consentChecked);
                                    // NOTE: 切换勾选状态时清除之前的相关错误
                                    if (error === t.auth.consentRequired) setError(null);
                                }}
                                className={`mt-0.5 w-[18px] h-[18px] min-w-[18px] rounded border-2 flex items-center justify-center transition-all duration-200 ${consentChecked
                                    ? 'bg-oldGold border-oldGold'
                                    : 'border-gray-300 hover:border-oldGold/50'
                                    }`}
                            >
                                {consentChecked && (
                                    <motion.svg
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-3 h-3 text-white"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                    >
                                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </motion.svg>
                                )}
                            </button>
                            <span className="text-xs text-textSub leading-relaxed">
                                {t.auth.consentLabel}
                                <button
                                    type="button"
                                    onClick={() => setShowPolicyModal(true)}
                                    className="text-oldGold font-medium hover:underline ml-0.5"
                                >
                                    {t.auth.consentLink}
                                </button>
                            </span>
                        </div>

                        {/* Error Message - 使用 height 动画避免挤压布局 */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileTap={{ scale: 0.98 }}
                            layout
                            className={`
                w-full py-4 rounded-full font-bold text-lg text-white
                flex items-center justify-center gap-2
                transition-colors duration-300
                ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-oldGold hover:bg-[#d4ac26] shadow-lg shadow-oldGold/30'}
              `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    {t.auth.processing}
                                </>
                            ) : (
                                <>
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.span
                                            key={mode}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center gap-2"
                                        >
                                            {mode === 'login' ? t.auth.login : t.auth.register}
                                            <ArrowRight size={20} />
                                        </motion.span>
                                    </AnimatePresence>
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={`${mode}-switch-text`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="text-textSub">
                                    {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}
                                </span>
                                <button
                                    onClick={switchMode}
                                    className="ml-2 text-oldGold font-semibold hover:underline"
                                >
                                    {mode === 'login' ? t.auth.registerNow : t.auth.backToLogin}
                                </button>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Language Switcher */}
                    <div className="mt-10 flex justify-center gap-4">
                        <button
                            onClick={() => setLanguage('zh')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${language === 'zh'
                                ? 'bg-oldGold/10 text-oldGold border border-oldGold/20'
                                : 'text-textSub hover:text-textMain'
                                }`}
                        >
                            中文
                        </button>
                        <div className="w-px h-3 bg-gray-200 self-center" />
                        <button
                            onClick={() => setLanguage('en')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${language === 'en'
                                ? 'bg-oldGold/10 text-oldGold border border-oldGold/20'
                                : 'text-textSub hover:text-textMain'
                                }`}
                        >
                            English
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <motion.div
                className="py-6 text-center text-gray-400 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
            >
                © 2026 SML
            </motion.div>

            {/* 隐私政策详情 Modal - 居中弹窗，响应式适配手机/桌面 */}
            <AnimatePresence>
                {showPolicyModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* 背景遮罩 */}
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setShowPolicyModal(false)}
                        />
                        {/* 弹窗内容 - 手机端紧凑，桌面端更宽 */}
                        <motion.div
                            className="relative z-10 w-full max-w-sm sm:max-w-md bg-background rounded-2xl p-5 sm:p-6 max-h-[70vh] overflow-y-auto shadow-2xl"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-oldGold/10 flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-oldGold" />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold font-serif text-textMain">
                                        {t.common.consent.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowPolicyModal(false)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-textSub hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* 政策内容 */}
                            <div className="space-y-3.5">
                                {t.common.consent.sections.map((section, index) => (
                                    <div key={index}>
                                        <h4 className="text-sm font-semibold text-textMain mb-1">
                                            {section.heading}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-textSub leading-relaxed whitespace-pre-line">
                                            {section.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
