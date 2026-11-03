import React from 'react';
import { Sun, Sunset, Moon, Coffee, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { TimeOfDayTheme } from '../types';
import { sound } from '../utils/audioHaptics';

export const TimeOfDayPicker: React.FC = () => {
  const { theme, setTheme, isAuto, setIsAuto } = useTheme();

  const options: { id: TimeOfDayTheme; label: string; icon: React.ReactNode; period: string }[] = [
    { id: 'manha', label: 'Manhã', icon: <Coffee className="w-3.5 h-3.5" />, period: '06h–12h' },
    { id: 'tarde', label: 'Tarde', icon: <Sun className="w-3.5 h-3.5" />, period: '12h–17h' },
    { id: 'pordosol', label: 'Pôr do sol', icon: <Sunset className="w-3.5 h-3.5" />, period: '17h–19h' },
    { id: 'noite', label: 'Noite', icon: <Moon className="w-3.5 h-3.5" />, period: '19h+' },
  ];

  const handleSelect = (t: TimeOfDayTheme) => {
    sound.tap();
    setTheme(t);
  };

  const handleAutoToggle = () => {
    sound.tap();
    setIsAuto(!isAuto);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20 backdrop-blur-md">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {options.map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium transition-all whitespace-nowrap ${
                active
                  ? 'bg-white text-[#14102E] font-bold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleAutoToggle}
        className={`ml-2 px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all shrink-0 ${
          isAuto 
            ? 'bg-[#D4FF3A]/20 text-[#D4FF3A] border border-[#D4FF3A]/40' 
            : 'text-white/50 hover:text-white border border-white/10'
        }`}
        title="Sincronizar com o horário real"
      >
        <Sparkles className="w-2.5 h-2.5" />
        <span>Auto</span>
      </button>
    </div>
  );
};
