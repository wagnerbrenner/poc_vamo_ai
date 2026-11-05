import { PlaceItem, CategorySlug, ReviewItem } from '../types';
import { INITIAL_PLACES } from '../data/mockPlaces';

export type RankByPreference = 'prominence' | 'distance';

export interface SearchPlacesParams {
  lat: number;
  lng: number;
  query?: string;
  category?: CategorySlug;
  radius?: number;
  openNow?: boolean;
  shuffle?: boolean;
  bypassCache?: boolean;
  rankby?: RankByPreference; // 'prominence' (POPULARITY) or 'distance'
  minprice?: number; // 1 to 4
  maxprice?: number; // 1 to 4
  vibe?: string; // e.g. 'gastronomia', 'drinques', 'agito', 'relax', 'estilo', 'casal'
  placeType?: string; // e.g. 'restaurant', 'bar', 'cafe', 'night_club'
}

export interface SearchPlacesResult {
  places: PlaceItem[];
  source: 'google_maps_places_api_new' | 'offline_cache' | 'fallback';
  isRealGoogleMaps: boolean;
  activeType?: string;
  rankbyUsed?: RankByPreference;
}

/**
 * Resolves price range based on the user's selected vibe
 */
export function getPriceRangeForVibe(vibe?: string): { minprice: number; maxprice: number } {
  switch (vibe?.toLowerCase()) {
    case 'gastronomia':
    case 'casal':
      return { minprice: 2, maxprice: 4 }; // Bistrôs e restaurantes sofisticados
    case 'drinques':
      return { minprice: 2, maxprice: 3 }; // Bares de coquetelaria e rooftops
    case 'agito':
      return { minprice: 1, maxprice: 3 }; // Baladas, pubs e rodas de samba
    case 'relax':
      return { minprice: 1, maxprice: 2 }; // Cafés aconchegantes e padarias
    case 'estilo':
      return { minprice: 2, maxprice: 4 }; // Barbearias conceituadas e spas
    case 'arlivre':
      return { minprice: 1, maxprice: 3 }; // Terraços e mesas ao ar livre
    default:
      return { minprice: 1, maxprice: 4 };
  }
}

class GooglePlacesService {
  private cache: Map<string, { places: PlaceItem[]; timestamp: number }> = new Map();
  private cacheTtlMs = 1000 * 60 * 5; // 5 minutes cache in memory

  private getCacheKey(params: SearchPlacesParams): string {
    const latRounded = params.lat.toFixed(3);
    const lngRounded = params.lng.toFixed(3);
    const cat = params.category || 'todos';
    const q = (params.query || '').trim().toLowerCase();
    const rank = params.rankby || 'prominence';
    const pType = params.placeType || 'all';
    const vibe = params.vibe || 'none';
    const minp = params.minprice ?? 'def';
    const maxp = params.maxprice ?? 'def';
    return `${latRounded}_${lngRounded}_${cat}_${q}_${rank}_${pType}_${vibe}_${minp}_${maxp}`;
  }

