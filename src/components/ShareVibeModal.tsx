import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { 
  X, Share2, Download, MessageCircle, Sparkles, 
  MapPin, Star, Heart, Check, Loader2, Copy 
} from 'lucide-react';
import { PlaceItem, OutingPlanSession } from '../types';
import { sound } from '../utils/audioHaptics';

interface ShareVibeModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: PlaceItem;
  session: OutingPlanSession;
}

export const ShareVibeModal: React.FC<ShareVibeModalProps> = ({
  isOpen,
  onClose,
  place,
  session,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const vibeLabels: Record<string, string> = {
    gastronomia: 'Alta Gastronomia',
    drinques: 'Coquetelaria & Drinques',
    agito: 'Samba & Balada',
    relax: 'Café & Brunch Tranquilo',
    estilo: 'Estilo & Cuidados',
    arlivre: 'Ao Ar Livre & Rooftop',
  };

  const withWhomLabels: Record<string, string> = {
    casal: 'Date a dois',
    amigos: 'Galera & Amigos',
    sozinho: 'Solo / Descoberta',
    familia: 'Família',
    trabalho: 'Afterwork',
  };

  const vibeLabel = vibeLabels[session.vibe] || session.vibe;
  const companionLabel = withWhomLabels[session.withWhom] || session.withWhom;

  const handleCaptureCard = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    setIsGenerating(true);
    sound.tap();

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#14102E',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedImageUrl(dataUrl);
      setIsGenerating(false);
      sound.success();
      return dataUrl;
    } catch (err) {
      console.warn('Error generating card image with html2canvas:', err);
      setIsGenerating(false);
      return null;
    }
  };

  const handleDownloadImage = async () => {
    let url = generatedImageUrl;
    if (!url) {
      url = await handleCaptureCard();
    }
    if (!url) return;

    const link = document.createElement('a');
    link.download = `vamo-ai-${place.title.toLowerCase().replace(/\s+/g, '-')}-vibe.png`;
    link.href = url;
    link.click();
    sound.pop();
  };

  const handleNativeShare = async () => {
    sound.tap();
    const shareText = `Bora pro ${place.title}? Escolhi no vamo.AI na vibe ${vibeLabel} (${companionLabel})! ${place.address}`;

    let url = generatedImageUrl;
    if (!url) {
      url = await handleCaptureCard();
    }

    if (url && navigator.canShare) {
      try {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], 'vibe-vamo-ai.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Bora pro ${place.title}?`,
            text: shareText,
            files: [file],
          });
          return;
        }
      } catch (e) {
        console.warn('Native share with file failed, falling back to text:', e);
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bora pro ${place.title}?`,
          text: shareText,
          url: window.location.href,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      // Fallback: WhatsApp link
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShareWhatsApp = () => {
    sound.tap();
    const shareText = `E aí, bora? Escolhi o rolê no vamo.AI! 🚀\n\n📍 *${place.title}*\n✨ Vibe: ${vibeLabel} (${companionLabel})\n🌟 Nota: ${place.rating}★\n💬 "${place.motivoAgora}"\n🏠 ${place.address}\n\nBora com a gente?`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    sound.pop();
    navigator.clipboard.writeText(
      `https://vamo.ai/lugar/${place.id}?vibe=${encodeURIComponent(session.vibe)}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#14102E] border border-white/20 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#6A4CFF]/30 text-[#D4FF3A] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-wider block">
                Card para Amigos
              </span>
              <h3 className="font-unbounded font-black text-sm text-white">
                Compartilhar Vibe
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Shareable Visual Card (Target of html2canvas) */}
        <div className="py-4">
          <div
            ref={cardRef}
            className="w-full rounded-2xl bg-gradient-to-b from-[#21164e] via-[#181335] to-[#14102E] p-4 border border-[#6A4CFF]/50 shadow-[0_12px_40px_rgba(106,76,255,0.3)] relative overflow-hidden"
          >
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF3D7F]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4FF3A]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Brand Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4FF3A] animate-pulse" />
                <span className="font-unbounded font-black text-xs text-white tracking-wider">
                  vamo<span className="text-[#D4FF3A]">.AI</span>
                </span>
              </div>
              <span className="text-[9px] font-unbounded uppercase font-black px-2 py-0.5 rounded-full bg-[#FF3D7F]/20 text-[#FF3D7F] border border-[#FF3D7F]/30">
                Rolê Escolhido
              </span>
            </div>

            {/* Main Place Photo */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 border border-white/10">
              <img
                src={place.imageUrl}
                alt={place.title}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Vibe Badge */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-[10px] font-unbounded font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[#D4FF3A] border border-[#D4FF3A]/30">
                  {vibeLabel}
                </span>
                <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white/90">
                  {companionLabel}
                </span>
              </div>
            </div>

            {/* Place Details */}
            <div className="relative z-10 space-y-1.5">
              <div className="flex items-start justify-between gap-1">
                <h4 className="font-unbounded font-black text-base text-white leading-tight">
                  {place.title}
                </h4>
                <span className="text-xs font-bold text-white/90 shrink-0">
                  {place.priceLevel}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <span className="flex items-center gap-0.5 text-[#D4FF3A] font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  {place.rating}
                </span>
                <span>•</span>
                <span className="truncate">{place.neighborhood}</span>
              </div>

              {/* Signature Why-Go-Now Quote */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 mt-2">
                <span className="text-[9px] font-unbounded uppercase font-black text-[#FFA36C] block mb-0.5">
                  Por que vamos agora:
                </span>
                <p className="text-[11px] text-white/90 font-sans italic leading-snug">
                  “{place.motivoAgora}”
                </p>
              </div>

              {/* Call to action for friends */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                <div className="text-left">
                  <span className="font-unbounded font-black text-[11px] text-[#D4FF3A] block">
                    Bora com a gente?
                  </span>
                  <span className="text-[9px] text-white/50 block">
                    Escolha decidida em 3 toques
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#D4FF3A] text-[#14102E] flex items-center justify-center font-black text-xs font-unbounded shadow-md">
                  →
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNativeShare}
              disabled={isGenerating}
              className="py-3 px-3 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#14102E]" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Gerando...' : 'Compartilhar'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="py-3 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-unbounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>WhatsApp</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-sans font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#D4FF3A]" />
              <span>Baixar Imagem</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-sans font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 active:scale-95 transition-all"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-white/70" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
