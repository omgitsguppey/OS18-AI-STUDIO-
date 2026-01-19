import { db, auth } from "./firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  query,
  addDoc,
  limit
} from "firebase/firestore";
import type { AppID, TelemetryEvent } from "../types";
import { logEvent } from "./telemetryTransport";

// --- Collection Names ---
export const STORES = {
  LYRICS: 'lyrics_ai_data',     
  ALBUMS: 'albums_ai_data',     
  DRAMA: 'drama_tracker_data',  
  STRATEGY: 'just_sell_it_data',
  SYSTEM: 'system_settings',    
  LINKS: 'link_flipper_data',    
  CAPTIONS: 'captions_ai_data',   
  PASSWORDS: 'passwords_data',    
  MARKUP: 'markup_ai_data',       
  CONTENT: 'content_ai_data',     
  ANALYTICS: 'analytics_ai_data',  
  CAREER: 'career_ai_data',        
  TRENDS: 'trends_ai_data',       
  GET_FAMOUS: 'get_famous_data',   
  PRIORITY: 'priority_ai_data',    
  BRAND_KIT: 'brand_kit_ai_data',  
  VIRAL_PLAN: 'viral_plan_ai_data', 
  PLAYGROUND: 'ai_playground_data', 
  PLAYLIST: 'playlist_ai_data', 
  ACHIEVEMENTS: 'achievements_data', 
  NSFW_AI: 'nsfw_ai_data',
  TRAP_AI: 'trap_ai_data',
  SPEECH_AI: 'speech_ai_data',
  SHORTS_STUDIO: 'shorts_studio_data',
  SYSTEM_MEMORY: 'sys_core_memory',
  WALLPAPERS: 'user_wallpapers_data' // NEW: Dedicated Wallpaper Store
};

const STORE_APP_MAP: Record<string, AppID> = {
  [STORES.DRAMA]: AppID.DRAMA,
  [STORES.STRATEGY]: AppID.SELL_IT,
  [STORES.LYRICS]: AppID.LYRICS_AI,
  [STORES.ALBUMS]: AppID.ALBUMS_AI,
  [STORES.LINKS]: AppID.LINK_FLIPPER,
  [STORES.CAPTIONS]: AppID.CAPTIONS,
  [STORES.PASSWORDS]: AppID.PASSWORDS,
  [STORES.MARKUP]: AppID.MARKUP_AI,
  [STORES.CONTENT]: AppID.CONTENT_AI,
  [STORES.ANALYTICS]: AppID.ANALYTICS_AI,
  [STORES.CAREER]: AppID.CAREER_AI,
  [STORES.TRENDS]: AppID.TRENDS_AI,
  [STORES.GET_FAMOUS]: AppID.GET_FAMOUS,
  [STORES.PRIORITY]: AppID.PRIORITY_AI,
  [STORES.BRAND_KIT]: AppID.BRAND_KIT_AI,
  [STORES.VIRAL_PLAN]: AppID.VIRAL_PLAN_AI,
  [STORES.PLAYGROUND]: AppID.AI_PLAYGROUND,
  [STORES.PLAYLIST]: AppID.PLAYLIST_AI,
  [STORES.ACHIEVEMENTS]: AppID.ACHIEVEMENTS,
  [STORES.NSFW_AI]: AppID.NSFW_AI,
  [STORES.TRAP_AI]: AppID.TRAP_AI,
  [STORES.SPEECH_AI]: AppID.SPEECH_AI,
  [STORES.SHORTS_STUDIO]: AppID.SHORTS_STUDIO,
  [STORES.WALLPAPERS]: AppID.WALLPAPER_AI,
  [STORES.SYSTEM]: AppID.SETTINGS
};

const SESSION_KEY = 'telemetry_session_v1';

const getTelemetrySessionId = () => {
  if (typeof window === 'undefined') return 'server-session';
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(SESSION_KEY, next);
  return next;
};

const emitStorageEvent = (
  appId: AppID | undefined,
  eventType: TelemetryEvent['eventType'],
  label: string,
  meta?: Record<string, unknown>
) => {
  if (!appId) return;
  const event: TelemetryEvent = {
    sessionId: getTelemetrySessionId(),
    appId,
    context: 'storage',
    eventType,
    label,
    timestamp: Date.now(),
    meta: meta ?? null
  };
  logEvent(event);
};

export interface StoreStats {
  name: string;
  count: number;
  sizeBytes: number;
}

export interface AIMetadata {
  appId: string;
  storeName: string;
  contextCount: number;
  memoryUsage: number;
  lastUpdated: number;
}

class StorageService {
  
  // Helper: Get current user's isolated collection path
  private getCollectionRef(storeName: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    // Path: users/{uid}/{storeName}
    return collection(db, "users", user.uid, storeName);
  }

  // Helper: Get specific doc ref
  private getDocRef(storeName: string, key: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    return doc(db, "users", user.uid, storeName, key);
  }

