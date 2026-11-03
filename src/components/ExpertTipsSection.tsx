import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Utensils, Clock, KeyRound, Users, 
  Quote, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, Zap 
} from 'lucide-react';
import { PlaceItem } from '../types';
import { sound } from '../utils/audioHaptics';

interface ExpertTips {
  bestTime: string;
  mustOrderDish: string;
  secretTip: string;
  companionVibe: string;
  curatorComment: string;
  source?: string;
}

interface ExpertTipsSectionProps {
  place: PlaceItem;
}

// In-memory cache across modals
const tipsCache: Record<string, ExpertTips> = {};

export const ExpertTipsSection: React.FC<ExpertTipsSectionProps> = ({ place }) => {
  const [tips, setTips] = useState<ExpertTips | null>(tipsCache[place.id] || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchTips = async (forceRefresh = false) => {
    if (!forceRefresh && tipsCache[place.id]) {
      setTips(tipsCache[place.id]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/expert-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeTitle: place.title,
          category: place.categoryLabel,
          neighborhood: place.neighborhood,
          currentEvent: place.currentEvent,
          motivoAgora: place.motivoAgora,
          suitableFor: place.suitableFor,
          priceLevel: place.priceLevel,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao consultar curadoria de IA');
      }

      const data = await res.json();
      tipsCache[place.id] = data;
      setTips(data);
    } catch (err) {
      console.warn('Erro ao carregar dicas da IA, usando fallback inteligente:', err);
      // Fallback local caso o backend demore ou esteja em offline mode
      const fallbackTips: ExpertTips = {
        bestTime: `Chegue até as ${place.closingTimeToday.split(':')[0] ? Number(place.closingTimeToday.split(':')[0]) - 3 : '20'}h para pegar mesas confortáveis sem fila.`,
        mustOrderDish: place.category === 'restaurantes' 
          ? 'O prato do chef com risoto ou massa artesanal e sobremesa com chocolate.'
          : place.category === 'bares' 
          ? 'O coquetel autoral da casa no balcão e porção de petiscos crocantes.'
          : 'O serviço completo com atendimento premium e bebidas cortesia.',
        secretTip: 'Pergunte ao garçom ou barista sobre os especiais fora da carta.',
        companionVibe: `Perfeito para ${place.suitableFor.join(' ou ')} aproveitarem a vibe ${place.vibes[0] || 'gastronomia'}.`,
        curatorComment: `O ${place.title} é uma das recomendações mais sólidas do vamo.AI. Bora nessa!`,
        source: 'curator_preset',
      };
      setTips(fallbackTips);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tipsCache[place.id]) {
      fetchTips();
    } else {
      setTips(tipsCache[place.id]);
    }
  }, [place.id]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.tap();
    fetchTips(true);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#21164e] via-[#1b153d] to-[#14102E] border border-[#6A4CFF]/40 shadow-xl overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6A4CFF] to-[#FF3D7F] flex items-center justify-center text-[#D4FF3A] shadow-[0_0_15px_rgba(106,76,255,0.4)] shrink-0">
            <Sparkles className="w-5 h-5 fill-current animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-unbounded font-black text-sm text-white">
                Dicas de Especialistas
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#D4FF3A] text-[#14102E] font-black text-[9px] uppercase tracking-wider font-unbounded">
                IA vamo.AI
              </span>
            </div>
            <p className="text-xs text-white/70 font-sans mt-0.5">
              Recomendações de amigo local para aproveitar ao máximo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-[#D4FF3A] transition-all disabled:opacity-50"
            title="Atualizar dicas com IA"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D4FF3A]' : ''}`} />
          </button>

          <button className="text-white/60 hover:text-white">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {loading && !tips ? (
            /* Shimmer Skeleton */
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-white/10 rounded-lg w-3/4" />
              <div className="h-16 bg-white/5 rounded-2xl w-full" />
              <div className="h-16 bg-white/5 rounded-2xl w-full" />
              <div className="h-12 bg-white/5 rounded-2xl w-full" />
            </div>
          ) : tips ? (
            <div className="space-y-3.5">
              {/* 1. O que pedir sem erro */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFA36C]/20 text-[#FFA36C] flex items-center justify-center shrink-0 mt-0.5">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-unbounded font-bold text-[#FFA36C] uppercase tracking-wider block">
                    O que pedir sem erro:
                  </span>
                  <p className="text-xs text-white/95 font-sans leading-relaxed mt-0.5">
                    {tips.mustOrderDish}
                  </p>
                </div>
              </div>

              {/* 2. Melhor horário & lugar no salão */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#D4FF3A]/20 text-[#D4FF3A] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-unbounded font-bold text-[#D4FF3A] uppercase tracking-wider block">
                    Melhor horário & Mesa:
                  </span>
                  <p className="text-xs text-white/95 font-sans leading-relaxed mt-0.5">
                    {tips.bestTime}
                  </p>
                </div>
              </div>

              {/* 3. Segredo de Frequentador */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FF3D7F]/20 text-[#FF3D7F] flex items-center justify-center shrink-0 mt-0.5">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-unbounded font-bold text-[#FF3D7F] uppercase tracking-wider block">
                    Segredo de Frequentador:
                  </span>
                  <p className="text-xs text-white/95 font-sans leading-relaxed mt-0.5">
                    {tips.secretTip}
                  </p>
                </div>
              </div>

              {/* 4. Companhia & Vibe ideal */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#6A4CFF]/30 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-unbounded font-bold text-purple-300 uppercase tracking-wider block">
                    Com quem combina mais:
                  </span>
                  <p className="text-xs text-white/95 font-sans leading-relaxed mt-0.5">
                    {tips.companionVibe}
                  </p>
                </div>
              </div>

              {/* 5. Veredito do Curador Local (Tom do vamo.AI) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#D4FF3A]/15 border border-[#D4FF3A]/30 flex items-start gap-3">
                <Quote className="w-5 h-5 text-[#D4FF3A] shrink-0 mt-0.5 rotate-180" />
                <div>
                  <span className="text-[10px] font-unbounded uppercase font-black tracking-wider text-[#D4FF3A] block mb-0.5">
                    Palavra do Amigo Local:
                  </span>
                  <p className="text-xs text-white font-sans italic leading-relaxed">
                    “{tips.curatorComment}”
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
