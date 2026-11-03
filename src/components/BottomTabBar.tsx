import React from 'react';
import { motion } from 'motion/react';
import { Compass, Sparkles, Map, Bookmark, MessageSquareText } from 'lucide-react';
import { sound } from '../utils/audioHaptics';

export type MainTabType = 'agora' | 'explorar' | 'chat' | 'mapa' | 'guardados';

interface BottomTabBarProps {
  currentTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  savedCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
  savedCount,
}) => {
  const tabs: { id: MainTabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'agora', label: 'Agora', icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'explorar', label: 'Explorar', icon: <Compass className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'chat', label: 'Chat IA', icon: <MessageSquareText className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4FF3A]" /> },
    { id: 'mapa', label: 'Mapa', icon: <Map className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'guardados', label: 'Guardados', icon: <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />, badge: savedCount },
  ];

  return (
    <nav className="shrink-0 bg-[#14102E]/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 z-40">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                sound.tap();
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl select-none transition-colors duration-200 cursor-pointer ${
                isActive
                  ? 'text-[#D4FF3A] font-bold'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {/* Active Tab Sliding Glow Backdrop (Reanimated / Fluid style) */}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-white/10 rounded-2xl -z-10 shadow-[0_0_15px_rgba(212,255,58,0.2)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative">
                <motion.div
                  animate={isActive ? { scale: [1, 1.18, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {tab.icon}
                </motion.div>

                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-[#FF3D7F] text-white text-[9px] font-black rounded-full min-w-[16px] text-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] font-sans tracking-tight">
                {tab.label}
              </span>

              {/* Active indicator dot/bar */}
              {isActive && (
                <motion.span
                  layoutId="activeTabUnderline"
                  className="absolute -bottom-1 w-5 h-1 bg-[#D4FF3A] rounded-full shadow-[0_0_8px_#D4FF3A]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
