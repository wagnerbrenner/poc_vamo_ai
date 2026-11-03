import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Star, Navigation, MapPin, Heart, 
  RefreshCw, Clock, ArrowRight, ShieldCheck, Flame 
} from 'lucide-react';
import { PlaceItem } from '../types';
import { useLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import { sound } from '../utils/audioHaptics';

interface MomentSuggestionCardProps {
  onSelectPlace: (place: PlaceItem) => void;
  onNavigateToPlace: (place: PlaceItem) => void;
  onToggleSave: (place: PlaceItem) => void;
  isSaved: (placeId: string) => boolean;
  fallbackPlaces: PlaceItem[];
}

export const MomentSuggestionCard: React.FC<MomentSuggestionCardProps> = ({
  onSelectPlace,
  onNavigateToPlace,
  onToggleSave,
  isSaved,
  fallbackPlaces,
}) => {
  const { userCoords, currentCity, calculateDistance } = useLocation();
  const { themeConfig, theme } = useTheme();

  const [suggestedPlaces, setSuggestedPlaces] = useState<PlaceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isGoogleMapsReal, setIsGoogleMapsReal] = useState(false);

  // Fetch real Google Maps Places API (New) recommendations
  const fetchNearbySuggestion = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/places/nearby-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userCoords.lat,
          lng: userCoords.lng,
          timeOfDay: theme,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.places && data.places.length > 0) {
          setSuggestedPlaces(data.places);
          setIsGoogleMapsReal(true);
          setCurrentIndex(0);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Google Maps nearby search error, using curated top places:', err);
    }

    // Curated fallback matching current time of day
    const timeVibe = theme === 'manha' ? 'relax' : theme === 'pordosol' ? 'drinques' : 'gastronomia';
    const filtered = fallbackPlaces.filter(p => p.vibes.includes(timeVibe as any) || p.isOpenNow);
    setSuggestedPlaces(filtered.length > 0 ? filtered : fallbackPlaces);
    setIsGoogleMapsReal(false);
    setCurrentIndex(0);
    setLoading(false);
  };

  useEffect(() => {
    fetchNearbySuggestion();
  }, [userCoords.lat, userCoords.lng, theme]);

  const currentPlace = suggestedPlaces[currentIndex] || fallbackPlaces[0];
  if (!currentPlace) return null;

  const dist = calculateDistance(currentPlace.lat, currentPlace.lng);
  const saved = isSaved(currentPlace.id);

  const handleNextSuggestion = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.tap();
    if (suggestedPlaces.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % suggestedPlaces.length);
    } else {
      fetchNearbySuggestion();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onSelectPlace(currentPlace)}
      className="w-full rounded-3xl bg-gradient-to-br from-[#21164e] via-[#1b153d] to-[#14102E] border border-[#D4FF3A]/30 shadow-[0_10px_30px_rgba(212,255,58,0.15)] overflow-hidden cursor-pointer relative group transition-all mb-5 select-none"
    >
      {/* Top Header Badge Bar */}
      <div className="p-3 px-4 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#D4FF3A] text-[#14102E] flex items-center justify-center font-black">
            <Flame className="w-3.5 h-3.5 fill-[#14102E]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-unbounded font-black text-xs text-white">
                Sugestão do Momento
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF3A] animate-ping" />
            </div>
            <span className="text-[10px] text-white/60 font-sans">
              Baseado no seu horário ({themeConfig.label}) e localização
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isGoogleMapsReal && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[9px] border border-blue-500/30 hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Google Maps Real</span>
            </span>
          )}

          <button
            onClick={handleNextSuggestion}
            disabled={loading}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-[#D4FF3A] flex items-center justify-center transition-all disabled:opacity-50"
            title="Ver outra sugestão do momento"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D4FF3A]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start">
        {/* Photo with Overlay */}
        <div className="relative w-full sm:w-28 h-32 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-black/40">
          <motion.img
            layoutId={`place-image-${currentPlace.id}`}
            src={currentPlace.imageUrl}
            alt={currentPlace.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.pop();
              onToggleSave(currentPlace);
            }}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              saved ? 'bg-[#FF3D7F] text-white' : 'bg-black/60 text-white/80 hover:text-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>

          <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-bold text-[#D4FF3A]">
            {currentPlace.categoryLabel}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-unbounded font-black text-sm sm:text-base text-white group-hover:text-[#D4FF3A] transition-colors truncate">
                {currentPlace.title}
              </h3>
              <span className="text-xs font-bold text-white/70 shrink-0">
                {currentPlace.priceLevel}
              </span>
            </div>

            <div className="flex items-center gap-3 my-1 text-xs text-white/70">
              <span className="flex items-center gap-1 text-[#D4FF3A] font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                {currentPlace.rating}
                <span className="text-white/50 font-normal">({currentPlace.reviewCount})</span>
              </span>

              <span className="flex items-center gap-1 text-[#FFA36C] font-medium">
                <MapPin className="w-3 h-3" />
                {dist.km} km ({dist.walkingMin} min)
              </span>

              <span className="text-emerald-400 font-semibold text-[11px]">
                {currentPlace.openStatus}
              </span>
            </div>

            <p className="text-xs text-white/85 font-sans line-clamp-2 mt-1">
              “{currentPlace.motivoAgora}”
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                sound.tap();
                onNavigateToPlace(currentPlace);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Navigation className="w-3.5 h-3.5 fill-[#14102E]" />
              <span>Me leva lá</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                sound.tap();
                onSelectPlace(currentPlace);
              }}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shrink-0"
            >
              <span>Detalhes</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
