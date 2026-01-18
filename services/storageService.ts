
/**
 * Advanced Storage Service
 * Isolated Object Stores for multi-app data persistence.
 */
import { AppID } from "../types";

const DB_NAME = 'OS18_Experience_DB_v2';
const DB_VERSION = 5; // Incremented for Shorts Studio

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
  // NEW SYSTEM STORES
  SYSTEM_EVENTS: 'sys_telemetry_events', // Raw high-frequency logs
  SYSTEM_MEMORY: 'sys_core_memory'       // Consolidated "Brain" facts
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
  memoryUsage: number; // in bytes
  lastUpdated: number;
}

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            // For event logs, we want auto-incrementing keys for speed
            if (storeName === STORES.SYSTEM_EVENTS) {
                db.createObjectStore(storeName, { autoIncrement: true });
            } else {
                db.createObjectStore(storeName);
            }
          }
        });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        reject('IndexedDB failed to initialize');
      };
    });
  }

  async set(storeName: string, key: string, value: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Failed to write to store: ${storeName}`);
    });
  }

  // Specialized method for high-frequency event logging
  async logEvent(value: any): Promise<void> {
    await this.init();
    return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORES.SYSTEM_EVENTS], 'readwrite');
        const store = transaction.objectStore(STORES.SYSTEM_EVENTS);
        // We don't wait for success to ensure UI non-blocking, fire and forget
        store.add({ ...value, timestamp: Date.now() });
        resolve();
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(`Failed to read from store: ${storeName}`);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    return new Promise((resolve) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });
  }

  async remove(storeName: string, key: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Failed to delete from store: ${storeName}`);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Failed to clear store: ${storeName}`);
    });
  }

  async getStoreStats(storeName: string): Promise<StoreStats> {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();
      
      let size = 0;
      // Sampling size for performance - exact byte count is expensive on large stores
      const cursorRequest = store.openCursor();
      let iterations = 0;
      
      cursorRequest.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor && iterations < 50) { // Sample first 50 for speed estimation
          const value = cursor.value;
          size += new Blob([JSON.stringify(value)]).size;
          iterations++;
          cursor.continue();
        } else {
          // Extrapolate if we hit limit
          const totalCount = countRequest.result || 0;
          const estimatedTotalSize = iterations > 0 ? (size / iterations) * totalCount : 0;
          
          resolve({
            name: storeName,
            count: totalCount,
            sizeBytes: estimatedTotalSize
          });
        }
      };
    });
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

  async purgeAll(): Promise<void> {
    await this.init();
    const stores = Object.values(STORES);
    for (const s of stores) {
      await this.clearStore(s);
    }
  }
}

export const storage = new StorageService();
