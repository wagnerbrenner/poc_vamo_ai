import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { SavedPlace, ReviewItem, OutingPlanSession, UserVisit, PlaceItem, PartnerCoupon } from '../types';

export const savePlaceToFirestore = async (userId: string, place: Partial<SavedPlace>): Promise<void> => {
  const docId = `${userId}_${place.placeId}`;
  const path = `saved_places/${docId}`;
  try {
    const payload: SavedPlace = {
      id: docId,
      userId,
      placeId: place.placeId || '',
      title: place.title || '',
      category: place.category || 'restaurantes',
      address: place.address || '',
      neighborhood: place.neighborhood || '',
      rating: place.rating || 4.5,
      priceLevel: place.priceLevel || '$$',
      imageUrl: place.imageUrl || '',
      customTag: place.customTag || 'Quero ir',
      notes: place.notes || '',
      savedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'saved_places', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const removeSavedPlace = async (userId: string, placeId: string): Promise<void> => {
  const docId = `${userId}_${placeId}`;
  const path = `saved_places/${docId}`;
  try {
    await deleteDoc(doc(db, 'saved_places', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateSavedPlaceNotes = async (
  userId: string, 
  placeId: string, 
  notes: string, 
  customTag?: string
): Promise<void> => {
  const docId = `${userId}_${placeId}`;
  const path = `saved_places/${docId}`;
  try {
    await setDoc(doc(db, 'saved_places', docId), { notes, ...(customTag ? { customTag } : {}) }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToSavedPlaces = (
  userId: string, 
  onUpdate: (places: SavedPlace[]) => void
) => {
  const path = 'saved_places';
  const q = query(collection(db, path), where('userId', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const list: SavedPlace[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as SavedPlace);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const submitCustomerReview = async (review: Omit<ReviewItem, 'id' | 'createdAt'>): Promise<string> => {
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `reviews/${reviewId}`;
  try {
    const payload = {
      ...review,
      id: reviewId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'reviews', reviewId), payload);
    return reviewId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/**
 * Submit a customer review into the Firestore sub-collection: places/{placeId}/reviews/{reviewId}
 */
export const submitPlaceSubcollectionReview = async (
  placeId: string,
  review: Omit<ReviewItem, 'id' | 'createdAt'>
): Promise<string> => {
  const safePlaceId = placeId.replace(/\//g, '_');
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `places/${safePlaceId}/reviews/${reviewId}`;
  try {
    const payload = {
      ...review,
      id: reviewId,
      placeId: safePlaceId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'places', safePlaceId, 'reviews', reviewId), payload);
    return reviewId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const subscribeToPlaceReviews = (
  placeId: string,
  onUpdate: (reviews: ReviewItem[]) => void
) => {
  const path = 'reviews';
  const q = query(
    collection(db, path), 
    where('placeId', '==', placeId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const list: ReviewItem[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as ReviewItem);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

/**
 * Real-time listener for the Firestore sub-collection: places/{placeId}/reviews
 */
export const subscribeToPlaceSubcollectionReviews = (
  placeId: string,
  onUpdate: (reviews: ReviewItem[]) => void
) => {
  const safePlaceId = placeId.replace(/\//g, '_');
  const path = `places/${safePlaceId}/reviews`;
  const reviewsCol = collection(db, 'places', safePlaceId, 'reviews');
  const q = query(reviewsCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ReviewItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ReviewItem);
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

export const saveOutingPlan = async (
  userId: string, 
  session: OutingPlanSession, 
  chosenPlaceId: string, 
  chosenPlaceName: string
): Promise<void> => {
  const planId = `plan_${Date.now()}`;
  const path = `outing_plans/${planId}`;
  try {
    await setDoc(doc(db, 'outing_plans', planId), {
      id: planId,
      userId,
      when: session.when,
      withWhom: session.withWhom,
      vibe: session.vibe,
      chosenPlaceId,
      chosenPlaceName,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/**
 * Record a user check-in / visit into the Firestore collection: visitas
 */
export const recordUserVisit = async (
  userId: string,
  place: PlaceItem,
  notes?: string
): Promise<UserVisit> => {
  const visitId = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `visitas/${visitId}`;
  const payload: UserVisit = {
    id: visitId,
    userId,
    placeId: place.id,
    placeTitle: place.title,
    placeCategory: place.categoryLabel || place.category,
    placeAddress: place.address || '',
    placeImageUrl: place.imageUrl || '',
    visitedAt: new Date().toISOString(),
    notes: notes || 'Check-in realizado pelo vamo.AI',
    vibe: place.vibes?.[0] || 'gastronomia',
  };

  try {
    await setDoc(doc(db, 'visitas', visitId), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

/**
 * Real-time listener for user check-ins / visits from the visitas collection
 */
export const subscribeToUserVisits = (
  userId: string,
  onUpdate: (visits: UserVisit[]) => void
) => {
  const path = 'visitas';
  const q = query(
    collection(db, path),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserVisit[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UserVisit);
      });
      list.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

/**
 * Partner Discount Coupons ("Cupons" collection in Firestore)
 */
export const subscribeToCupons = (
  onUpdate: (coupons: PartnerCoupon[]) => void
) => {
  const path = 'cupons';
  const q = collection(db, path);

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PartnerCoupon[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Could not listen to cupons, using cached coupons:', error);
    }
  );
};

export const fetchCuponsFromFirestore = async (): Promise<PartnerCoupon[]> => {
  const path = 'cupons';
  try {
    const snap = await getDocs(collection(db, path));
    const list: PartnerCoupon[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    return list;
  } catch (error) {
    console.warn('Error fetching cupons from Firestore:', error);
    return [];
  }
};

export const saveCouponToFirestore = async (coupon: PartnerCoupon): Promise<void> => {
  const path = `cupons/${coupon.id}`;
  try {
    await setDoc(doc(db, 'cupons', coupon.id), {
      ...coupon,
      createdAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('Error saving coupon to Firestore:', error);
  }
};

export const claimCouponInFirestore = async (couponId: string, userId: string): Promise<string> => {
  const redemptionCode = `RESGATE-${couponId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  try {
    await setDoc(doc(db, 'cupons', couponId), {
      lastClaimedAt: new Date().toISOString(),
      lastClaimedBy: userId,
    }, { merge: true });
    return redemptionCode;
  } catch (error) {
    console.warn('Claim coupon recorded locally:', error);
    return redemptionCode;
  }
};

export const seedInitialCouponsIfEmpty = async (): Promise<void> => {
  try {
    const existing = await fetchCuponsFromFirestore();
    if (existing.length === 0) {
      const initialCoupons: PartnerCoupon[] = [
        {
          id: 'cupom-vamo15-welcome',
          code: 'VAMO15',
          title: '15% OFF na Conta Total',
          discount: '15% OFF',
          description: 'Desconto exclusivo de 15% em todo o consumo de comida e bebidas para clientes vamo.AI.',
          minSpend: 'R$ 80',
          validUntil: 'Válido até domingo',
          partnerTier: 'exclusive',
          terms: 'Apresente este cupom ou QR Code ao atendente no momento de pedir a conta.',
          qrPayload: 'https://vamo.ai/cupom/VAMO15?val=15off',
          claimCount: 42,
        },
        {
          id: 'cupom-drink-cortesia',
          code: 'VAMODRINK',
          title: 'Coquetel Autoral de Boas-Vindas',
          discount: 'Drink Cortesia',
          description: 'Ao pedir qualquer prato principal, ganhe um drinque autoral da casa preparado na hora.',
          minSpend: 'R$ 60',
          validUntil: 'Válido até domingo',
          partnerTier: 'vip',
          terms: 'Válido para 1 coquetel por mesa ou por cliente que apresentar o QR Code no balcão.',
          qrPayload: 'https://vamo.ai/cupom/VAMODRINK?val=drink',
          claimCount: 89,
        },
        {
          id: 'cupom-chopp-2x1',
          code: 'VAMO2X1',
          title: 'Chopp Artesanal em Dobro (2x1)',
          discount: '2x1 Chopp',
          description: 'Compre 1 chopp artesanal de 500ml e ganhe o segundo por conta do estabelecimento.',
          minSpend: 'Sem valor mínimo',
          validUntil: 'Válido até domingo',
          partnerTier: 'featured',
          terms: 'Apresente o QR Code no balcão ou na comanda.',
          qrPayload: 'https://vamo.ai/cupom/VAMO2X1?val=2x1',
          claimCount: 153,
        },
        {
          id: 'cupom-sobremesa-chef',
          code: 'VAMODOCE',
          title: 'Sobremesa Cortesia do Chef',
          discount: 'Sobremesa Grátis',
          description: 'Sobremesa especial da casa como cortesia ao pedir menu ou prato individual.',
          minSpend: 'R$ 75',
          validUntil: 'Válido até domingo',
          partnerTier: 'exclusive',
          terms: 'Válido mediante apresentação do voucher ativo antes do fechamento da conta.',
          qrPayload: 'https://vamo.ai/cupom/VAMODOCE?val=doce',
          claimCount: 67,
        },
      ];

      for (const c of initialCoupons) {
        await saveCouponToFirestore(c);
      }
    }
  } catch (err) {
    console.warn('Could not seed initial coupons to Firestore:', err);
  }
};
