import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Compass, Bookmark, Flame, Clock, Heart, Users, MapPin, 
  ArrowRight, Mic, MessageSquareText, Star, Navigation, Map, RefreshCw, 
  Umbrella, Zap, Car, Tag, Ticket, Dumbbell, ChevronDown, ChevronUp, Check, Play
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { useBatterySaver } from '../context/BatterySaverContext';
import { PlaceItem, SavedPlace, UserVisit, CategorySlug } from '../types';
import { CATEGORIES } from '../data/mockPlaces';
import { WeatherBanner } from './WeatherBanner';
import { PriceFilterBar, PriceLevelOption } from './PriceFilterBar';
import { sound, haptic } from '../utils/audioHaptics';

interface HomeScreenProps {
  onStartThreeTouches: (initialVibe?: string) => void;
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
  onOpenVoiceSearch?: () => void;
  onOpenLocationModal?: () => void;
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
  onOpenVoiceSearch,
  onOpenLocationModal,
}) => {
  const { themeConfig } = useTheme();
  const { currentCity, calculateDistance, setCurrentCity, getNearbyCitiesAround100km } = useLocation();
  const { isBatterySaver, toggleBatterySaver } = useBatterySaver();

  // Decision State
  const [selectedCompanion, setSelectedCompanion] = useState<'casal' | 'amigos' | 'sozinho' | 'familia'>('casal');
  const [selectedVibeCategory, setSelectedVibeCategory] = useState<string>('gastronomia');
  const [showContextWidgets, setShowContextWidgets] = useState<boolean>(false);
  const [isOutdoorFiltered, setIsOutdoorFiltered] = useState<boolean>(false);

  // Neighboring getaway cities within ~100km
  const neighborCities = useMemo(() => {
    return getNearbyCitiesAround100km();
  }, [getNearbyCitiesAround100km]);

  // Feed Category Filter
  const [feedCategory, setFeedCategory] = useState<CategorySlug | 'cupons' | 'cuidado_masculino' | 'cuidado_feminino' | 'fitness'>('todos');

  // Price filter
  const [priceFilter, setPriceFilter] = useState<PriceLevelOption>(() => {
    try {
      return (localStorage.getItem('@vamo_ai:price_preference') as PriceLevelOption) || 'todos';
    } catch {
      return 'todos';
    }
  });

  // Filtered Places for Feed
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // 1. Weather rain filter
      if (isOutdoorFiltered) {
        const isOutdoor =
          p.vibes.includes('arlivre') ||
          p.features.some((f) => {
            const low = f.toLowerCase();
            return low.includes('ar livre') || low.includes('área aberta') || low.includes('rooftop aberto');
          });
        if (isOutdoor) return false;
      }

      // 2. Price filter
      if (priceFilter !== 'todos' && p.priceLevel !== priceFilter) {
        return false;
      }

      // 3. Category / Subcategory filter
      if (feedCategory === 'cupons') {
        return !!p.coupon;
      }
      if (feedCategory === 'cuidado_masculino') {
        return p.category === 'barbearias' && (p.wellnessType === 'barbearia' || p.title.toLowerCase().includes('barber') || p.subCategory.toLowerCase().includes('barba'));
      }
      if (feedCategory === 'cuidado_feminino') {
        return p.category === 'barbearias' && (p.wellnessType === 'salao' || p.title.toLowerCase().includes('beauty') || p.title.toLowerCase().includes('salão') || p.subCategory.toLowerCase().includes('cabelo'));
      }
      if (feedCategory === 'fitness') {
        return p.category === 'barbearias' && (p.wellnessType === 'fitness' || p.title.toLowerCase().includes('cross') || p.title.toLowerCase().includes('academia') || p.subCategory.toLowerCase().includes('treino'));
      }
      if (feedCategory !== 'todos' && p.category !== feedCategory) {
        return false;
      }

      return true;
    });
  }, [places, feedCategory, priceFilter, isOutdoorFiltered]);

  const handleDecideWithCurrentSelection = () => {
    sound.success();
    haptic.success();
    onQuickVibeSelect(selectedVibeCategory);
  };

  return (
    <div className={`flex-1 flex flex-col justify-start p-3.5 sm:p-5 bg-gradient-to-b ${themeConfig.bgGradient} transition-all duration-700 relative overflow-y-auto no-scrollbar space-y-3.5`}>
      {/* Ambient background glow decoration */}
      <div className="absolute top-10 -right-20 w-64 h-64 bg-[#FF3D7F]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 -left-20 w-64 h-64 bg-[#6A4CFF]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar: Location Badge, 100km Neighbor Pill, Mic & Eco */}
      <div className="flex items-center justify-between z-10 gap-2 flex-wrap">
        {/* Clickable City Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              sound.tap();
              haptic.light();
              onOpenLocationModal?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-xs text-white font-medium shadow-sm transition-all cursor-pointer group active:scale-95"
            title="Trocar cidade ou usar GPS em todo o Brasil"
          >
            <span className="w-2 h-2 rounded-full bg-[#D4FF3A] animate-pulse" />
            <span className="font-unbounded font-black text-white group-hover:text-[#D4FF3A] transition-colors">{currentCity.name}</span>
            <MapPin className="w-3 h-3 text-[#D4FF3A]" />
          </button>

          {/* Quick Neighbor City (~100km) Pill */}
          {neighborCities.slice(0, 1).map((dest) => (
            <button
              key={dest.id}
              onClick={() => {
                sound.tap();
                haptic.medium();
                setCurrentCity(dest);
              }}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-[10px] font-sans text-white/80 border border-white/10 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              title={`Trocar busca para ${dest.name} (~${dest.distanceKm}km)`}
            >
              <Car className="w-3 h-3 text-[#D4FF3A]" />
              <span>{dest.name} (~{dest.distanceKm}km)</span>
            </button>
          ))}
        </div>

        {/* Right Controls: Voice Search (Hands-free) & Battery Saver */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.tap();
              haptic.medium();
              if (onOpenVoiceSearch) {
                onOpenVoiceSearch();
              } else {
                onOpenChat();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] text-xs font-unbounded font-black shadow-[0_0_15px_rgba(212,255,58,0.4)] active:scale-95 transition-all cursor-pointer group"
            title="Pesquisar por comando de voz (mãos livres)"
          >
            <Mic className="w-3.5 h-3.5 fill-[#14102E] group-hover:scale-110 transition-transform" />
            <span>Falar</span>
          </button>

          <button
            onClick={toggleBatterySaver}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-unbounded font-bold border transition-all cursor-pointer ${
              isBatterySaver
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Economizar Bateria (modo eco)"
          >
            <Zap className={`w-3 h-3 ${isBatterySaver ? 'fill-current text-amber-300' : ''}`} />
            <span>{isBatterySaver ? 'Eco ⚡' : 'Eco'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          HERO DE AÇÃO RÁPIDA: DECISÃO DE 3 TOQUES & VIBES NO TOPO!
          ========================================================================= */}
      <div className="z-10 w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1b153d]/95 via-[#14102E]/90 to-black/85 border border-white/20 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Top subtle glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#D4FF3A]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Micro Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[#D4FF3A] text-[10px] font-unbounded font-black tracking-wide border border-white/10">
            <Flame className="w-3 h-3 text-[#FFA36C]" />
            <span>O MELHOR DA CIDADE, PRA AGORA</span>
          </div>

          <button
            onClick={() => setShowContextWidgets(!showContextWidgets)}
            className="text-[10px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <span>{showContextWidgets ? 'Menos clima' : 'Ver clima & dicas'}</span>
            {showContextWidgets ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Clean Headline */}
        <h1 className="font-unbounded font-black text-xl sm:text-2xl text-white tracking-tight leading-snug mb-3">
          O que combina com você <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4FF3A] via-[#FFA36C] to-[#FF3D7F]">agora?</span>
        </h1>

        {/* 1. BOTÕES DE AÇÃO RÁPIDA (PRIORIDADE MÁXIMA NO TOPO) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {/* Flagship 1: Decisão de 3 Toques */}
          <button
            onClick={() => {
              sound.tap();
              haptic.medium();
              onStartThreeTouches(selectedVibeCategory);
            }}
            className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF3A] to-[#b8f01b] hover:brightness-105 text-[#14102E] font-unbounded font-black text-xs sm:text-sm shadow-[0_8px_25px_rgba(212,255,58,0.45)] active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#14102E] text-[#D4FF3A] flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-[#D4FF3A] ml-0.5" />
              </div>
              <div className="text-left">
                <span className="block leading-tight font-black text-xs sm:text-sm">
                  Decisão de 3 Toques
                </span>
                <span className="text-[10px] text-[#14102E]/70 font-sans font-medium block">
                  Escolha Quando, Quem e Vibe
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#14102E] group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Flagship 2: Decide por mim agora */}
          <button
            onClick={handleDecideWithCurrentSelection}
            className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-unbounded font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-[#FF3D7F] group-hover:rotate-12 transition-transform" />
            <span>Decide por mim ({selectedVibeCategory})</span>
          </button>
        </div>

        {/* 2. VIBES DO MOMENTO (DIRETAMENTE ABAIXO DOS BOTÕES DE AÇÃO) */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-unbounded font-black uppercase text-white/60 tracking-wider">
              Vibes do Momento
            </span>
            <span className="text-[10px] text-[#D4FF3A] font-sans">
              Toque para filtrar
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {[
              { id: 'gastronomia', label: 'Jantar & Almoço', icon: '🍽️', sub: 'Comida boa' },
              { id: 'drinques', label: 'Bares & Drinks', icon: '🍸', sub: 'Coquetelaria' },
              { id: 'cultura', label: 'Cultura & Shows', icon: '🎭', sub: 'Ingressos' },
              { id: 'estilo', label: 'Barbearia & Salão', icon: '✂️', sub: 'Cuidado' },
              { id: 'fitness', label: 'Academias & Treino', icon: '🏋️', sub: 'Fitness' },
              { id: 'agito', label: 'Balada & Pista', icon: '⚡', sub: 'Nightlife' },
            ].map((vibe) => {
              const isSelected = selectedVibeCategory === vibe.id;
              return (
                <button
                  key={vibe.id}
                  onClick={() => {
                    sound.tap();
                    haptic.light();
                    setSelectedVibeCategory(vibe.id);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center active:scale-95 ${
                    isSelected
                      ? 'bg-[#FF3D7F] text-white border-[#FF3D7F] shadow-[0_0_15px_rgba(255,61,127,0.45)] font-black'
                      : 'bg-white/5 hover:bg-white/10 text-white/90 border-white/10 font-medium'
                  }`}
                >
                  <span className="text-sm mb-0.5">{vibe.icon}</span>
                  <span className="text-[9px] font-unbounded leading-tight truncate w-full">{vibe.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. SELEÇÃO DE COMPANHIA (COMPACTA) */}
        <div>
          <span className="text-[10px] font-unbounded font-black uppercase text-white/60 mb-1.5 block tracking-wider">
            Com quem você vai sair?
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'casal', label: 'Date', icon: '🥂' },
              { id: 'amigos', label: 'Amigos', icon: '🍻' },
              { id: 'sozinho', label: 'Sozinho', icon: '☕' },
              { id: 'familia', label: 'Família', icon: '👨‍👩‍👧' },
            ].map((comp) => {
              const isSelected = selectedCompanion === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => {
                    sound.tap();
                    haptic.light();
                    setSelectedCompanion(comp.id as any);
                  }}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-[#D4FF3A] text-[#14102E] border-[#D4FF3A] font-black shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-white/90 border-white/10 font-medium'
                  }`}
                >
                  <span className="text-xs">{comp.icon}</span>
                  <span className="font-unbounded text-[10px] leading-tight">{comp.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          LISTAGENS MENOS CRÍTICAS MOVIDAS PARA BAIXO (CLIMA & CONTEXTO)
          ========================================================================= */}
      <AnimatePresence>
        {showContextWidgets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden z-10 space-y-2.5"
          >
            <WeatherBanner
              isOutdoorFiltered={isOutdoorFiltered}
              onApplyWeatherSuggestion={(vibe, filterOutdoors) => {
                setIsOutdoorFiltered(filterOutdoors);
                if (vibe) onQuickVibeSelect(vibe);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CATEGORY FILTER BAR (Tudo, Restaurantes, Bares, Cultura, Barbearias, Cupons)
          ========================================================================= */}
      <div className="z-10 pt-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-unbounded font-black text-xs text-white">
              Lugares em Alta
            </span>
            <span className="text-[10px] text-white/50">({filteredPlaces.length} locais)</span>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshPlaces && (
              <button
                onClick={() => {
                  sound.tap();
                  haptic.refresh();
                  onRefreshPlaces();
                }}
                disabled={isLoadingPlaces}
                className="text-[11px] text-[#D4FF3A] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPlaces ? 'animate-spin' : ''}`} />
                <span>{isLoadingPlaces ? 'Atualizando...' : 'Recarregar'}</span>
              </button>
            )}

            <button
              onClick={onExplore}
              className="text-[11px] font-semibold text-white/80 hover:text-white flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Scrollable Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {/* Cupons */}
          <button
            onClick={() => {
              sound.tap();
              haptic.light();
              setFeedCategory((prev) => (prev === 'cupons' ? 'todos' : 'cupons'));
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-1 cursor-pointer active:scale-95 ${
              feedCategory === 'cupons'
                ? 'bg-[#FF3D7F] text-white shadow-[0_0_12px_rgba(255,61,127,0.5)]'
                : 'bg-white/5 text-[#FF3D7F] border border-[#FF3D7F]/30 hover:bg-[#FF3D7F]/10'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>🏷️ Cupons</span>
          </button>

          {/* Tudo */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('todos');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              feedCategory === 'todos'
                ? 'bg-[#D4FF3A] text-[#14102E] font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            Tudo
          </button>

          {/* Restaurantes */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('restaurantes');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              feedCategory === 'restaurantes'
                ? 'bg-[#D4FF3A] text-[#14102E] font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            🍽️ Restaurantes
          </button>

          {/* Bares */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('bares');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              feedCategory === 'bares'
                ? 'bg-[#D4FF3A] text-[#14102E] font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            🍸 Bares & Drinks
          </button>

          {/* Cultura & Shows (Com link de Ingressos) */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('eventos');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
              feedCategory === 'eventos'
                ? 'bg-[#6A4CFF] text-white font-black shadow-[0_0_12px_rgba(106,76,255,0.5)]'
                : 'bg-white/5 text-[#D4FF3A] hover:bg-[#6A4CFF]/20 border border-[#6A4CFF]/30'
            }`}
          >
            <Ticket className="w-3 h-3 text-[#D4FF3A]" />
            <span>🎭 Cultura & Ingressos</span>
          </button>

          {/* Barbearias */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('cuidado_masculino');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              feedCategory === 'cuidado_masculino'
                ? 'bg-[#D4FF3A] text-[#14102E] font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            ✂️ Barbearias
          </button>

          {/* Salão & Beleza */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('cuidado_feminino');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              feedCategory === 'cuidado_feminino'
                ? 'bg-[#FF3D7F] text-white font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            💇‍♀️ Salão & Beleza
          </button>

          {/* Academias & Fitness */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('fitness');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
              feedCategory === 'fitness'
                ? 'bg-[#D4FF3A] text-[#14102E] font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            <Dumbbell className="w-3 h-3" />
            <span>Academias & Treino</span>
          </button>

          {/* Cafés */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('cafes');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              feedCategory === 'cafes'
                ? 'bg-[#D4FF3A] text-[#14102E] font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            ☕ Cafés
          </button>

          {/* Baladas */}
          <button
            onClick={() => {
              sound.tap();
              setFeedCategory('baladas');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              feedCategory === 'baladas'
                ? 'bg-[#D4FF3A] text-[#14102E] font-black'
                : 'bg-white/5 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            ⚡ Baladas
          </button>
        </div>

        {/* Price Filter Bar */}
        <div className="mt-2">
          <PriceFilterBar currentPrice={priceFilter} onChangePrice={setPriceFilter} />
        </div>
      </div>

      {/* =========================================================================
          FEED CARDS (Horizontal Carousel & Quick Navigation)
          ========================================================================= */}
      <div className="z-10 pb-4">
        {filteredPlaces.length === 0 ? (
          <div className="p-8 rounded-3xl bg-black/30 border border-white/10 text-center text-white/60">
            <p className="text-sm font-unbounded font-bold mb-1">Nenhum lugar encontrado nesse filtro.</p>
            <p className="text-xs text-white/40">Tente alternar a categoria ou limpar o filtro de preço.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {filteredPlaces.map((place) => {
              const dist = calculateDistance(place.lat, place.lng);
              const saved = isSaved(place.id);
              const isCultural = place.category === 'eventos' || place.culturalType;

              return (
                <div
                  key={place.id}
                  onClick={() => {
                    sound.tap();
                    haptic.light();
                    onSelectPlace(place);
                  }}
                  className="w-64 sm:w-72 shrink-0 p-3.5 rounded-2xl bg-[#14102E]/90 hover:bg-[#1b153d] border border-white/15 transition-all shadow-lg flex flex-col justify-between cursor-pointer group active:scale-[0.99]"
                >
                  <div>
                    {/* Image with Badges */}
                    <div className="relative h-36 rounded-xl overflow-hidden mb-2.5">
                      <img
                        src={place.imageUrl}
                        alt={place.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[#D4FF3A] text-[9px] font-unbounded font-black border border-white/10">
                          {place.categoryLabel}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.tap();
                            haptic.medium();
                            onToggleSave(place);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            saved ? 'bg-[#FF3D7F] text-white' : 'bg-black/50 text-white/80 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Coupon / Ticket Highlight on bottom of photo */}
                      {place.coupon ? (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[#FF3D7F] text-white text-[9px] font-unbounded font-black flex items-center gap-1 shadow-md">
                          <span>🏷️ {place.coupon.discount}</span>
                        </div>
                      ) : isCultural ? (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[#6A4CFF] text-white text-[9px] font-unbounded font-black flex items-center gap-1 shadow-md">
                          <Ticket className="w-2.5 h-2.5 text-[#D4FF3A]" />
                          <span>Ingressos Oficiais</span>
                        </div>
                      ) : place.wellnessType ? (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-unbounded font-black flex items-center gap-1 shadow-md">
                          <span>{place.wellnessType === 'fitness' ? '🏋️ Passe Livre' : '✂️ Horário Livre'}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Title & Info */}
                    <h3 className="font-unbounded font-black text-sm text-white truncate mb-1">
                      {place.title}
                    </h3>

                    <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed mb-2 font-sans">
                      “{place.motivoAgora}”
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-2 text-[11px] text-white/70">
                      <span className="flex items-center gap-1 font-bold text-[#D4FF3A]">
                        <Star className="w-3 h-3 fill-current" />
                        {place.rating}
                      </span>
                      <span className="text-white/30">•</span>
                      <span>{place.priceLevel}</span>
                      <span className="text-white/30">•</span>
                      <span className="text-[#FFA36C] font-medium flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {dist.km} km
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      place.isOpenNow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {place.openStatus}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.tap();
                        haptic.medium();
                        onNavigateToPlace(place);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] text-[10px] font-unbounded font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
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
    </div>
  );
};
