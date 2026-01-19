import { db, auth } from "./firebaseConfig";
import { 
  collection, doc, getDoc, setDoc, deleteDoc, getDocs, getCountFromServer,
  writeBatch, query, where, addDoc, limit
} from "firebase/firestore";
import { AppID } from "../types";

// --- Collection Names ---
export const STORES = {
  LYRICS: 'lyrics_ai_data',     
  ALBUMS: 'albums_ai_data',     
  DRAMA: 'drama_tracker_data',  
  STRATEGY: 'just_sell_it_data',
  CHAT: 'gemini_chat_data',     
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
  SYSTEM_EVENTS: 'sys_telemetry_events', 
  SYSTEM_MEMORY: 'sys_core_memory',
  WALLPAPERS: 'user_wallpapers_data' // NEW: Dedicated Wallpaper Store
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
    if (!auth.currentUser) return; // Silent fail if offline/logged out
    try {
        const ref = this.getDocRef(storeName, key);
        // Adding timestamp for sorting
        const payload = { ...value, _updated: Date.now() };
        await setDoc(ref, payload);
    } catch (e) {
        console.error("Firestore Write Error", e);
    }
  }

  // Add new item (Auto-ID)
  async add(storeName: string, value: any): Promise<string | null> {
      if (!auth.currentUser) return null;
      try {
          const col = this.getCollectionRef(storeName);
          const payload = { ...value, _created: Date.now() };
          const ref = await addDoc(col, payload);
          return ref.id;
      } catch (e) {
          console.error("Firestore Add Error", e);
          return null;
      }
  }

  // Fire-and-forget logging (Optimized)
  async logEvent(value: any): Promise<void> {
    if (!auth.currentUser) return;
    try {
        const col = this.getCollectionRef(STORES.SYSTEM_EVENTS);
        // Use addDoc for auto-generated IDs
        // We don't await this strictly to keep UI fast
        await addDoc(col, { ...value, timestamp: Date.now() });
    } catch (e) {
        // Suppress telemetry errors
    }
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
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
    if (!auth.currentUser) return;
    await deleteDoc(this.getDocRef(storeName, key));
  }

  async clearStore(storeName: string): Promise<void> {
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
  }

  async getStoreStats(storeName: string): Promise<StoreStats> {
    if (!auth.currentUser) return { name: storeName, count: 0, sizeBytes: 0 };
    
    // Aggregation queries avoid full collection scans for counts and reduce read costs.
    const col = this.getCollectionRef(storeName);
    const countSnap = await getCountFromServer(col);
    const count = countSnap.data().count;

    return {
        name: storeName,
        count,
        sizeBytes: 0
    };
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
