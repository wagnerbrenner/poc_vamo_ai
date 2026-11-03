import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound } from '../utils/audioHaptics';

interface NetworkContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOffline: boolean;
  toggleSimulateOffline: () => void;
}

const NetworkContext = createContext<NetworkContextType>({} as NetworkContextType);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSimulateOffline = () => {
    sound.tap();
    setIsSimulatedOffline(prev => !prev);
  };

  const effectiveOffline = !isOnline || isSimulatedOffline;

  return (
    <NetworkContext.Provider value={{
      isOnline,
      isSimulatedOffline,
      effectiveOffline,
      toggleSimulateOffline,
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
