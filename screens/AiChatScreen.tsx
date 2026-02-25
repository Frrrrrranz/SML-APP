import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { askMusicQuestion } from '../services/gemini';
import { staggerContainer, listItem } from '../utils/animations';

// =============================================
// 打字机 Hook — 借鉴 ShipSwift SWTypewriterText 的逐字呈现概念
// =============================================
const useTypewriter = (text: string, speed = 18) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!text) {
            setDisplayedText('');
            setIsComplete(true);
            return;
        }

        setDisplayedText('');
        setIsComplete(false);
        let index = 0;

        const timer = setInterval(() => {
            index++;
            setDisplayedText(text.slice(0, index));
            if (index >= text.length) {
                clearInterval(timer);
                setIsComplete(true);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return { displayedText, isComplete };
};

// 打字机气泡 — AI 回复逐字渲染
const TypewriterBubble: React.FC<{
    content: string;
    isError?: boolean;
    onComplete?: () => void;
}> = ({ content, isError, onComplete }) => {
    const { displayedText, isComplete } = useTypewriter(content, isError ? 0 : 18);

    useEffect(() => {
        if (isComplete && onComplete) onComplete();
    }, [isComplete, onComplete]);

    return (
        <>
            {displayedText.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                    {line}
                    {i < displayedText.split('\n').length - 1 && <br />}
                </React.Fragment>
            ))}
            {/* 闪烁光标 — 打字完成后隐藏 */}
            {!isComplete && (
                <span className="inline-block w-[2px] h-[1em] bg-oldGold/60 ml-0.5 align-text-bottom animate-pulse" />
            )}
        </>
    );
};

// 消息类型定义
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isError?: boolean;
}

// 消息气泡动画
const bubbleVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const AiChatScreen: React.FC = () => {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // NOTE: 追踪已完成打字的消息，避免重新渲染时重复动画
    const [typedMessageIds, setTypedMessageIds] = useState<Set<string>>(new Set());
    const markTyped = useCallback((id: string) => {
        setTypedMessageIds(prev => new Set(prev).add(id));
    }, []);

    // 快捷问题
    const quickQuestions = [
        t.aiChat.quick1,
        t.aiChat.quick2,
        t.aiChat.quick3,
        t.aiChat.quick4,
    ];

    // 自动滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 生成唯一 ID
    const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // 发送消息
    const handleSend = async (question?: string) => {
        const text = question || inputValue.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = {
            id: generateId(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const answer = await askMusicQuestion(text);
            const assistantMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: answer,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch {
            const errorMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: t.aiChat.error,
                timestamp: new Date(),
                isError: true,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 渲染欢迎界面
    const renderWelcome = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center px-6 pb-8"
        >
            {/* NOTE: 使用与作曲家列表一致的圆形图标风格 */}
            <div className="w-20 h-20 rounded-full bg-[#F0F0EB] flex items-center justify-center mb-5 shadow-inner ring-1 ring-black/5">
                <Sparkles className="w-9 h-9 text-oldGold opacity-80" strokeWidth={1.5} />
            </div>

            <p className="text-sm text-textSub text-center mb-8 max-w-[280px] leading-relaxed font-sans">
                {t.aiChat.greeting}
            </p>

            {/* 快捷问题 - 使用与搜索分类一致的列表样式 */}
            <div className="w-full">
                <p className="text-xs font-medium text-textSub uppercase tracking-wider mb-3 pl-1 font-sans">
                    {t.aiChat.suggestionsLabel}
                </p>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50"
                >
                    {quickQuestions.map((q, index) => (
                        <motion.button
                            key={index}
                            variants={listItem}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSend(q)}
                            className="w-full text-left flex items-center gap-3 px-4 py-3.5
                               text-sm text-textMain font-serif
                               hover:bg-[#fcfbf9] active:bg-gray-50
                               transition-colors duration-200"
                        >
                            <MessageSquare className="w-4 h-4 text-oldGold opacity-60 shrink-0" strokeWidth={1.5} />
                            <span className="flex-1">{q}</span>
                        </motion.button>
                    ))}
                </motion.div>
            </div>
        </motion.div>
    );

    // 渲染消息列表
    const renderMessages = () => (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-4">
            <AnimatePresence>
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        variants={bubbleVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {/* NOTE: 头像风格与作曲家列表保持一致 */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-black/5 shadow-inner ${msg.role === 'user'
                                ? 'bg-[#F0F0EB]'
                                : msg.isError
                                    ? 'bg-red-50'
                                    : 'bg-[#F0F0EB]'
                                }`}>
                                {msg.role === 'user' ? (
                                    <User className="w-4 h-4 text-textSub" strokeWidth={1.5} />
                                ) : msg.isError ? (
                                    <AlertCircle className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                                ) : (
                                    <Sparkles className="w-4 h-4 text-oldGold opacity-80" strokeWidth={1.5} />
                                )}
                            </div>

                            {/* NOTE: 气泡样式统一使用项目配色 */}
                            <div className={`px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-oldGold/90 text-white rounded-2xl rounded-tr-md font-sans'
                                : msg.isError
                                    ? 'bg-red-50/80 text-red-700 border border-red-100 rounded-2xl rounded-tl-md font-sans'
                                    : 'bg-white text-textMain border border-gray-100 rounded-2xl rounded-tl-md shadow-sm font-serif'
                                }`}>
                                {/* AI 回复使用打字机效果，用户消息直接显示 */}
                                {msg.role === 'assistant' && !typedMessageIds.has(msg.id) ? (
                                    <TypewriterBubble
                                        content={msg.content}
                                        isError={msg.isError}
                                        onComplete={() => markTyped(msg.id)}
                                    />
                                ) : (
                                    msg.content.split('\n').map((line, i) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            {i < msg.content.split('\n').length - 1 && <br />}
                                        </React.Fragment>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* 加载动画 */}
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                >
                    <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F0F0EB] flex items-center justify-center ring-1 ring-black/5 shadow-inner">
                            <Sparkles className="w-4 h-4 text-oldGold opacity-80" strokeWidth={1.5} />
                        </div>
                        <div className="px-4 py-3.5 bg-white rounded-2xl rounded-tl-md border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-oldGold/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-oldGold/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-oldGold/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col pb-20">
            {/* NOTE: 沉浸式 header，滚动时有模糊效果和底部渐隐 */}
            <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-3xl backdrop-saturate-200 px-6 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-4">
                <h1 className="text-4xl font-bold tracking-tight text-textMain font-serif">
                    {t.aiChat.title}
                </h1>

            </header>
            {/* Header 底部渐隐遮罩 */}
            <div className="sticky top-[calc(env(safe-area-inset-top)+6.5rem)] z-20 h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />

            {/* 内容区域 */}
            {messages.length === 0 ? renderWelcome() : renderMessages()}

            {/* NOTE: 底部输入区 - 使用与搜索框一致的样式 */}
            <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-20 bg-background/80 backdrop-blur-2xl backdrop-saturate-150 border-t border-gray-100/50 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t.aiChat.placeholder}
                        disabled={isLoading}
                        className="flex-1 h-10 px-4 bg-[#e8e6e1] rounded-xl text-sm text-textMain font-sans
                           placeholder:text-[#8a8470] border-0
                           focus:ring-2 focus:ring-oldGold/50 focus:bg-white
                           transition-all duration-200 disabled:opacity-50"
                    />
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isLoading}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-200 ${inputValue.trim() && !isLoading
                                ? 'bg-oldGold text-white shadow-lg shadow-oldGold/30'
                                : 'bg-[#e8e6e1] text-[#8a8470]'
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
