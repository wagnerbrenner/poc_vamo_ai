import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Compass, Zap, MapPin, ChevronRight, RefreshCw, 
  Flame, Heart, CheckCircle2, ChevronDown, ChevronUp 
} from 'lucide-react';
import { SavedPlace, UserVisit, VibeDashboardData } from '../types';
import { sound, haptic } from '../utils/audioHaptics';

interface VibeDashboardProps {
  savedPlaces: SavedPlace[];
  userVisits: UserVisit[];
  city?: string;
  onQuickVibeSelect?: (vibe: string) => void;
  onExploreCategory?: (category: string) => void;
}

export const VibeDashboard: React.FC<VibeDashboardProps> = ({
  savedPlaces,
  userVisits,
  city = 'São Paulo',
  onQuickVibeSelect,
  onExploreCategory,
}) => {
  const [data, setData] = useState<VibeDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Combine latest 5 interactions (visits first, then saved places)
  const recentPlaces = React.useMemo(() => {
    const combined: any[] = [];
    userVisits.forEach(v => combined.push({
      title: v.placeTitle,
      category: v.placeCategory,
      notes: v.notes,
      vibe: v.vibe,
      timestamp: v.visitedAt,
    }));
    savedPlaces.forEach(s => combined.push({
      title: s.title,
      category: s.category,
      notes: s.notes || s.customTag,
      timestamp: s.savedAt,
    }));
    // Dedup by title
    const unique: any[] = [];
    const seen = new Set<string>();
    combined.forEach(item => {
      const key = item.title?.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique.slice(0, 5);
  }, [savedPlaces, userVisits]);

  const fetchVibeDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vibe-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentPlaces,
          city,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch (err) {
      console.warn('Error fetching VibeDashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVibeDashboard();
  }, [recentPlaces.length]);

  if (!data && !loading) return null;

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-[#1b153d]/90 via-[#181236]/95 to-[#14102E] border border-[#6A4CFF]/35 shadow-xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-md">
      {/* Decorative neon backdrops */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#D4FF3A]/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#FF3D7F]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6A4CFF] to-[#D4FF3A] p-[1px] flex items-center justify-center">
            <div className="w-full h-full bg-[#14102E] rounded-[11px] flex items-center justify-center text-[#D4FF3A]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-unbounded uppercase font-black tracking-wider text-[#D4FF3A]">
                VibeDashboard · Gemini AI
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#D4FF3A]/20 text-[#D4FF3A] font-bold">
                Radar Ativo
              </span>
            </div>
            <h3 className="font-unbounded font-black text-xs sm:text-sm text-white">
              Sua Vibe Atual
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              sound.tap();
              haptic.refresh();
              fetchVibeDashboard();
            }}
            disabled={loading}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all disabled:opacity-50"
            title="Recalcular sua Vibe com Gemini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              sound.tap();
              setIsExpanded(!isExpanded);
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
          <RefreshCw className="w-5 h-5 text-[#D4FF3A] animate-spin" />
          <p className="text-xs text-white/70 font-sans">
            Analisando seus últimos lugares salvos e visitas com Gemini...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-3 pt-3 relative z-10 text-left">
          {/* Archetype & Title */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF3D7F]/20 text-[#FF3D7F] border border-[#FF3D7F]/30 text-[10px] font-unbounded font-bold">
                {data.archetype}
              </span>
              <span className="text-[11px] text-white/60 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#FFA36C]" />
                <span>Energia {data.energyLevel} ({data.energyPercentage}%)</span>
              </span>
            </div>

            <h4 className="font-unbounded font-black text-sm sm:text-base text-white leading-tight">
              {data.userVibeTitle}
            </h4>

            <p className="text-xs text-white/85 font-sans leading-relaxed mt-1.5">
              “{data.summary}”
            </p>
          </div>

          {/* Energy Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#6A4CFF] via-[#FF3D7F] to-[#D4FF3A] h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(20, Math.min(100, data.energyPercentage))}%` }}
            />
          </div>

          {/* Favorite Vibe Tags */}
          {data.favoriteVibes && data.favoriteVibes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {data.favoriteVibes.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/80 text-[10px] font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Expandable Section: Future Check-in Suggestions */}
          {isExpanded && data.futureCheckinSuggestions && data.futureCheckinSuggestions.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-unbounded uppercase font-black tracking-wider text-[#FFA36C] flex items-center gap-1">
                  <Flame className="w-3 h-3 text-[#FFA36C]" />
                  <span>Próximos Check-ins Recomendados:</span>
                </span>
                <span className="text-[10px] text-white/50 font-sans">
                  Baseado no seu histórico
                </span>
              </div>

              <div className="space-y-1.5">
                {data.futureCheckinSuggestions.map((sug) => (
                  <button
                    key={sug.id}
                    onClick={() => {
                      sound.tap();
                      haptic.light();
                      if (onQuickVibeSelect) {
                        onQuickVibeSelect(sug.vibe);
                      } else if (onExploreCategory) {
                        onExploreCategory(sug.category);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4FF3A]/40 transition-all flex items-center justify-between gap-3 text-left group active:scale-[0.99] cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-unbounded font-black text-xs text-white group-hover:text-[#D4FF3A] transition-colors truncate">
                          {sug.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-[#6A4CFF]/30 text-[#D4FF3A] text-[9px] font-bold uppercase shrink-0">
                          {sug.vibe}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70 line-clamp-1 font-sans">
                        {sug.reason}
                      </p>
                    </div>

                    <div className="w-6 h-6 rounded-lg bg-white/10 group-hover:bg-[#D4FF3A] group-hover:text-[#14102E] flex items-center justify-center text-white/60 transition-all shrink-0">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
