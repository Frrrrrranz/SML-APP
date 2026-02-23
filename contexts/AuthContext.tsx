import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '../types';
import {
    signUp as supabaseSignUp,
    signIn as supabaseSignIn,
    signOut as supabaseSignOut,
    getCurrentProfile,
    getSession,
    onAuthStateChange,
} from '../supabase';

// 认证上下文类型定义
interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, nickname: string) => Promise<{ needsVerification: boolean }>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 组件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // 初始化：检查现有 session
    useEffect(() => {
        const initAuth = async () => {
            try {
                const currentSession = await getSession();
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    const userProfile = await getCurrentProfile();
                    setProfile(userProfile);
                }
            } catch (error) {
                console.error('Failed to initialize auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // 监听认证状态变化
        const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
            console.log('Auth state changed:', event);
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
                // NOTE: 延迟获取 profile，等待触发器创建完成
                setTimeout(async () => {
                    const userProfile = await getCurrentProfile();
                    setProfile(userProfile);
                }, 500);
            } else {
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // 用户注册
    const signUp = async (email: string, password: string, nickname: string) => {
        const data = await supabaseSignUp(email, password, nickname);

        // NOTE: Supabase 邮箱验证模式下，注册后 user 存在但 session 为 null
        // 需要用户点击邮件中的验证链接后才能登录
        const needsVerification = data.user && !data.session;

        return { needsVerification: !!needsVerification };
    };

    // 用户登录
    const signIn = async (email: string, password: string) => {
        const data = await supabaseSignIn(email, password);
        setSession(data.session);
        setUser(data.user);

        if (data.user) {
            const userProfile = await getCurrentProfile();
            setProfile(userProfile);
        }
    };

    // 用户登出
    const signOut = async () => {
        await supabaseSignOut();
        setSession(null);
        setUser(null);
        setProfile(null);
    };

    // 刷新 Profile
    const refreshProfile = async () => {
        if (user) {
            const userProfile = await getCurrentProfile();
            setProfile(userProfile);
        }
    };

    const value: AuthContextType = {
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义 Hook：使用认证上下文
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
