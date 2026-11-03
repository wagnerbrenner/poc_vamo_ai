import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Compass, Bookmark, Flame, Clock, Heart, Users, MapPin, ArrowRight, Mic, MessageSquareText, Star, Navigation, Map, RefreshCw, Umbrella, Zap, Car } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { useBatterySaver } from '../context/BatterySaverContext';
import { PlaceItem, SavedPlace, UserVisit } from '../types';
import { MomentSuggestionCard } from './MomentSuggestionCard';
import { WeatherBanner } from './WeatherBanner';
import { VibeDashboard } from './VibeDashboard';
import { PriceFilterBar, PriceLevelOption } from './PriceFilterBar';
import { PersonalizedCurationSection } from './PersonalizedCurationSection';
import { sound, haptic } from '../utils/audioHaptics';

interface HomeScreenProps {
  onStartThreeTouches: () => void;
  onExplore: () => void;
  onOpenSaved: () => void;
  onOpenChat: () => void;
  onDirectDecide: () => void;
  onQuickVibeSelect: (vibe: string) => void;
  onSelectPlace: (place: PlaceItem) => void;
  onNavigateToPlace: (place: PlaceItem) => void;
  onToggleSave: (place: PlaceItem) => void;
  isSaved: (placeId: string) => boolean;
  places: PlaceItem[];
  isLoadingPlaces?: boolean;
  onRefreshPlaces?: () => void;
  activeTypeName?: string | null;
  savedPlaces?: SavedPlace[];
  userVisits?: UserVisit[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartThreeTouches,
  onExplore,
  onOpenSaved,
  onOpenChat,
  onDirectDecide,
  onQuickVibeSelect,
  onSelectPlace,
  onNavigateToPlace,
  onToggleSave,
  isSaved,
  places,
  isLoadingPlaces = false,
  onRefreshPlaces,
  activeTypeName,
  savedPlaces = [],
  userVisits = [],
}) => {
  const { themeConfig, theme } = useTheme();
  const { currentCity, calculateDistance, setCurrentCity, getNearbyCitiesAround100km } = useLocation();
  const { isBatterySaver, toggleBatterySaver } = useBatterySaver();
  const [isOutdoorFiltered, setIsOutdoorFiltered] = useState<boolean>(false);
  
  // 2 neighbouring cities within ~100km suggested automatically for 1-touch search context switch
  const neighborCities = useMemo(() => {
    return getNearbyCitiesAround100km();
  }, [getNearbyCitiesAround100km]);

  const [priceFilter, setPriceFilter] = useState<PriceLevelOption>(() => {
    try {
      return (localStorage.getItem('@vamo_ai:price_preference') as PriceLevelOption) || 'todos';
    } catch {
      return 'todos';
    }
  });

  // Weather-aware filtering: deprioritizes or removes open-air venues when raining/requested
  const filteredPlaces = isOutdoorFiltered
    ? places.filter(
        (p) =>
          !p.vibes.includes('arlivre') &&
          !p.features.some((f) => {
            const low = f.toLowerCase();
            return low.includes('ar livre') || low.includes('área aberta') || low.includes('rooftop aberto');
          })
      )
    : places;

  const activePlaces = filteredPlaces.length > 0 ? filteredPlaces : places;

  // Price level filter: applies selected price ($ to $$$$) or all
  const priceFilteredPlaces = priceFilter === 'todos'
    ? activePlaces
    : activePlaces.filter((p) => p.priceLevel === priceFilter);

  const finalPlaces = priceFilteredPlaces.length > 0 ? priceFilteredPlaces : activePlaces;

  return (
    <div className={`flex-1 flex flex-col justify-between p-6 bg-gradient-to-b ${themeConfig.bgGradient} transition-all duration-700 relative overflow-y-auto no-scrollbar`}>
      {/* Ambient background glow decoration */}
      <div className="absolute top-1/4 -right-16 w-64 h-64 bg-[#FF3D7F]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -left-16 w-64 h-64 bg-[#6A4CFF]/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Context Pill with Battery Saver Mode Toggle */}
      <div className="flex items-center justify-between z-10 gap-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-[11px] text-white/80 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#D4FF3A] animate-pulse" />
          <span>{themeConfig.label} ({themeConfig.period})</span>
          <span className="text-white/30">•</span>
          <span className="text-white/60">{themeConfig.keywords}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Modo Economia de Energia Toggle */}
          <button
            onClick={toggleBatterySaver}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-unbounded font-bold border transition-all cursor-pointer ${
              isBatterySaver
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title={isBatterySaver ? 'Modo Economia de Energia ATIVO (GPS e Clima em baixa taxa para poupar bateria)' : 'Ativar Modo Economia de Energia'}
          >
            <Zap className={`w-3 h-3 ${isBatterySaver ? 'fill-current text-amber-300' : ''}`} />
            <span>{isBatterySaver ? 'Eco ⚡' : 'Eco'}</span>
          </button>

          <div className="flex items-center gap-1 text-[11px] text-[#FFA36C] font-semibold">
            <Flame className="w-3.5 h-3.5 text-[#FFA36C]" />
            <span className="hidden sm:inline">3 opções certas</span>
          </div>
        </div>
      </div>

      {/* Weather Forecast Banner (Live rain & climate recommendations) */}
      <div className="z-10 mt-3">
        <WeatherBanner
          isOutdoorFiltered={isOutdoorFiltered}
          onApplyWeatherSuggestion={(vibe, filterOutdoors) => {
            setIsOutdoorFiltered(filterOutdoors);
            if (vibe) {
              onQuickVibeSelect(vibe);
            }
          }}
        />
      </div>

      {/* 1-Touch Neighbor Cities Context Switcher (<100km) */}
      {neighborCities.length > 0 && (
        <div className="z-10 mt-2.5 p-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 flex flex-col gap-2 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-unbounded font-bold text-[#D4FF3A]">
              <Car className="w-3.5 h-3.5" />
              <span>Bate-volta (~100km):</span>
            </div>
            <span className="text-[10px] text-white/50">Toque 1x p/ trocar cidade</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {neighborCities.map((dest) => {
              const isCurrent = currentCity.name === dest.name;
              return (
                <button
                  key={dest.id}
                  onClick={() => {
                    sound.tap();
                    haptic.medium();
                    setCurrentCity(dest);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-[#D4FF3A] text-[#14102E] border-[#D4FF3A] shadow-[0_0_12px_rgba(212,255,58,0.35)]'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                  title={`Trocar busca para ${dest.name} (~${dest.distanceKm} km)`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-unbounded font-black text-xs truncate">
                      {dest.name}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-black/20 text-[#14102E]' : 'bg-white/10 text-[#D4FF3A]'
                    }`}>
                      ~{dest.distanceKm}km
                    </span>
                  </div>
                  <span className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-[#14102E]/80 font-medium' : 'text-white/60'}`}>
                    {dest.vibeTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VibeDashboard: Gemini AI Current User Vibe & Future Check-in Suggestions */}
      <div className="z-10 mt-3">
        <VibeDashboard
          savedPlaces={savedPlaces}
          userVisits={userVisits}
          city={currentCity.name}
          onQuickVibeSelect={onQuickVibeSelect}
          onExploreCategory={() => onExplore()}
        />
      </div>

      {/* Sugestão do Momento (Top Flagship Card based on GPS and Time of Day) */}
      <div className="z-10 mt-3">
        <MomentSuggestionCard
          onSelectPlace={onSelectPlace}
          onNavigateToPlace={onNavigateToPlace}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
          fallbackPlaces={finalPlaces}
        />
      </div>

      {/* Center Main Stage (Exactly as Video 00:00 - 00:03) */}
      <div className="my-auto py-8 z-10 flex flex-col items-start text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-4 border border-white/10 backdrop-blur-sm">
          <Clock className="w-3.5 h-3.5 text-[#D4FF3A]" />
          <span>Onde vamos hoje ou amanhã?</span>
        </div>

        <h1 className="font-unbounded font-black text-3xl sm:text-4xl text-white tracking-tight leading-[1.15] mb-4 drop-shadow-md">
          O que combina <br />
          com você <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4FF3A] to-[#FFA36C]">agora?</span>
        </h1>

        <p className="font-sans text-sm sm:text-base text-white/85 max-w-xs leading-relaxed font-normal">
          Três lugares abertos agora, perto de você, cada um com um motivo.
        </p>

        {/* Quick Question Helpers */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { label: 'Date romântico', vibe: 'casal' },
            { label: 'Tomar um drinque', vibe: 'drinques' },
            { label: 'Samba & agito', vibe: 'agito' },
            { label: 'Corte de cabelo', vibe: 'estilo' },
          ].map((pill) => (
            <button
              key={pill.label}
              onClick={() => {
                sound.tap();
                onQuickVibeSelect(pill.vibe);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-all font-medium active:scale-95"
            >
              + {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Google Places Section (Real places near user GPS) */}
      <div className="z-10 my-4 w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="font-unbounded font-black text-xs sm:text-sm text-white">
              Em alta perto de você
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-bold text-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>Google Maps</span>
            </div>
            {isOutdoorFiltered && (
              <button
                onClick={() => {
                  sound.tap();
                  setIsOutdoorFiltered(false);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[10px] font-bold text-blue-200 hover:bg-blue-500/40 transition-all cursor-pointer"
                title="Clique para remover o filtro de chuva e ver todos os locais"
              >
                <Umbrella className="w-3 h-3 text-blue-300" />
                <span>Modo Chuva ✕</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRefreshPlaces && (
              <button
                onClick={() => {
                  sound.tap();
                  onRefreshPlaces();
                }}
                disabled={isLoadingPlaces}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#D4FF3A] text-[11px] font-semibold border border-white/10 active:scale-95 transition-all disabled:opacity-50"
                title="Alternar entre diferentes tipos de lugares (restaurantes, bares, cafés, baladas)"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPlaces ? 'animate-spin' : ''}`} />
                <span>
                  {activeTypeName
                    ? `Alternar (${activeTypeName === 'restaurant' ? 'Restaurantes' : activeTypeName === 'bar' ? 'Bares' : activeTypeName === 'cafe' ? 'Cafés' : 'Baladas'})`
                    : 'Alternar tipo'}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                sound.tap();
                onExplore();
              }}
              className="text-[11px] font-semibold text-white/80 hover:text-white flex items-center gap-0.5"
            >
              <span>Ver feed</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Price Level Filter Bar ($ to $$$$) */}
        <div className="mb-3">
          <PriceFilterBar
            currentPrice={priceFilter}
            onChangePrice={setPriceFilter}
          />
        </div>

        {/* Carousel / Cards */}
        {isLoadingPlaces ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-64 h-48 rounded-2xl bg-white/5 border border-white/10 animate-pulse shrink-0 p-3 flex flex-col justify-between"
              >
                <div className="w-full h-24 rounded-xl bg-white/10" />
                <div className="space-y-1.5">
                  <div className="w-3/4 h-3 rounded bg-white/10" />
                  <div className="w-1/2 h-2.5 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
            Buscando estabelecimentos reais com Google Maps...
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {finalPlaces.slice(0, 8).map((place) => {
              const dist = calculateDistance(place.lat, place.lng);
              const saved = isSaved(place.id);
              return (
                <div
                  key={place.id}
                  onClick={() => {
                    sound.tap();
                    haptic.light();
                    onSelectPlace(place);
                  }}
                  className="w-64 shrink-0 p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/25 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {/* Place Photo & Overlay Badges with Shared Layout Animation */}
                    <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2.5 bg-black/40">
                      <motion.img
                        layoutId={`place-image-${place.id}`}
                        src={place.imageUrl}
                        alt={place.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-[#D4FF3A]">
                        {place.categoryLabel}
                      </span>
                      {place.coupon && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[#FF3D7F] text-white text-[9px] font-unbounded font-black shadow-md flex items-center gap-1">
                          <span>🏷️ {place.coupon.discount}</span>
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.pop();
                          haptic.light();
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

                    {/* Place Info */}
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-unbounded font-bold text-xs text-white group-hover:text-[#D4FF3A] transition-colors truncate">
                        {place.title}
                      </h4>
                      <span className="text-[11px] font-bold text-white/80 shrink-0">
                        {place.priceLevel}
                      </span>
                    </div>

                    <p className="text-[11px] text-white/60 truncate mt-0.5">
                      {place.subCategory} • {place.neighborhood}
                    </p>

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

                  {/* Actions Bar */}
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
        )}
      </div>

      {/* Personalized Curation Section based on last 5 saved/visited places */}
      <PersonalizedCurationSection
        savedPlaces={savedPlaces}
        userVisits={userVisits}
        allPlaces={places}
        onSelectPlace={onSelectPlace}
        onNavigateToPlace={onNavigateToPlace}
        onToggleSave={onToggleSave}
        isSaved={isSaved}
      />

      {/* Primary Actions Area */}
      <div className="z-10 flex flex-col gap-3 w-full max-w-sm mx-auto pt-4">
        {/* Flagship CTA: Decide por mim (Page 05 & 10 Brand Manual) */}
        <button
          onClick={() => {
            sound.tap();
            onDirectDecide();
          }}
          className="w-full py-4 px-6 rounded-full bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-base shadow-[0_8px_25px_rgba(212,255,58,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-[#14102E] group-hover:rotate-12 transition-transform" />
          <span>Decide por mim</span>
        </button>

        {/* Voice & Chat Assistant Button */}
        <button
          onClick={() => {
            sound.tap();
            onOpenChat();
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-unbounded font-bold flex items-center justify-center gap-2 backdrop-blur-md active:scale-95 transition-all shadow-md group cursor-pointer"
        >
          <Mic className="w-4 h-4 text-[#D4FF3A] group-hover:scale-110 transition-transform" />
          <span>Falar com Amigo Local (Voz ou Chat)</span>
        </button>

        {/* Secondary: Deixa eu escolher (3-touches flow) */}
        <button
          onClick={() => {
            sound.tap();
            onStartThreeTouches();
          }}
          className="w-full py-2.5 text-center text-sm font-sans font-semibold text-white/90 hover:text-white transition-all underline underline-offset-4 decoration-white/30 hover:decoration-white"
        >
          Deixa eu escolher (3 toques)
        </button>

        {/* Tertiary: Ver guardados */}
        <button
          onClick={() => {
            sound.tap();
            onOpenSaved();
          }}
          className="w-full py-1 text-center text-xs font-sans font-medium text-white/60 hover:text-[#D4FF3A] transition-all flex items-center justify-center gap-1.5"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Ver guardados</span>
        </button>
      </div>

      {/* Floating 'Recarregar Sugestões' Button with pulse animation and haptic feedback */}
      {onRefreshPlaces && (
        <div className="sticky bottom-4 self-center z-30 pt-4 pointer-events-auto">
          <button
            onClick={() => {
              sound.tap();
              haptic.refresh();
              onRefreshPlaces();
            }}
            disabled={isLoadingPlaces}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1b153d]/95 hover:bg-[#251b54] text-[#D4FF3A] border border-[#D4FF3A]/60 shadow-[0_4px_22px_rgba(212,255,58,0.35)] backdrop-blur-md active:scale-95 transition-all cursor-pointer group"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF3A] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D4FF3A]" />
            </span>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPlaces ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span className="font-unbounded font-black text-xs tracking-tight">
              Recarregar Sugestões
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
