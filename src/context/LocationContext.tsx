import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LocationCity {
  id: string;
  name: string;
  state: string;
  neighborhood: string;
  lat: number;
  lng: number;
}

export interface DestinationCity extends LocationCity {
  vibeTag: string;
  distanceKm?: number;
  driveTimeMin?: number;
}

export const PRESET_CITIES: LocationCity[] = [
  { id: 'sp-pinheiros', name: 'São Paulo', state: 'SP', neighborhood: 'Pinheiros / Vila Madalena', lat: -23.5615, lng: -46.6826 },
  { id: 'sp-jardins', name: 'São Paulo', state: 'SP', neighborhood: 'Jardins / Oscar Freire', lat: -23.5651, lng: -46.6672 },
  { id: 'rj-ipanema', name: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Ipanema / Leblon', lat: -22.9847, lng: -43.2045 },
  { id: 'rs-gramado', name: 'Gramado', state: 'RS', neighborhood: 'Centro / Planalto', lat: -29.3746, lng: -50.8764 },
  { id: 'sc-florianopolis', name: 'Florianópolis', state: 'SC', neighborhood: 'Lagoa da Conceição', lat: -27.5954, lng: -48.4619 },
  { id: 'pr-curitiba', name: 'Curitiba', state: 'PR', neighborhood: 'Batel / Bigorrilho', lat: -25.4385, lng: -49.2885 },
];

export const ALL_EXPLORE_CITIES: DestinationCity[] = [
  // SP Region
  { id: 'sp-capital', name: 'São Paulo', state: 'SP', neighborhood: 'Capital Gastronômica', lat: -23.5505, lng: -46.6333, vibeTag: 'Gastronomia & Agito' },
  { id: 'sp-santos', name: 'Santos', state: 'SP', neighborhood: 'Litoral & Praia do Gonzaga', lat: -23.9608, lng: -46.3336, vibeTag: 'Litoral, Frutos do Mar & Brisa' },
  { id: 'sp-campinas', name: 'Campinas', state: 'SP', neighborhood: 'Cambuí & Barão Geraldo', lat: -22.9099, lng: -47.0626, vibeTag: 'Bares Autênticos & Vida Noturna' },
  { id: 'sp-campos', name: 'Campos do Jordão', state: 'SP', neighborhood: 'Capivari / Serra da Mantiqueira', lat: -22.7394, lng: -45.5913, vibeTag: 'Fondue, Vinho & Clima de Serra' },
  { id: 'sp-jundiai', name: 'Jundiaí', state: 'SP', neighborhood: 'Rota da Uva & Vinhedos', lat: -23.1857, lng: -46.8978, vibeTag: 'Vinhedos & Gastronomia Italiana' },
  { id: 'sp-embu', name: 'Embu das Artes', state: 'SP', neighborhood: 'Centro Histórico & Artes', lat: -23.6492, lng: -46.8528, vibeTag: 'Artesanato, Comida Típica & Charme' },
  { id: 'sp-sorocaba', name: 'Sorocaba', state: 'SP', neighborhood: 'Campolim & Centro', lat: -23.5015, lng: -47.4526, vibeTag: 'Polo Cervejeiro & Bistrôs' },
  { id: 'sp-ubatuba', name: 'Ubatuba', state: 'SP', neighborhood: 'Itaguá & Praias Selvagens', lat: -23.4332, lng: -45.0834, vibeTag: 'Praias Paradisíacas & Peixe Fresco' },
  // RJ Region
  { id: 'rj-capital', name: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Zona Sul / Lapa', lat: -22.9068, lng: -43.1729, vibeTag: 'Samba, Orla & Rooftops' },
  { id: 'rj-niteroi', name: 'Niterói', state: 'RJ', neighborhood: 'Icaraí & Charitas', lat: -22.8859, lng: -43.1153, vibeTag: 'Vista da Baía & Alta Gastronomia' },
  { id: 'rj-petropolis', name: 'Petrópolis', state: 'RJ', neighborhood: 'Cidade Imperial & Serra', lat: -22.5050, lng: -43.1789, vibeTag: 'Cervejarias Artesanais & História' },
  { id: 'rj-buzios', name: 'Armação dos Búzios', state: 'RJ', neighborhood: 'Rua das Pedras & Praias', lat: -22.7538, lng: -41.8847, vibeTag: 'Charme Praiano & Vida Noturna' },
  // PR Region
  { id: 'pr-curitiba', name: 'Curitiba', state: 'PR', neighborhood: 'Batel & Cabral', lat: -25.4284, lng: -49.2733, vibeTag: 'Cafés Especiais & Parques' },
  { id: 'pr-morretes', name: 'Morretes', state: 'PR', neighborhood: 'Centro Histórico & Serra do Mar', lat: -25.4746, lng: -48.8339, vibeTag: 'Barreado Típico & Ecoturismo' },
  { id: 'pr-pontagrossa', name: 'Ponta Grossa', state: 'PR', neighborhood: 'Vila Velha', lat: -25.0994, lng: -50.1583, vibeTag: 'Paisagens Naturais & Cervejarias' },
  // MG Region
  { id: 'mg-bh', name: 'Belo Horizonte', state: 'MG', neighborhood: 'Savassi & Lourdes', lat: -19.9167, lng: -43.9345, vibeTag: 'Capital dos Botecos & Queijos' },
  { id: 'mg-ouropreto', name: 'Ouro Preto', state: 'MG', neighborhood: 'Centro Barroco', lat: -20.3856, lng: -43.5036, vibeTag: 'História, Cachaças & Charme' },
  { id: 'mg-brumadinho', name: 'Brumadinho', state: 'MG', neighborhood: 'Inhotim & Natureza', lat: -20.1439, lng: -44.1989, vibeTag: 'Arte Contemporânea & Verde' },
  // Sul
  { id: 'rs-canoas', name: 'Canoas', state: 'RS', neighborhood: 'Marechal Rondon & Centro', lat: -29.9189, lng: -51.1794, vibeTag: 'Grande POA, Parques & Gastronomia' },
  { id: 'rs-portoalegre', name: 'Porto Alegre', state: 'RS', neighborhood: 'Moinhos de Vento & Orla do Guaíba', lat: -30.0346, lng: -51.2177, vibeTag: 'Pôr do Sol, Parrillas & Bares' },
  { id: 'rs-novohamburgo', name: 'Novo Hamburgo', state: 'RS', neighborhood: 'Hamburgo Velho & Centro', lat: -29.6783, lng: -51.1306, vibeTag: 'Vale dos Sinos & Cervejarias' },
  { id: 'rs-saoleopoldo', name: 'São Leopoldo', state: 'RS', neighborhood: 'Rua Grande & Morro do Espelho', lat: -29.7547, lng: -51.1472, vibeTag: 'Bares Noturnos & Gastronomia' },
  { id: 'rs-gramado', name: 'Gramado', state: 'RS', neighborhood: 'Centro & Borges de Medeiros', lat: -29.3746, lng: -50.8764, vibeTag: 'Chocolates, Fondue & Romantismo' },
  { id: 'rs-caxiasdosul', name: 'Caxias do Sul', state: 'RS', neighborhood: 'São Pelegrino & Centro', lat: -29.1678, lng: -51.1794, vibeTag: 'Serra Gaúcha, Galeto & Vinho' },
  { id: 'rs-bentogoncalves', name: 'Bento Gonçalves', state: 'RS', neighborhood: 'Vale dos Vinhedos', lat: -29.1713, lng: -51.5190, vibeTag: 'Capital Brasileira do Vinho' },
  { id: 'sc-floripa', name: 'Florianópolis', state: 'SC', neighborhood: 'Lagoa & Santo Antônio de Lisboa', lat: -27.5954, lng: -48.5480, vibeTag: 'Ostras Frescas & Noites na Ilha' },
  { id: 'ba-salvador', name: 'Salvador', state: 'BA', neighborhood: 'Rio Vermelho & Pelourinho', lat: -12.9777, lng: -38.5016, vibeTag: 'Acarajé, Dendê & Música ao Vivo' },
  { id: 'df-brasilia', name: 'Brasília', state: 'DF', neighborhood: 'Asa Sul & Lago Paranoá', lat: -15.7975, lng: -47.8919, vibeTag: 'Píer, Alta Gastronomia & Arquitetura' },
];

export function getNearbyGetawayCities(userLat: number, userLng: number): DestinationCity[] {
  const withDistance = ALL_EXPLORE_CITIES.map((c) => {
    const km = getDistanceInKm(userLat, userLng, c.lat, c.lng);
    const driveTimeMin = Math.round(km * 1.1 + 10);
    return { ...c, distanceKm: km, driveTimeMin };
  });

  // Filter cities around ~100km (between 15km and 140km away from user)
  const around100km = withDistance
    .filter((c) => (c.distanceKm || 0) >= 15 && (c.distanceKm || 0) <= 150)
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

  if (around100km.length >= 2) {
    return around100km.slice(0, 2);
  }

  // Fallback: pick the 2 closest distinct cities that are not the exact same center
  const distinct = withDistance
    .filter((c) => (c.distanceKm || 0) > 8)
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

  return distinct.slice(0, 2);
}

interface LocationContextType {
  currentCity: LocationCity;
  userCoords: { lat: number; lng: number };
  isGpsActive: boolean;
  gpsLoading: boolean;
  gpsError: string | null;
  setCurrentCity: (city: LocationCity) => void;
  requestGpsLocation: (onSuccess?: (city: LocationCity) => void) => void;
  calculateDistance: (destLat: number, destLng: number) => { km: number; walkingMin: number; drivingMin: number };
  getNearbyCitiesAround100km: () => DestinationCity[];
  searchCities: (query: string) => Promise<DestinationCity[]>;
}

const LocationContext = createContext<LocationContextType>({} as LocationContextType);

// Haversine formula
export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCity, setCurrentCity] = useState<LocationCity>(() => {
    try {
      const saved = localStorage.getItem('@vamo_ai:chosen_city');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name && parsed?.lat) return parsed;
      }
    } catch (e) {}
    return PRESET_CITIES[0];
  });

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem('@vamo_ai:chosen_city');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.lat && parsed?.lng) return { lat: parsed.lat, lng: parsed.lng };
      }
    } catch (e) {}
    return { lat: PRESET_CITIES[0].lat, lng: PRESET_CITIES[0].lng };
  });

  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Auto-detect real location if permission was previously granted
  useEffect(() => {
    try {
      if (localStorage.getItem('@vamo_ai:gps_allowed') === 'true' && navigator.geolocation) {
        requestGpsLocation();
      }
    } catch (e) {}
  }, []);

  const requestGpsLocation = (onSuccess?: (city: LocationCity) => void) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada no seu navegador.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setIsGpsActive(true);

        // Reverse geocode to resolve actual city name rather than raw GPS coords
        try {
          const res = await fetch('/api/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(coords),
          });

          if (res.ok) {
            const data = await res.json();
            const resolvedCity: LocationCity = {
              id: `live-city-${data.city.toLowerCase().replace(/\s+/g, '-')}`,
              name: data.city || 'São Paulo',
              state: data.state || 'SP',
              neighborhood: data.neighborhood || 'Localização Atual',
              lat: coords.lat,
              lng: coords.lng,
            };
            setCurrentCity(resolvedCity);
            setGpsLoading(false);
            try {
              localStorage.setItem('@vamo_ai:gps_allowed', 'true');
              localStorage.setItem('@vamo_ai:chosen_city', JSON.stringify(resolvedCity));
            } catch (e) {}
            if (onSuccess) onSuccess(resolvedCity);
            return;
          }
        } catch (revErr) {
          console.warn('Reverse geocode error, using default city name:', revErr);
        }

        const fallbackCity: LocationCity = {
          id: 'live-gps',
          name: 'São Paulo',
          state: 'SP',
          neighborhood: 'Localização Atual',
          lat: coords.lat,
          lng: coords.lng,
        };
        setCurrentCity(fallbackCity);
        setGpsLoading(false);
        try {
          localStorage.setItem('@vamo_ai:gps_allowed', 'true');
          localStorage.setItem('@vamo_ai:chosen_city', JSON.stringify(fallbackCity));
        } catch (e) {}
        if (onSuccess) onSuccess(fallbackCity);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError('Permissão de GPS negada. Usando localização simulada.');
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectCity = (city: LocationCity) => {
    setIsGpsActive(false);
    setCurrentCity(city);
    setUserCoords({ lat: city.lat, lng: city.lng });
    try {
      localStorage.setItem('@vamo_ai:chosen_city', JSON.stringify(city));
    } catch (e) {}
  };

  const searchCities = async (query: string): Promise<DestinationCity[]> => {
    const q = query.trim();
    if (!q) return [];
    try {
      const res = await fetch(`/api/search-cities?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.cities) && data.cities.length > 0) {
          return data.cities.map((c: any) => ({
            ...c,
            distanceKm: getDistanceInKm(userCoords.lat, userCoords.lng, c.lat, c.lng),
          }));
        }
      }
    } catch (err) {
      console.warn('searchCities client fetch error:', err);
    }
    const norm = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return ALL_EXPLORE_CITIES.filter((c) => {
      const cNorm = c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const sNorm = c.state.toLowerCase();
      const nNorm = c.neighborhood.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return cNorm.includes(norm) || sNorm === norm || nNorm.includes(norm);
    }).map((c) => ({
      ...c,
      distanceKm: getDistanceInKm(userCoords.lat, userCoords.lng, c.lat, c.lng),
    }));
  };

  const calculateDistance = (destLat: number, destLng: number) => {
    const km = getDistanceInKm(userCoords.lat, userCoords.lng, destLat, destLng);
    const walkingMin = Math.max(3, Math.round(km * 12));
    const drivingMin = Math.max(2, Math.round(km * 2.5 + 2));
    return { km, walkingMin, drivingMin };
  };

  const getNearbyCitiesAround100km = () => {
    return getNearbyGetawayCities(userCoords.lat, userCoords.lng);
  };

  return (
    <LocationContext.Provider value={{
      currentCity,
      userCoords,
      isGpsActive,
      gpsLoading,
      gpsError,
      setCurrentCity: handleSelectCity,
      requestGpsLocation,
      calculateDistance,
      getNearbyCitiesAround100km,
      searchCities,
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
