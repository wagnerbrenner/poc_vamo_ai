import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, SlidersHorizontal, Star, MapPin, Heart, 
  Navigation, Flame, Check, X, Sparkles, Filter, RefreshCw, Loader2, Globe 
} from 'lucide-react';
import { PlaceItem, CategorySlug } from '../types';
import { CATEGORIES } from '../data/mockPlaces';
import { useLocation } from '../context/LocationContext';
import { googlePlacesService } from '../services/googlePlacesService';
import { sound } from '../utils/audioHaptics';

interface ExploreFeedProps {
  places: PlaceItem[];
  onSelectPlace: (place: PlaceItem) => void;
  onNavigateToPlace: (place: PlaceItem) => void;
  isSaved: (placeId: string) => boolean;
  onToggleSave: (place: PlaceItem) => void;
  onUpdatePlaces?: (newPlaces: PlaceItem[]) => void;
}

const QUICK_SEARCH_SUGGESTIONS = [
  '🍕 Pizza artesanal',
  '☕ Café especial & brunch',
  '🍸 Rooftop com drinks',
  '🥩 Parrilla & carnes',
  '🍣 Culinária japonesa',
  '💈 Barbearia retrô',
  '🎵 Bar com samba & música',
];

export const ExploreFeed: React.FC<ExploreFeedProps> = ({
  places,
  onSelectPlace,
  onNavigateToPlace,
  isSaved,
  onToggleSave,
  onUpdatePlaces,
}) => {
  const { userCoords, currentCity, calculateDistance } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug>('todos');
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);
  const [selectedPrice, setSelectedPrice] = useState<string>('todos');
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'popular'>('distance');
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [hasSearchedGoogle, setHasSearchedGoogle] = useState(false);

  // Debounced search timer
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to query Google Places API in real-time
  const triggerGooglePlacesSearch = async (
    category: CategorySlug = selectedCategory,
    query: string = searchQuery,
    radiusKm: number = maxDistance
  ) => {
    setIsSearchingLive(true);
    try {
      const res = await googlePlacesService.searchPlaces({
        lat: userCoords.lat,
        lng: userCoords.lng,
        category: category,
        query: query.trim(),
        radius: Math.round(radiusKm * 1000),
        openNow: onlyOpenNow,
      });

      if (res && res.places.length > 0 && onUpdatePlaces) {
        onUpdatePlaces(res.places);
      }
      setHasSearchedGoogle(true);
    } catch (err) {
      console.warn('Live Google Places search error in ExploreFeed:', err);
    } finally {
      setIsSearchingLive(false);
    }
  };

  // Trigger Google Places search on category change
  const handleCategorySelect = (catId: CategorySlug) => {
    sound.tap();
    setSelectedCategory(catId);
    triggerGooglePlacesSearch(catId, searchQuery, maxDistance);
  };

  // Debounced trigger on text search input
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      triggerGooglePlacesSearch(selectedCategory, val, maxDistance);
    }, 600);
  };

  const handleQuickSuggestion = (suggestion: string) => {
    sound.tap();
    const cleanQuery = suggestion.replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();
    setSearchQuery(cleanQuery);
    triggerGooglePlacesSearch(selectedCategory, cleanQuery, maxDistance);
  };

  // Filter & sort logic applied to the current places list
  const filteredPlaces = useMemo(() => {
    return places.filter(place => {
      // Category filter (if not 'todos')
      if (selectedCategory !== 'todos' && place.category !== selectedCategory) {
        return false;
      }

      // Search query client-side filtering if text is present
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = place.title.toLowerCase().includes(query);
        const matchesNeighborhood = place.neighborhood.toLowerCase().includes(query);
        const matchesSubCategory = place.subCategory.toLowerCase().includes(query);
        const matchesMotivo = place.motivoAgora.toLowerCase().includes(query);
        const matchesFeatures = place.features.some(f => f.toLowerCase().includes(query));
        if (!matchesTitle && !matchesNeighborhood && !matchesSubCategory && !matchesMotivo && !matchesFeatures) {
          return false;
        }
      }

      // Open now filter
      if (onlyOpenNow && !place.isOpenNow) {
        return false;
      }

      // Price filter
      if (selectedPrice !== 'todos' && place.priceLevel !== selectedPrice) {
        return false;
      }

      // Distance filter
      const dist = calculateDistance(place.lat, place.lng);
      if (dist.km > maxDistance) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'popular') return b.reviewCount - a.reviewCount;
      const distA = calculateDistance(a.lat, a.lng).km;
      const distB = calculateDistance(b.lat, b.lng).km;
      return distA - distB;
    });
  }, [places, selectedCategory, searchQuery, onlyOpenNow, selectedPrice, maxDistance, sortBy, calculateDistance]);

  return (
    <div className="flex-1 flex flex-col bg-[#14102E] overflow-y-auto no-scrollbar p-4 sm:p-6 pb-20">
      {/* Top Search & Filter Bar */}
      <div className="space-y-3 shrink-0 mb-4">
        {/* Live Google Places Connected Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="font-semibold text-white">Google Places (New)</span>
            <span className="text-blue-400/50">•</span>
            <span className="text-white/70 truncate">{currentCity.name}</span>
          </div>

          <button
            onClick={() => {
              sound.tap();
              triggerGooglePlacesSearch(selectedCategory, searchQuery, maxDistance);
            }}
            disabled={isSearchingLive}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 font-bold active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSearchingLive ? 'animate-spin' : ''}`} />
            <span>{isSearchingLive ? 'Buscando...' : 'Atualizar'}</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  triggerGooglePlacesSearch(selectedCategory, searchQuery, maxDistance);
                }
              }}
              placeholder="Buscar no Google Maps: cafés, pizzarias, bares..."
              className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none transition-all"
            />
            {isSearchingLive ? (
              <Loader2 className="w-4 h-4 text-[#D4FF3A] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  triggerGooglePlacesSearch(selectedCategory, '', maxDistance);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          <button
            onClick={() => {
              sound.tap();
              setShowFiltersModal(!showFiltersModal);
            }}
            className={`p-3 rounded-2xl border transition-all ${
              showFiltersModal || onlyOpenNow || selectedPrice !== 'todos' || maxDistance < 10
                ? 'bg-[#D4FF3A] text-[#14102E] border-[#D4FF3A] font-bold shadow-md'
                : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
            }`}
            title="Filtros avançados"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {QUICK_SEARCH_SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              onClick={() => handleQuickSuggestion(sug)}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-white/80 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Categories Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#D4FF3A] text-[#14102E] font-black shadow-md'
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showFiltersModal && (
          <div className="p-4 rounded-2xl bg-[#1b153d] border border-[#6A4CFF]/30 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-unbounded font-bold text-xs text-white">
                Filtros do Google Places
              </span>
              <button
                onClick={() => {
                  sound.tap();
                  setOnlyOpenNow(false);
                  setSelectedPrice('todos');
                  setMaxDistance(10);
                }}
                className="text-[11px] text-[#FFA36C] hover:underline"
              >
                Limpar filtros
              </button>
            </div>

            {/* Aberto agora toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/80">Aberto agora (Tempo Real)</span>
              <button
                onClick={() => {
                  sound.tap();
                  setOnlyOpenNow(!onlyOpenNow);
                }}
                className={`w-11 h-6 rounded-full transition-all relative p-0.5 ${
                  onlyOpenNow ? 'bg-[#D4FF3A]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#14102E] transition-all transform ${
                    onlyOpenNow ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Faixa de Preço */}
            <div>
              <span className="text-xs text-white/80 block mb-2">Faixa de preço</span>
              <div className="grid grid-cols-5 gap-1.5">
                {['todos', '$', '$$', '$$$', '$$$$'].map((price) => (
                  <button
                    key={price}
                    onClick={() => {
                      sound.tap();
                      setSelectedPrice(price);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedPrice === price
                        ? 'bg-[#FF3D7F] text-white shadow-md'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {price === 'todos' ? 'Qualquer' : price}
                  </button>
                ))}
              </div>
            </div>

            {/* Raio Máximo (Distância GPS) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/80">Distância do seu GPS</span>
                <span className="font-bold text-[#D4FF3A]">até {maxDistance} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-[#D4FF3A] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>1 km (a pé)</span>
                <span>10 km (bairro)</span>
                <span>25 km (cidade)</span>
              </div>
            </div>

            {/* Ordenação */}
            <div>
              <span className="text-xs text-white/80 block mb-2">Ordenar resultados</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'distance', label: 'Mais perto' },
                  { id: 'rating', label: 'Melhor nota' },
                  { id: 'popular', label: 'Mais avaliados' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      sound.tap();
                      setSortBy(item.id as any);
                    }}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      sortBy === item.id
                        ? 'bg-[#6A4CFF] text-white font-bold shadow-md'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-white/60 px-1">
          <div className="flex items-center gap-1.5">
            <span>{filteredPlaces.length} locais encontrados</span>
            {isSearchingLive && (
              <span className="text-[#D4FF3A] flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Atualizando Google Maps...</span>
              </span>
            )}
          </div>
          <span className="text-[#D4FF3A] font-semibold">
            {sortBy === 'distance' ? 'Mais próximos' : sortBy === 'rating' ? 'Melhores notas' : 'Mais populares'}
          </span>
        </div>
      </div>

      {/* Places Cards Grid */}
      <div className="space-y-4">
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white/5 rounded-3xl border border-white/10">
            <Sparkles className="w-8 h-8 text-[#D4FF3A] mx-auto mb-2 opacity-50" />
            <h3 className="font-unbounded font-bold text-sm text-white mb-1">
              Nenhum lugar encontrado com esses filtros
            </h3>
            <p className="text-xs text-white/60 mb-4">
              Tente aumentar a distância ou fazer uma busca no Google Maps.
            </p>
            <button
              onClick={() => {
                sound.tap();
                setSelectedCategory('todos');
                setSearchQuery('');
                setMaxDistance(15);
                triggerGooglePlacesSearch('todos', '', 15);
              }}
              className="px-4 py-2 rounded-full bg-[#D4FF3A] text-[#14102E] font-unbounded font-bold text-xs"
            >
              Buscar todos os lugares próximos
            </button>
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const dist = calculateDistance(place.lat, place.lng);
            const saved = isSaved(place.id);

            return (
              <div
                key={place.id}
                onClick={() => {
                  sound.tap();
                  onSelectPlace(place);
                }}
                className="p-4 rounded-3xl bg-[#1b153d] border border-white/10 hover:border-white/25 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 group"
              >
                {/* Photo */}
                <div className="relative w-full sm:w-36 h-36 rounded-2xl overflow-hidden shrink-0">
                  <img
                    src={place.imageUrl}
                    alt={place.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-[#D4FF3A]">
                    {place.categoryLabel}
                  </span>

                  {place.isRealGoogleMaps && (
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-blue-600/80 backdrop-blur-sm text-[9px] font-black text-white flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      <span>Google</span>
                    </span>
                  )}

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

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div>
                        <h3 className="font-unbounded font-bold text-base text-white group-hover:text-[#D4FF3A] transition-colors">
                          {place.title}
                        </h3>
                        <p className="text-xs text-white/60">
                          {place.subCategory} · {place.neighborhood}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-white/80 shrink-0">
                        {place.priceLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 my-1.5 text-xs flex-wrap">
                      <span className="flex items-center gap-1 font-bold text-[#D4FF3A]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {place.rating}
                        <span className="text-white/50 font-normal">({place.reviewCount})</span>
                      </span>

                      <span className="flex items-center gap-1 text-[#FFA36C]">
                        <MapPin className="w-3 h-3" />
                        {dist.km} km ({dist.walkingMin} min a pé)
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        place.isOpenNow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {place.openStatus}
                      </span>
                    </div>

                    <p className="text-xs text-white/80 line-clamp-2 mt-1">
                      “{place.motivoAgora}”
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.tap();
                        onNavigateToPlace(place);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-[11px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Navigation className="w-3 h-3 fill-[#14102E]" />
                      <span>Me leva lá</span>
                    </button>

                    <span className="text-[11px] text-[#FFA36C] font-semibold group-hover:underline">
                      Ver detalhes & dicas →
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
