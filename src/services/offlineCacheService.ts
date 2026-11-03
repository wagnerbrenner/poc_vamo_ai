import AsyncStorage from '../utils/asyncStorage';
import { SavedPlace, UserVisit } from '../types';

export interface StoredDecision {
  id: string;
  timestamp: string;
  when: string;
  withWhom: string;
  vibe: string;
  chosenPlaceId: string;
  chosenPlaceName: string;
  chosenPlaceCategory?: string;
  chosenPlaceImageUrl?: string;
  rating?: number;
}

const KEYS = {
  SAVED_PLACES: (uid: string) => `@vamo_ai:saved_places:${uid || 'guest'}`,
  DECISION_HISTORY: (uid: string) => `@vamo_ai:decision_history:${uid || 'guest'}`,
  VISITS: (uid: string) => `@vamo_ai:visits:${uid || 'guest'}`,
  LAST_SYNC: (uid: string) => `@vamo_ai:last_sync:${uid || 'guest'}`,
};

export const offlineCacheService = {
  // Save places to AsyncStorage cache
  async cacheSavedPlaces(userId: string, places: SavedPlace[]): Promise<void> {
    try {
      const key = KEYS.SAVED_PLACES(userId);
      await AsyncStorage.setItem(key, JSON.stringify(places));
      await AsyncStorage.setItem(KEYS.LAST_SYNC(userId), new Date().toISOString());
    } catch (e) {
      console.warn('[OfflineCache] Failed to cache saved places:', e);
    }
  },

  // Load saved places from AsyncStorage cache
  async loadCachedSavedPlaces(userId: string): Promise<SavedPlace[]> {
    try {
      const key = KEYS.SAVED_PLACES(userId);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as SavedPlace[];
      }
    } catch (e) {
      console.warn('[OfflineCache] Failed to load cached saved places:', e);
    }
    return [];
  },

  // Save a decision to the offline history
  async recordDecision(userId: string, decision: Omit<StoredDecision, 'id' | 'timestamp'>): Promise<StoredDecision> {
    const record: StoredDecision = {
      ...decision,
      id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    try {
      const key = KEYS.DECISION_HISTORY(userId);
      const existing = await this.loadDecisionHistory(userId);
      // Keep most recent 20 decisions
      const updated = [record, ...existing.filter(d => d.chosenPlaceId !== record.chosenPlaceId)].slice(0, 20);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('[OfflineCache] Failed to record decision in AsyncStorage:', e);
    }

    return record;
  },

  // Load decision history from AsyncStorage cache
  async loadDecisionHistory(userId: string): Promise<StoredDecision[]> {
    try {
      const key = KEYS.DECISION_HISTORY(userId);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as StoredDecision[];
      }
    } catch (e) {
      console.warn('[OfflineCache] Failed to load decision history:', e);
    }
    return [];
  },

  // Cache visits
  async cacheVisits(userId: string, visits: UserVisit[]): Promise<void> {
    try {
      const key = KEYS.VISITS(userId);
      await AsyncStorage.setItem(key, JSON.stringify(visits));
    } catch (e) {
      console.warn('[OfflineCache] Failed to cache visits:', e);
    }
  },

  // Load visits from cache
  async loadCachedVisits(userId: string): Promise<UserVisit[]> {
    try {
      const key = KEYS.VISITS(userId);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as UserVisit[];
      }
    } catch (e) {
      console.warn('[OfflineCache] Failed to load cached visits:', e);
    }
    return [];
  },

  // Record a single local visit
  async recordLocalVisit(userId: string, visit: UserVisit): Promise<UserVisit[]> {
    try {
      const existing = await this.loadCachedVisits(userId);
      const updated = [visit, ...existing.filter(v => v.id !== visit.id)].slice(0, 50);
      await this.cacheVisits(userId, updated);
      return updated;
    } catch (e) {
      console.warn('[OfflineCache] Failed to record local visit:', e);
      return [];
    }
  },

  // Get last sync timestamp
  async getLastSync(userId: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_SYNC(userId));
    } catch {
      return null;
    }
  },

  // Sync Queue: Enqueue action when offline or pending confirmation
  async enqueueSyncAction(userId: string, action: {
    type: 'SAVE_PLACE' | 'REMOVE_SAVED_PLACE' | 'CHECK_IN';
    payload: any;
  }): Promise<PendingSyncAction> {
    const queueKey = `@vamo_ai:sync_queue:${userId || 'guest'}`;
    const newAction: PendingSyncAction = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: action.type,
      userId,
      payload: action.payload,
      queuedAt: new Date().toISOString(),
    };

    try {
      const existing = await this.loadPendingSyncActions(userId);
      const updated = [...existing, newAction];
      await AsyncStorage.setItem(queueKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('[OfflineCache] Failed to enqueue sync action:', e);
    }

    return newAction;
  },

  // Load all pending sync actions from queue
  async loadPendingSyncActions(userId: string): Promise<PendingSyncAction[]> {
    const queueKey = `@vamo_ai:sync_queue:${userId || 'guest'}`;
    try {
      const data = await AsyncStorage.getItem(queueKey);
      if (data) {
        return JSON.parse(data) as PendingSyncAction[];
      }
    } catch (e) {
      console.warn('[OfflineCache] Failed to load sync queue:', e);
    }
    return [];
  },

  // Remove a completed sync action by ID
  async removePendingSyncAction(userId: string, actionId: string): Promise<void> {
    const queueKey = `@vamo_ai:sync_queue:${userId || 'guest'}`;
    try {
      const existing = await this.loadPendingSyncActions(userId);
      const updated = existing.filter(a => a.id !== actionId);
      await AsyncStorage.setItem(queueKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('[OfflineCache] Failed to remove action from sync queue:', e);
    }
  },

  // Clear sync queue
  async clearSyncQueue(userId: string): Promise<void> {
    const queueKey = `@vamo_ai:sync_queue:${userId || 'guest'}`;
    try {
      await AsyncStorage.removeItem(queueKey);
    } catch (e) {
      console.warn('[OfflineCache] Failed to clear sync queue:', e);
    }
  },

  // Clear offline cache
  async clearCache(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.SAVED_PLACES(userId));
      await AsyncStorage.removeItem(KEYS.DECISION_HISTORY(userId));
      await AsyncStorage.removeItem(KEYS.VISITS(userId));
      await AsyncStorage.removeItem(KEYS.LAST_SYNC(userId));
      await this.clearSyncQueue(userId);
    } catch (e) {
      console.warn('[OfflineCache] Failed to clear cache:', e);
    }
  }
};

export interface PendingSyncAction {
  id: string;
  type: 'SAVE_PLACE' | 'REMOVE_SAVED_PLACE' | 'CHECK_IN';
  userId: string;
  payload: any;
  queuedAt: string;
}

