/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './firebase/authContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocationProvider, useLocation } from './context/LocationContext';
import { NetworkProvider, useNetwork } from './context/NetworkContext';
import { BatterySaverProvider, useBatterySaver } from './context/BatterySaverContext';
import { PhoneFrame } from './components/PhoneFrame';
import { Navbar } from './components/Navbar';
import { TimeOfDayPicker } from './components/TimeOfDayPicker';
import { BottomTabBar, MainTabType } from './components/BottomTabBar';
import { HomeScreen } from './components/HomeScreen';
import { ThreeTouchDecideModal } from './components/ThreeTouchDecideModal';
import { DecideResultScreen } from './components/DecideResultScreen';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import { MapView } from './components/MapView';
import { ExploreFeed } from './components/ExploreFeed';
import { AIChatScreen } from './components/AIChatScreen';
import { SavedPlacesScreen } from './components/SavedPlacesScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { LocationPickerModal } from './components/LocationPickerModal';
import { InitialLocationModal } from './components/InitialLocationModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { VoiceSearchModal } from './components/VoiceSearchModal';
import { VoiceCommandResult } from './hooks/useWebSpeech';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SplashScreen } from './components/SplashScreen';
import { INITIAL_PLACES } from './data/mockPlaces';
import { PlaceItem, SavedPlace, OutingPlanSession, UserVisit } from './types';
import { googlePlacesService } from './services/googlePlacesService';
import { 
  offlineCacheService, 
  StoredDecision 
} from './services/offlineCacheService';
import { 
  savePlaceToFirestore, 
  removeSavedPlace, 
  subscribeToSavedPlaces, 
  saveOutingPlan,
  subscribeToUserVisits,
  recordUserVisit,
  seedInitialCouponsIfEmpty 
} from './firebase/firestoreService';
import { fcmNotificationService, WeatherNotificationPayload } from './services/fcmNotificationService';
import { WeatherShiftAlert } from './components/WeatherShiftAlert';
import { SyncQueueToast, SyncToastState } from './components/SyncQueueToast';
import { weatherService, WeatherData } from './services/weatherService';
import { sound, haptic } from './utils/audioHaptics';

