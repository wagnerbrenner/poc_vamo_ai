import React, { useState } from 'react';
import { 
  X, Navigation, MapPin, Compass, Car, Footprints, 
  ExternalLink, Copy, Check, Smartphone, Globe 
} from 'lucide-react';
import { PlaceItem } from '../types';
import { sound, haptic } from '../utils/audioHaptics';

interface NavigationOptionsModalProps {
  place: PlaceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NavigationOptionsModal: React.FC<NavigationOptionsModalProps> = ({
  place,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !place) return null;

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleOpenGoogleMaps = (mode: 'app' | 'web') => {
    sound.tap();
    haptic.medium();
    const destination = `${place.lat},${place.lng}`;
    const destinationName = encodeURIComponent(place.title);
    
    if (mode === 'app' && isMobile) {
      // Direct Maps intent for mobile app
      const mapsAppUrl = `geo:${place.lat},${place.lng}?q=${place.lat},${place.lng}(${destinationName})`;
      window.location.href = mapsAppUrl;
      setTimeout(() => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${destinationName}`, '_blank');
      }, 700);
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${destinationName}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const handleOpenWaze = (mode: 'app' | 'web') => {
    sound.tap();
    haptic.medium();
    if (mode === 'app' && isMobile) {
      // Native app scheme for Waze with fallback
      const nativeScheme = `waze://?ll=${place.lat},${place.lng}&navigate=yes`;
      const fallbackWeb = `https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`;
      
      const start = Date.now();
      window.location.href = nativeScheme;
      setTimeout(() => {
        // If user is still on page after 1.5s, app probably not installed -> open universal web link
        if (Date.now() - start < 2000) {
          window.open(fallbackWeb, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    } else {
      const wazeUrl = `https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`;
      window.open(wazeUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const handleCopyAddress = () => {
    sound.pop();
    haptic.success();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${place.title} - ${place.address}`).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#D4FF3A]/20 flex items-center justify-center text-[#D4FF3A]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-unbounded font-black text-sm text-white">
                Como deseja ir?
              </h3>
              <p className="text-[11px] text-white/60 truncate max-w-[200px]">
                {place.title}
              </p>
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

        {/* Place Quick Travel Stats */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-white/80">
          <div className="flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-[#D4FF3A]" />
            <span>~{place.walkingMinutes || 12} min a pé</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>~{place.drivingMinutes || 8} min de carro</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="text-[#FFA36C] font-semibold">
            {place.distanceKm} km
          </div>
        </div>

        <p className="text-xs text-white/60 leading-relaxed px-1">
          {place.address}
        </p>

        {/* Navigation App Options with Smart Deep Linking */}
        <div className="space-y-2.5 pt-1">
          {/* Google Maps Option */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenGoogleMaps('app')}
              className="flex-1 p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-between shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-unbounded font-black text-xs block">
                    Google Maps
                  </span>
                  <span className="text-[10px] text-white/70">
                    {isMobile ? 'Abrir no App do Maps' : 'Melhor rota no Maps'}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>

            {isMobile && (
              <button
                onClick={() => handleOpenGoogleMaps('web')}
                title="Abrir via Navegador Web"
                className="w-12 h-[58px] rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="text-[9px] mt-0.5">Web</span>
              </button>
            )}
          </div>

          {/* Waze Option */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenWaze('app')}
              className="flex-1 p-3.5 rounded-2xl bg-gradient-to-r from-[#33ccff] to-[#0099ff] hover:from-[#47d1ff] hover:to-[#1aa3ff] text-[#14102E] flex items-center justify-between shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center">
                  <Navigation className="w-4 h-4 fill-[#14102E] text-[#14102E]" />
                </div>
                <div className="text-left">
                  <span className="font-unbounded font-black text-xs block">
                    Waze
                  </span>
                  <span className="text-[10px] text-[#14102E]/80 font-medium">
                    {isMobile ? 'Detectar App ou Web' : 'Trânsito em tempo real'}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>

            {isMobile && (
              <button
                onClick={() => handleOpenWaze('web')}
                title="Abrir Waze no Navegador"
                className="w-12 h-[58px] rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="text-[9px] mt-0.5">Web</span>
              </button>
            )}
          </div>

          {/* Copy Address for Uber / 99 */}
          <button
            onClick={handleCopyAddress}
            className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Endereço copiado! Cole no Uber / 99</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#D4FF3A]" />
                <span>Copiar endereço para o Uber / Táxi</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-white/40 text-center pt-1 font-sans">
          Detecção inteligente de aplicativo com fallback automático para a web.
        </p>
      </div>
    </div>
  );
};
