import React from 'react';
import { WifiOff, Database, CheckCircle2, RefreshCw } from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

interface OfflineIndicatorProps {
  lastSyncTime?: string | null;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lastSyncTime }) => {
  const { effectiveOffline, isSimulatedOffline, toggleSimulateOffline } = useNetwork();

  if (!effectiveOffline) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200 backdrop-blur-md shrink-0 z-40 animate-in fade-in">
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="font-semibold text-[11px]">
          Modo Offline · Visualizando cache do AsyncStorage
        </span>
      </div>

      <div className="flex items-center gap-2">
        {lastSyncTime && (
          <span className="text-[10px] text-amber-300/70 hidden sm:inline">
            Sincronizado {new Date(lastSyncTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={toggleSimulateOffline}
          className="px-2 py-0.5 rounded-full bg-amber-400 text-[#14102E] font-bold text-[10px] hover:bg-amber-300"
          title="Alternar simulação de conexão"
        >
          {isSimulatedOffline ? 'Reconectar' : 'Simular Offline'}
        </button>
      </div>
    </div>
  );
};
