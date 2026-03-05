import React from 'react';
import { Library, Search, Settings, Sparkles, Cloud } from 'lucide-react';
import { NavItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * 桌面端侧边栏导航组件
 * NOTE: 仅在 Electron 桌面端使用，替代 BottomNav
 * 固定在左侧，宽度 220px，深色主题
 */

interface SideNavProps {
    currentPath: string;
    onNavigate: (path: string) => void;
}

export const SideNav: React.FC<SideNavProps> = ({ currentPath, onNavigate }) => {
    const { t } = useLanguage();

    const navItems: NavItem[] = [
        { id: 'composers', label: t.navigation.composers, icon: Library, path: '/' },
        { id: 'search', label: t.navigation.search, icon: Search, path: '/search' },
        { id: 'cloud', label: t.navigation.cloud, icon: Cloud, path: '/cloud' },
        { id: 'ai-chat', label: t.navigation.aiChat, icon: Sparkles, path: '/ai-chat' },
        { id: 'settings', label: t.navigation.settings, icon: Settings, path: '/settings' },
    ];

    return (
        <nav className="fixed left-0 top-0 z-50 h-full w-[220px] flex flex-col bg-[#1a1a2e] border-r border-[#2a2a4a]">
            {/* Logo 区域 */}
            <div className="flex items-center gap-3 px-5 py-6 border-b border-[#2a2a4a]">
                <img src="./logo.png" alt="SML" className="w-8 h-8 rounded" />
                <div>
                    <h1 className="text-white text-base font-bold tracking-wide">SML</h1>
                    <p className="text-gray-400 text-[10px]">Sheet Music Library</p>
                </div>
            </div>

            {/* 导航项 */}
            <div className="flex-1 flex flex-col gap-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive =
                        item.path === '/'
                            ? currentPath === '/' || currentPath.startsWith('/composer')
                            : currentPath.startsWith(item.path);

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.path)}
                            className={`
                                group flex items-center gap-3 px-3 py-2.5 rounded-lg
                                transition-all duration-200 text-left w-full
                                ${isActive
                                    ? 'bg-oldGold/15 text-oldGold'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }
                            `}
                        >
                            <item.icon
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-oldGold' : 'text-gray-500 group-hover:text-gray-300'
                                    }`}
                            />
                            <span className={`text-sm font-medium transition-colors duration-200 ${isActive ? 'text-oldGold' : ''
                                }`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 底部版本号 */}
            <div className="px-5 py-3 border-t border-[#2a2a4a]">
                <p className="text-gray-500 text-[10px]">Desktop v1.0.0</p>
            </div>
        </nav>
    );
};
