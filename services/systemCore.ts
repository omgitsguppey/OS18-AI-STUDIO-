import { storage, STORES } from './storageService';
import { telemetryTransport } from './telemetryTransport';
import { AppID } from '../types';
import { authService } from './authService'; // Added for Admin check
import { auth } from './firebaseConfig';     // Added to access current user

/**
 * SYSTEM INTELLIGENCE LAYER (v3.0 - Phase 1: Dumb Collector)
 * "The Nervous System"
 * Role: Lightweight telemetry collection and state reading.
 * Logic: All heuristic analysis (HVA), scoring, and "dreaming" 
 * has been moved server-side.
 */

export type MemoryScope = 'Global' | 'Creative' | 'Business' | 'Utility';

export interface LearnedFact {
  content: string;
  scope: MemoryScope;
  confidence: number;
  source: 'implicit_edit' | 'explicit_save' | 'clipboard' | 'dwell';
  timestamp: number;
}

export interface Insight {
  id: string;
  type: 'pattern' | 'anomaly' | 'behavior';
  message: string;
  confidence: number;
  timestamp: number;
}

export interface InteractionEvent {
  appId: string;
  action: 'open' | 'generate' | 'regenerate' | 'edit' | 'copy' | 'download' | 'dwell' | 'abandon' | 'success' | 'dislike' | 'completion' | 'error' | 'sys_event' | 'install_app' | 'open_app';
  timestamp: number;
  metadata?: any;
  // Score is now optional/null on client, calculated server-side
  score?: number; 
}

export interface SystemState {
  userArchetype: string;
  activePromptVariant: 'A' | 'B';
  learnedFacts: LearnedFact[];
  insights: Insight[];
  telemetryEnabled: boolean;
  keywordWeights: Record<string, number>;
  negativeConstraints: Record<string, string[]>;
  goldenTemplates: Record<string, any[]>;
  sessionScore: number;
  lastGenerationTimestamp: number;
  totalInputChars: number;
  totalOutputChars: number;
  requestCount: number;
  
  credits: {
      count: number;
      lastReset: string; 
  };
}

const DEFAULT_STATE: SystemState = {
  userArchetype: 'General User',
  activePromptVariant: 'A', // Default to A, server assigns variants now
  learnedFacts: [],
  insights: [],
  telemetryEnabled: true,
  keywordWeights: {},
  negativeConstraints: {},
  goldenTemplates: {},
  sessionScore: 0,
  lastGenerationTimestamp: 0,
  totalInputChars: 0,
  totalOutputChars: 0,
  requestCount: 0,
  credits: {
      count: 20, 
      lastReset: new Date().toDateString()
  }
};

class SystemCoreService {
  private state: SystemState = DEFAULT_STATE;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    
    // Load the "Dreamt" state (synced from server by SyncService)
    const saved = await storage.get<SystemState>(STORES.SYSTEM_MEMORY, 'core_state_v3');
    
    if (saved) {
      this.state = { ...DEFAULT_STATE, ...saved };
      
      // Credit reset logic (still good to keep a local check for UI responsiveness)
      const today = new Date().toDateString();
      if (this.state.credits.lastReset !== today) {
          this.state.credits = { count: 20, lastReset: today };
          this.saveState();
      }
    }
    
