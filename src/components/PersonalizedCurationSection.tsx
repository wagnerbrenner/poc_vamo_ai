import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, Navigation, Star, MapPin, Compass, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PlaceItem, SavedPlace, UserVisit } from '../types';
import { curatePersonalizedPlaces } from '../services/curationService';
import { useLocation } from '../context/LocationContext';
import { sound, haptic } from '../utils/audioHaptics';

interface PersonalizedCurationSectionProps {
  savedPlaces: SavedPlace[];
  userVisits: UserVisit[];
  allPlaces: PlaceItem[];
  onSelectPlace: (place: PlaceItem) => void;
  onNavigateToPlace: (place: PlaceItem) => void;
  onToggleSave: (place: PlaceItem) => void;
  isSaved: (placeId: string) => boolean;
}

export const PersonalizedCurationSection: React.FC<PersonalizedCurationSectionProps> = ({
  savedPlaces,
  userVisits,
  allPlaces,
  onSelectPlace,
  onNavigateToPlace,
  onToggleSave,
  isSaved,
}) => {
  const { calculateDistance } = useLocation();

  const curation = useMemo(() => {
    return curatePersonalizedPlaces(savedPlaces, userVisits, allPlaces);
  }, [savedPlaces, userVisits, allPlaces]);

  if (!curation) return null;

  return (
    <div className="z-10 my-4 w-full">
      {/* Section Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-unbounded font-black text-xs sm:text-sm text-white">
              Curadoria para Você
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#6A4CFF]/30 border border-[#6A4CFF]/50 text-[10px] font-bold text-[#D4FF3A]">
              <Sparkles className="w-3 h-3 text-[#D4FF3A]" />
              <span>Gosto Pessoal</span>
            </div>
          </div>

          <span className="text-[10px] text-white/50 font-sans">
            {curation.hasHistory ? 'Novos locais' : 'Populares'}
          </span>
        </div>

        {/* Dynamic Taste Profile Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 via-[#251d4d] to-[#FF3D7F]/15 border border-white/10 mt-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-unbounded uppercase font-black tracking-wider text-[#D4FF3A]">
              Seu perfil de interesse recente:
            </span>
            <span className="text-[11px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-full truncate">
              {curation.tasteSummary}
            </span>
          </div>
          <p className="text-[11px] text-white/75 font-sans leading-relaxed">
            {curation.tasteExplanation}
          </p>
        </div>
      </div>

      {/* Curated Place Cards Carousel */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {curation.curatedPlaces.map((place) => {
          const dist = calculateDistance(place.lat, place.lng);
          const saved = isSaved(place.id);
          const hasVisited = userVisits.some((v) => v.placeId === place.id);

          return (
            <div
              key={`curated-${place.id}`}
              onClick={() => {
                sound.tap();
                onSelectPlace(place);
              }}
              className="w-64 shrink-0 p-3 rounded-2xl bg-[#181335]/90 backdrop-blur-md border border-[#6A4CFF]/30 hover:border-[#D4FF3A]/60 transition-all cursor-pointer group flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Place Photo & Overlay Badges */}
                <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2.5 bg-black/40">
                  <motion.img
                    layoutId={`place-image-${place.id}`}
                    src={place.imageUrl}
                    alt={place.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#6A4CFF] to-[#FF3D7F] text-[10px] font-bold text-white shadow-md">
                    {hasVisited ? 'Visitado' : 'Novo para você'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.pop();
                      onToggleSave(place);
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                      saved ? 'bg-[#FF3D7F] text-white shadow-md' : 'bg-black/50 text-white hover:text-[#FF3D7F]'
                    }`}
                    title={saved ? 'Remover' : 'Guardar'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Place Title & Category */}
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-unbounded font-bold text-xs text-white group-hover:text-[#D4FF3A] transition-colors truncate">
                    {place.title}
                  </h4>
                  <span className="text-[11px] font-bold text-white/80 shrink-0">
                    {place.priceLevel}
                  </span>
                </div>

                <p className="text-[11px] text-white/60 truncate mt-0.5">
                  {place.categoryLabel} • {place.neighborhood}
                </p>

                {/* Motivo Agora snippet tailored to taste */}
                <div className="mt-2 p-1.5 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-[10px] text-[#D4FF3A] font-sans line-clamp-2">
                    “{place.motivoAgora}”
                  </p>
                </div>

                {/* Rating & Distance */}
                <div className="flex items-center gap-2 mt-2 text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-[#D4FF3A]">
                    <Star className="w-3 h-3 fill-current" />
                    {place.rating}
                    <span className="text-white/40 font-normal">({place.reviewCount})</span>
                  </span>
                  <span className="text-white/30">•</span>
                  <span className="text-[#FFA36C] font-medium flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {dist.km} km
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  place.isOpenNow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {place.openStatus}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.tap();
                    onNavigateToPlace(place);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] text-[10px] font-unbounded font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                >
                  <Navigation className="w-2.5 h-2.5 fill-[#14102E]" />
                  <span>Me leva lá</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
