import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Locate, Search, X, Check, ArrowRight, ShieldCheck, Sparkles, Navigation } from 'lucide-react';
import { useLocation, LocationCity, DestinationCity } from '../context/LocationContext';
import { sound, haptic } from '../utils/audioHaptics';

interface InitialLocationModalProps {
  onOpenManualPicker: () => void;
}

const STORAGE_KEY = '@vamo_ai:location_onboarding_completed';

const POPULAR_HUBS: { name: string; state: string; lat: number; lng: number }[] = [
  { name: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333 },
  { name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729 },
  { name: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345 },
  { name: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733 },
  { name: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480 },
  { name: 'Salvador', state: 'BA', lat: -12.9777, lng: -38.5016 },
  { name: 'Brasília', state: 'DF', lat: -15.7975, lng: -47.8919 },
  { name: 'Gramado', state: 'RS', lat: -29.3746, lng: -50.8764 },
];

export const InitialLocationModal: React.FC<InitialLocationModalProps> = ({ onOpenManualPicker }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DestinationCity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const { requestGpsLocation, gpsLoading, setCurrentCity, searchCities, currentCity } = useLocation();

  useEffect(() => {
    // Check if user already confirmed their location in this browser
    const completed = localStorage.getItem(STORAGE_KEY);
    const chosenCity = localStorage.getItem('@vamo_ai:chosen_city');
    const gpsAllowed = localStorage.getItem('@vamo_ai:gps_allowed');

    if (!completed && !chosenCity && !gpsAllowed) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  // Search cities anywhere in Brazil with fast debounce
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
        const res = await searchCities(q);
        setSearchResults(res || []);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, searchCities]);

  const handleAllowGps = () => {
    sound.tap();
    haptic.medium();
    localStorage.setItem(STORAGE_KEY, 'gps');
    requestGpsLocation((resolvedCity) => {
      haptic.success();
      setIsOpen(false);
    });
  };

  const handleSelectCity = (city: LocationCity | DestinationCity) => {
    sound.tap();
    haptic.success();
    localStorage.setItem(STORAGE_KEY, 'manual');
    setCurrentCity(city);
    setIsOpen(false);
  };

  const handleClose = () => {
    sound.tap();
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Subtle glow background */}
          <div className="absolute top-0 -left-16 w-56 h-56 bg-[#6A4CFF]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -right-16 w-56 h-56 bg-[#D4FF3A]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer z-10"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-left mb-4 pr-8">
            <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-wider block mb-1">
              Localização vamo.AI
            </span>
            <h2 className="font-unbounded font-black text-xl sm:text-2xl text-white tracking-tight leading-snug">
              Onde você está hoje?
            </h2>
            <p className="text-xs text-white/70 font-sans mt-1">
              Descubra lugares abertos agora, cupons de parceiros locais e o clima na sua região.
            </p>
          </div>

          {/* Primary Action 1: GPS Auto-Detect */}
          <button
            onClick={handleAllowGps}
            disabled={gpsLoading}
            className="w-full py-4 px-4 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs sm:text-sm flex items-center justify-between shadow-[0_8px_22px_rgba(212,255,58,0.35)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 mb-3.5 group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#14102E]/10 flex items-center justify-center">
                <Locate className={`w-4 h-4 text-[#14102E] ${gpsLoading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
              </div>
              <div className="text-left">
                <span className="block leading-tight">
                  {gpsLoading ? 'Detectando sua cidade...' : 'Usar Minha Localização Real (GPS)'}
                </span>
                <span className="text-[10px] text-[#14102E]/70 font-sans font-medium block">
                  Identifica sua cidade automaticamente
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#14102E] group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2 my-2 text-white/30 text-xs font-sans">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-wider text-white/50">ou pesquise qualquer cidade</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Primary Action 2: Real-time Search Any City in Brazil */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome da sua cidade no Brasil..."
              className="w-full pl-10 pr-9 py-3 rounded-2xl bg-black/40 border border-white/20 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none focus:bg-black/60 transition-all font-sans"
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

          {/* Results List or Quick City Hubs */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mb-2 max-h-56">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-white/60 flex items-center justify-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#D4FF3A] animate-ping" />
                <span>Buscando cidades no Brasil...</span>
              </div>
            ) : searchQuery && searchResults.length > 0 ? (
              searchResults.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleSelectCity(city)}
                  className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-left flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-unbounded font-black text-xs text-white group-hover:text-[#D4FF3A] transition-colors">
                        {city.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[9px] font-bold text-white/80">
                        {city.state}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/50 block mt-0.5 truncate max-w-[280px]">
                      {city.neighborhood || city.vibeTag || 'Região'}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-[#D4FF3A] group-hover:translate-x-1 transition-all" />
                </button>
              ))
            ) : searchQuery && searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-white/50">
                Nenhuma cidade encontrada para "{searchQuery}".
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-unbounded font-bold text-white/50 uppercase block mb-2">
                  Capitais & Cidades Populares:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {POPULAR_HUBS.map((hub) => (
                    <button
                      key={hub.name}
                      onClick={() =>
                        handleSelectCity({
                          id: `hub-${hub.name.toLowerCase()}`,
                          name: hub.name,
                          state: hub.state,
                          neighborhood: 'Região Central',
                          lat: hub.lat,
                          lng: hub.lng,
                        })
                      }
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center justify-between transition-all cursor-pointer group active:scale-95"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-[#D4FF3A] shrink-0" />
                        <span className="font-unbounded font-bold text-xs text-white/90 group-hover:text-white truncate">
                          {hub.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-white/40">
                        {hub.state}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 text-[10px] text-white/40">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sua localização é usada exclusivamente para exibir os lugares reais da sua cidade.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
