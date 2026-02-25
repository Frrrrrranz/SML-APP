import React from 'react';
import { Library, Search, Settings, Sparkles, Cloud } from 'lucide-react';
import { NavItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPath, onNavigate }) => {
  const { t } = useLanguage();

  const navItems: NavItem[] = [
    { id: 'composers', label: t.navigation.composers, icon: Library, path: '/' },
    { id: 'search', label: t.navigation.search, icon: Search, path: '/search' },
    { id: 'cloud', label: t.navigation.cloud, icon: Cloud, path: '/cloud' },
    { id: 'ai-chat', label: t.navigation.aiChat, icon: Sparkles, path: '/ai-chat' },
    { id: 'settings', label: t.navigation.settings, icon: Settings, path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px] border-t border-gray-200 bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          // Simple active check: strictly equal or (for root) strictly root
          const isActive =
            item.path === '/'
              ? currentPath === '/' || currentPath.startsWith('/composer')
              : currentPath.startsWith(item.path);

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.path)}
              className="group flex flex-1 flex-col items-center justify-center gap-1 focus:outline-none"
            >
              <item.icon
                strokeWidth={isActive ? 2.5 : 2}
                className={`h-6 w-6 transition-colors duration-200 ${isActive ? 'text-oldGold' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
              />
              <span
                className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${isActive ? 'text-oldGold' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};