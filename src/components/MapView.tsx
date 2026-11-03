import React, { useState, useMemo } from 'react';
import { 
  Navigation, Star, MapPin, Compass, Locate, 
  ExternalLink, Layers, ZoomIn, ZoomOut, Heart, Clock, X, ChevronRight, Tag 
} from 'lucide-react';
import { PlaceItem, CategorySlug } from '../types';
import { CATEGORIES } from '../data/mockPlaces';
import { useLocation } from '../context/LocationContext';
import { sound, haptic } from '../utils/audioHaptics';

interface MapViewProps {
  places: PlaceItem[];
  selectedPlace: PlaceItem | null;
  onSelectPlace: (place: PlaceItem | null) => void;
  onOpenDetail: (place: PlaceItem) => void;
  isSaved: (placeId: string) => boolean;
  onToggleSave: (place: PlaceItem) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  onOpenDetail,
  isSaved,
  onToggleSave,
}) => {
  const { userCoords, currentCity, requestGpsLocation, isGpsActive, gpsLoading, calculateDistance } = useLocation();
  const [activeCategory, setActiveCategory] = useState<CategorySlug | 'cupons'>('todos');
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [mapCenterOffset, setMapCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter places
  const filteredPlaces = useMemo(() => {
    return places.filter(place => {
      if (activeCategory === 'cupons') {
        return !!place.coupon;
      }
      const matchCat = activeCategory === 'todos' || place.category === activeCategory;
      const matchOpen = !onlyOpenNow || place.isOpenNow;
      return matchCat && matchOpen;
    });
  }, [places, activeCategory, onlyOpenNow]);

  // Center coordinate reference
  const centerLat = selectedPlace ? selectedPlace.lat : userCoords.lat;
  const centerLng = selectedPlace ? selectedPlace.lng : userCoords.lng;

  // Projection formula for map canvas relative to center
  const projectCoords = (lat: number, lng: number) => {
    const scale = Math.pow(2, zoomLevel) * 850;
    const x = (lng - centerLng) * scale + 200 + mapCenterOffset.x;
    const y = (centerLat - lat) * scale + 240 + mapCenterOffset.y;
    return { x, y };
  };

  const handleOpenGoogleMaps = (place: PlaceItem) => {
    sound.tap();
    haptic.medium();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${encodeURIComponent(place.title)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenWaze = (place: PlaceItem) => {
    sound.tap();
    haptic.medium();
    const wazeUrl = `https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`;
    window.open(wazeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#100c24] select-none flex flex-col">
      {/* Top Filter Chips Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto py-1">
          {/* Cupons Chip */}
          <button
            onClick={() => {
              sound.tap();
              haptic.light();
              setActiveCategory((prev) => (prev === 'cupons' ? 'todos' : 'cupons'));
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-unbounded font-black whitespace-nowrap transition-all shadow-md flex items-center gap-1 cursor-pointer ${
              activeCategory === 'cupons'
                ? 'bg-[#FF3D7F] text-white scale-105 shadow-[0_0_15px_rgba(255,61,127,0.5)]'
                : 'bg-[#14102E]/90 text-[#FF3D7F] hover:bg-[#FF3D7F]/20 border border-[#FF3D7F]/40 backdrop-blur-md'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>🏷️ Cupons</span>
          </button>

          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  sound.tap();
                  haptic.light();
                  setActiveCategory(cat.id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-all shadow-md cursor-pointer ${
                  isActive
                    ? 'bg-[#D4FF3A] text-[#14102E] font-black scale-105'
                    : 'bg-[#14102E]/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Map Controls */}
      <div className="absolute top-16 right-3 z-30 flex flex-col gap-2">
        <button
          onClick={() => {
            sound.tap();
            haptic.light();
            requestGpsLocation();
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-md transition-all ${
            isGpsActive ? 'bg-[#D4FF3A] text-[#14102E]' : 'bg-[#14102E]/90 text-white hover:bg-white/10'
          }`}
          title="Minha localização GPS"
        >
          <Locate className={`w-5 h-5 ${gpsLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => {
            sound.tap();
            setZoomLevel(prev => Math.min(prev + 0.5, 17));
          }}
          className="w-10 h-10 rounded-full bg-[#14102E]/90 text-white flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-md hover:bg-white/10"
          title="Aproximar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            sound.tap();
            setZoomLevel(prev => Math.max(prev - 0.5, 12));
          }}
          className="w-10 h-10 rounded-full bg-[#14102E]/90 text-white flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-md hover:bg-white/10"
          title="Afastar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Styled Google Maps Vector Layer */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden">
        {/* Night Map Grids & Streets Aesthetics */}
        <svg className="w-full h-full absolute inset-0">
          <defs>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#251d4d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#100c24" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="routeLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4FF3A" />
              <stop offset="100%" stopColor="#FF3D7F" />
            </linearGradient>
            <linearGradient id="vamoPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF3D7F" />
              <stop offset="100%" stopColor="#6A4CFF" />
            </linearGradient>
            <pattern id="streetGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#251d4d" strokeWidth="1.2" opacity="0.4" />
              <circle cx="30" cy="30" r="1.5" fill="#6A4CFF" opacity="0.3" />
            </pattern>
          </defs>

          {/* Background Canvas */}
          <rect width="100%" height="100%" fill="url(#mapGlow)" />
          <rect width="100%" height="100%" fill="url(#streetGrid)" />

          {/* Stylized Urban Arteries / Avenidas */}
          <path
            d="M -100 240 Q 200 200, 600 270"
            fill="none"
            stroke="#2f2563"
            strokeWidth="10"
            opacity="0.6"
          />
          <path
            d="M 220 -100 Q 180 200, 240 600"
            fill="none"
            stroke="#2f2563"
            strokeWidth="8"
            opacity="0.6"
          />
          <path
            d="M 50 120 L 450 420"
            fill="none"
            stroke="#211848"
            strokeWidth="6"
            opacity="0.5"
          />

          {/* Route line if place is selected */}
          {selectedPlace && (() => {
            const userPt = projectCoords(userCoords.lat, userCoords.lng);
            const placePt = projectCoords(selectedPlace.lat, selectedPlace.lng);
            return (
              <g>
                <path
                  d={`M ${userPt.x} ${userPt.y} Q ${(userPt.x + placePt.x) / 2 + 30} ${(userPt.y + placePt.y) / 2 - 20}, ${placePt.x} ${placePt.y}`}
                  fill="none"
                  stroke="url(#routeLine)"
                  strokeWidth="4"
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
              </g>
            );
          })()}
        </svg>

        {/* Live User Position (Blue Radar Dot) */}
        {(() => {
          const pt = projectCoords(userCoords.lat, userCoords.lng);
          return (
            <div
              style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#6A4CFF]/30 animate-ping absolute" />
              <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_15px_#3b82f6] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <span className="absolute top-6 px-2 py-0.5 rounded-full bg-black/70 text-[9px] font-bold text-white whitespace-nowrap backdrop-blur-sm">
                Você em {currentCity.name}
              </span>
            </div>
          );
        })()}

        {/* Custom Brand Place Markers */}
        {filteredPlaces.map((place) => {
          const pt = projectCoords(place.lat, place.lng);
          const isSelected = selectedPlace?.id === place.id;

          return (
            <div
              key={place.id}
              onClick={() => {
                sound.tap();
                haptic.light();
                onSelectPlace(place);
              }}
              style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
              className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-300 z-20 flex flex-col items-center group ${
                isSelected ? 'scale-125 z-40' : 'hover:scale-110'
              }`}
            >
              {/* Rating pill or coupon badge above pin */}
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 shadow-md flex items-center gap-1 border transition-all ${
                isSelected 
                  ? 'bg-[#D4FF3A] text-[#14102E] border-[#D4FF3A]' 
                  : place.coupon
                  ? 'bg-[#FF3D7F] text-white border-[#FF3D7F]'
                  : 'bg-[#14102E]/90 text-white border-white/20'
              }`}>
                {place.coupon ? (
                  <span>🏷️ {place.coupon.discount}</span>
                ) : (
                  <>
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>{place.rating}</span>
                  </>
                )}
              </div>

              {/* Pino + Play Pin Vector Icon */}
              <div className="w-8 h-8 relative drop-shadow-[0_4px_10px_rgba(255,61,127,0.5)]">
                <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                  <path
                    d="M50 94C50 94 84 62 84 40C84 21.2223 68.7777 6 50 6C31.2223 6 16 21.2223 16 40C16 62 50 94 50 94Z"
                    fill={isSelected ? '#D4FF3A' : place.coupon ? '#FF3D7F' : 'url(#vamoPinGrad)'}
                  />
                  <path
                    d="M42 26L68 40L42 54V26Z"
                    fill={isSelected ? '#14102E' : '#D4FF3A'}
                  />
                </svg>
              </div>

              {/* Mini Label */}
              <span className={`text-[10px] font-sans font-bold whitespace-nowrap mt-1 px-1.5 py-0.5 rounded-md backdrop-blur-md ${
                isSelected ? 'bg-[#D4FF3A] text-[#14102E]' : 'bg-black/60 text-white/90'
              }`}>
                {place.title.split('&')[0].trim()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected Place Bottom Drawer / Preview Card */}
      {selectedPlace && (() => {
        const dist = calculateDistance(selectedPlace.lat, selectedPlace.lng);
        const saved = isSaved(selectedPlace.id);

        return (
          <div className="absolute bottom-3 left-3 right-3 z-40 bg-[#14102E]/95 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Close pin button */}
            <button
              onClick={() => {
                sound.tap();
                onSelectPlace(null);
              }}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white absolute top-3 right-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <img
                src={selectedPlace.imageUrl}
                alt={selectedPlace.title}
                className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-white/10"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold">
                    {selectedPlace.categoryLabel}
                  </span>
                  {selectedPlace.coupon && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FF3D7F] text-white text-[9px] font-unbounded font-black">
                      🏷️ {selectedPlace.coupon.discount}
                    </span>
                  )}
                </div>

                <h4 className="font-unbounded font-black text-sm text-white truncate">
                  {selectedPlace.title}
                </h4>

                <div className="flex items-center gap-3 mt-1 text-xs text-white/70">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <Star className="w-3 h-3 fill-[#D4FF3A] text-[#D4FF3A]" />
                    {selectedPlace.rating}
                  </span>
                  <span>{selectedPlace.priceLevel}</span>
                  <span className="text-[#FFA36C] font-medium">
                    {dist.km} km · {dist.walkingMin} min a pé
                  </span>
                </div>

                <p className="text-[11px] text-white/80 line-clamp-1 mt-1">
                  “{selectedPlace.motivoAgora}”
                </p>
              </div>
            </div>

            {/* Actions: Direct Route (Waze / Google Maps) + Ver Detalhes */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-white/10">
              <button
                onClick={() => handleOpenGoogleMaps(selectedPlace)}
                className="py-2 px-2 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-[11px] flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer truncate"
              >
                <Navigation className="w-3 h-3 fill-[#14102E]" />
                <span>Google Maps</span>
              </button>

              <button
                onClick={() => handleOpenWaze(selectedPlace)}
                className="py-2 px-2 rounded-xl bg-[#33CCFF] hover:bg-[#20b8eb] text-[#14102E] font-unbounded font-black text-[11px] flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer truncate"
              >
                <Compass className="w-3 h-3" />
                <span>Waze</span>
              </button>

              <button
                onClick={() => {
                  sound.tap();
                  haptic.light();
                  onOpenDetail(selectedPlace);
                }}
                className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all truncate"
              >
                <span>Detalhes</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
