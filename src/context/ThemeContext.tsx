import React, { createContext, useContext, useState, useEffect } from 'react';
import { TimeOfDayTheme } from '../types';

interface ThemeContextType {
  theme: TimeOfDayTheme;
  isAuto: boolean;
  setTheme: (t: TimeOfDayTheme) => void;
  setIsAuto: (auto: boolean) => void;
  themeConfig: {
    label: string;
    period: string;
    keywords: string;
    bgGradient: string;
    cardBorder: string;
    badgeBg: string;
    badgeText: string;
    accentColor: string;
  };
}

const THEME_DATA: Record<TimeOfDayTheme, ThemeContextType['themeConfig']> = {
  manha: {
    label: 'Manhã',
    period: '06h – 12h',
    keywords: 'Café, trilha, mirante',
    bgGradient: 'from-[#0e272a] via-[#164448] to-[#14102E]',
    cardBorder: 'border-emerald-400/30',
    badgeBg: 'bg-emerald-400/20',
    badgeText: 'text-emerald-300',
    accentColor: '#34d399',
  },
  tarde: {
    label: 'Tarde',
    period: '12h – 17h',
    keywords: 'Almoço, passeio, parque',
    bgGradient: 'from-[#381a0e] via-[#4d2516] to-[#14102E]',
    cardBorder: 'border-[#FFA36C]/40',
    badgeBg: 'bg-[#FFA36C]/20',
    badgeText: 'text-[#FFA36C]',
    accentColor: '#FFA36C',
  },
  pordosol: {
    label: 'Pôr do Sol',
    period: '17h – 19h',
    keywords: 'Orla, rooftop, drinque',
    bgGradient: 'from-[#4a1236] via-[#66184a] to-[#14102E]',
    cardBorder: 'border-[#FF3D7F]/40',
    badgeBg: 'bg-[#FF3D7F]/20',
    badgeText: 'text-[#FF3D7F]',
    accentColor: '#FF3D7F',
  },
  noite: {
    label: 'Noite',
    period: '19h em diante',
    keywords: 'Jantar, música, balada',
    bgGradient: 'from-[#14102E] via-[#241347] to-[#14102E]',
    cardBorder: 'border-[#6A4CFF]/40',
    badgeBg: 'bg-[#6A4CFF]/20',
    badgeText: 'text-[#D4FF3A]',
    accentColor: '#6A4CFF',
  },
};

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

function getAutomaticTheme(): TimeOfDayTheme {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'manha';
  if (hour >= 12 && hour < 17) return 'tarde';
  if (hour >= 17 && hour < 19) return 'pordosol';
  return 'noite';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuto, setIsAuto] = useState<boolean>(true);
  const [theme, setTheme] = useState<TimeOfDayTheme>(() => getAutomaticTheme());

  useEffect(() => {
    if (!isAuto) return;
    const interval = setInterval(() => {
      setTheme(getAutomaticTheme());
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuto]);

  return (
    <ThemeContext.Provider value={{
      theme,
      isAuto,
      setTheme: (t) => {
        setIsAuto(false);
        setTheme(t);
      },
      setIsAuto: (auto) => {
        setIsAuto(auto);
        if (auto) setTheme(getAutomaticTheme());
      },
      themeConfig: THEME_DATA[theme],
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
