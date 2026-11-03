import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, BatteryCharging } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const [isMobileFrame, setIsMobileFrame] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const { themeConfig } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0818] flex flex-col items-center justify-start p-0 md:p-6 transition-colors duration-700">
      {/* Top Device Switcher Toolbar */}
      <header className="w-full max-w-5xl flex items-center justify-between px-4 py-2 mb-2 text-xs font-sans text-white/70">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#D4FF3A] animate-pulse"></span>
          <span className="font-semibold text-white/90">vamo.AI</span>
          <span className="text-white/40 hidden sm:inline">•</span>
          <span className="text-white/60 hidden sm:inline">Ambiente Expo / React Native Preview</span>
        </div>

        <div className="flex items-center gap-2 bg-[#1a1438] p-1 rounded-full border border-white/10">
          <button
            onClick={() => setIsMobileFrame(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              isMobileFrame
                ? 'bg-[#D4FF3A] text-[#14102E] font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Native</span>
          </button>
          <button
            onClick={() => setIsMobileFrame(false)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              !isMobileFrame
                ? 'bg-[#D4FF3A] text-[#14102E] font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Expandir Tela</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      {isMobileFrame ? (
        <div className="relative w-full max-w-[420px] h-[860px] max-h-[95vh] bg-[#14102E] rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(106,76,255,0.25)] border-[8px] border-[#251d4d] flex flex-col overflow-hidden transition-all duration-500 ring-1 ring-white/15">
          {/* Hardware Notch / Dynamic Island */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-7 pt-3 pb-1 pointer-events-none select-none text-white text-[12px] font-semibold">
            <span>{currentTime || '20:12'}</span>

            {/* Dynamic Pill Island */}
            <div className="w-24 h-5 bg-black/90 rounded-full flex items-center justify-center gap-2 border border-white/10 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-[#FF3D7F] animate-ping opacity-75"></span>
              <span className="text-[9px] font-unbounded text-[#D4FF3A]">vamo</span>
            </div>

            <div className="flex items-center gap-1.5 text-white/80">
              <span className="text-[10px] font-bold">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <BatteryCharging className="w-4 h-4 text-[#D4FF3A]" />
            </div>
          </div>

          {/* Device Screen Body */}
          <div className="flex-1 w-full h-full overflow-hidden flex flex-col pt-9 pb-4 relative">
            {children}
          </div>

          {/* iOS / Android Home Swipe Indicator Bar */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full pointer-events-none z-50"></div>
        </div>
      ) : (
        <div className="w-full max-w-5xl min-h-[85vh] bg-[#14102E] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative transition-all">
          {children}
        </div>
      )}
    </div>
  );
};
