import { PlaceItem, SavedPlace, UserVisit } from '../types';

export interface PersonalizedCurationResult {
  hasHistory: boolean;
  historyCount: number;
  dominantVibes: string[];
  topCategories: string[];
  tasteSummary: string;
  tasteExplanation: string;
  curatedPlaces: PlaceItem[];
  recentHistory: Array<{
    id: string;
    placeId: string;
    title: string;
    type: 'visit' | 'saved';
    date: string;
    category: string;
  }>;
}

const VIBE_LABELS: Record<string, string> = {
  gastronomia: 'Alta Gastronomia & Bistrôs',
  drinques: 'Coquetelaria & Speakeasies',
  agito: 'Samba, Agito & Noite',
  relax: 'Cafés Especiais & Brunch',
  estilo: 'Estilo & Experiências Exclusivas',
  arlivre: 'Rooftops & Espaços Abertos',
};

/**
 * Analyzes the last 5 saved or visited places by the user and computes a personalized
 * curation of brand-new venues matching their discovered historical taste profile.
 */
export function curatePersonalizedPlaces(
  savedPlaces: SavedPlace[],
  userVisits: UserVisit[],
  allPlaces: PlaceItem[]
): PersonalizedCurationResult {
  // 1. Gather all interactions (saved places + checked-in visits)
  const interactions: Array<{
    id: string;
    placeId: string;
    title: string;
    type: 'visit' | 'saved';
    timestamp: number;
    date: string;
    category: string;
  }> = [];

  savedPlaces.forEach((sp) => {
    interactions.push({
      id: sp.id,
      placeId: sp.placeId,
      title: sp.title,
      type: 'saved',
      timestamp: new Date(sp.savedAt || Date.now()).getTime(),
      date: sp.savedAt || new Date().toISOString(),
      category: sp.category,
    });
  });

  userVisits.forEach((uv) => {
    interactions.push({
      id: uv.id,
      placeId: uv.placeId,
      title: uv.placeTitle,
      type: 'visit',
      timestamp: new Date(uv.visitedAt || Date.now()).getTime(),
      date: uv.visitedAt || new Date().toISOString(),
      category: uv.placeCategory,
    });
  });

  // Sort by date descending
  interactions.sort((a, b) => b.timestamp - a.timestamp);

  // Take the last 5 interactions
  const last5 = interactions.slice(0, 5);

  if (last5.length === 0) {
    // Fallback: If user is new without history, curate top-rated versatile spots
    const topStarter = [...allPlaces]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    return {
      hasHistory: false,
      historyCount: 0,
      dominantVibes: ['gastronomia', 'drinques'],
      topCategories: ['restaurantes', 'bares'],
      tasteSummary: 'Destaques aclamados da cidade',
      tasteExplanation: 'Explore, salve lugares ou faça check-in para calibrar sua curadoria exclusiva.',
      curatedPlaces: topStarter,
      recentHistory: [],
    };
  }

  // 2. Extract vibes, categories and price patterns from these last 5 places
  const vibeCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const visitedPlaceIds = new Set(userVisits.map((v) => v.placeId));
  const savedPlaceIds = new Set(savedPlaces.map((s) => s.placeId));

  last5.forEach((item) => {
    const matchedPlace = allPlaces.find((p) => p.id === item.placeId || p.title.toLowerCase() === item.title.toLowerCase());
    
    if (matchedPlace) {
      matchedPlace.vibes.forEach((v) => {
        vibeCounts[v] = (vibeCounts[v] || 0) + 1;
      });
      categoryCounts[matchedPlace.category] = (categoryCounts[matchedPlace.category] || 0) + 1;
    } else {
      // Deduce from category string
      const catLow = item.category.toLowerCase();
      if (catLow.includes('bar') || catLow.includes('drinque') || catLow.includes('cocktail')) {
        vibeCounts['drinques'] = (vibeCounts['drinques'] || 0) + 1;
        categoryCounts['bares'] = (categoryCounts['bares'] || 0) + 1;
      } else if (catLow.includes('cafe') || catLow.includes('café') || catLow.includes('brunch') || catLow.includes('padaria')) {
        vibeCounts['relax'] = (vibeCounts['relax'] || 0) + 1;
        categoryCounts['cafes'] = (categoryCounts['cafes'] || 0) + 1;
      } else if (catLow.includes('samba') || catLow.includes('balada') || catLow.includes('show')) {
        vibeCounts['agito'] = (vibeCounts['agito'] || 0) + 1;
        categoryCounts['baladas'] = (categoryCounts['baladas'] || 0) + 1;
      } else {
        vibeCounts['gastronomia'] = (vibeCounts['gastronomia'] || 0) + 1;
        categoryCounts['restaurantes'] = (categoryCounts['restaurantes'] || 0) + 1;
      }
    }
  });

  // Sort vibes by frequency
  const dominantVibes = Object.entries(vibeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([vibe]) => vibe);

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  // Generate taste summary phrase
  const primaryVibe = dominantVibes[0] || 'gastronomia';
  const secondaryVibe = dominantVibes[1];
  const primaryLabel = VIBE_LABELS[primaryVibe] || 'Gastronomia sofisticada';
  const secondaryLabel = secondaryVibe && VIBE_LABELS[secondaryVibe] ? VIBE_LABELS[secondaryVibe] : null;

  const tasteSummary = secondaryLabel
    ? `${primaryLabel} & ${secondaryLabel.split('&')[0].trim()}`
    : primaryLabel;

  const visitCountInLast5 = last5.filter((i) => i.type === 'visit').length;
  const savedCountInLast5 = last5.filter((i) => i.type === 'saved').length;

  const tasteExplanation = `Baseado em suas últimas ${last5.length} interações (${visitCountInLast5} check-ins e ${savedCountInLast5} salvos). Novos locais selecionados a dedo que você ainda não visitou.`;

  // 3. Filter for NEW places (places the user hasn't visited yet)
  const candidatePlaces = allPlaces.filter((p) => !visitedPlaceIds.has(p.id));

  // Score candidates
  const scoredPlaces = (candidatePlaces.length > 0 ? candidatePlaces : allPlaces).map((place) => {
    let score = 0;

    // Vibe match score
    place.vibes.forEach((v) => {
      const idx = dominantVibes.indexOf(v);
      if (idx === 0) score += 6; // Primary vibe match
      else if (idx === 1) score += 4; // Secondary vibe match
      else if (idx !== -1) score += 2;
    });

    // Category match score
    if (topCategories.includes(place.category)) {
      score += 3;
    }

    // High rating boost
    if (place.rating >= 4.8) score += 3;
    else if (place.rating >= 4.5) score += 1.5;

    // Favor open now
    if (place.isOpenNow) score += 1.5;

    // Slight penalty if already saved (we want novel discovery, but still acceptable)
    if (savedPlaceIds.has(place.id)) {
      score -= 1;
    }

    return { place, score };
  });

  // Sort by score desc
  scoredPlaces.sort((a, b) => b.score - a.score);

  // Pick top 4 curated places
  const curatedPlaces = scoredPlaces.slice(0, 4).map((sp) => sp.place);

  return {
    hasHistory: true,
    historyCount: last5.length,
    dominantVibes,
    topCategories,
    tasteSummary,
    tasteExplanation,
    curatedPlaces: curatedPlaces.length > 0 ? curatedPlaces : allPlaces.slice(0, 4),
    recentHistory: last5,
  };
}
