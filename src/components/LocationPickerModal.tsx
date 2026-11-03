import React, { useState, useMemo } from 'react';
import { X, MapPin, Locate, Check, Sparkles, Search, Car, Compass, ArrowRight } from 'lucide-react';
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
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');

  // 2 Getaway cities within ~100km based on user coords
  const nearbyGetawayCities = useMemo(() => {
    return getNearbyCitiesAround100km();
  }, [getNearbyCitiesAround100km]);

  // Search filtered cities
  const filteredSearchCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_EXPLORE_CITIES.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.neighborhood.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.vibeTag.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectAndClose = (city: LocationCity) => {
    sound.tap();
    haptic.medium();
    setCurrentCity(city);
    onClose(); // Closes immediately on selection
  };

  const handleUseGps = () => {
    sound.tap();
    haptic.light();
    requestGpsLocation((resolvedCity) => {
      haptic.success();
      onClose(); // Automatically close modal when GPS + city name resolves
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FF3D7F]/20 text-[#FF3D7F] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-wider">
                Geolocalização & Cidades
              </span>
              <h2 className="font-unbounded font-black text-lg text-white">
                Onde você quer curtir?
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar cidade (ex: Santos, Campinas, Rio, Curitiba)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none focus:bg-white/10 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="py-2 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* Search Results if user is typing */}
          {searchQuery ? (
            <div className="space-y-2">
              <span className="text-[11px] font-unbounded font-bold text-white/60 block">
                Resultados da busca ({filteredSearchCities.length}):
              </span>
              {filteredSearchCities.length > 0 ? (
                filteredSearchCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectAndClose(city)}
                    className="w-full p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-left flex items-center justify-between transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-unbounded font-bold text-sm text-white group-hover:text-[#D4FF3A] transition-colors">
                          {city.name} - {city.state}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/70">
                          {city.vibeTag}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-0.5">
                        {city.neighborhood}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#D4FF3A] group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              ) : (
                <p className="text-xs text-white/50 p-4 text-center">
                  Nenhuma cidade encontrada para "{searchQuery}". Tente outro nome.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Live GPS Button (Detects actual City Name) */}
              <button
                onClick={handleUseGps}
                disabled={gpsLoading}
                className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isGpsActive
                    ? 'bg-[#D4FF3A]/10 border-[#D4FF3A] text-white shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isGpsActive ? 'bg-[#D4FF3A] text-[#14102E]' : 'bg-white/10 text-white'
                  }`}>
                    <Locate className={`w-5 h-5 ${gpsLoading ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-left">
                    <span className="font-unbounded font-bold text-sm block">
                      Detectar minha Cidade via GPS
                    </span>
                    <span className="text-xs text-white/60">
                      {gpsLoading
                        ? 'Identificando sua cidade em tempo real...'
                        : 'Localiza sua cidade e fecha automaticamente'}
                    </span>
                  </div>
                </div>

                {isGpsActive && (
                  <div className="w-6 h-6 rounded-full bg-[#D4FF3A] flex items-center justify-center text-[#14102E] shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {gpsError && (
                <p className="text-xs text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  {gpsError}
                </p>
              )}

              {/* 2 Cidades legais em torno de 100km (Bate-volta recomendado) */}
              {nearbyGetawayCities.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#FF3D7F]/15 border border-[#6A4CFF]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-unbounded font-bold text-[#D4FF3A]">
                      <Car className="w-3.5 h-3.5" />
                      <span>Bate-volta: Cidades a ~100km</span>
                    </div>
                    <span className="text-[10px] text-white/50">Ideal p/ hoje</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {nearbyGetawayCities.map((dest) => {
                      const isSelected = currentCity.name === dest.name;
                      return (
                        <button
                          key={dest.id}
                          onClick={() => handleSelectAndClose(dest)}
                          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                            isSelected
                              ? 'bg-[#D4FF3A] text-[#14102E] border-[#D4FF3A]'
                              : 'bg-black/30 border-white/10 hover:border-[#D4FF3A]/60 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-unbounded font-black text-xs">
                              {dest.name} - {dest.state}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected ? 'bg-black/20 text-[#14102E]' : 'bg-white/10 text-[#D4FF3A]'
                            }`}>
                              ~{dest.distanceKm} km
                            </span>
                          </div>
                          <p className={`text-[11px] truncate ${isSelected ? 'text-[#14102E]/80' : 'text-white/60'}`}>
                            {dest.vibeTag}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preset / Favorite Hubs */}
              <div>
                <span className="text-xs font-unbounded font-bold text-white/70 block mb-2">
                  Ou escolha outra região:
                </span>
                <div className="space-y-2">
                  {PRESET_CITIES.map((city) => {
                    const isSelected = !isGpsActive && currentCity.id === city.id;
                    return (
                      <button
                        key={city.id}
                        onClick={() => handleSelectAndClose(city)}
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#6A4CFF]/30 border-[#D4FF3A] text-white shadow-sm'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                        }`}
                      >
                        <div>
                          <span className="font-unbounded font-bold text-sm text-white">
                            {city.name} - {city.state}
                          </span>
                          <p className="text-xs text-white/60 mt-0.5">
                            {city.neighborhood}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#D4FF3A] flex items-center justify-center text-[#14102E] shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
