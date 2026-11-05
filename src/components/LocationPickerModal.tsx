import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Locate, Check, Sparkles, Search, Car, Compass, ArrowRight, Building2 } from 'lucide-react';
import { useLocation, PRESET_CITIES, ALL_EXPLORE_CITIES, LocationCity, DestinationCity } from '../context/LocationContext';
import { sound, haptic } from '../utils/audioHaptics';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentCity,
    setCurrentCity,
    requestGpsLocation,
    isGpsActive,
    gpsLoading,
    gpsError,
    getNearbyCitiesAround100km,
    searchCities,
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DestinationCity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // 2 Getaway cities within ~100km based on user coords
  const nearbyGetawayCities = useMemo(() => {
    return getNearbyCitiesAround100km();
  }, [getNearbyCitiesAround100km]);

  // Live real-time search across any city in Brazil
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchCities(q);
        setSearchResults(results || []);
      } catch (err) {
        console.warn('Location picker search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, searchCities]);

  if (!isOpen) return null;

  const handleSelectAndClose = (city: LocationCity | DestinationCity) => {
    sound.tap();
    haptic.medium();
    setCurrentCity(city);
    onClose();
  };

  const handleUseGps = () => {
    sound.tap();
    haptic.light();
    requestGpsLocation((resolvedCity) => {
      haptic.success();
      onClose();
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] relative overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4FF3A]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#D4FF3A]/20 text-[#D4FF3A] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-wider block">
                  Cidades do Brasil
                </span>
                <h2 className="font-unbounded font-black text-base sm:text-lg text-white">
                  Onde você quer curtir?
                </h2>
              </div>
            </div>

            <button
              onClick={() => {
                sound.tap();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Bar (Covers 100% of Brazil) */}
          <div className="pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar qualquer cidade do Brasil (ex: Santos, Gramado, Curitiba, Salvador)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none focus:bg-black/60 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="py-2 space-y-3.5 overflow-y-auto no-scrollbar flex-1">
            {/* Search Results Display */}
            {isSearching ? (
              <div className="p-6 text-center text-xs text-white/60 flex items-center justify-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#D4FF3A] animate-ping" />
                <span>Buscando cidades no Brasil...</span>
              </div>
            ) : searchQuery && searchResults.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[10px] font-unbounded font-bold text-white/50 block px-1">
                  Resultados encontrados ({searchResults.length}):
                </span>
                {searchResults.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectAndClose(city)}
                    className="w-full p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/15 text-left flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-unbounded font-bold text-xs sm:text-sm text-white group-hover:text-[#D4FF3A] transition-colors">
                          {city.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[9px] font-bold text-white/80">
                          {city.state}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5 truncate max-w-[280px]">
                        {city.neighborhood || city.vibeTag || 'Região'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#D4FF3A] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            ) : searchQuery && searchResults.length === 0 ? (
              <p className="text-xs text-white/50 p-6 text-center">
                Nenhuma cidade encontrada para "{searchQuery}". Tente pesquisar outro município do Brasil.
              </p>
            ) : (
              <>
                {/* Live GPS Button (Detects real city) */}
                <button
                  onClick={handleUseGps}
                  disabled={gpsLoading}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                    isGpsActive
                      ? 'bg-[#D4FF3A]/10 border-[#D4FF3A] text-white shadow-md'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isGpsActive ? 'bg-[#D4FF3A] text-[#14102E]' : 'bg-white/10 text-white'
                      }`}
                    >
                      <Locate className={`w-5 h-5 ${gpsLoading ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-unbounded font-bold text-xs sm:text-sm block">
                          Localização Real via GPS
                        </span>
                        {isGpsActive && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#D4FF3A] text-[#14102E] text-[9px] font-unbounded font-black">
                            Ativo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/60 block">
                        {gpsLoading
                          ? 'Detectando sua cidade em tempo real...'
                          : `Cidade atual: ${currentCity.name} - ${currentCity.state}`}
                      </span>
                    </div>
                  </div>

                  {isGpsActive ? (
                    <div className="w-6 h-6 rounded-full bg-[#D4FF3A] flex items-center justify-center text-[#14102E] shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-white/40" />
                  )}
                </button>

                {gpsError && (
                  <p className="text-xs text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    {gpsError}
                  </p>
                )}

                {/* 2 Cidades vizinhas ~100km (Bate-volta) */}
                {nearbyGetawayCities.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#FF3D7F]/15 border border-[#6A4CFF]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-unbounded font-bold text-[#D4FF3A]">
                        <Car className="w-3.5 h-3.5" />
                        <span>Bate-volta (~100km):</span>
                      </div>
                      <span className="text-[10px] text-white/50">Ideal para sair hoje</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {nearbyGetawayCities.map((dest) => {
                        const isSelected = currentCity.name === dest.name;
                        return (
                          <button
                            key={dest.id}
                            onClick={() => handleSelectAndClose(dest)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-[#D4FF3A] text-[#14102E] border-[#D4FF3A] shadow-sm'
                                : 'bg-black/30 border-white/10 hover:border-[#D4FF3A]/60 text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-unbounded font-black text-xs truncate">
                                {dest.name}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  isSelected ? 'bg-black/20 text-[#14102E]' : 'bg-white/10 text-[#D4FF3A]'
                                }`}
                              >
                                ~{dest.distanceKm}km
                              </span>
                            </div>
                            <p className={`text-[10px] truncate ${isSelected ? 'text-[#14102E]/80' : 'text-white/60'}`}>
                              {dest.vibeTag}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Capitais e Polos Mais Buscados */}
                <div>
                  <span className="text-xs font-unbounded font-bold text-white/70 block mb-2 px-1">
                    Ou escolha uma capital/região:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESET_CITIES.map((city) => {
                      const isSelected = currentCity.name === city.name;
                      return (
                        <button
                          key={city.id}
                          onClick={() => handleSelectAndClose(city)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-[#6A4CFF]/30 border-[#D4FF3A] text-white shadow-sm'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                          }`}
                        >
                          <div className="truncate pr-1">
                            <span className="font-unbounded font-bold text-xs text-white block truncate">
                              {city.name}
                            </span>
                            <span className="text-[10px] text-white/50 truncate block">
                              {city.neighborhood.split('/')[0]}
                            </span>
                          </div>

                          {isSelected ? (
                            <div className="w-4 h-4 rounded-full bg-[#D4FF3A] flex items-center justify-center text-[#14102E] shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-white/40">
                              {city.state}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
