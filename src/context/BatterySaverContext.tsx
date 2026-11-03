import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound, haptic } from '../utils/audioHaptics';

interface BatterySaverContextType {
  isBatterySaver: boolean;
  toggleBatterySaver: () => void;
  weatherIntervalMs: number;
}

const STORAGE_KEY = '@vamo_ai:battery_saver_mode';

const BatterySaverContext = createContext<BatterySaverContextType>({} as BatterySaverContextType);

export const BatterySaverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBatterySaver, setIsBatterySaver] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleBatterySaver = () => {
    sound.tap();
    haptic.medium();
    setIsBatterySaver((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch (e) {
        console.warn('Could not store battery saver preference:', e);
      }
      return next;
    });
  };

  // When battery saver is active, check weather every 10 minutes instead of every 60s
  const weatherIntervalMs = isBatterySaver ? 600000 : 60000;

  return (
    <BatterySaverContext.Provider value={{
      isBatterySaver,
      toggleBatterySaver,
      weatherIntervalMs,
    }}>
      {children}
    </BatterySaverContext.Provider>
  );
};

export const useBatterySaver = () => useContext(BatterySaverContext);
