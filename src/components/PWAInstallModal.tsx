import React from 'react';
import { Smartphone, Download, Share, PlusSquare, X, Check, ShieldCheck, Zap, Layers } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sound, haptic } from '../utils/audioHaptics';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstalled, isIOS, canPromptDirectly, installPWA } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    sound.tap();
    haptic.medium();
    if (canPromptDirectly) {
      const success = await installPWA();
      if (success) {
        sound.success();
        haptic.success();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4FF3A]/20 border border-[#D4FF3A]/30 flex items-center justify-center text-[#D4FF3A]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-wider block">
                Aplicativo Móvel
              </span>
              <h3 className="font-unbounded font-black text-base text-white">
                Instalar vamo.AI no Celular
              </h3>
            </div>
          </div>

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

        {/* Status / App Perks */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#FF3D7F]/15 border border-[#6A4CFF]/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-unbounded font-bold text-white">
            <Zap className="w-4 h-4 text-[#D4FF3A]" />
            <span>Experiência 100% de App Nativo</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-sans">
            Ao instalar, o vamo.AI fica na tela de início do seu celular, abre em tela cheia (sem barra de navegador), envia notificações de clima e funciona offline!
          </p>
        </div>

        {/* Installation Actions */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-center space-y-1.5 text-emerald-300">
            <div className="flex items-center justify-center gap-2 font-unbounded font-bold text-sm">
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
              <span>Aplicativo já instalado!</span>
            </div>
            <p className="text-xs text-emerald-200/80 font-sans">
              O vamo.AI já está na tela de início do seu dispositivo em modo standalone.
            </p>
          </div>
        ) : canPromptDirectly ? (
          /* Android / Chrome One-Tap Install */
          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full py-4 px-4 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(212,255,58,0.35)] active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 fill-current" />
              <span>Instalar Aplicativo Agora</span>
            </button>
            <p className="text-[11px] text-white/50 text-center font-sans">
              Instalação instantânea sem precisar passar pela loja ou baixar arquivos pesados.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Guide */
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-xs font-unbounded font-bold text-[#D4FF3A] block">
              Como instalar no iPhone / iPad:
            </span>
            <div className="space-y-2.5 text-xs text-white/85 font-sans">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#6A4CFF] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> (<Share className="w-3.5 h-3.5 inline mx-0.5 text-[#D4FF3A]" />) na barra inferior do Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#6A4CFF] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                <span>Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#D4FF3A]" />).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#6A4CFF] text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!</span>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop / Fallback */
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-white/80">
            <span className="font-unbounded font-bold text-[#D4FF3A] block">
              Instalação no Computador ou Celular:
            </span>
            <p>
              Abra este link no seu celular (Chrome ou Safari) ou clique no ícone de instalação (<Download className="w-3.5 h-3.5 inline text-[#D4FF3A]" />) na barra de endereços do seu navegador para fixar o vamo.AI como app na sua área de trabalho.
            </p>
          </div>
        )}

        {/* Technical Architecture Info: React + PWA + Capacitor */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-unbounded font-bold text-white/70">
            <Layers className="w-3.5 h-3.5 text-[#FF3D7F]" />
            <span>Sobre a Tecnologia deste App:</span>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed font-sans">
            Construído em <strong>React 19 + TypeScript + PWA</strong>. Para publicar nas lojas (Google Play e Apple App Store), o código é 100% compatível para ser empacotado via <strong>Capacitor</strong> ou portado para <strong>React Native</strong> sem reescrever as integrações de Firebase e mapas.
          </p>
        </div>
      </div>
    </div>
  );
};
