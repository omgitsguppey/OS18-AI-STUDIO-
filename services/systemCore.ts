import { storage, STORES } from './storageService';
import { logEvent } from './telemetryTransport';
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

const LOCAL_STATE_KEY = 'core_state_v3';

const readLocalStateSnapshot = (): SystemState => {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  // TODO: Replace localStorage snapshot with server-synced state when available.
  const raw = localStorage.getItem(LOCAL_STATE_KEY);
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<SystemState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch (error) {
    console.warn('[SystemCore] Failed to parse local state snapshot.', error);
    return DEFAULT_STATE;
  }
};

const writeLocalStateSnapshot = (state: SystemState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
};

class SystemCoreService {
  async init() {
    // TODO: Wire server-synced state into a local snapshot when SyncService is ready.
    return;
  }

  // --- 1. CORE TRACKING API (The Pipeline) ---

  async trackInteraction(
    appId: string, 
    action: InteractionEvent['action'], 
    metadata?: any
  ) {
    const state = readLocalStateSnapshot();
    if (!state.telemetryEnabled && action === 'sys_event') return;

    // Construct Event
    const event: InteractionEvent = { 
        appId, 
        action, 
        timestamp: Date.now(), 
        metadata 
    };

    // DELEGATE: Send to Transport Layer immediately
    // No buffering, no scoring, no analysis here.
    logEvent(event);
  }

  // Public API for Raw DOM Events
  trackRawEvent(type: 'click' | 'keypress' | 'scroll', label: string) {
      const state = readLocalStateSnapshot();
      if (!state.telemetryEnabled) return;
      const cleanLabel = label.length > 40 ? label.substring(0, 40) + '...' : label;
      this.trackInteraction('SYSTEM', 'sys_event', { type, label: cleanLabel });
  }

  // --- 2. CREDIT SYSTEM ---
  
  getCredits(): number {
      // Admin Bypass: Show effectively unlimited credits
      if (authService.isAdmin(auth.currentUser)) return 999;
      const state = readLocalStateSnapshot();
      return state.credits.count;
  }

  async useCredit(amount = 1): Promise<boolean> {
      // Admin Bypass: Never face credit restrictions
      if (authService.isAdmin(auth.currentUser)) return true;

      const state = readLocalStateSnapshot();
      if (state.credits.count < amount) return false;
      writeLocalStateSnapshot({
        ...state,
        credits: { ...state.credits, count: state.credits.count - amount }
      });
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
      const state = readLocalStateSnapshot();

      const variant = state.activePromptVariant;
      if (variant === 'A') systemContext += "Style: Direct and Professional. ";
      else systemContext += "Style: Conversational and Engaging. ";

      systemContext += `Mode: ${this.getTimeContext()} `;

      const relevantFacts = state.learnedFacts.filter(f => f.scope === 'Global' || f.scope === scope);
      if (relevantFacts.length > 0) {
          systemContext += `User Context: ${relevantFacts.map(f => f.content).join('. ')}. `;
      }

      const negatives = state.negativeConstraints[appId];
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

  async updateStateFromSync(newState: Partial<SystemState>) {
      const state = readLocalStateSnapshot();
      writeLocalStateSnapshot({ ...state, ...newState });
      // TODO: Replace local snapshot updates with server-synced state wiring.
  }

  // --- PUBLIC API FOR SETTINGS APP ---

  getMetrics() {
      const state = readLocalStateSnapshot();
      const efficiency = state.totalOutputChars > 0 
        ? Math.round((state.totalOutputChars / (state.totalInputChars + 1)) * 100) 
        : 0;
        
      return {
          score: state.sessionScore, 
          facts: state.learnedFacts.length,
          variant: state.activePromptVariant,
          keywords: Object.keys(state.keywordWeights).length,
          archetype: state.userArchetype,
          conciseness: efficiency || 100, 
          interactions: state.requestCount,
          savings: Math.round(state.sessionScore * 12),
          totalTokens: Math.round((state.totalInputChars + state.totalOutputChars) / 4),
          telemetryEnabled: state.telemetryEnabled,
          insights: state.insights,
          credits: this.getCredits() // Uses the bypass logic
      };
  }

  getRecentEvents(limit = 20): InteractionEvent[] {
      // Client no longer holds buffer. 
      return [];
  }

  getMemory(): LearnedFact[] {
      const state = readLocalStateSnapshot();
      return [...state.learnedFacts];
  }

  async forget(timestamp: number) {
      const state = readLocalStateSnapshot();
      writeLocalStateSnapshot({
        ...state,
        learnedFacts: state.learnedFacts.filter(f => f.timestamp !== timestamp)
      });
  }

  async toggleTelemetry(enabled: boolean) {
      const state = readLocalStateSnapshot();
      writeLocalStateSnapshot({ ...state, telemetryEnabled: enabled });
  }

  // RESTORED: This method is required by SettingsApp.tsx
  async setLowPowerMode(enabled: boolean) {
      await storage.set(STORES.SYSTEM, 'low_power_mode', enabled);
  }
  
  async lobotomy() {
      writeLocalStateSnapshot(DEFAULT_STATE);
  }
}

export const systemCore = new SystemCoreService();
