export type TimeOfDayTheme = 'manha' | 'tarde' | 'pordosol' | 'noite';

export type CategorySlug = 
  | 'todos'
  | 'restaurantes' 
  | 'bares' 
  | 'eventos' 
  | 'barbearias' 
  | 'cafes' 
  | 'baladas';

export interface CategoryInfo {
  id: CategorySlug;
  label: string;
  icon: string;
  tagline: string;
}

export interface ReviewItem {
  id: string;
  placeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment: string;
  vibeTag?: string;
  date: string;
  createdAt?: string;
}

export interface PlaceItem {
  id: string;
  title: string;
  category: 'restaurantes' | 'bares' | 'eventos' | 'barbearias' | 'cafes' | 'baladas';
  categoryLabel: string;
  subCategory: string;
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  distanceKm: number;
  walkingMinutes: number;
  drivingMinutes: number;
  rating: number;
  reviewCount: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  openStatus: string;
  isOpenNow: boolean;
  closingTimeToday: string;
  motivoAgora: string; // The signature vamo.AI why-this-place-fits-right-now
  currentEvent?: {
    title: string;
    time: string;
    description: string;
    tag: string;
  };
  imageUrl: string;
  gallery: string[];
  features: string[];
  suitableFor: ('sozinho' | 'casal' | 'amigos' | 'familia' | 'trabalho')[];
  vibes: ('gastronomia' | 'drinques' | 'agito' | 'relax' | 'estilo' | 'arlivre')[];
  phone: string;
  whatsapp: string;
  reviews: ReviewItem[];
  googleMapsUri?: string;
  websiteUri?: string;
  isRealGoogleMaps?: boolean;
  coupon?: PartnerCoupon;
  categorizedPhotos?: {
    food: string[];
    ambience: string[];
    menu: string[];
    all: string[];
  };
}

export interface PartnerCoupon {
  id: string;
  placeId?: string;
  placeTitle?: string;
  code: string;
  title: string;
  discount: string; // e.g. "15% OFF", "Drink Cortesia", "2x1 Chopp", "Sobremesa Grátis"
  description: string;
  minSpend?: string;
  validUntil: string;
  partnerTier: 'exclusive' | 'featured' | 'vip';
  terms?: string;
  qrPayload?: string;
  claimCount?: number;
  isClaimed?: boolean;
}

export interface ItineraryStop {
  order: number;
  stageName: 'Esquenta & Drinque' | 'Prato Principal' | 'Saideira & Doce' | string;
  role: 'drink' | 'dinner' | 'dessert' | 'after';
  timeSlot: string; // e.g. "19:30 - 20:30"
  place: PlaceItem;
  rationale: string;
  recommendedOrder: string;
  transitTimeToNextMin?: number;
}

export interface ThreeStopItinerary {
  id: string;
  title: string;
  tagline: string;
  vibe: string;
  totalDurationHours: string;
  curatorNotes: string;
  stops: ItineraryStop[];
}

export interface VibeDashboardData {
  userVibeTitle: string;
  archetype: string;
  summary: string;
  favoriteVibes: string[];
  energyLevel: 'Intimista' | 'Equilibrado' | 'Vibrante';
  energyPercentage: number;
  futureCheckinSuggestions: {
    id: string;
    title: string;
    category: 'restaurantes' | 'bares' | 'cafes' | 'baladas' | 'eventos';
    vibe: 'gastronomia' | 'drinques' | 'agito' | 'relax' | 'estilo' | 'arlivre';
    reason: string;
    placeTypeKeyword: string;
  }[];
  source?: string;
}

export interface SavedPlace {
  id: string;
  userId: string;
  placeId: string;
  title: string;
  category: string;
  address: string;
  neighborhood: string;
  rating: number;
  priceLevel: string;
  imageUrl: string;
  customTag?: string;
  notes?: string;
  savedAt: string;
}

export interface OutingPlanSession {
  when: 'agora' | 'hoje_noite' | 'amanha_tarde' | 'amanha_noite' | 'fim_de_semana';
  withWhom: 'sozinho' | 'casal' | 'amigos' | 'familia' | 'trabalho';
  vibe: 'gastronomia' | 'drinques' | 'agito' | 'relax' | 'estilo' | 'arlivre';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  city?: string;
  defaultVibe?: string;
  favoriteCategories?: string[];
}

export interface UserVisit {
  id: string;
  userId: string;
  placeId: string;
  placeTitle: string;
  placeCategory: string;
  placeAddress: string;
  placeImageUrl: string;
  visitedAt: string;
  notes?: string;
  vibe?: string;
}

