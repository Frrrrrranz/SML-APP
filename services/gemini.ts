// 前端 Gemini API 服务模块
// NOTE: 通过 Supabase Edge Function 代理调用 Gemini API
// API Key 存储在 Supabase Secrets 中，前端完全不接触密钥

import { supabase } from '../supabase';

interface GeminiChatResponse {
    answer: string;
}

/**
 * 通过 Supabase Edge Function 向 Gemini AI 提问
 * @param question 用户的问题
 * @returns AI 的回答文本
 * @throws 当 API 调用失败时抛出错误
 */
export const askMusicQuestion = async (question: string): Promise<string> => {
    try {
        const { data, error } = await supabase.functions.invoke('gemini-chat', {
            body: { question },
        });

        // NOTE: 详细打印调试信息，方便排查 Edge Function 问题
        console.log('Edge Function response - data:', data, 'error:', error);

        if (error) {
            console.error('Edge Function invocation error:', error);
            throw new Error(`Edge Function error: ${error.message || JSON.stringify(error)}`);
        }

        // NOTE: supabase.functions.invoke 返回的 data 可能已经是解析后的对象
        // 如果 Edge Function 返回了 error 字段（业务错误），也需要处理
        if (data?.error) {
            console.error('Edge Function returned error:', data.error);
            throw new Error(data.error);
        }

        if (!data?.answer) {
            console.error('Unexpected response format:', data);
            throw new Error('Empty response from AI');
        }

        return data.answer;
    } catch (error) {
        console.error('askMusicQuestion failed:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred');
    }
};
