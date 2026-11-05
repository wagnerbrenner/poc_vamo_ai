import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Navigation, Star, MapPin, Compass, Locate, 
  ExternalLink, ZoomIn, ZoomOut, Heart, Clock, X, ChevronRight, Tag,
  Users, Sparkles, Ticket, Dumbbell, RotateCcw, Layers
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

interface MapCluster {
  id: string;
  places: PlaceItem[];
  x: number;
  y: number;
  lat: number;
  lng: number;
  isSingle: boolean;
  place?: PlaceItem;
  hasCoupon: boolean;
  hasCultural: boolean;
  averageRating: number;
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
  const [activeCompanion, setActiveCompanion] = useState<'todos' | 'casal' | 'amigos' | 'sozinho' | 'familia'>('todos');
  const [wellnessSubfilter, setWellnessSubfilter] = useState<'todos' | 'barbearia' | 'salao' | 'fitness'>('todos');
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);
  
  // Camera & Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [mapCenterOffset, setMapCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Smooth camera transition animation ref
  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Dragging / Pan state for touch and mouse
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Base center coordinates (User coordinates or initial city)
  const baseLat = userCoords.lat;
  const baseLng = userCoords.lng;

  // Filter places based on Category + Companion + Wellness Subtype + Open Status
  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      // 1. Cupons
      if (activeCategory === 'cupons' && !place.coupon) {
        return false;
      }

      // 2. Category
      if (activeCategory !== 'todos' && activeCategory !== 'cupons') {
        if (place.category !== activeCategory) {
          return false;
        }
      }

      // 3. Companion filter
      if (activeCompanion !== 'todos') {
        const matchesCompanion =
          place.suitableFor && place.suitableFor.includes(activeCompanion);
        if (!matchesCompanion) {
          return false;
        }
      }

      // 4. Wellness subtype filter (if in barbearias/cuidado category)
      if (activeCategory === 'barbearias' && wellnessSubfilter !== 'todos') {
        if (wellnessSubfilter === 'barbearia') {
          const isBarber =
            place.wellnessType === 'barbearia' ||
            place.title.toLowerCase().includes('barber') ||
            place.subCategory.toLowerCase().includes('barba');
          if (!isBarber) return false;
        } else if (wellnessSubfilter === 'salao') {
          const isSalon =
            place.wellnessType === 'salao' ||
            place.title.toLowerCase().includes('salão') ||
            place.title.toLowerCase().includes('beauty') ||
            place.subCategory.toLowerCase().includes('cabelo');
          if (!isSalon) return false;
        } else if (wellnessSubfilter === 'fitness') {
          const isFitness =
            place.wellnessType === 'fitness' ||
            place.title.toLowerCase().includes('cross') ||
            place.title.toLowerCase().includes('academia') ||
            place.subCategory.toLowerCase().includes('treino');
          if (!isFitness) return false;
        }
      }

      // 5. Open now
      if (onlyOpenNow && !place.isOpenNow) {
        return false;
      }

      return true;
    });
  }, [places, activeCategory, activeCompanion, wellnessSubfilter, onlyOpenNow]);

  // Projection formula for map canvas relative to base user center
  const projectCoords = useCallback(
    (lat: number, lng: number, currentOffset = mapCenterOffset, currentZoom = zoomLevel) => {
      const scale = Math.pow(2, currentZoom) * 850;
      const x = (lng - baseLng) * scale + 200 + currentOffset.x;
      const y = (baseLat - lat) * scale + 240 + currentOffset.y;
      return { x, y };
    },
    [baseLat, baseLng, mapCenterOffset, zoomLevel]
  );

  // Smooth animation function to glide the camera to a new offset and zoom
  const smoothFlyTo = useCallback(
    (targetOffset: { x: number; y: number }, targetZoom?: number, duration = 450) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      isAnimatingRef.current = true;

      const startOffset = { ...mapCenterOffset };
      const startZoom = zoomLevel;
      const finalZoom = targetZoom !== undefined ? targetZoom : zoomLevel;
      const startTime = performance.now();

      // Cubic ease-out: starts fast, lands with velvet softness
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeOutCubic(progress);

        const currentX = startOffset.x + (targetOffset.x - startOffset.x) * ease;
        const currentY = startOffset.y + (targetOffset.y - startOffset.y) * ease;
        setMapCenterOffset({ x: currentX, y: currentY });

        if (targetZoom !== undefined && targetZoom !== startZoom) {
          const currentZ = startZoom + (finalZoom - startZoom) * ease;
          setZoomLevel(currentZ);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          isAnimatingRef.current = false;
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [mapCenterOffset, zoomLevel]
  );

  // Center smoothly on selected place whenever it changes from external source or selection
  useEffect(() => {
    if (!selectedPlace) return;

    // Calculate offset required to place selectedPlace at the optimal viewport focus
    // (slightly above the center to leave room for the bottom preview card)
    const scale = Math.pow(2, zoomLevel) * 850;
    const targetOffsetX = -(selectedPlace.lng - baseLng) * scale;
    // Y has a -40px offset so pin is nicely visible above bottom drawer
    const targetOffsetY = -((baseLat - selectedPlace.lat) * scale) - 40;

    smoothFlyTo({ x: targetOffsetX, y: targetOffsetY }, undefined, 450);
  }, [selectedPlace?.id]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // =========================================================================
  // MARKER CLUSTERING ALGORITHM (Spatial Grid Clustering)
  // =========================================================================
  const clusters = useMemo(() => {
    // Dynamic cluster threshold in pixels based on zoom level:
    // When zoomed out, cluster radius is slightly larger to prevent clutter
    const clusterPixelRadius = zoomLevel < 13.5 ? 54 : zoomLevel < 15 ? 46 : 38;

    const rawProjected = filteredPlaces.map((place) => {
      const pt = projectCoords(place.lat, place.lng);
      return { place, pt };
    });

    const resultClusters: MapCluster[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < rawProjected.length; i++) {
      const current = rawProjected[i];
      if (visited.has(current.place.id)) continue;

      const clusterPlaces: PlaceItem[] = [current.place];
      visited.add(current.place.id);

      let sumX = current.pt.x;
      let sumY = current.pt.y;
      let sumLat = current.place.lat;
      let sumLng = current.place.lng;

      // Check nearby neighbors
      for (let j = i + 1; j < rawProjected.length; j++) {
        const other = rawProjected[j];
        if (visited.has(other.place.id)) continue;

        const distPx = Math.hypot(current.pt.x - other.pt.x, current.pt.y - other.pt.y);
        if (distPx <= clusterPixelRadius) {
          clusterPlaces.push(other.place);
          visited.add(other.place.id);
          sumX += other.pt.x;
          sumY += other.pt.y;
          sumLat += other.place.lat;
          sumLng += other.place.lng;
        }
      }

      const count = clusterPlaces.length;
      const isSingle = count === 1;
      const avgRating = Number(
        (clusterPlaces.reduce((acc, p) => acc + (p.rating || 0), 0) / count).toFixed(1)
      );

      resultClusters.push({
        id: isSingle ? `single-${clusterPlaces[0].id}` : `cluster-${clusterPlaces.map((p) => p.id).join('-')}`,
        places: clusterPlaces,
        x: sumX / count,
        y: sumY / count,
        lat: sumLat / count,
        lng: sumLng / count,
        isSingle,
        place: isSingle ? clusterPlaces[0] : undefined,
        hasCoupon: clusterPlaces.some((p) => !!p.coupon),
        hasCultural: clusterPlaces.some((p) => p.category === 'eventos' || !!p.culturalType),
        averageRating: avgRating,
      });
    }

    return resultClusters;
  }, [filteredPlaces, projectCoords, zoomLevel]);

  // =========================================================================
  // INTERACTION HANDLERS
  // =========================================================================
  const handlePointerDown = (e: React.PointerEvent) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...mapCenterOffset };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setMapCenterOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleResetCenter = () => {
    sound.tap();
    haptic.light();
    smoothFlyTo({ x: 0, y: 0 }, 14, 450);
    onSelectPlace(null);
  };

  const handleClusterClick = (cluster: MapCluster) => {
    sound.tap();
    haptic.medium();

    // Calculate target offset to center directly on this cluster's centroid
    const targetZoom = Math.min(zoomLevel + 2, 17);
    const scale = Math.pow(2, targetZoom) * 850;
    const targetOffsetX = -(cluster.lng - baseLng) * scale;
    const targetOffsetY = -((baseLat - cluster.lat) * scale) - 30;

    smoothFlyTo({ x: targetOffsetX, y: targetOffsetY }, targetZoom, 500);
  };

  const handleSinglePlaceClick = (place: PlaceItem) => {
    sound.tap();
    haptic.light();
    onSelectPlace(place);
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
      {/* Top Filter Chips Stack */}
      <div className="absolute top-2 left-2 right-2 z-30 flex flex-col gap-1.5 pointer-events-none">
        {/* Layer 1: Companhia (Com quem você vai?) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto py-1 px-1">
          <span className="text-[10px] font-unbounded font-black uppercase text-white/50 bg-black/50 px-2 py-1 rounded-full backdrop-blur-md">
            Com quem:
          </span>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'casal', label: '🥂 Date' },
            { id: 'amigos', label: '🍻 Amigos' },
            { id: 'sozinho', label: '☕ Sozinho' },
            { id: 'familia', label: '👨‍👩‍👧 Família' },
          ].map((comp) => {
            const isActive = activeCompanion === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => {
                  sound.tap();
                  haptic.light();
                  setActiveCompanion(comp.id as any);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-bold whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[#FF3D7F] text-white shadow-[0_0_12px_rgba(255,61,127,0.5)]'
                    : 'bg-[#14102E]/90 text-white/70 hover:text-white border border-white/10 backdrop-blur-md'
                }`}
              >
                {comp.label}
              </button>
            );
          })}
        </div>

        {/* Layer 2: Categorias Principais */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto py-1 px-1">
          {/* Cupons Chip */}
          <button
            onClick={() => {
              sound.tap();
              haptic.light();
              setActiveCategory((prev) => (prev === 'cupons' ? 'todos' : 'cupons'));
            }}
            className={`px-3 py-1 rounded-full text-xs font-unbounded font-black whitespace-nowrap transition-all shadow-md flex items-center gap-1 cursor-pointer active:scale-95 ${
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
                className={`px-3 py-1 rounded-full text-xs font-sans font-bold whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 ${
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

        {/* Layer 3: Cuidado Pessoal Sub-Filtro (Barbearia, Salão, Academia) */}
        {activeCategory === 'barbearias' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto py-0.5 px-1 animate-in fade-in duration-200">
            <span className="text-[10px] font-unbounded font-black text-[#D4FF3A] bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md">
              Estilo:
            </span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'barbearia', label: '✂️ Barbearias' },
              { id: 'salao', label: '💇‍♀️ Salões & Estética' },
              { id: 'fitness', label: '🏋️ Academias & Treino' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => {
                  sound.tap();
                  haptic.light();
                  setWellnessSubfilter(sub.id as any);
                }}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-unbounded font-bold transition-all cursor-pointer ${
                  wellnessSubfilter === sub.id
                    ? 'bg-[#D4FF3A] text-[#14102E]'
                    : 'bg-black/60 text-white/70 border border-white/10'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Map Controls */}
      <div className="absolute top-28 right-3 z-30 flex flex-col gap-2">
        <button
          onClick={() => {
            sound.tap();
            haptic.light();
            requestGpsLocation();
            handleResetCenter();
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-md transition-all cursor-pointer ${
            isGpsActive ? 'bg-[#D4FF3A] text-[#14102E]' : 'bg-[#14102E]/90 text-white hover:bg-white/10'
          }`}
          title="Minha localização GPS"
        >
          <Locate className={`w-5 h-5 ${gpsLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={handleResetCenter}
          className="w-10 h-10 rounded-full bg-[#14102E]/90 text-white/80 hover:text-white flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-md hover:bg-white/10 cursor-pointer"
          title="Recentralizar mapa"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            sound.tap();
            setZoomLevel((prev) => Math.min(prev + 0.5, 17));
          }}
          className="w-10 h-10 rounded-full bg-[#14102E]/90 text-white flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-md hover:bg-white/10 cursor-pointer"
          title="Aproximar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            sound.tap();
            setZoomLevel((prev) => Math.max(prev - 0.5, 12));
          }}
          className="w-10 h-10 rounded-full bg-[#14102E]/90 text-white flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-md hover:bg-white/10 cursor-pointer"
          title="Afastar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Styled Google Maps Vector Layer (Pan & Drag Enabled) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden touch-none"
      >
        {/* Night Map Grids & Streets Aesthetics */}
        <svg className="w-full h-full absolute inset-0 pointer-events-none">
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
            <linearGradient id="clusterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6A4CFF" />
              <stop offset="100%" stopColor="#D4FF3A" />
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
          <path d="M -100 240 Q 200 200, 600 270" fill="none" stroke="#2f2563" strokeWidth="10" opacity="0.6" />
          <path d="M 220 -100 Q 180 200, 240 600" fill="none" stroke="#2f2563" strokeWidth="8" opacity="0.6" />
          <path d="M 50 120 L 450 420" fill="none" stroke="#211848" strokeWidth="6" opacity="0.5" />

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
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center transition-all duration-300"
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

        {/* =========================================================================
            MARKERS & CLUSTERS LAYER (Avoids Overlap via Spatial Clustering)
            ========================================================================= */}
        {clusters.map((cluster) => {
          // If cluster represents a single place: render single pin
          if (cluster.isSingle && cluster.place) {
            const place = cluster.place;
            const pt = projectCoords(place.lat, place.lng);
            const isSelected = selectedPlace?.id === place.id;
            const isCultural = place.category === 'eventos' || place.culturalType;

            return (
              <div
                key={place.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSinglePlaceClick(place);
                }}
                style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-300 z-20 flex flex-col items-center group pointer-events-auto ${
                  isSelected ? 'scale-125 z-40' : 'hover:scale-110'
                }`}
              >
                {/* Rating pill or coupon badge above pin */}
                <div
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 shadow-md flex items-center gap-1 border transition-all ${
                    isSelected
                      ? 'bg-[#D4FF3A] text-[#14102E] border-[#D4FF3A]'
                      : place.coupon
                      ? 'bg-[#FF3D7F] text-white border-[#FF3D7F]'
                      : isCultural
                      ? 'bg-[#6A4CFF] text-white border-[#6A4CFF]'
                      : 'bg-[#14102E]/90 text-white border-white/20'
                  }`}
                >
                  {place.coupon ? (
                    <span>🏷️ {place.coupon.discount}</span>
                  ) : isCultural ? (
                    <span>🎭 Ingressos</span>
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
                      fill={isSelected ? '#D4FF3A' : place.coupon ? '#FF3D7F' : isCultural ? '#6A4CFF' : 'url(#vamoPinGrad)'}
                    />
                    <path
                      d="M42 26L68 40L42 54V26Z"
                      fill={isSelected ? '#14102E' : '#D4FF3A'}
                    />
                  </svg>
                </div>

                {/* Mini Label */}
                <span
                  className={`text-[10px] font-sans font-bold whitespace-nowrap mt-1 px-1.5 py-0.5 rounded-md backdrop-blur-md ${
                    isSelected ? 'bg-[#D4FF3A] text-[#14102E]' : 'bg-black/60 text-white/90'
                  }`}
                >
                  {place.title.split('&')[0].trim()}
                </span>
              </div>
            );
          }

          // If cluster has multiple places: render Cluster Badge
          return (
            <div
              key={cluster.id}
              onClick={(e) => {
                e.stopPropagation();
                handleClusterClick(cluster);
              }}
              style={{ left: `${cluster.x}px`, top: `${cluster.y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-30 flex flex-col items-center group pointer-events-auto hover:scale-115 active:scale-95"
            >
              {/* Outer Pulsing Ring */}
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[#6A4CFF]/30 animate-ping absolute pointer-events-none" />
                
                {/* Main Cluster Circle */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6A4CFF] via-[#FF3D7F] to-[#D4FF3A] p-0.5 shadow-[0_0_20px_rgba(212,255,58,0.45)] flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#14102E] flex flex-col items-center justify-center text-white border border-white/20">
                    <span className="font-unbounded font-black text-xs text-[#D4FF3A] leading-none">
                      {cluster.places.length}
                    </span>
                    <span className="text-[8px] font-bold text-white/70 uppercase leading-none mt-0.5">
                      locais
                    </span>
                  </div>
                </div>

                {/* Badge decoration if cluster has coupons or events */}
                {cluster.hasCoupon ? (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF3D7F] text-[9px] font-bold flex items-center justify-center text-white border border-white/20 shadow">
                    🏷️
                  </span>
                ) : cluster.hasCultural ? (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6A4CFF] text-[9px] font-bold flex items-center justify-center text-white border border-white/20 shadow">
                    🎭
                  </span>
                ) : null}
              </div>

              {/* Cluster Hint Pill */}
              <div className="mt-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[9px] font-bold text-white/90 whitespace-nowrap shadow-md group-hover:border-[#D4FF3A] transition-colors flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-[#D4FF3A]" />
                <span>Toque para aproximar</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Place Bottom Drawer / Preview Card */}
      {selectedPlace && (() => {
        const dist = calculateDistance(selectedPlace.lat, selectedPlace.lng);
        const isCultural = selectedPlace.category === 'eventos' || selectedPlace.culturalType;

        return (
          <div className="absolute bottom-3 left-3 right-3 z-40 bg-[#14102E]/95 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Close pin button */}
            <button
              onClick={() => {
                sound.tap();
                onSelectPlace(null);
              }}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white absolute top-3 right-3 cursor-pointer"
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
                  {isCultural && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#6A4CFF] text-white text-[9px] font-unbounded font-black">
                      🎟️ Ingressos
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

            {/* Actions: Direct Route (Waze / Google Maps) + Ingressos + Ver Detalhes */}
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
                className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all truncate cursor-pointer"
              >
                <span>{isCultural ? '🎟️ Ingressos' : 'Detalhes'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