    this.isInitialized = true;
  }

  // --- 1. CORE TRACKING API (The Pipeline) ---

  async trackInteraction(
    appId: string, 
    action: InteractionEvent['action'], 
    metadata?: any
  ) {
    if (!this.isInitialized) await this.init();
    if (!this.state.telemetryEnabled && action === 'sys_event') return;

    const now = Date.now();

    // Optimistic Local State Updates (for UI responsiveness only)
    if (action === 'generate') {
        this.state.lastGenerationTimestamp = now;
    }
    if (action === 'completion') {
        this.state.requestCount++;
        this.state.totalInputChars += (metadata?.inputLength || 0);
        this.state.totalOutputChars += (metadata?.outputLength || 0);
    }

    // Construct Event
    const event: InteractionEvent = { 
        appId, 
        action, 
        timestamp: now, 
        metadata 
    };

    // DELEGATE: Send to Transport Layer immediately
    // No buffering, no scoring, no analysis here.
    telemetryTransport.track(event);
  }

  // Public API for Raw DOM Events
  trackRawEvent(type: 'click' | 'keypress' | 'scroll', label: string) {
      if (!this.state.telemetryEnabled) return;
      const cleanLabel = label.length > 40 ? label.substring(0, 40) + '...' : label;
      this.trackInteraction('SYSTEM', 'sys_event', { type, label: cleanLabel });
  }

  // --- 2. CREDIT SYSTEM ---
  
  getCredits(): number {
      // Admin Bypass: Show effectively unlimited credits
      if (authService.isAdmin(auth.currentUser)) return 999;
      return this.state.credits.count;
  }

  async useCredit(amount = 1): Promise<boolean> {
      // Admin Bypass: Never face credit restrictions
      if (authService.isAdmin(auth.currentUser)) return true;

      if (this.state.credits.count < amount) return false;
      this.state.credits.count -= amount;
      await this.saveState(); // Save local decrement immediately
      return true;
  }

  // --- 3. PROMPT ENGINEERING & CONTEXT ---

  getTimeContext(): string {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return "Morning: Focus on productivity, clarity, and planning.";
      if (hour >= 12 && hour < 18) return "Afternoon: Focus on execution, energy, and brevity.";
      if (hour >= 18 || hour < 5) return "Night: Focus on creativity, reflection, and exploration.";
      return "";
  }

  getOptimizedPrompt(originalPrompt: string, appId: string, scope: MemoryScope = 'Global'): string {
      let systemContext = "";

      const variant = this.state.activePromptVariant;
      if (variant === 'A') systemContext += "Style: Direct and Professional. ";
      else systemContext += "Style: Conversational and Engaging. ";

      systemContext += `Mode: ${this.getTimeContext()} `;

      const relevantFacts = this.state.learnedFacts.filter(f => f.scope === 'Global' || f.scope === scope);
      if (relevantFacts.length > 0) {
          systemContext += `User Context: ${relevantFacts.map(f => f.content).join('. ')}. `;
      }

      const negatives = this.state.negativeConstraints[appId];
      if (negatives && negatives.length > 0) {
          systemContext += `AVOID: ${negatives.slice(-3).join(', ')}. `;
      }

      if (!systemContext) return originalPrompt;
      return `[SYSTEM: ${systemContext}] ${originalPrompt}`;
  }

  getDynamicTemperature(): number {
      const hour = new Date().getHours();
      let temp = 0.7;
      if (hour > 20 || hour < 4) temp += 0.1;
      return temp;
  }

  // --- 4. STATE MANAGEMENT ---

  async saveState() {
    storage.set(STORES.SYSTEM_MEMORY, 'core_state_v3', this.state).catch(console.error);
  }

  async updateStateFromSync(newState: Partial<SystemState>) {
      this.state = { ...this.state, ...newState };
      await this.saveState();
  }

  // --- PUBLIC API FOR SETTINGS APP ---

  getMetrics() {
      const efficiency = this.state.totalOutputChars > 0 
        ? Math.round((this.state.totalOutputChars / (this.state.totalInputChars + 1)) * 100) 
        : 0;
        
      return {
          score: this.state.sessionScore, 
          facts: this.state.learnedFacts.length,
          variant: this.state.activePromptVariant,
          keywords: Object.keys(this.state.keywordWeights).length,
          archetype: this.state.userArchetype,
          conciseness: efficiency || 100, 
          interactions: this.state.requestCount,
          savings: Math.round(this.state.sessionScore * 12),
          totalTokens: Math.round((this.state.totalInputChars + this.state.totalOutputChars) / 4),
          telemetryEnabled: this.state.telemetryEnabled,
          insights: this.state.insights,
          credits: this.getCredits() // Uses the bypass logic
      };
  }

  getRecentEvents(limit = 20): InteractionEvent[] {
      // Client no longer holds buffer. 
      return [];
  }

  getMemory(): LearnedFact[] {
      return [...this.state.learnedFacts];
  }

  async forget(timestamp: number) {
      this.state.learnedFacts = this.state.learnedFacts.filter(f => f.timestamp !== timestamp);
      await this.saveState();
  }

  async toggleTelemetry(enabled: boolean) {
      this.state.telemetryEnabled = enabled;
      await this.saveState();
  }

  // RESTORED: This method is required by SettingsApp.tsx
  async setLowPowerMode(enabled: boolean) {
      await storage.set(STORES.SYSTEM, 'low_power_mode', enabled);
  }
  
  async lobotomy() {
      this.state = DEFAULT_STATE;
      await this.saveState();
  }
}

export const systemCore = new SystemCoreService();