  // Save with specific Key
  async set(storeName: string, key: string, value: any): Promise<void> {
    if (storeName === STORES.PASSWORDS) {
      localStorage.setItem(`local_${storeName}_${key}`, JSON.stringify(value));
      emitStorageEvent(STORE_APP_MAP[storeName], 'save', 'local_save', { storeName });
      return;
    }
    if (!auth.currentUser) return; // Silent fail if offline/logged out
    try {
        const ref = this.getDocRef(storeName, key);
        // Adding timestamp for sorting
        const payload = { ...value, _updated: Date.now() };
        await setDoc(ref, payload);
        emitStorageEvent(STORE_APP_MAP[storeName], 'save', 'save', { storeName });
    } catch (e) {
        console.error("Firestore Write Error", e);
    }
  }

  // Add new item (Auto-ID)
  async add(storeName: string, value: any): Promise<string | null> {
      if (storeName === STORES.PASSWORDS) {
        const key = `local_${storeName}_${Date.now().toString()}`;
        localStorage.setItem(key, JSON.stringify(value));
        emitStorageEvent(STORE_APP_MAP[storeName], 'save', 'local_add', { storeName });
        return key;
      }
      if (!auth.currentUser) return null;
      try {
          const col = this.getCollectionRef(storeName);
          const payload = { ...value, _created: Date.now() };
          const ref = await addDoc(col, payload);
          emitStorageEvent(STORE_APP_MAP[storeName], 'save', 'add', { storeName });
          return ref.id;
      } catch (e) {
          console.error("Firestore Add Error", e);
          return null;
      }
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (storeName === STORES.PASSWORDS) {
      const raw = localStorage.getItem(`local_${storeName}_${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    if (!auth.currentUser) return null;
    try {
        const ref = this.getDocRef(storeName, key);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return snap.data() as T;
        }
        return null;
    } catch (e) {
        console.error("Firestore Read Error", e);
        return null;
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (storeName === STORES.PASSWORDS) {
      const prefix = `local_${storeName}_`;
      const entries: T[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) entries.push(JSON.parse(raw) as T);
        }
      }
      return entries;
    }
    if (!auth.currentUser) return [];
    try {
        const col = this.getCollectionRef(storeName);
        const snap = await getDocs(col);
        return snap.docs.map(d => d.data() as T);
    } catch (e) {
        return [];
    }
  }

  async remove(storeName: string, key: string): Promise<void> {
    if (storeName === STORES.PASSWORDS) {
      localStorage.removeItem(`local_${storeName}_${key}`);
      emitStorageEvent(STORE_APP_MAP[storeName], 'delete', 'local_delete', { storeName });
      return;
    }
    if (!auth.currentUser) return;
    await deleteDoc(this.getDocRef(storeName, key));
    emitStorageEvent(STORE_APP_MAP[storeName], 'delete', 'delete', { storeName });
  }

  async clearStore(storeName: string): Promise<void> {
    if (storeName === STORES.PASSWORDS) {
      const prefix = `local_${storeName}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      emitStorageEvent(STORE_APP_MAP[storeName], 'delete', 'local_clear', { storeName });
      return;
    }
    if (!auth.currentUser) return;
    const col = this.getCollectionRef(storeName);

    while (true) {
        const snap = await getDocs(query(col, limit(500)));
        if (snap.empty) return;

        // Batch delete (limit 500 per batch in Firestore)
        const batch = writeBatch(db);
        snap.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }
    emitStorageEvent(STORE_APP_MAP[storeName], 'delete', 'clear', { storeName });
  }

  async getStoreStats(storeName: string): Promise<StoreStats> {
    if (storeName === STORES.PASSWORDS) {
      const prefix = `local_${storeName}_`;
      let totalBytes = 0;
      let count = 0;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = localStorage.getItem(key) ?? '';
          totalBytes += raw.length;
          count += 1;
        }
      }
      return { name: storeName, count, sizeBytes: totalBytes };
    }

    if (!auth.currentUser) return { name: storeName, count: 0, sizeBytes: 0 };

    const userId = auth.currentUser.uid;
    const appId = STORE_APP_MAP[storeName];
    if (!appId) return { name: storeName, count: 0, sizeBytes: 0 };

    const ref = doc(db, "stats", "users", userId, "apps", appId, "summary");
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { name: storeName, count: 0, sizeBytes: 0 };
    }
    const data = snap.data() ?? {};
    const count = typeof data.count === "number" ? data.count : 0;
    const sizeBytes = typeof data.sizeBytes === "number" ? data.sizeBytes : 0;
    return { name: storeName, count, sizeBytes };
  }

  async getAIMetadata(appId: AppID, storeName: string): Promise<AIMetadata> {
    const stats = await this.getStoreStats(storeName);
    return {
      appId,
      storeName,
      contextCount: stats.count,
      memoryUsage: stats.sizeBytes,
      lastUpdated: Date.now() 
    };
  }

  // Admin Tool: Clear everything for this user
  async purgeAll(): Promise<void> {
    const stores = Object.values(STORES);
    for (const s of stores) {
      await this.clearStore(s);
    }
  }
}

export const storage = new StorageService();