  /**
   * Search real Google Places via backend proxy with prominence ranking & vibe price filters
   */
  async searchPlaces(params: SearchPlacesParams): Promise<SearchPlacesResult> {
    const rankby = params.rankby || 'prominence';
    const vibePrice = getPriceRangeForVibe(params.vibe);
    const minprice = params.minprice ?? vibePrice.minprice;
    const maxprice = params.maxprice ?? vibePrice.maxprice;

    const fullParams: SearchPlacesParams = {
      ...params,
      rankby,
      minprice,
      maxprice,
    };

    const cacheKey = this.getCacheKey(fullParams);
    const cached = this.cache.get(cacheKey);
    if (!params.shuffle && !params.bypassCache && cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return {
        places: cached.places,
        source: 'google_maps_places_api_new',
        isRealGoogleMaps: true,
        activeType: params.placeType,
        rankbyUsed: rankby,
      };
    }

    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: params.lat,
          lng: params.lng,
          query: params.query || '',
          category: params.category || 'todos',
          radius: params.radius || 6000,
          shuffle: !!params.shuffle,
          rankby,
          minprice,
          maxprice,
          vibe: params.vibe,
          placeType: params.placeType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.places) && data.places.length > 0) {
        // Save in memory cache
        this.cache.set(cacheKey, { places: data.places, timestamp: Date.now() });

        return {
          places: data.places,
          source: 'google_maps_places_api_new',
          isRealGoogleMaps: true,
          activeType: params.placeType,
          rankbyUsed: rankby,
        };
      }
    } catch (error) {
      console.warn('Google Places API fetch error, falling back:', error);
    }

    // Fallback: Return curated starter places adjusted to user coordinates
    const fallbackPlaces = INITIAL_PLACES.map((p) => {
      const R = 6371;
      const dLat = ((p.lat - params.lat) * Math.PI) / 180;
      const dLon = ((p.lng - params.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((params.lat * Math.PI) / 180) *
          Math.cos((p.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const distanceKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
      return {
        ...p,
        distanceKm,
        walkingMinutes: Math.max(3, Math.round(distanceKm * 12)),
        drivingMinutes: Math.max(2, Math.round(distanceKm * 2.5 + 2)),
      };
    });

    return {
      places: fallbackPlaces,
      source: 'fallback',
      isRealGoogleMaps: false,
    };
  }

  /**
   * Fetch top recommendation for current moment
   */
  async fetchNearbyMoments(lat: number, lng: number, timeOfDay: string): Promise<PlaceItem[]> {
    try {
      const response = await fetch('/api/places/nearby-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lng, timeOfDay }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          return data.places;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch moment suggestion from Google Places:', err);
    }
    return [];
  }
  /**
   * Generates a high quality photo URL for a given Google Places photo reference or name
   */
  getPhotoUrl(photoNameOrRef: string, maxWidth = 1400, maxHeight = 900): string {
    if (!photoNameOrRef) return '';
    if (photoNameOrRef.startsWith('http')) return photoNameOrRef;
    if (photoNameOrRef.startsWith('/api/maps/photo')) return photoNameOrRef;
    return `/api/maps/photo?name=${encodeURIComponent(photoNameOrRef)}&maxWidth=${maxWidth}&maxHeight=${maxHeight}`;
  }

  /**
   * Dynamically fetch high-resolution photos for a place using Google Places Photo API
   */
  async fetchDynamicPlacePhotos(
    placeId: string,
    photoNames?: string[]
  ): Promise<{
    photos: string[];
    categorizedPhotos: { all: string[]; food: string[]; ambience: string[]; menu: string[] };
    source: string;
  }> {
    try {
      const response = await fetch('/api/places/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, photoNames }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.photos) && data.photos.length > 0) {
          return {
            photos: data.photos,
            categorizedPhotos: data.categorizedPhotos || {
              all: data.photos,
              food: data.photos.slice(0, 3),
              ambience: data.photos.slice(0, 3),
              menu: data.photos.slice(0, 2),
            },
            source: data.source || 'google_places_photo_api',
          };
        }
      }
    } catch (err) {
      console.warn('googlePlacesService.fetchDynamicPlacePhotos error:', err);
    }

    return {
      photos: [],
      categorizedPhotos: { all: [], food: [], ambience: [], menu: [] },
      source: 'fallback',
    };
  }

  /**
   * Dynamically fetch real Google Maps reviews for an establishment
   */
  async fetchPlaceReviews(
    placeId: string,
    placeTitle?: string,
    city?: string
  ): Promise<{
    reviews: ReviewItem[];
    totalRating?: number;
    userRatingCount?: number;
    source: string;
    isRealGoogle: boolean;
  }> {
    try {
      const url = `/api/places/${encodeURIComponent(placeId)}/reviews?title=${encodeURIComponent(placeTitle || '')}&city=${encodeURIComponent(city || '')}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.reviews) && data.reviews.length > 0) {
          return {
            reviews: data.reviews,
            totalRating: data.totalRating,
            userRatingCount: data.userRatingCount,
            source: data.source || 'google_places_api_new',
            isRealGoogle: !!data.isRealGoogle,
          };
        }
      }
    } catch (err) {
      console.warn('googlePlacesService.fetchPlaceReviews error:', err);
    }

    return {
      reviews: [],
      source: 'fallback',
      isRealGoogle: false,
    };
  }
}

export const googlePlacesService = new GooglePlacesService();


