import React, { useState, useEffect } from 'react';
import { 
  Globe, Sparkles, Utensils, MessageSquare, ExternalLink, 
  Image as ImageIcon, Instagram, Flame, CheckCircle, RefreshCw,
  Clock, ShieldCheck, Check, Compass
} from 'lucide-react';
import { PlaceItem } from '../types';
import { sound, haptic } from '../utils/audioHaptics';

interface WebContentSectionProps {
  place: PlaceItem;
}

interface WebContentData {
  webSummary: string;
  popularDishes: string[];
  servicesFound?: string[];
  atmosphere?: string;
  bestTimeTip?: string;
  secretTip: string;
  socialBuzz: string;
  photoSearchUrl: string;
  instagramSearchUrl?: string;
  mapsSearchUrl?: string;
  source?: string;
}

export const WebContentSection: React.FC<WebContentSectionProps> = ({ place }) => {
  const [data, setData] = useState<WebContentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchWebContent = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch('/api/places/web-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeTitle: place.title,
          address: place.address,
          city: place.city,
          category: place.category,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        setData(json);
      } else {
        setError(true);
      }
    } catch (err) {
      console.warn('Error fetching web content:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebContent();
  }, [place.id, place.title]);

  const handleInstagramClick = (e: React.MouseEvent) => {
    e.preventDefault();
    sound.tap();
    haptic.light();
    const cleanHandle = place.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._]/g, '');
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try opening directly in Instagram native app
      window.location.href = `instagram://user?username=${cleanHandle}`;
      setTimeout(() => {
        const fallbackUrl = data?.instagramSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`${place.title} ${place.city} instagram perfil oficial fotos`)}`;
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }, 700);
    } else {
      const searchUrl = data?.instagramSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`${place.title} ${place.city} site:instagram.com`)}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const googleImagesUrl = data?.photoSearchUrl || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${place.title} ${place.city} restaurante fotos ambiente cardápio`)}`;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1b153d] to-[#14102E] border border-[#6A4CFF]/30 space-y-3.5 my-3 shadow-lg relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#6A4CFF]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Google Search Grounding badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#6A4CFF]/30 text-[#D4FF3A] flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-unbounded uppercase font-black tracking-wider text-[#D4FF3A] block">
                Google Search & Maps
              </span>
              <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                100% Real
              </span>
            </div>
            <h4 className="font-unbounded font-black text-xs text-white">
              Pesquisa Real na Web & Imagens
            </h4>
          </div>
        </div>

        <button
          onClick={() => {
            sound.tap();
            haptic.light();
            fetchWebContent();
          }}
          disabled={loading}
          className="text-white/50 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all disabled:opacity-40 cursor-pointer"
          title="Atualizar busca web em tempo real"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D4FF3A]' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
          <RefreshCw className="w-5 h-5 text-[#D4FF3A] animate-spin" />
          <p className="text-xs text-white/70 font-sans">
            Vasculhando fotos reais, serviços e avaliações na internet...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-3 text-left">
          {/* Web Summary */}
          <p className="text-xs text-white/90 font-sans leading-relaxed">
            {data.webSummary}
          </p>

          {/* Real Services & Amenities Found on the Web */}
          {data.servicesFound && data.servicesFound.length > 0 && (
            <div>
              <span className="text-[10px] font-unbounded uppercase font-bold text-[#D4FF3A] flex items-center gap-1 mb-1.5">
                <CheckCircle className="w-3 h-3 text-[#D4FF3A]" />
                <span>Serviços & comodidades identificados:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.servicesFound.map((service, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/10 flex items-center gap-1 font-medium"
                  >
                    <Check className="w-2.5 h-2.5 text-[#D4FF3A]" />
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Atmosphere Highlight */}
          {data.atmosphere && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/85 flex items-start gap-2">
              <Compass className="w-3.5 h-3.5 text-[#FFA36C] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#FFA36C] text-[10px] uppercase font-unbounded block">
                  Vibe do Salão & Ambiente:
                </span>
                <p className="text-[11px] mt-0.5 text-white/80">{data.atmosphere}</p>
              </div>
            </div>
          )}

          {/* Popular Dishes on the Web */}
          {data.popularDishes && data.popularDishes.length > 0 && (
            <div>
              <span className="text-[10px] font-unbounded uppercase font-bold text-[#FFA36C] flex items-center gap-1 mb-1.5">
                <Utensils className="w-3 h-3 text-[#FFA36C]" />
                <span>Mais comentados & fotografados online:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.popularDishes.map((dish, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/10 flex items-center gap-1 font-medium"
                  >
                    <Flame className="w-2.5 h-2.5 text-[#D4FF3A]" />
                    {dish}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Best Time Tip */}
          {data.bestTimeTip && (
            <div className="flex items-center gap-2 text-[11px] text-white/70">
              <Clock className="w-3 h-3 text-[#D4FF3A] shrink-0" />
              <span><strong>Horário sugerido:</strong> {data.bestTimeTip}</span>
            </div>
          )}

          {/* Golden Web Tip */}
          {data.secretTip && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/85 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4FF3A] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#D4FF3A] text-[10px] uppercase font-unbounded block">
                  Dica de ouro da internet:
                </span>
                <p className="text-[11px] mt-0.5">{data.secretTip}</p>
              </div>
            </div>
          )}

          {/* Social Buzz */}
          {data.socialBuzz && (
            <div className="text-[11px] text-white/60 italic flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-[#FF3D7F] shrink-0" />
              <span>"{data.socialBuzz}"</span>
            </div>
          )}

          {/* Internet Quick Links: Photos & Official Site */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
            <a
              href={googleImagesUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                sound.tap();
                haptic.medium();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#D4FF3A]/15 hover:bg-[#D4FF3A]/25 text-[#D4FF3A] border border-[#D4FF3A]/40 text-[11px] font-sans font-bold flex items-center gap-1.5 transition-colors"
            >
              <ImageIcon className="w-3 h-3 text-[#D4FF3A]" />
              <span>Ver Fotos no Google Imagens</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>

            <button
              onClick={handleInstagramClick}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-pink-200 text-[11px] font-sans font-bold flex items-center gap-1.5 border border-pink-400/30 transition-colors cursor-pointer active:scale-95"
            >
              <Instagram className="w-3 h-3 text-pink-300" />
              <span>Fotos no Instagram</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </button>

            {place.websiteUri && (
              <a
                href={place.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  sound.tap();
                  haptic.light();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#6A4CFF]/30 hover:bg-[#6A4CFF]/45 text-[#D4FF3A] text-[11px] font-sans font-bold flex items-center gap-1.5 border border-[#6A4CFF]/40 transition-colors"
              >
                <Globe className="w-3 h-3" />
                <span>Site Oficial</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-xs text-white/50">
          Não foi possível carregar o conteúdo adicional da web no momento.
        </div>
      )}
    </div>
  );
};

