import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { sound, haptic } from '../utils/audioHaptics';

export interface SyncToastState {
  id: string;
  message: string;
  syncedCount: number;
}

interface SyncQueueToastProps {
  toast: SyncToastState | null;
  onDismiss: () => void;
}

export const SyncQueueToast: React.FC<SyncQueueToastProps> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (toast) {
      sound.success();
      haptic.success();
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast?.id]);

  if (!toast) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-4 right-4 z-[99] max-w-sm mx-auto"
      >
        <div className="p-3.5 rounded-2xl bg-[#14102E]/95 border border-emerald-400/40 shadow-[0_10px_30px_rgba(16,185,129,0.25)] backdrop-blur-md flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <Cloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-unbounded font-black text-xs text-emerald-300">
                  Conexão Restaurada!
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                  Sync ✓
                </span>
              </div>
              <p className="text-[11px] text-white/80 font-sans mt-0.5 leading-tight">
                {toast.message}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.tap();
              onDismiss();
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