function MainApp() {
  const { user } = useAuth();
  const { currentCity, userCoords } = useLocation();
  const { effectiveOffline } = useNetwork();
  const { isBatterySaver, weatherIntervalMs } = useBatterySaver();

  const [places, setPlaces] = useState<PlaceItem[]>(INITIAL_PLACES);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(true);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [userVisits, setUserVisits] = useState<UserVisit[]>([]);
  const [decisionHistory, setDecisionHistory] = useState<StoredDecision[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [currentTab, setCurrentTab] = useState<MainTabType>('agora');
  const [activeSession, setActiveSession] = useState<OutingPlanSession | null>(null);
  const [weatherAlert, setWeatherAlert] = useState<WeatherNotificationPayload | null>(null);
  const [syncToast, setSyncToast] = useState<SyncToastState | null>(null);
  const initialSessionWeatherRef = React.useRef<WeatherData | null>(null);

  // Modals state
  const [isThreeTouchModalOpen, setIsThreeTouchModalOpen] = useState(false);
  const [threeTouchInitialVibe, setThreeTouchInitialVibe] = useState<string | undefined>();
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<PlaceItem | null>(null);
  const [selectedPlaceForMap, setSelectedPlaceForMap] = useState<PlaceItem | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);

  // 1. Initial load: Read from AsyncStorage cache immediately for offline capability
  useEffect(() => {
    const initFromAsyncStorage = async () => {
      const startTime = Date.now();
      const uid = user?.uid || 'guest';
      try {
        const [cachedPlaces, cachedHistory, cachedVisits, sync] = await Promise.all([
          offlineCacheService.loadCachedSavedPlaces(uid),
          offlineCacheService.loadDecisionHistory(uid),
          offlineCacheService.loadCachedVisits(uid),
          offlineCacheService.getLastSync(uid),
        ]);

      if (cachedPlaces && cachedPlaces.length > 0) {
        setSavedPlaces(cachedPlaces);
      } else {
        // Sample starter places
        const initialStarters: SavedPlace[] = [
          {
            id: 'sample-1',
            userId: uid,
            placeId: 'place-bistro-serra',
            title: 'Bistrô da Serra & Adega',
            category: 'Bistrô Contemporâneo',
            address: 'Rua das Flores, 340 - Jardins',
            neighborhood: 'Jardins',
            rating: 4.9,
            priceLevel: '$$$',
            imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
            customTag: 'Date especial',
            notes: 'Pedir mesa perto da lareira com vinho Pinot Noir',
            savedAt: new Date().toISOString(),
          },
          {
            id: 'sample-2',
            userId: uid,
            placeId: 'place-rooftop-mirante',
            title: 'Rooftop Mirante Skybar',
            category: 'Rooftop & Coquetelaria',
            address: 'Av. Paulista, 2100 - Cobertura',
            neighborhood: 'Bela Vista',
            rating: 4.8,
            priceLevel: '$$$',
            imageUrl: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&w=1000&q=80',
            customTag: 'Pôr do Sol',
            notes: 'Chegar às 17h45 para pegar a luz dourada com os amigos',
            savedAt: new Date().toISOString(),
          }
        ];
        setSavedPlaces(initialStarters);
        await offlineCacheService.cacheSavedPlaces(uid, initialStarters);
      }

      // Starter visits
      if (cachedVisits && cachedVisits.length > 0) {
        setUserVisits(cachedVisits);
      } else {
        const initialVisits: UserVisit[] = [
          {
            id: 'visit-init-1',
            userId: uid,
            placeId: 'place-bistro-serra',
            placeTitle: 'Bistrô da Serra & Adega',
            placeCategory: 'Bistrô Contemporâneo',
            placeAddress: 'Rua das Flores, 340 - Jardins',
            placeImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
            visitedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            notes: 'Mesa perto da lareira com vinho Pinot Noir',
            vibe: 'gastronomia',
          }
        ];
        setUserVisits(initialVisits);
        await offlineCacheService.cacheVisits(uid, initialVisits);
      }

      if (cachedHistory && cachedHistory.length > 0) {
        setDecisionHistory(cachedHistory);
      } else {
        // Starter decision history
        const initialDecisions: StoredDecision[] = [
          {
            id: 'dec_init_1',
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
            when: 'Agora mesmo',
            withWhom: 'Casal · romântico',
            vibe: 'Gastronomia',
            chosenPlaceId: 'place-bistro-serra',
            chosenPlaceName: 'Bistrô da Serra & Adega',
            chosenPlaceCategory: 'Bistrô Contemporâneo',
            chosenPlaceImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
          }
        ];
        setDecisionHistory(initialDecisions);
        await offlineCacheService.recordDecision(uid, initialDecisions[0]);
      }

      } catch (err) {
        console.warn('Error reading from AsyncStorage cache:', err);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          setIsSplashVisible(false);
        }, remaining);
      }
    };

    initFromAsyncStorage();

    // Check & seed partner coupons in Firestore collection 'cupons' if empty
    seedInitialCouponsIfEmpty().catch((err) =>
      console.warn('Initial coupons seed check:', err)
    );
  }, [user?.uid]);

  // 2. Subscribe to Firebase Firestore when online (Saved Places & Visitas)
  useEffect(() => {
    if (user?.uid && !effectiveOffline) {
      try {
        const unsubSaved = subscribeToSavedPlaces(user.uid, (data) => {
          if (data && data.length > 0) {
            setSavedPlaces(data);
            offlineCacheService.cacheSavedPlaces(user.uid, data);
            setLastSyncTime(new Date().toISOString());
          }
        });

        const unsubVisits = subscribeToUserVisits(user.uid, (visitsData) => {
          if (visitsData && visitsData.length > 0) {
            setUserVisits(visitsData);
            offlineCacheService.cacheVisits(user.uid, visitsData);
          }
        });

        return () => {
          unsubSaved();
          unsubVisits();
        };
      } catch (err) {
        console.warn('Could not listen to Firestore collections, relying on AsyncStorage cache:', err);
      }
    }
  }, [user?.uid, effectiveOffline]);

  // Automatic Sync Queue Processor: flushes pending check-ins & saved places to Firestore when online
  useEffect(() => {
    if (effectiveOffline || !user?.uid) return;

    const processSyncQueue = async () => {
      try {
        const pendingActions = await offlineCacheService.loadPendingSyncActions(user.uid);
        if (!pendingActions || pendingActions.length === 0) return;

        let syncedCount = 0;
        for (const action of pendingActions) {
          try {
            if (action.type === 'CHECK_IN') {
              await recordUserVisit(user.uid, action.payload.place, action.payload.notes);
              await offlineCacheService.removePendingSyncAction(user.uid, action.id);
              syncedCount++;
            } else if (action.type === 'SAVE_PLACE') {
              await savePlaceToFirestore(user.uid, action.payload);
              await offlineCacheService.removePendingSyncAction(user.uid, action.id);
              syncedCount++;
            } else if (action.type === 'REMOVE_SAVED_PLACE') {
              await removeSavedPlace(user.uid, action.payload.placeId);
              await offlineCacheService.removePendingSyncAction(user.uid, action.id);
              syncedCount++;
            }
          } catch (itemErr) {
            console.warn('Sync queue action error:', itemErr);
          }
        }

        if (syncedCount > 0) {
          sound.success();
          haptic.success();
          setSyncToast({
            id: `sync_${Date.now()}`,
            message: `${syncedCount} ${syncedCount === 1 ? 'ação pendente sincronizada' : 'ações pendentes sincronizadas'} no Firestore!`,
            syncedCount,
          });
        }
      } catch (e) {
        console.warn('Sync queue flush error:', e);
      }
    };

    processSyncQueue();
    window.addEventListener('online', processSyncQueue);
    return () => {
      window.removeEventListener('online', processSyncQueue);
    };
  }, [effectiveOffline, user?.uid]);

  // 2. FCM Push Notification Service Listener
  useEffect(() => {
    fcmNotificationService.init().catch(console.warn);
    const unsubscribe = fcmNotificationService.subscribe((payload) => {
      setWeatherAlert(payload);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // 3. Weather Shift Watcher during Active Outing Session (FCM Push Alert)
  useEffect(() => {
    if (!activeSession) {
      initialSessionWeatherRef.current = null;
      return;
    }

    let isCancelled = false;

    // Snapshot baseline weather when session starts
    weatherService.getCurrentWeather(userCoords.lat, userCoords.lng).then((w) => {
      if (!isCancelled && w) {
        initialSessionWeatherRef.current = w;
      }
    });

    // Check weather at intervals while session is active
    const interval = setInterval(async () => {
      if (!initialSessionWeatherRef.current) return;
      try {
        const latestWeather = await weatherService.getCurrentWeather(userCoords.lat, userCoords.lng);
        if (!latestWeather || isCancelled) return;

        const baseline = initialSessionWeatherRef.current;
        const rainStarted = !baseline.isRaining && latestWeather.isRaining;
        const rainStopped = baseline.isRaining && !latestWeather.isRaining;
        const tempDrop = (baseline.temp - latestWeather.temp) >= 4;
        const tempRise = (latestWeather.temp - baseline.temp) >= 4;

        if (rainStarted || rainStopped || tempDrop || tempRise) {
          let reason = '';
          let suggestedVibe = 'gastronomia';

          if (rainStarted) {
            reason = `Começou a chover (${latestWeather.temp}°C). Lugares cobertos e acolhedores combinam mais com agora!`;
            suggestedVibe = 'gastronomia';
          } else if (rainStopped) {
            reason = `A chuva parou e abriu o tempo (${latestWeather.temp}°C). Uma ótima para um rooftop ou espaço aberto!`;
            suggestedVibe = 'drinques';
          } else if (tempDrop) {
            reason = `A temperatura caiu para ${latestWeather.temp}°C. Que tal um café quentinho ou bistrô intimista?`;
            suggestedVibe = 'relax';
          } else if (tempRise) {
            reason = `Esquentou bastante (${latestWeather.temp}°C). Clima perfeito para drinques refrescantes ou ar livre!`;
            suggestedVibe = 'agito';
          }

          // Trigger push notification (FCM + Web Push + In-App banner)
          await fcmNotificationService.notifyWeatherShift({
            previousWeather: baseline,
            currentWeather: latestWeather,
            reason,
            suggestedVibe,
          });

          // Advance baseline so alert doesn't repeat immediately
          initialSessionWeatherRef.current = latestWeather;
        }
      } catch (err) {
        console.warn('Weather shift check failed:', err);
      }
    }, weatherIntervalMs);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [activeSession, userCoords.lat, userCoords.lng, weatherIntervalMs]);

  // Alternating place types: 'restaurant', 'bar', 'cafe', 'night_club'
  const ALTERNATING_PLACE_TYPES = ['restaurant', 'bar', 'cafe', 'night_club'] as const;
  const [activeTypeIndex, setActiveTypeIndex] = useState<number>(0);
  const [activeTypeName, setActiveTypeName] = useState<string | null>(null);

  // Evaluates whether places pool appears repetitive or of low quality/diversity
  const isRepetitiveOrLowQuality = (items: PlaceItem[]): boolean => {
    if (!items || items.length < 3) return true;

    // Check 1: Average rating below 4.2 indicates low relevance/quality
    const avgRating = items.reduce((acc, p) => acc + (p.rating || 0), 0) / items.length;
    if (avgRating < 4.2) return true;

    // Check 2: High repetition in titles (e.g. repeated chains or identical names)
    const titles = items.map(p => p.title.toLowerCase().trim());
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size < items.length * 0.75) return true;

    // Check 3: Zero category diversity if there are 4 or more items all belonging to only 1 category
    const uniqueCategories = new Set(items.map(p => p.category));
    if (uniqueCategories.size === 1 && items.length >= 4) return true;

    return false;
  };

  // 3. Fetch real Google Places based on user geolocation in real time with prominence ranking & type alternation
  useEffect(() => {
    let isCancelled = false;
    const fetchPlaces = async () => {
      setIsLoadingPlaces(true);
      try {
        // Step 1: Initial query with prominence ranking and general vibe
        let res = await googlePlacesService.searchPlaces({
          lat: userCoords.lat,
          lng: userCoords.lng,
          category: 'todos',
          radius: 8000,
          rankby: 'prominence',
          vibe: 'gastronomia',
        });

        // Step 2: Check if initial result is repetitive or of low relevance
        if (isRepetitiveOrLowQuality(res.places)) {
          console.warn('Initial places result evaluated as repetitive or low relevance. Alternating between distinct types...');
          for (let i = 0; i < ALTERNATING_PLACE_TYPES.length; i++) {
            const candidateType = ALTERNATING_PLACE_TYPES[i];
            const altRes = await googlePlacesService.searchPlaces({
              lat: userCoords.lat,
              lng: userCoords.lng,
              category: 'todos',
              radius: 8000,
              rankby: 'prominence',
              placeType: candidateType,
              shuffle: true,
              bypassCache: true,
            });

            if (altRes.places && altRes.places.length >= 3 && !isRepetitiveOrLowQuality(altRes.places)) {
              res = altRes;
              setActiveTypeIndex(i);
              setActiveTypeName(candidateType);
              break;
            }
          }
        }

        if (!isCancelled && res.places && res.places.length > 0) {
          setPlaces(res.places);
        }
      } catch (err) {
        console.warn('Error fetching Google Places in App:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPlaces(false);
        }
      }
    };

    fetchPlaces();
    return () => {
      isCancelled = true;
    };
  }, [userCoords.lat, userCoords.lng]);

  const handleUpdatePlaces = (newPlaces: PlaceItem[]) => {
    if (newPlaces && newPlaces.length > 0) {
      setPlaces(newPlaces);
    }
  };

  const handleRefreshPlaces = async () => {
    setIsLoadingPlaces(true);
    try {
      // Cycle through ALTERNATING_PLACE_TYPES: 'restaurant' -> 'bar' -> 'cafe' -> 'night_club'
      const nextIndex = (activeTypeIndex + 1) % ALTERNATING_PLACE_TYPES.length;
      const nextType = ALTERNATING_PLACE_TYPES[nextIndex];
      setActiveTypeIndex(nextIndex);
      setActiveTypeName(nextType);

      // Determine vibe corresponding to type for optimal price filtering
      const typeVibeMap: Record<string, string> = {
        restaurant: 'gastronomia',
        bar: 'drinques',
        cafe: 'relax',
        night_club: 'agito',
      };
      const vibe = typeVibeMap[nextType] || 'gastronomia';

      const res = await googlePlacesService.searchPlaces({
        lat: userCoords.lat,
        lng: userCoords.lng,
        category: 'todos',
        radius: 8000,
        shuffle: true,
        bypassCache: true,
        rankby: 'prominence',
        placeType: nextType,
        vibe,
      });

      if (res.places && res.places.length > 0) {
        setPlaces(res.places);
      }
    } catch (err) {
      console.warn('Error refreshing places in App:', err);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const isSaved = (placeId: string) => {
    return savedPlaces.some(p => p.placeId === placeId);
  };

  const handleToggleSave = async (place: PlaceItem) => {
    sound.pop();
    const uid = user?.uid || 'guest';
    const alreadySaved = isSaved(place.id);

    let updatedList: SavedPlace[];
    if (alreadySaved) {
      updatedList = savedPlaces.filter(p => p.placeId !== place.id);
      setSavedPlaces(updatedList);
      if (user?.uid && !effectiveOffline) {
        try {
          await removeSavedPlace(user.uid, place.id);
        } catch (e) {
          console.warn('Error removing saved place from firestore:', e);
        }
      } else if (user?.uid && effectiveOffline) {
        await offlineCacheService.enqueueSyncAction(user.uid, {
          type: 'REMOVE_SAVED_PLACE',
          payload: { placeId: place.id }
        });
      }
    } else {
      const newSaved: SavedPlace = {
        id: `${uid}_${place.id}`,
        userId: uid,
        placeId: place.id,
        title: place.title,
        category: place.categoryLabel,
        address: place.address,
        neighborhood: place.neighborhood,
        rating: place.rating,
        priceLevel: place.priceLevel,
        imageUrl: place.imageUrl,
        customTag: 'Quero ir',
        notes: '',
        savedAt: new Date().toISOString(),
      };
      updatedList = [newSaved, ...savedPlaces];
      setSavedPlaces(updatedList);
      if (user?.uid && !effectiveOffline) {
        try {
          await savePlaceToFirestore(user.uid, newSaved);
        } catch (e) {
          console.warn('Error saving place to firestore:', e);
        }
      } else if (user?.uid && effectiveOffline) {
        await offlineCacheService.enqueueSyncAction(user.uid, {
          type: 'SAVE_PLACE',
          payload: newSaved
        });
      }
    }

    // Always update AsyncStorage cache
    await offlineCacheService.cacheSavedPlaces(uid, updatedList);
    setLastSyncTime(new Date().toISOString());
  };

  const handleDirectDecide = async () => {
    sound.success();
    const uid = user?.uid || 'guest';
    const randomVibe: OutingPlanSession['vibe'] = ['gastronomia', 'drinques', 'agito', 'relax'][Math.floor(Math.random() * 4)] as any;
    const session: OutingPlanSession = {
      when: 'agora',
      withWhom: 'casal',
      vibe: randomVibe,
    };
    setActiveSession(session);

    const chosen = places[0];
    // Record to AsyncStorage offline cache
    const recorded = await offlineCacheService.recordDecision(uid, {
      when: 'Agora mesmo',
      withWhom: 'Casal · romântico',
      vibe: randomVibe,
      chosenPlaceId: chosen.id,
      chosenPlaceName: chosen.title,
      chosenPlaceCategory: chosen.categoryLabel,
      chosenPlaceImageUrl: chosen.imageUrl,
    });
    setDecisionHistory(prev => [recorded, ...prev.filter(d => d.chosenPlaceId !== recorded.chosenPlaceId)]);

    // Sync to Firestore if online
    if (user?.uid && !effectiveOffline) {
      saveOutingPlan(user.uid, session, chosen.id, chosen.title).catch(() => {});
    }
  };

  const handleStartThreeTouches = (initialVibe?: string) => {
    sound.tap();
    setThreeTouchInitialVibe(initialVibe);
    setIsThreeTouchModalOpen(true);
  };

  const handleCompleteThreeTouches = async (session: OutingPlanSession) => {
    setIsThreeTouchModalOpen(false);
    setActiveSession(session);
    const uid = user?.uid || 'guest';

    const chosen = places.find(p => p.vibes.includes(session.vibe)) || places[0];
    // Record to AsyncStorage offline cache
    const recorded = await offlineCacheService.recordDecision(uid, {
      when: session.when,
      withWhom: session.withWhom,
      vibe: session.vibe,
      chosenPlaceId: chosen.id,
      chosenPlaceName: chosen.title,
      chosenPlaceCategory: chosen.categoryLabel,
      chosenPlaceImageUrl: chosen.imageUrl,
    });
    setDecisionHistory(prev => [recorded, ...prev.filter(d => d.chosenPlaceId !== recorded.chosenPlaceId)]);

    // Sync to Firestore if online
    if (user?.uid && !effectiveOffline) {
      saveOutingPlan(user.uid, session, chosen.id, chosen.title).catch(() => {});
    }
  };

  const handleNavigateToPlace = (place: PlaceItem) => {
    sound.tap();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${encodeURIComponent(place.title)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleVoiceCommand = (cmd: VoiceCommandResult) => {
    sound.success();
    haptic.success();
    if (cmd.action === 'open_map') {
      setActiveSession(null);
      setCurrentTab('mapa');
      return;
    }
    if (cmd.action === 'decide') {
      handleDirectDecide();
      return;
    }
    if (cmd.action === 'open_cupons') {
      setActiveSession(null);
      setCurrentTab('explorar');
      return;
    }
    if (cmd.action === 'filter_companion') {
      const randomVibe: OutingPlanSession['vibe'] = ['gastronomia', 'drinques', 'agito', 'relax'][Math.floor(Math.random() * 4)] as any;
      setActiveSession({
        when: 'agora',
        withWhom: cmd.companion || 'casal',
        vibe: randomVibe,
      });
      return;
    }
    if (cmd.action === 'filter_category') {
      setActiveSession(null);
      setCurrentTab('explorar');
      return;
    }
    // Generic query -> switch to chat with the voice prompt
    setActiveSession(null);
    setCurrentTab('chat');
  };

  const handleOpenMapFromPlace = (place: PlaceItem) => {
    setSelectedPlaceForMap(place);
    setCurrentTab('mapa');
  };

  const handleCheckIn = (place: PlaceItem) => {
    const uid = user?.uid || 'guest';
    const newVisit: UserVisit = {
      id: `visit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: uid,
      placeId: place.id,
      placeTitle: place.title,
      placeCategory: place.categoryLabel || place.category,
      placeAddress: place.address || '',
      placeImageUrl: place.imageUrl || '',
      visitedAt: new Date().toISOString(),
      notes: 'Check-in realizado pelo vamo.AI',
      vibe: place.vibes?.[0] || 'gastronomia',
    };
    setUserVisits((prev) => [newVisit, ...prev.filter((v) => v.placeId !== place.id)]);
  };

  const handleSimulateWeatherAlert = async () => {
    const fakePrev: WeatherData = initialSessionWeatherRef.current || {
      temp: 27,
      weatherCode: 0,
      precipitation: 0,
      isDay: true,
      conditionLabel: 'Céu Limpo',
      isRaining: false,
      isCold: false,
      isHot: true,
      badge: '☀️ Ensolarado',
      suggestion: 'Aproveite o tempo aberto',
      suggestedVibe: 'gastronomia',
      filterOutdoors: false,
    };
    const fakeCurr: WeatherData = {
      temp: 20,
      weatherCode: 61,
      precipitation: 4.2,
      isDay: true,
      conditionLabel: 'Chuva Moderada',
      isRaining: true,
      isCold: false,
      isHot: false,
      badge: '🌧️ Chuva',
      suggestion: 'Prefira locais cobertos',
      suggestedVibe: 'gastronomia',
      filterOutdoors: true,
    };
    await fcmNotificationService.notifyWeatherShift({
      previousWeather: fakePrev,
      currentWeather: fakeCurr,
      reason: 'Começou a chover forte! Sugerimos opções cobertas, intimistas ou bistrôs acolhedores.',
      suggestedVibe: 'gastronomia',
    });
  };

  return (
    <>
      <AnimatePresence>
        {isSplashVisible && <SplashScreen key="app-splash" />}
      </AnimatePresence>
      <PhoneFrame>
        <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#14102E] relative">
        {/* Weather Shift Notification Alert Banner (FCM Push) */}
        <WeatherShiftAlert
          notification={weatherAlert}
          onDismiss={() => setWeatherAlert(null)}
          onAdjustOuting={() => {
            const suggested = weatherAlert?.suggestedVibe || 'gastronomia';
            setWeatherAlert(null);
            handleStartThreeTouches(suggested);
          }}
        />

        {/* Offline Sync Queue Recovery Toast */}
        <SyncQueueToast
          toast={syncToast}
          onDismiss={() => setSyncToast(null)}
        />

        {/* Navigation Header */}
        <Navbar
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
        />

        {/* Offline Indicator & AsyncStorage Cache Status */}
        <OfflineIndicator lastSyncTime={lastSyncTime} />

        {/* Ambient Time-of-Day Bar (A cor do agora) */}
        <TimeOfDayPicker />

        {/* Main Body depending on active Tab / Active Decision Session */}
        <main className="flex-1 w-full overflow-hidden flex flex-col relative">
          <AnimatePresence mode="wait">
            {activeSession ? (
              <motion.div
                key="decide-result"
                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -24, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 w-full h-full flex flex-col overflow-hidden"
              >
                <DecideResultScreen
                  session={activeSession}
                  places={places}
                  onSelectPlace={(place) => setSelectedPlaceDetail(place)}
                  onNavigateToPlace={handleNavigateToPlace}
                  onToggleSave={handleToggleSave}
                  isSaved={isSaved}
                  onBack={() => setActiveSession(null)}
                />
              </motion.div>
            ) : currentTab === 'agora' ? (
              <motion.div
                key="agora"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 w-full h-full flex flex-col overflow-hidden"
              >
                <HomeScreen
                  onStartThreeTouches={() => handleStartThreeTouches()}
                  onExplore={() => setCurrentTab('explorar')}
                  onOpenSaved={() => setCurrentTab('guardados')}
                  onOpenChat={() => setCurrentTab('chat')}
                  onDirectDecide={handleDirectDecide}
                  onQuickVibeSelect={(vibe) => handleStartThreeTouches(vibe)}
                  onSelectPlace={(place) => setSelectedPlaceDetail(place)}
                  onNavigateToPlace={handleNavigateToPlace}
                  onToggleSave={handleToggleSave}
                  isSaved={isSaved}
                  places={places}
                  isLoadingPlaces={isLoadingPlaces}
                  onRefreshPlaces={handleRefreshPlaces}
                  activeTypeName={activeTypeName}
                  savedPlaces={savedPlaces}
                  userVisits={userVisits}
                  onOpenVoiceSearch={() => setIsVoiceSearchOpen(true)}
                  onOpenLocationModal={() => setIsLocationModalOpen(true)}
                />
              </motion.div>
            ) : currentTab === 'explorar' ? (
              <motion.div
                key="explorar"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 w-full h-full flex flex-col overflow-hidden"
              >
                <ExploreFeed
                  places={places}
                  onSelectPlace={(place) => setSelectedPlaceDetail(place)}
                  onNavigateToPlace={handleNavigateToPlace}
                  isSaved={isSaved}
                  onToggleSave={handleToggleSave}
                  onUpdatePlaces={handleUpdatePlaces}
                />
              </motion.div>
            ) : currentTab === 'chat' ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 w-full h-full flex flex-col overflow-hidden"
              >
                <AIChatScreen
                  places={places}
                  onSelectPlace={(place) => setSelectedPlaceDetail(place)}
                  onNavigateToPlace={handleNavigateToPlace}
                  isSaved={isSaved}
                  onToggleSave={handleToggleSave}
                />
              </motion.div>
            ) : currentTab === 'mapa' ? (
              <motion.div
                key="mapa"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 w-full h-full flex flex-col overflow-hidden"
              >
                <MapView
                  places={places}
                  selectedPlace={selectedPlaceForMap}
                  onSelectPlace={(place) => setSelectedPlaceForMap(place)}
                  onOpenDetail={(place) => setSelectedPlaceDetail(place)}
                  isSaved={isSaved}
                  onToggleSave={handleToggleSave}
                />
              </motion.div>
            ) : (
              <motion.div
                key="guardados"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 w-full h-full flex flex-col overflow-hidden"
              >
                <SavedPlacesScreen
                  savedPlaces={savedPlaces}
                  decisionHistory={decisionHistory}
                  places={places}
                  onSelectPlace={(place) => setSelectedPlaceDetail(place)}
                  onNavigateToPlace={handleNavigateToPlace}
                  onRemoveSaved={(id) => handleToggleSave({ id } as any)}
                  onExplore={() => setCurrentTab('explorar')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Tab Bar */}
        <BottomTabBar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setActiveSession(null);
            setCurrentTab(tab);
          }}
          savedCount={savedPlaces.length}
        />

        {/* Modals */}
        <ThreeTouchDecideModal
          isOpen={isThreeTouchModalOpen}
          onClose={() => setIsThreeTouchModalOpen(false)}
          onComplete={handleCompleteThreeTouches}
          initialVibe={threeTouchInitialVibe}
        />

        <PlaceDetailModal
          place={selectedPlaceDetail}
          onClose={() => setSelectedPlaceDetail(null)}
          onToggleSave={handleToggleSave}
          isSaved={selectedPlaceDetail ? isSaved(selectedPlaceDetail.id) : false}
          onOpenMap={handleOpenMapFromPlace}
          onCheckIn={handleCheckIn}
        />

        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          savedCount={savedPlaces.length}
          visits={userVisits}
          onSelectPlaceById={(placeId) => {
            const found = places.find(p => p.id === placeId);
            if (found) setSelectedPlaceDetail(found);
          }}
        />

        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
        />

        <InitialLocationModal
          onOpenManualPicker={() => setIsLocationModalOpen(true)}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onTestWeatherAlert={handleSimulateWeatherAlert}
          onOpenInstallModal={() => {
            setIsSettingsModalOpen(false);
            setIsInstallModalOpen(true);
          }}
        />

        <PWAInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />

        <VoiceSearchModal
          isOpen={isVoiceSearchOpen}
          onClose={() => setIsVoiceSearchOpen(false)}
          onApplyVoiceCommand={handleVoiceCommand}
          currentCityName={currentCity.name}
        />
      </div>
    </PhoneFrame>
    </>
  );
}

export default function App() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <ThemeProvider>
          <LocationProvider>
            <BatterySaverProvider>
              <MainApp />
            </BatterySaverProvider>
          </LocationProvider>
        </ThemeProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}
