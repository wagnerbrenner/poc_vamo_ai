import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Sparkles, Navigation, Search, Tag, Volume2, AlertCircle, Compass } from 'lucide-react';
import { useWebSpeech, VoiceCommandResult } from '../hooks/useWebSpeech';
import { sound, haptic } from '../utils/audioHaptics';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVoiceCommand: (result: VoiceCommandResult) => void;
  currentCityName?: string;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyVoiceCommand,
  currentCityName = 'sua cidade',
}) => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useWebSpeech();

  const [manualInput, setManualInput] = useState('');

  // Start speech recognition when opened
  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      setManualInput('');
      const timer = setTimeout(() => {
        startListening((cmd) => {
          // Auto-trigger command after a tiny delay so user sees what was recognized
          setTimeout(() => {
            onApplyVoiceCommand(cmd);
            onClose();
          }, 600);
        });
      }, 200);
      return () => clearTimeout(timer);
    } else {
      stopListening();
    }
  }, [isOpen, startListening, stopListening, resetTranscript, onApplyVoiceCommand, onClose]);

  if (!isOpen) return null;

  const currentDisplay = interimTranscript || transcript;

  const handleSuggestionClick = (phrase: string) => {
    sound.tap();
    haptic.medium();
    const command = { rawText: phrase, cleanQuery: phrase, action: 'search' as const };
    onApplyVoiceCommand(command);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    sound.tap();
    haptic.medium();
    onApplyVoiceCommand({ rawText: manualInput.trim(), cleanQuery: manualInput.trim(), action: 'search' });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="w-full sm:max-w-md bg-[#14102E] border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
        >
          {/* Ambient background glow */}
          <div className="absolute top-0 -left-20 w-48 h-48 bg-[#D4FF3A]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -right-20 w-48 h-48 bg-[#FF3D7F]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => {
              sound.tap();
              stopListening();
              onClose();
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4FF3A]/10 border border-[#D4FF3A]/30 text-[#D4FF3A] text-xs font-unbounded font-black mb-4">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Pesquisa por Voz (Mãos Livres)</span>
          </div>

          <h3 className="font-unbounded font-black text-xl text-white tracking-tight mb-1">
            Fale o que você quer
          </h3>
          <p className="text-xs text-white/60 mb-6">
            Em {currentCityName}: peça um prato, vibe, lugar ou com quem você vai
          </p>

          {/* Pulsing Visualizer Mic Button */}
          <div className="relative my-4 flex items-center justify-center">
            {isListening && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.45, 1], opacity: [0.5, 0.1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  className="w-28 h-28 rounded-full bg-[#D4FF3A]/20 absolute"
                />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.2, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  className="w-24 h-24 rounded-full bg-[#FF3D7F]/30 absolute"
                />
              </>
            )}

            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening((cmd) => {
                    setTimeout(() => {
                      onApplyVoiceCommand(cmd);
                      onClose();
                    }, 500);
                  });
                }
              }}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all z-10 cursor-pointer active:scale-95 ${
                isListening
                  ? 'bg-[#D4FF3A] text-[#14102E] shadow-[0_0_30px_rgba(212,255,58,0.6)]'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 animate-pulse" />
              ) : (
                <MicOff className="w-8 h-8 text-white/60" />
              )}
            </button>
          </div>

          {/* Status Label */}
          <div className="h-6 flex items-center justify-center mb-2">
            {isListening ? (
              <span className="text-xs font-unbounded font-bold text-[#D4FF3A] flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#D4FF3A]" />
                Ouvindo agora... Fale naturalmente
              </span>
            ) : error ? (
              <span className="text-xs text-rose-300 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </span>
            ) : (
              <span className="text-xs text-white/50">
                Toque no microfone para falar novamente
              </span>
            )}
          </div>

          {/* Live Transcript Bubble */}
          <div className="w-full min-h-[56px] p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-center mb-5">
            {currentDisplay ? (
              <p className="font-unbounded font-bold text-sm text-white leading-snug">
                “{currentDisplay}”
              </p>
            ) : (
              <p className="text-xs text-white/40 italic">
                Ex: “date romântico no jantar”, “teatro com ingressos”, “onde cortar cabelo”
              </p>
            )}
          </div>

          {/* Quick Voice Shortcut Chips */}
          <div className="w-full text-left mb-4">
            <span className="text-[10px] font-unbounded uppercase font-bold text-white/50 mb-2 block">
              Comandos e atalhos rápidos:
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {[
                { label: '🥂 Date romântico', q: 'date romântico' },
                { label: '🍻 Barzinho com amigos', q: 'barzinho com amigos' },
                { label: '🎭 Peça de teatro & shows', q: 'teatro com ingressos' },
                { label: '✂️ Barbearia ou salão', q: 'barbearia e salão de beleza' },
                { label: '🏋️ Academia & treino', q: 'academia fitness' },
                { label: '🏷️ Ver cupons', q: 'ver cupons com desconto' },
                { label: '🗺️ Abrir mapa', q: 'abrir mapa' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSuggestionClick(chip.q)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-white/80 transition-all font-medium active:scale-95 cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual text search fallback */}
          <form onSubmit={handleManualSubmit} className="w-full flex items-center gap-2 mt-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ou digite o que procura..."
                className="w-full py-2.5 px-3 pl-8 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D4FF3A]"
              />
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="py-2.5 px-3 rounded-xl bg-[#D4FF3A] disabled:opacity-40 text-[#14102E] font-unbounded font-black text-xs active:scale-95 transition-all cursor-pointer"
            >
              Buscar
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
