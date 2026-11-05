import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Heart, Star, Navigation, Phone, MessageCircle, 
  MapPin, Clock, Calendar, Check, Share2, Plus, Sparkles, Send, ShieldCheck,
  ShoppingBag, ExternalLink, MessageSquare, CheckCircle2, Utensils, Camera, BookOpen,
  Copy, Tag, Building2, ChevronLeft, ChevronRight, Ticket, Dumbbell
} from 'lucide-react';
import { PlaceItem, ReviewItem } from '../types';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../firebase/authContext';
import { 
  submitPlaceSubcollectionReview, 
  subscribeToPlaceSubcollectionReviews,
  recordUserVisit 
} from '../firebase/firestoreService';
import { offlineCacheService } from '../services/offlineCacheService';
import { googlePlacesService } from '../services/googlePlacesService';
import { sound, haptic } from '../utils/audioHaptics';
import { ExpertTipsSection } from './ExpertTipsSection';
import { WebContentSection } from './WebContentSection';
import { NavigationOptionsModal } from './NavigationOptionsModal';
import { MerchantPartnerModal } from './MerchantPartnerModal';
import { CouponCard } from './CouponCard';

interface PlaceDetailModalProps {
  place: PlaceItem | null;
  onClose: () => void;
  onToggleSave: (place: PlaceItem) => void;
  isSaved: boolean;
  onOpenMap: (place: PlaceItem) => void;
  onCheckIn?: (place: PlaceItem) => void;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  onToggleSave,
  isSaved,
  onOpenMap,
  onCheckIn,
}) => {
  const { calculateDistance } = useLocation();
  const { user, profile, signInGuest } = useAuth();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [photoCategory, setPhotoCategory] = useState<'all' | 'food' | 'ambience' | 'menu'>('all');
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [vibeTagInput, setVibeTagInput] = useState('Date romântico');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [localReviews, setLocalReviews] = useState<ReviewItem[]>([]);
  const [firestoreReviews, setFirestoreReviews] = useState<ReviewItem[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState<string | null>(null);
  const [showCheckInNoteInput, setShowCheckInNoteInput] = useState(false);
  const [checkInNote, setCheckInNote] = useState('');
  const [dynamicPhotos, setDynamicPhotos] = useState<string[]>([]);
  const [dynamicCategorizedPhotos, setDynamicCategorizedPhotos] = useState<{ food: string[]; ambience: string[]; menu: string[]; all: string[] } | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(false);
  const [googleReviews, setGoogleReviews] = useState<ReviewItem[]>([]);
  const [isLoadingGoogleReviews, setIsLoadingGoogleReviews] = useState<boolean>(false);

  // Dynamically fetch and enhance high-resolution photos using Google Places Photo API
  useEffect(() => {
    if (!place?.id) return;
    setDynamicPhotos(place.gallery && place.gallery.length > 0 ? place.gallery : [place.imageUrl]);
    setDynamicCategorizedPhotos(place.categorizedPhotos || null);
    setActiveImageIndex(0);

    // If it's a real Google Place or has photo references, fetch fresh high-res photos
    if (place.rawPhotoNames?.length || place.isRealGoogleMaps || place.id.startsWith('gmp-') || place.id.startsWith('ChIJ')) {
      setIsLoadingPhotos(true);
      googlePlacesService
        .fetchDynamicPlacePhotos(place.id, place.rawPhotoNames)
        .then((res) => {
          if (res && res.photos && res.photos.length > 0) {
            setDynamicPhotos(res.photos);
            setDynamicCategorizedPhotos(res.categorizedPhotos);
          }
        })
        .catch((err) => {
          console.warn('Dynamic photo fetch error:', err);
        })
        .finally(() => {
          setIsLoadingPhotos(false);
        });
    }
  }, [place?.id, place?.title]);

  // Dynamically fetch real Google Maps reviews for the establishment
  useEffect(() => {
    if (!place?.id) return;
    setIsLoadingGoogleReviews(true);
    googlePlacesService
      .fetchPlaceReviews(place.id, place.title, place.city)
      .then((res) => {
        if (res && res.reviews && res.reviews.length > 0) {
          setGoogleReviews(res.reviews);
        } else {
          setGoogleReviews(place.reviews || []);
        }
      })
      .catch((err) => {
        console.warn('Google reviews fetch error:', err);
        setGoogleReviews(place.reviews || []);
      })
      .finally(() => {
        setIsLoadingGoogleReviews(false);
      });
  }, [place?.id, place?.title, place?.city]);

  // Check if place is already recorded as visited
  useEffect(() => {
    if (!place?.id) return;
    setIsCheckedIn(false);
    setCheckInSuccessMsg(null);
    setShowCheckInNoteInput(false);
    setCheckInNote('');
    const uid = user?.uid || 'guest';
    offlineCacheService.loadCachedVisits(uid).then((visits) => {
      const alreadyVisited = visits.some((v) => v.placeId === place.id);
      if (alreadyVisited) {
        setIsCheckedIn(true);
      }
    });
  }, [place?.id, user?.uid]);

  // Real-time subscription to the Firestore sub-collection: places/{placeId}/reviews
  useEffect(() => {
    if (!place?.id) return;
    try {
      const unsubscribe = subscribeToPlaceSubcollectionReviews(place.id, (subReviews) => {
        if (subReviews && Array.isArray(subReviews)) {
          setFirestoreReviews(subReviews);
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('Subcollection listener error:', err);
    }
  }, [place?.id]);

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!place) return;
    sound.success();
    haptic.checkIn();
    setIsCheckingIn(true);
    const uid = user?.uid || 'guest';
    const noteText = checkInNote.trim() || 'Check-in realizado com sucesso no vamo.AI';

    try {
      const visit = await recordUserVisit(uid, place, noteText);
      await offlineCacheService.recordLocalVisit(uid, visit);
      setIsCheckedIn(true);
      setShowCheckInNoteInput(false);
      setCheckInSuccessMsg('Check-in registrado na coleção Visitas e no seu perfil!');
      if (onCheckIn) {
        onCheckIn(place);
      }
    } catch (err) {
      console.warn('Local visit fallback and sync-queue:', err);
      const fallbackVisit = {
        id: `visit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: uid,
        placeId: place.id,
        placeTitle: place.title,
        placeCategory: place.categoryLabel || place.category,
        placeAddress: place.address || '',
        placeImageUrl: place.imageUrl || '',
        visitedAt: new Date().toISOString(),
        notes: noteText,
        vibe: place.vibes?.[0] || 'gastronomia',
      };
      await offlineCacheService.recordLocalVisit(uid, fallbackVisit);
      // Enqueue to offline sync queue so it synchronizes automatically when network restores
      await offlineCacheService.enqueueSyncAction(uid, {
        type: 'CHECK_IN',
        payload: { place, notes: noteText }
      });
      setIsCheckedIn(true);
      setShowCheckInNoteInput(false);
      setCheckInSuccessMsg('Check-in salvo no histórico! Será sincronizado automaticamente.');
      if (onCheckIn) {
        onCheckIn(place);
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!place) return null;

  const dist = calculateDistance(place.lat, place.lng);
  
  // Combine local in-memory reviews, real Firestore sub-collection reviews, and Google Maps reviews (deduped by id)
  const combined = [...localReviews, ...firestoreReviews, ...googleReviews, ...(place.reviews || [])];
  const allReviews = combined.filter((rev, idx, arr) => arr.findIndex(r => r.id === rev.id) === idx);

  // Categorized Photos resolution with dynamic Google Places Photo API
  const allPhotos = dynamicPhotos.length > 0 ? dynamicPhotos : (place.gallery && place.gallery.length > 0 ? place.gallery : [place.imageUrl]);
  const foodPhotos = dynamicCategorizedPhotos?.food?.length ? dynamicCategorizedPhotos.food : (place.categorizedPhotos?.food?.length ? place.categorizedPhotos.food : allPhotos.slice(0, 3));
  const ambiencePhotos = dynamicCategorizedPhotos?.ambience?.length ? dynamicCategorizedPhotos.ambience : (place.categorizedPhotos?.ambience?.length ? place.categorizedPhotos.ambience : allPhotos.slice(0, 3));
  const menuPhotos = dynamicCategorizedPhotos?.menu?.length ? dynamicCategorizedPhotos.menu : (place.categorizedPhotos?.menu?.length ? place.categorizedPhotos.menu : allPhotos.slice(0, 2));

  const activePhotos = photoCategory === 'food' ? foodPhotos
    : photoCategory === 'ambience' ? ambiencePhotos
    : photoCategory === 'menu' ? menuPhotos
    : allPhotos;

  const hasActiveDelivery = place.features.some(f => /delivery|entrega/i.test(f));

  const handleMeLevaLa = () => {
    sound.tap();
    haptic.medium();
    setIsNavModalOpen(true);
  };

  const handleWhatsApp = () => {
    sound.tap();
    haptic.light();
    const text = encodeURIComponent(`Olá! Encontrei o ${place.title} pelo vamo.AI e gostaria de saber sobre mesas/horários para hoje.`);
    window.open(`https://wa.me/${place.whatsapp}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleDelivery = () => {
    sound.tap();
    haptic.delivery();
    const cleanTitle = place.title.replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();
    const cityParam = place.city || 'São Paulo';
    const ifoodSearchUrl = `https://www.ifood.com.br/busca?q=${encodeURIComponent(cleanTitle)}&local=${encodeURIComponent(cityParam)}`;
    window.open(ifoodSearchUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    sound.tap();
    setIsSubmittingReview(true);

    let activeUser = user;
    if (!activeUser) {
      await signInGuest();
    }

    const reviewId = `rev-${Date.now()}`;
    const newRev: ReviewItem = {
      id: reviewId,
      placeId: place.id,
      userId: user?.uid || 'guest-user',
      userName: profile?.displayName || 'Explorador vamo.AI',
      userAvatar: profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      rating: ratingInput,
      comment: commentInput.trim(),
      vibeTag: vibeTagInput,
      date: 'Agora mesmo',
    };

    try {
      if (user?.uid) {
        // Persist to the Firestore sub-collection: places/{placeId}/reviews/{reviewId}
        await submitPlaceSubcollectionReview(place.id, {
          placeId: place.id,
          userId: user.uid,
          userName: newRev.userName,
          userAvatar: newRev.userAvatar,
          rating: ratingInput,
          comment: commentInput.trim(),
          vibeTag: vibeTagInput,
          date: 'Hoje',
        });
      }
    } catch (err) {
      console.warn('Sub-collection review saved locally in-session:', err);
    }

    setLocalReviews([newRev, ...localReviews]);
    setCommentInput('');
    setShowReviewForm(false);
    setIsSubmittingReview(false);
    sound.success();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md overflow-y-auto no-scrollbar p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden my-auto">
        {/* Top Floating App Bar */}
        <div className="flex items-center justify-between p-4 bg-[#14102E]/90 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
          <button
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <span className="text-xs font-unbounded font-black tracking-tight text-white/80">
            {place.categoryLabel}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.pop();
                onToggleSave(place);
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isSaved
                  ? 'bg-[#FF3D7F] text-white shadow-md'
                  : 'bg-white/10 text-white/80 hover:text-white'
              }`}
              title={isSaved ? 'Remover dos Guardados' : 'Guardar pra depois'}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Photo Category Filter Tabs (Google Places Photo API) */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-black/40 border-b border-white/10 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Todas', icon: Camera, count: allPhotos.length },
              { id: 'food', label: 'Comida', icon: Utensils, count: foodPhotos.length },
              { id: 'ambience', label: 'Ambiente', icon: Sparkles, count: ambiencePhotos.length },
              { id: 'menu', label: 'Cardápio', icon: BookOpen, count: menuPhotos.length },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = photoCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    sound.tap();
                    haptic.light();
                    setPhotoCategory(cat.id as any);
                    setActiveImageIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-unbounded font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-[#D4FF3A] text-[#14102E] shadow-sm font-black'
                      : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-black/20 text-[#14102E]' : 'bg-white/10 text-white/60'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Gallery Carousel */}
          <div className="relative h-64 sm:h-72 w-full bg-black/40 overflow-hidden group">
            {/* Google Places Photo API High-Res Indicator Badge */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] text-white/90 font-bold">
              <Camera className="w-3 h-3 text-[#D4FF3A]" />
              <span>{isLoadingPhotos ? 'Carregando fotos HD...' : `${activePhotos.length} fotos Google Places`}</span>
              {isLoadingPhotos && <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF3A] animate-ping" />}
            </div>

            <motion.img
              layoutId={`place-image-${place.id}`}
              key={activePhotos[activeImageIndex] || place.imageUrl}
              src={activePhotos[activeImageIndex] || place.imageUrl}
              alt={place.title}
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14102E] via-transparent to-black/30 pointer-events-none" />

            {/* Left / Right Carousel Controls */}
            {activePhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.tap();
                    haptic.light();
                    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : activePhotos.length - 1));
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 z-10 active:scale-95 transition-all cursor-pointer opacity-80 hover:opacity-100"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.tap();
                    haptic.light();
                    setActiveImageIndex((prev) => (prev < activePhotos.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 z-10 active:scale-95 transition-all cursor-pointer opacity-80 hover:opacity-100"
                  title="Próxima foto"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Thumbnail Dots */}
            {activePhotos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                {activePhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      sound.tap();
                      setActiveImageIndex(i);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      activeImageIndex === i ? 'bg-[#D4FF3A] w-5' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Real Web Photos Thumbnails Strip */}
          {activePhotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pt-3 pb-1 bg-black/20">
              {activePhotos.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    sound.tap();
                    haptic.light();
                    setActiveImageIndex(i);
                  }}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    activeImageIndex === i ? 'border-[#D4FF3A] scale-105 shadow-md' : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Foto real ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-5">
            {/* Title & Key Stats */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#6A4CFF]/20 text-[#D4FF3A] font-unbounded text-[10px] font-bold border border-[#6A4CFF]/40">
                  {place.subCategory}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {place.openStatus}
                </span>
                <span className="text-white/60 text-xs font-semibold">
                  Preço: {place.priceLevel}
                </span>
              </div>

              <h1 className="font-unbounded font-black text-2xl sm:text-3xl text-white">
                {place.title}
              </h1>

              <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[#D4FF3A] text-[#D4FF3A]" />
                  <span className="font-bold text-white text-sm">{place.rating}</span>
                  <span className="text-white/60">({place.reviewCount} avaliações)</span>
                </div>
                <div className="flex items-center gap-1 text-[#FFA36C]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{dist.km} km ({dist.walkingMin} min a pé)</span>
                </div>
              </div>

              <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
                <span>{place.address}</span>
              </p>
            </div>

            {/* Motivo Agora (Signature reason) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/25 to-[#FF3D7F]/20 border border-[#6A4CFF]/30">
              <span className="text-[10px] font-unbounded uppercase font-black tracking-wider text-[#D4FF3A] block mb-1">
                Por que você deve ir agora:
              </span>
              <p className="text-xs text-white/95 font-sans leading-relaxed">
                “{place.motivoAgora}”
              </p>
            </div>

            {/* Current Event / Special Highlight */}
            {place.currentEvent && (
              <div className="p-4 rounded-2xl bg-[#D4FF3A]/10 border border-[#D4FF3A]/30">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D4FF3A] mb-1">
                  <Sparkles className="w-4 h-4 text-[#D4FF3A]" />
                  <span>{place.currentEvent.title}</span>
                </div>
                <p className="text-xs text-white/80">
                  {place.currentEvent.description}
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold text-[#14102E] bg-[#D4FF3A] px-2.5 py-0.5 rounded-full">
                  {place.currentEvent.time}
                </span>
              </div>
            )}

            {/* Ingressos & Bilheteria Oficial (Sympla, Ingresso Digital, Eventim, Bilheteria Express) */}
            {(place.category === 'eventos' ||
              place.culturalType ||
              place.ticketUrls ||
              place.subCategory.toLowerCase().includes('teatro') ||
              place.subCategory.toLowerCase().includes('show') ||
              place.subCategory.toLowerCase().includes('musical') ||
              place.subCategory.toLowerCase().includes('peça')) && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF3D7F]/20 via-[#6A4CFF]/20 to-black/40 border border-[#FF3D7F]/30 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[#FF3D7F]" />
                    <span className="font-unbounded font-black text-xs text-white">
                      Ingressos Oficiais & Bilheteria
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#D4FF3A] px-2 py-0.5 rounded-full bg-[#D4FF3A]/15 border border-[#D4FF3A]/30">
                    Disponíveis
                  </span>
                </div>
                <p className="text-[11px] text-white/80 mb-3 font-sans">
                  Garanta sua entrada antecipada nas principais ticketeiras parceiras sem filas:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Sympla */}
                  <a
                    href={
                      place.ticketUrls?.sympla ||
                      `https://www.sympla.com.br/eventos?s=${encodeURIComponent(place.title + ' ' + place.city)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#0060F4]/30 to-[#0040B0]/40 hover:from-[#0060F4]/50 hover:to-[#0040B0]/60 border border-[#0060F4]/50 flex items-center justify-between text-white transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-unbounded font-black text-xs text-[#5293FF]">Sympla</span>
                      <span className="text-[9px] text-white/60">Ver ingressos</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
                  </a>

                  {/* Ingresso Digital */}
                  <a
                    href={
                      place.ticketUrls?.ingressoDigital ||
                      `https://www.ingressodigital.com/pesquisa?busca=${encodeURIComponent(place.title)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#FF007A]/25 to-[#990049]/35 hover:from-[#FF007A]/45 hover:to-[#990049]/55 border border-[#FF007A]/40 flex items-center justify-between text-white transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-unbounded font-black text-xs text-[#FF66B2]">Ingresso Digital</span>
                      <span className="text-[9px] text-white/60">Ver sessões</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
                  </a>

                  {/* Eventim */}
                  <a
                    href={
                      place.ticketUrls?.eventim ||
                      `https://www.eventim.com.br/search/?searchterm=${encodeURIComponent(place.title)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#FFCC00]/20 to-[#B28F00]/30 hover:from-[#FFCC00]/35 hover:to-[#B28F00]/45 border border-[#FFCC00]/40 flex items-center justify-between text-white transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-unbounded font-black text-xs text-[#FFD633]">Eventim</span>
                      <span className="text-[9px] text-white/60">Shows & Festivais</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
                  </a>

                  {/* Bilheteria Express */}
                  <a
                    href={
                      place.ticketUrls?.bilheteriaExpress ||
                      `https://www.bilheteriaexpress.com.br/catalogsearch/result/?q=${encodeURIComponent(place.title)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#00D084]/20 to-[#008A57]/30 hover:from-[#00D084]/35 hover:to-[#008A57]/45 border border-[#00D084]/40 flex items-center justify-between text-white transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-unbounded font-black text-xs text-[#40E0A0]">Bilheteria Express</span>
                      <span className="text-[9px] text-white/60">Teatro & Stand-up</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
                  </a>
                </div>
              </div>
            )}

            {/* Cuidado Pessoal / Bem-Estar (Barbearia, Salão de Beleza, Academia & Fitness) */}
            {(place.category === 'barbearias' || place.wellnessType) && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#D4FF3A]/20 flex items-center justify-center text-[#D4FF3A]">
                    {place.wellnessType === 'fitness' ? (
                      <Dumbbell className="w-5 h-5" />
                    ) : place.wellnessType === 'salao' ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-unbounded font-bold text-xs text-white block">
                      {place.wellnessType === 'fitness'
                        ? 'Treino & Passe Livre Disponível'
                        : place.wellnessType === 'salao'
                        ? 'Salão & Estética com Atendimento VIP'
                        : 'Barbearia com Cadeira Livre Agora'}
                    </span>
                    <span className="text-[10px] text-white/60">
                      Reserve horário ou chegue direto pelo app
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleWhatsApp}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#D4FF3A] text-[10px] font-unbounded font-bold transition-all cursor-pointer"
                >
                  Agendar
                </button>
              </div>
            )}

            {/* Primary Action Buttons (Me Leva Lá / WhatsApp) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleMeLevaLa}
                className="py-4 px-4 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(212,255,58,0.35)] active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 fill-[#14102E]" />
                <span>Me leva lá</span>
              </button>

              <button
                onClick={handleWhatsApp}
                className="py-4 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-unbounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Pedir Delivery (iFood com verificação inteligente de entrega ativa) */}
            <button
              onClick={handleDelivery}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA1D2C] to-[#C81622] hover:from-[#f23341] hover:to-[#db1d2a] text-white font-unbounded font-bold text-xs sm:text-sm flex items-center justify-between shadow-[0_4px_16px_rgba(234,29,44,0.35)] active:scale-[0.98] transition-all cursor-pointer border border-red-400/20"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>{hasActiveDelivery ? 'Pedir no iFood (Entrega Ativa)' : 'Pedir no iFood / Delivery'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasActiveDelivery ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[9px] font-bold">
                    Aberto p/ pedidos
                  </span>
                ) : (
                  <span className="text-[10px] text-white/70 font-sans">
                    {place.city}
                  </span>
                )}
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </div>
            </button>

            {/* Partner Coupon Component (Sistema de Cupons com QR Code & Resgate Firestore) */}
            {place.coupon ? (
              <CouponCard
                coupon={place.coupon}
                place={place}
                onOpenPartnerModal={() => setIsPartnerModalOpen(true)}
              />
            ) : (
              /* Merchant Monetization Invitation Banner */
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#D4FF3A]/10 border border-[#D4FF3A]/25 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-[#D4FF3A]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      É o proprietário deste local?
                    </span>
                    <span className="text-[11px] text-white/60">
                      Anuncie cupons e atraia clientes com o plano parceiro.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.tap();
                    setIsPartnerModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#D4FF3A]/15 hover:bg-[#D4FF3A]/25 border border-[#D4FF3A]/40 text-[#D4FF3A] text-xs font-unbounded font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  Planos
                </button>
              </div>
            )}

            {/* Fazer Check-in Button (Registra visita na coleção 'visitas' no Firestore) */}
            <div className="pt-1">
              {isCheckedIn ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-between gap-3 text-emerald-300">
                  <div className="flex items-center gap-2 text-xs font-bold font-unbounded">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Visita registrada no seu perfil!</span>
                  </div>
                  <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
                    Check-in ✓
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      sound.tap();
                      setShowCheckInNoteInput(!showCheckInNoteInput);
                    }}
                    disabled={isCheckingIn}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#6A4CFF] to-[#8F4CFF] hover:from-[#7b5eff] hover:to-[#9e62ff] text-white font-unbounded font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(106,76,255,0.35)] active:scale-[0.98] transition-all cursor-pointer border border-[#6A4CFF]/40 disabled:opacity-50"
                  >
                    <MapPin className="w-4 h-4 text-[#D4FF3A]" />
                    <span>Fazer Check-in Aqui</span>
                  </button>

                  {showCheckInNoteInput && (
                    <form
                      onSubmit={handleCheckIn}
                      className="p-3.5 rounded-2xl bg-[#1b153d] border border-[#6A4CFF]/40 space-y-2.5 animate-in fade-in"
                    >
                      <label className="text-[11px] font-bold text-white/90 block">
                        Nota ou detalhe da sua visita (opcional):
                      </label>
                      <input
                        type="text"
                        value={checkInNote}
                        onChange={(e) => setCheckInNote(e.target.value)}
                        placeholder="Ex: Mesa externa agradável, pedi drinque autoral..."
                        className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none"
                      />
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowCheckInNoteInput(false)}
                          className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isCheckingIn}
                          className="px-4 py-2 rounded-full bg-[#D4FF3A] text-[#14102E] font-unbounded font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isCheckingIn ? 'Registrando...' : 'Confirmar Check-in'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {checkInSuccessMsg && (
                <p className="text-[11px] text-emerald-400 font-medium text-center mt-1.5 animate-in fade-in">
                  ✓ {checkInSuccessMsg}
                </p>
              )}
            </div>

            {/* AI-Powered Expert Tips (Dicas de Especialistas) */}
            <ExpertTipsSection place={place} />

            {/* Live Web Content & Real Photos (Google Search Grounding) */}
            <WebContentSection place={place} />

            {/* Features Tags */}
            <div>
              <span className="text-xs font-unbounded font-bold text-white/80 block mb-2">
                Destaques do estabelecimento
              </span>
              <div className="flex flex-wrap gap-2">
                {place.features.map((feat) => (
                  <span
                    key={feat}
                    className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/10 flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-[#D4FF3A]" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Map Preview Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-unbounded font-bold text-white">
                  Localização no mapa
                </span>
                <button
                  onClick={() => {
                    sound.tap();
                    onOpenMap(place);
                    onClose();
                  }}
                  className="text-xs text-[#D4FF3A] font-bold hover:underline"
                >
                  Abrir no mapa interativo →
                </button>
              </div>
              <p className="text-xs text-white/70 mb-3">
                {place.address} · {place.neighborhood}
              </p>
              <div
                onClick={() => {
                  sound.tap();
                  onOpenMap(place);
                  onClose();
                }}
                className="h-32 w-full rounded-xl bg-gradient-to-br from-[#251d4d] to-[#14102E] border border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-[#D4FF3A] transition-all relative overflow-hidden group"
              >
                <div className="w-10 h-10 rounded-full bg-[#FF3D7F] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Navigation className="w-5 h-5 fill-white" />
                </div>
                <span className="text-xs font-bold text-white mt-2 group-hover:text-[#D4FF3A]">
                  Ver rota e pin no mapa
                </span>
              </div>
            </div>

            {/* Google Places API Real Reviews (Avaliações oficiais do Google Maps) */}
            <div className="pt-2">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1b153d] to-[#14102E] border border-white/10 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4285F4]/20 via-[#34A853]/20 to-[#FBBC05]/20 border border-white/15 flex items-center justify-center">
                      <Star className="w-4 h-4 fill-[#D4FF3A] text-[#D4FF3A]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-unbounded font-black text-xs sm:text-sm text-white">
                          Avaliações do Google Maps
                        </h3>
                        <span className="text-[10px] font-sans font-bold text-[#D4FF3A] px-2 py-0.2 rounded-full bg-[#D4FF3A]/10 border border-[#D4FF3A]/25">
                          Oficial
                        </span>
                      </div>
                      <span className="text-[11px] text-white/60">
                        Nota {place.rating.toFixed(1)} · Baseado em opiniões verificadas
                      </span>
                    </div>
                  </div>

                  {place.googleMapsUri && (
                    <a
                      href={place.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#D4FF3A] hover:underline flex items-center gap-1 font-bold shrink-0 active:scale-95 transition-transform"
                    >
                      <span>Abrir Google</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {isLoadingGoogleReviews ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/60 text-xs">
                    <div className="w-4 h-4 border-2 border-[#D4FF3A] border-t-transparent rounded-full animate-spin" />
                    <span>Carregando comentários reais do Google Places...</span>
                  </div>
                ) : googleReviews.length > 0 ? (
                  <div className="space-y-2.5">
                    {googleReviews.slice(0, 4).map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/10 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={rev.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                              alt={rev.userName}
                              className="w-7 h-7 rounded-full object-cover border border-white/20"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white">
                                  {rev.userName}
                                </span>
                                <span className="text-[9px] text-[#D4FF3A] bg-[#D4FF3A]/15 px-1.5 py-0.2 rounded font-medium">
                                  Google Review
                                </span>
                              </div>
                              <span className="text-[10px] text-white/50">{rev.date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                            <Star className="w-3 h-3 fill-[#D4FF3A] text-[#D4FF3A]" />
                            <span className="text-xs font-bold text-white">{rev.rating}</span>
                          </div>
                        </div>

                        <p className="text-xs text-white/85 font-sans leading-relaxed">
                          "{rev.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/60 italic text-center py-2">
                    Nenhum comentário público recente retornado para este local.
                  </p>
                )}
              </div>
            </div>

            {/* Customer Reviews Section (Requested by user: avaliações reais de outros clientes) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-unbounded font-black text-lg text-white">
                    Avaliações da comunidade vamo.AI
                  </h3>
                  <span className="text-xs text-white/60">
                    Opiniões de quem já foi hoje e nos últimos dias
                  </span>
                </div>

                <button
                  onClick={() => {
                    sound.tap();
                    setShowReviewForm(!showReviewForm);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#6A4CFF]/30 hover:bg-[#6A4CFF]/40 text-[#D4FF3A] font-sans font-bold text-xs flex items-center gap-1 border border-[#6A4CFF]/40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Avaliar</span>
                </button>
              </div>

              {/* Review Submission Form */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-4 rounded-2xl bg-[#1b153d] border border-[#6A4CFF]/40 mb-4 space-y-3 animate-in fade-in"
                >
                  <span className="text-xs font-unbounded font-bold text-white block">
                    Sua experiência no {place.title}
                  </span>

                  {/* Star Rating Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70">Nota:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => {
                            sound.tap();
                            setRatingInput(star);
                          }}
                          className="p-1"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= ratingInput
                                ? 'fill-[#D4FF3A] text-[#D4FF3A]'
                                : 'text-white/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vibe Tag Selector */}
                  <div>
                    <span className="text-xs text-white/70 block mb-1">Qual era a vibe?</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Date romântico', 'Rolê com amigos', 'Drinques & DJ', 'Almoço rápido', 'Corte impecável'].map((tag) => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => {
                            sound.tap();
                            setVibeTagInput(tag);
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                            vibeTagInput === tag
                              ? 'bg-[#D4FF3A] text-[#14102E] font-bold border-[#D4FF3A]'
                              : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Conte como foi sua experiência, o que pediu, atendimento..."
                    rows={3}
                    maxLength={500}
                    required
                    className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="px-4 py-2 rounded-full bg-[#D4FF3A] text-[#14102E] font-unbounded font-black text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSubmittingReview ? 'Publicando...' : 'Publicar'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                {allReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                          alt={rev.userName}
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">
                              {rev.userName}
                            </span>
                            <span title="Cliente verificado">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#D4FF3A]" />
                            </span>
                          </div>
                          <span className="text-[10px] text-white/50">{rev.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                        <Star className="w-3 h-3 fill-[#D4FF3A] text-[#D4FF3A]" />
                        <span className="text-xs font-bold text-white">{rev.rating}</span>
                      </div>
                    </div>

                    <p className="text-xs text-white/85 font-sans leading-relaxed">
                      {rev.comment}
                    </p>

                    {rev.vibeTag && (
                      <span className="inline-block text-[10px] font-medium text-[#FFA36C] bg-[#FFA36C]/10 px-2 py-0.5 rounded-full">
                        #{rev.vibeTag}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route & Navigation Chooser Modal (Google Maps + Waze) */}
      <NavigationOptionsModal
        place={place}
        isOpen={isNavModalOpen}
        onClose={() => setIsNavModalOpen(false)}
      />

      {/* Merchant Partner Proposal Modal */}
      <MerchantPartnerModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        placeTitle={place.title}
      />
    </div>
  );
};
