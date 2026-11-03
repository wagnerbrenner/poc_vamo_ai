import React, { useState, useEffect } from 'react';
import { MapPin, Locate, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { sound, haptic } from '../utils/audioHaptics';

interface InitialLocationModalProps {
  onOpenManualPicker: () => void;
}

const STORAGE_KEY = '@vamo_ai:location_permission_prompted';

export const InitialLocationModal: React.FC<InitialLocationModalProps> = ({ onOpenManualPicker }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { requestGpsLocation, gpsLoading } = useLocation();

  useEffect(() => {
    const hasPrompted = localStorage.getItem(STORAGE_KEY);
    if (!hasPrompted) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllowGps = () => {
    sound.tap();
    haptic.medium();
    localStorage.setItem(STORAGE_KEY, 'granted');
    requestGpsLocation((resolvedCity) => {
      haptic.success();
      setIsOpen(false);
    });
  };

  const handleManualChoice = () => {
    sound.tap();
    localStorage.setItem(STORAGE_KEY, 'manual');
    setIsOpen(false);
    onOpenManualPicker();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#14102E] border border-white/20 rounded-[32px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center relative overflow-hidden">
        {/* Glow background accent */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#6A4CFF]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[#D4FF3A]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#6A4CFF] via-[#FF3D7F] to-[#D4FF3A] p-0.5 shadow-[0_10px_25px_rgba(106,76,255,0.4)] mb-4">
          <div className="w-full h-full bg-[#14102E] rounded-[22px] flex items-center justify-center">
            <MapPin className="w-8 h-8 text-[#D4FF3A] animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-widest block mb-1">
          Boas-vindas ao vamo.AI
        </span>
        <h2 className="font-unbounded font-black text-2xl text-white mb-2 leading-tight">
          O melhor da sua cidade, pra agora.
        </h2>
        <p className="text-xs text-white/70 font-sans leading-relaxed mb-6">
          Para descobrirmos os melhores rolês abertos hoje, cupons de parceiros locais e o clima ao vivo, precisamos saber em qual cidade você está.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleAllowGps}
            disabled={gpsLoading}
            className="w-full py-4 px-5 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(212,255,58,0.35)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Locate className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Identificando sua cidade...' : 'Ativar Minha Cidade (GPS)'}</span>
          </button>

          <button
            onClick={handleManualChoice}
            className="w-full py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white/90 font-unbounded font-bold text-xs flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <span>Escolher Cidade na Lista</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/40 mt-5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sua localização é usada apenas para mostrar opções perto de você.</span>
        </div>
      </div>
    </div>
  );
};
