import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Sparkles, Navigation, Heart, Star, Clock, MapPin, 
  Share2, Flame, ExternalLink, MessageCircle, RefreshCw, Route, 
  ChevronRight, Compass, ArrowRight, Utensils, Wine, Coffee 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlaceItem, OutingPlanSession, ThreeStopItinerary, ItineraryStop } from '../types';
import { useLocation } from '../context/LocationContext';
import { sound, haptic } from '../utils/audioHaptics';
import { ShareVibeModal } from './ShareVibeModal';

interface DecideResultScreenProps {
  session: OutingPlanSession;
  places: PlaceItem[];
  onSelectPlace: (place: PlaceItem) => void;
  onNavigateToPlace: (place: PlaceItem) => void;
  onToggleSave: (place: PlaceItem) => void;
  isSaved: (placeId: string) => boolean;
  onBack: () => void;
}

export const DecideResultScreen: React.FC<DecideResultScreenProps> = ({
  session,
  places,
  onSelectPlace,
  onNavigateToPlace,
  onToggleSave,
  isSaved,
  onBack,
}) => {
  const { calculateDistance, currentCity, userCoords } = useLocation();
  const [viewMode, setViewMode] = useState<'options' | 'itinerary'>('options');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isDecidingRoulette, setIsDecidingRoulette] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [placeToShare, setPlaceToShare] = useState<PlaceItem | null>(null);

  // Itinerary state
  const [itinerary, setItinerary] = useState<ThreeStopItinerary | null>(null);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);

  // Filter and alternate the 3 best options matching the session vibe
  const topThree = React.useMemo(() => {
    const vibe = session.vibe;
    let matching = places.filter((p) => {
      if (vibe === 'drinques') {
        return p.category === 'bares' || p.vibes.includes('drinques');
      }
      if (vibe === 'gastronomia') {
        return p.category === 'restaurantes' || p.vibes.includes('gastronomia');
      }
      if (vibe === 'agito') {
        return p.category === 'baladas' || p.category === 'eventos' || p.category === 'bares' || p.vibes.includes('agito');
      }
      if (vibe === 'arlivre') {
        return p.vibes.includes('arlivre') || p.features.some(f => f.toLowerCase().includes('externa') || f.toLowerCase().includes('jardim'));
      }
      if (vibe === 'estilo') {
        return p.category === 'barbearias';
      }
      if (vibe === 'relax') {
        return p.vibes.includes('relax') || p.category === 'cafes' || p.category === 'restaurantes';
      }
      return true;
    });

    if (matching.length < 3) {
      const existingIds = new Set(matching.map((m) => m.id));
      const rest = places.filter((p) => !existingIds.has(p.id));
      matching = [...matching, ...rest];
    }

    matching.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const offset = (shuffleSeed * 3) % Math.max(1, matching.length - 2);
    const chosen = matching.slice(offset, offset + 3);
    return chosen.length >= 3 ? chosen : matching.slice(0, 3);
  }, [places, session.vibe, shuffleSeed]);

  const loadThreeStopItinerary = async () => {
    setIsGeneratingItinerary(true);
    setItineraryError(null);
    try {
      const res = await fetch('/api/itinerary-3-stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe: session.vibe,
          when: session.when,
          withWhom: session.withWhom,
          city: currentCity.name,
          lat: userCoords.lat,
          lng: userCoords.lng,
          places: places.slice(0, 15),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItinerary(data);
        haptic.success();
      } else {
        throw new Error('Falha na resposta do servidor');
      }
    } catch (err) {
      console.warn('Itinerary fetch error:', err);
      setItineraryError('Não foi possível gerar o roteiro com Gemini no momento.');
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'itinerary' && !itinerary && !isGeneratingItinerary) {
      loadThreeStopItinerary();
    }
  }, [viewMode]);

  const handleAlternateOptions = () => {
    sound.tap();
    haptic.refresh();
    setShuffleSeed((prev) => prev + 1);
    setHighlightedIndex(null);
  };

  const handleRouletteDecide = () => {
    sound.tap();
    haptic.medium();
    setIsDecidingRoulette(true);
    let count = 0;
    const interval = setInterval(() => {
      setHighlightedIndex(count % topThree.length);
      sound.tap();
      haptic.light();
      count++;
      if (count > 12) {
        clearInterval(interval);
        const finalChoice = Math.floor(Math.random() * topThree.length);
        setHighlightedIndex(finalChoice);
        setIsDecidingRoulette(false);
        sound.success();
        haptic.success();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4FF3A', '#FF3D7F', '#6A4CFF', '#FFA36C'],
        });
      }
    }, 100);
  };

  const getSessionLabels = () => {
    const whenMap = {
      agora: 'Agora',
      hoje_noite: 'Hoje à noite',
      amanha_tarde: 'Amanhã tarde',
      amanha_noite: 'Amanhã noite',
      fim_de_semana: 'Fim de semana',
    };
    const withMap = {
      casal: 'Casal · romântico',
      amigos: 'Amigos / galera',
      sozinho: 'Sozinho',
      familia: 'Família',
      trabalho: 'Trabalho',
    };
    return `${whenMap[session.when]} · ${withMap[session.withWhom]}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14102E] overflow-y-auto no-scrollbar relative p-4 sm:p-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <button
          onClick={() => {
            sound.tap();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.tap();
              haptic.light();
              const target = highlightedIndex !== null ? topThree[highlightedIndex] : topThree[0];
              setPlaceToShare(target);
              setIsShareModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF3D7F] to-[#6A4CFF] hover:from-[#ff528d] hover:to-[#7c5eff] text-white text-xs font-unbounded font-black tracking-wide shadow-md active:scale-95 transition-all cursor-pointer"
            title="Compartilhar imagem do rolê escolhido"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar Vibe</span>
          </button>

          {viewMode === 'options' ? (
            <button
              onClick={handleAlternateOptions}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[#D4FF3A] text-xs font-semibold border border-white/10 active:scale-95 transition-all"
              title="Ver outros 3 locais para este momento"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Alternar</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sound.tap();
                haptic.refresh();
                loadThreeStopItinerary();
              }}
              disabled={isGeneratingItinerary}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#6A4CFF]/30 hover:bg-[#6A4CFF]/50 text-[#D4FF3A] text-xs font-semibold border border-[#6A4CFF]/40 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingItinerary ? 'animate-spin' : ''}`} />
              <span>Regerar Roteiro</span>
            </button>
          )}

          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-[#FF3D7F]/20 text-[#FF3D7F] text-xs font-unbounded font-black tracking-wide border border-[#FF3D7F]/30">
            {getSessionLabels()}
          </span>
        </div>
      </div>

      {/* Mode Switcher Tabs (3 Opções vs Roteiro de 3 Paradas) */}
      <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/10 mb-5 shrink-0">
        <button
          onClick={() => {
            sound.tap();
            haptic.light();
            setViewMode('options');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-unbounded font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            viewMode === 'options'
              ? 'bg-[#D4FF3A] text-[#14102E] shadow-md font-black'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <span>3 Melhores Opções</span>
        </button>

        <button
          onClick={() => {
            sound.tap();
            haptic.light();
            setViewMode('itinerary');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-unbounded font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            viewMode === 'itinerary'
              ? 'bg-gradient-to-r from-[#6A4CFF] to-[#FF3D7F] text-white shadow-md font-black'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D4FF3A]" />
          <span>Roteiro 3 Paradas (Gemini)</span>
        </button>
      </div>

      {/* VIEW MODE 1: 3 Opções Individuais */}
      {viewMode === 'options' && (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-[#D4FF3A] text-[#14102E] font-black text-xs flex items-center justify-center font-unbounded">
                3
              </span>
              <h1 className="font-unbounded font-black text-2xl text-white">
                Três lugares pra agora
              </h1>
            </div>
            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Aqui estão os 3 lugares ideais com motivo claro, horário, distância e benefícios exclusivos.
            </p>
          </div>

          <div className="space-y-4">
            {topThree.map((place, index) => {
              const dist = calculateDistance(place.lat, place.lng);
              const saved = isSaved(place.id);
              const isSelectedByRoulette = highlightedIndex === index;

              return (
                <div
                  key={place.id}
                  className={`rounded-3xl border transition-all duration-300 overflow-hidden relative ${
                    isSelectedByRoulette
                      ? 'bg-[#21164e] border-[#D4FF3A] shadow-[0_0_30px_rgba(212,255,58,0.4)] scale-[1.02]'
                      : 'bg-[#1b153d] border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Image & Badges */}
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={place.imageUrl}
                      alt={place.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1b153d] via-black/30 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-unbounded font-bold text-[#D4FF3A]">
                        {place.categoryLabel}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-sans font-semibold text-white">
                        {place.priceLevel}
                      </span>
                      {place.coupon && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FF3D7F] text-white text-[10px] font-unbounded font-black shadow-md animate-pulse">
                          🏷️ {place.coupon.discount}
                        </span>
                      )}
                    </div>

                    {/* Save Heart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.pop();
                        haptic.light();
                        onToggleSave(place);
                      }}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                        saved
                          ? 'bg-[#FF3D7F] text-white shadow-lg'
                          : 'bg-black/50 text-white/80 hover:text-white hover:bg-black/70'
                      }`}
                      title={saved ? 'Remover dos Guardados' : 'Guardar pra depois'}
                    >
                      <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                    </button>

                    {/* Rating & Real Distance Pill */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md">
                        <Star className="w-3.5 h-3.5 fill-[#D4FF3A] text-[#D4FF3A]" />
                        <span className="font-bold">{place.rating}</span>
                        <span className="text-white/60">({place.reviewCount})</span>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white/90">
                        <MapPin className="w-3 h-3 text-[#FF3D7F]" />
                        <span>{dist.km} km</span>
                        <span className="text-white/40">•</span>
                        <span>{dist.walkingMin} min a pé</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-unbounded font-black text-lg text-white">
                          {place.title}
                        </h3>
                        <p className="text-xs text-white/60 font-sans">
                          {place.address}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        {place.openStatus}
                      </span>
                    </div>

                    {/* Motivo Agora */}
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#FF3D7F]/20 border border-[#6A4CFF]/30 my-3">
                      <span className="text-[10px] font-unbounded uppercase font-black tracking-wider text-[#FFA36C] block mb-1">
                        Por que combina com você agora:
                      </span>
                      <p className="text-xs text-white/90 font-sans leading-relaxed">
                        “{place.motivoAgora}”
                      </p>
                    </div>

                    {/* Partner Coupon Highlight if present */}
                    {place.coupon && (
                      <div className="p-2.5 rounded-xl bg-[#FF3D7F]/10 border border-[#FF3D7F]/30 flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-unbounded font-black text-[#FF3D7F]">
                            {place.coupon.discount}
                          </span>
                          <span className="text-[11px] text-white/80 font-sans">
                            {place.coupon.title}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#FF3D7F]/20 text-[#FF3D7F] text-[10px] font-mono font-bold">
                          {place.coupon.code}
                        </span>
                      </div>
                    )}

                    {/* Current Event Badge */}
                    {place.currentEvent && (
                      <div className="flex items-center gap-2 text-xs text-[#D4FF3A] bg-[#D4FF3A]/10 px-3 py-1.5 rounded-xl border border-[#D4FF3A]/20 mb-4">
                        <Flame className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold truncate">
                          {place.currentEvent.title} · {place.currentEvent.time}
                        </span>
                      </div>
                    )}

                    {/* Action CTAs */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          sound.tap();
                          haptic.medium();
                          onNavigateToPlace(place);
                        }}
                        className="py-3 px-3 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 fill-[#14102E]" />
                        <span>Me leva lá</span>
                      </button>

                      <button
                        onClick={() => {
                          sound.tap();
                          haptic.light();
                          onSelectPlace(place);
                        }}
                        className="py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <span>Ver detalhes</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        sound.tap();
                        haptic.light();
                        setPlaceToShare(place);
                        setIsShareModalOpen(true);
                      }}
                      className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#FF3D7F]/20 hover:from-[#6A4CFF]/35 hover:to-[#FF3D7F]/35 text-[#D4FF3A] border border-[#6A4CFF]/40 text-xs font-unbounded font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#D4FF3A]" />
                      <span>Compartilhar Vibe</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Bottom Roulette Bar */}
          <div className="sticky bottom-2 mt-6 p-3 rounded-3xl bg-[#14102E]/95 backdrop-blur-xl border border-[#D4FF3A]/30 shadow-2xl flex items-center justify-between gap-3">
            <div className="text-left">
              <span className="text-[11px] font-bold text-white block">
                Indeciso entre os três?
              </span>
              <span className="text-[10px] text-white/60">
                Deixa a roleta do vamo.AI escolher
              </span>
            </div>

            <button
              onClick={handleRouletteDecide}
              disabled={isDecidingRoulette}
              className="px-5 py-2.5 rounded-full bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#14102E]" />
              <span>{isDecidingRoulette ? 'Girando...' : 'Decide por mim'}</span>
            </button>
          </div>
        </>
      )}

      {/* VIEW MODE 2: Roteiro de 3 Paradas (Gemini) */}
      {viewMode === 'itinerary' && (
        <div className="space-y-5">
          {isGeneratingItinerary ? (
            <div className="p-8 rounded-3xl bg-[#1b153d] border border-white/10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#6A4CFF]/30 text-[#D4FF3A] flex items-center justify-center mx-auto animate-spin">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-unbounded font-black text-lg text-white">
                Gemini criando seu roteiro de 3 paradas...
              </h3>
              <p className="text-xs text-white/60 max-w-sm mx-auto">
                Conectando o esquenta de drinques, o prato principal e a saideira perfeita com distâncias curtas e horários sincronizados.
              </p>
            </div>
          ) : itinerary ? (
            <>
              {/* Itinerary Header */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-[#6A4CFF]/30 via-[#FF3D7F]/20 to-[#14102E] border border-[#6A4CFF]/40 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4FF3A] text-[#14102E] font-unbounded text-[10px] font-black">
                    IA GEMINI 3.8 FLASH
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">
                    ⏱️ Duração total ~{itinerary.totalDurationHours}
                  </span>
                </div>

                <h2 className="font-unbounded font-black text-xl sm:text-2xl text-white mb-1">
                  {itinerary.title}
                </h2>
                <p className="text-xs text-[#D4FF3A] font-semibold mb-2">
                  {itinerary.tagline}
                </p>
                <p className="text-xs text-white/80 leading-relaxed font-sans">
                  💡 {itinerary.curatorNotes}
                </p>
              </div>

              {/* 3 Sequential Stops Timeline */}
              <div className="space-y-4 relative">
                {itinerary.stops.map((stop, sIndex) => {
                  const place = stop.place;
                  const dist = calculateDistance(place.lat, place.lng);
                  const isLast = sIndex === itinerary.stops.length - 1;

                  return (
                    <div key={`stop-${stop.order}-${place.id}`} className="relative">
                      {/* Stop Card */}
                      <div className="rounded-3xl bg-[#1b153d] border border-white/15 overflow-hidden hover:border-[#D4FF3A]/40 transition-all">
                        {/* Top Stage Header */}
                        <div className="p-3.5 bg-black/40 border-b border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#6A4CFF] text-white font-unbounded font-black text-xs flex items-center justify-center">
                              {stop.order}
                            </span>
                            <span className="font-unbounded font-bold text-xs text-[#D4FF3A]">
                              {stop.stageName}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
                            🕒 {stop.timeSlot}
                          </span>
                        </div>

                        {/* Place Details inside Stop */}
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                          <img
                            src={place.imageUrl}
                            alt={place.title}
                            className="w-full sm:w-28 h-28 rounded-2xl object-cover shrink-0 border border-white/10"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <div>
                                <span className="text-[10px] font-unbounded text-white/50 block">
                                  {place.categoryLabel} · {place.priceLevel}
                                </span>
                                <h3 className="font-unbounded font-black text-base text-white">
                                  {place.title}
                                </h3>
                              </div>
                              <span className="flex items-center gap-1 text-xs font-bold text-white bg-black/40 px-2 py-1 rounded-full shrink-0">
                                <Star className="w-3 h-3 fill-[#D4FF3A] text-[#D4FF3A]" />
                                {place.rating}
                              </span>
                            </div>

                            <p className="text-xs text-white/60 mb-2 truncate">
                              📍 {place.address}
                            </p>

                            {/* Rationale & Recommended Order */}
                            <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                              <p className="text-white/90">
                                <strong className="text-[#FFA36C]">Por que aqui:</strong> {stop.rationale}
                              </p>
                              <p className="text-emerald-300">
                                <strong>Pedido certeiro:</strong> {stop.recommendedOrder}
                              </p>
                            </div>

                            {/* Partner Coupon if available */}
                            {place.coupon && (
                              <div className="mt-2 p-2 rounded-lg bg-[#FF3D7F]/15 border border-[#FF3D7F]/30 flex items-center justify-between text-xs text-white">
                                <span className="font-unbounded font-bold text-[#FF3D7F]">
                                  🏷️ {place.coupon.discount}
                                </span>
                                <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-white/90">
                                  {place.coupon.code}
                                </span>
                              </div>
                            )}

                            {/* CTAs */}
                            <div className="flex items-center gap-2 mt-3 pt-1">
                              <button
                                onClick={() => {
                                  sound.tap();
                                  haptic.medium();
                                  onNavigateToPlace(place);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                              >
                                <Navigation className="w-3.5 h-3.5 fill-[#14102E]" />
                                <span>Como Chegar</span>
                              </button>

                              <button
                                onClick={() => {
                                  sound.tap();
                                  haptic.light();
                                  onSelectPlace(place);
                                }}
                                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-xs active:scale-95 transition-all"
                              >
                                <span>Ver Detalhes</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transit Indicator to Next Stop */}
                      {!isLast && (
                        <div className="py-2 flex items-center justify-center gap-2 text-xs text-white/50">
                          <div className="h-4 w-0.5 bg-gradient-to-b from-[#6A4CFF] to-[#D4FF3A]" />
                          <span className="font-mono text-[11px] bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10 text-white/70">
                            🚗 ~{stop.transitTimeToNextMin || 10} min até a próxima parada
                          </span>
                          <div className="h-4 w-0.5 bg-gradient-to-b from-[#6A4CFF] to-[#D4FF3A]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-6 rounded-3xl bg-[#1b153d] border border-white/10 text-center">
              <p className="text-xs text-rose-300 mb-3">{itineraryError}</p>
              <button
                onClick={loadThreeStopItinerary}
                className="px-4 py-2 rounded-full bg-[#D4FF3A] text-[#14102E] font-unbounded font-black text-xs"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Share Vibe Modal */}
      {placeToShare && (
        <ShareVibeModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setPlaceToShare(null);
          }}
          place={placeToShare}
          session={session}
        />
      )}
    </div>
  );
};
