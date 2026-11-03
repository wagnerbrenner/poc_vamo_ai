import { X, Volume2, Sparkles, Moon, Sun, Info, Heart, Smartphone, Bell, CloudRain, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useBatterySaver } from '../context/BatterySaverContext';
import { sound } from '../utils/audioHaptics';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestWeatherAlert?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onTestWeatherAlert,
}) => {
  const { theme, setTheme, isAuto, setIsAuto } = useTheme();
  const { isBatterySaver, toggleBatterySaver } = useBatterySaver();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <h2 className="font-unbounded font-black text-lg text-white">
            Configurações & Sobre
          </h2>
          <button
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 overflow-y-auto no-scrollbar">
          {/* Modo Economia de Energia */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isBatterySaver ? 'bg-amber-400 text-[#14102E]' : 'bg-white/10 text-white'
              }`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">
                  Modo Economia de Bateria
                </span>
                <span className="text-[11px] text-white/60">
                  Reduz GPS e chamadas de clima em saídas longas
                </span>
              </div>
            </div>

            <button
              onClick={toggleBatterySaver}
              className={`px-3.5 py-1.5 rounded-full font-unbounded font-black text-xs transition-all ${
                isBatterySaver
                  ? 'bg-amber-400 text-[#14102E] shadow-md'
                  : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              {isBatterySaver ? 'Ativo ⚡' : 'Desativado'}
            </button>
          </div>
          {/* Brand Concept: A cor do agora */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4FF3A]" />
              <span className="font-unbounded font-bold text-xs text-white">
                Conceito: A cor do agora
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed font-sans">
              A marca do vamo.AI acompanha o momento do seu dia: a mesma pergunta ganha uma luz diferente às 10h da manhã e às 22h da noite.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {[
                { id: 'manha', label: '06h–12h Manhã', sub: 'Café, trilha, mirante' },
                { id: 'tarde', label: '12h–17h Tarde', sub: 'Almoço, passeio, parque' },
                { id: 'pordosol', label: '17h–19h Pôr do Sol', sub: 'Orla, rooftop, drinque' },
                { id: 'noite', label: '19h+ Noite', sub: 'Jantar, música, balada' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    sound.tap();
                    setTheme(item.id as any);
                  }}
                  className={`p-2 rounded-xl text-left border transition-all text-xs ${
                    theme === item.id
                      ? 'bg-[#D4FF3A] text-[#14102E] font-bold border-[#D4FF3A]'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <span className="block font-bold">{item.label}</span>
                  <span className="text-[10px] opacity-75">{item.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Haptics test */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#D4FF3A]">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">
                  Feedback Tátil & Sonoro
                </span>
                <span className="text-[11px] text-white/60">
                  Sons sintéticos de toques e cliques
                </span>
              </div>
            </div>

            <button
              onClick={() => sound.success()}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#D4FF3A] font-bold text-xs"
            >
              Testar som
            </button>
          </div>

          {/* FCM Push Notifications (O clima mudou) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#FF3D7F]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block flex items-center gap-1.5">
                  Notificações FCM de Clima
                  <CloudRain className="w-3.5 h-3.5 text-[#38bdf8]" />
                </span>
                <span className="text-[11px] text-white/60">
                  Alerta inteligente quando o tempo muda no seu rolê
                </span>
              </div>
            </div>

            {onTestWeatherAlert && (
              <button
                onClick={() => {
                  sound.tap();
                  onTestWeatherAlert();
                }}
                className="px-3 py-1.5 rounded-full bg-[#FF3D7F]/20 hover:bg-[#FF3D7F]/30 text-[#FF3D7F] font-bold text-xs shrink-0"
              >
                Testar alerta
              </button>
            )}
          </div>

          {/* Brand Manifesto (Page 02 & 03 do Manual) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#FF3D7F]/20 border border-white/10 space-y-2">
            <span className="text-[10px] font-unbounded text-[#FFA36C] font-black uppercase tracking-wider block">
              Manifesto vamo.AI
            </span>
            <p className="text-xs text-white/90 italic font-sans leading-relaxed">
              “Do ‘o que a gente faz?’ ao ‘vamo!’ em segundos. Entende hora, companhia, bolso e vibe, e entrega as três opções certas pra agora.”
            </p>
            <span className="text-[10px] text-white/50 block font-sans">
              Identidade Visual 2026 · vamo.AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
