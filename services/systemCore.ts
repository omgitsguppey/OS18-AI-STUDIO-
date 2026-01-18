import { storage, STORES } from './storageService';
import { AppID } from '../types';

/**
 * SYSTEM INTELLIGENCE LAYER (v3.0 - Phase 0 Refined)
 * Neural Backend Algorithm for Pattern Recognition & Telemetry.
 * Local-First Architecture for Zero Latency.
 */

type MemoryScope = 'Global' | 'Creative' | 'Business' | 'Utility';

interface LearnedFact {
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

interface InteractionEvent {
  appId: string;
  action: 'open' | 'generate' | 'regenerate' | 'edit' | 'copy' | 'download' | 'dwell' | 'abandon' | 'success' | 'dislike' | 'completion' | 'error' | 'sys_event' | 'install_app' | 'open_app';
  timestamp: number;
  metadata?: any;
  score: number;
}

interface SystemState {
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
  
  // Phase 0: Centralized Credits
  credits: {
      count: number;
      lastReset: string; // DateString
  };
}

const DEFAULT_STATE: SystemState = {
  userArchetype: 'General User',
  activePromptVariant: Math.random() > 0.5 ? 'A' : 'B',
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
      count: 20, // Default daily limit
      lastReset: new Date().toDateString()
  }
};

// Heuristic Value Assessment (HVA) Scoring Matrix
const SCORES = {
  SCROLL: 1,
  DWELL_SHORT: 0,
  DWELL_LONG: 5,
  CLICK: 2,
  COPY: 10,
  DOWNLOAD: 20,
  EDIT: 5,
  REGENERATE_FAST: -10,
  REGENERATE_SLOW: -2,
  ABANDON: -15,
  SUCCESS: 25,
  DISLIKE: -10,
  COMPLETION: 5,
  ERROR: -5,
  INSTALL: 15
};

class SystemCoreService {
  private state: SystemState = DEFAULT_STATE;
  private isInitialized = false;
  private eventBuffer: InteractionEvent[] = [];
  private lowPowerMode = false;

  async init() {
    if (this.isInitialized) return;
    const saved = await storage.get<SystemState>(STORES.SYSTEM_MEMORY, 'core_state_v3');
    const lpMode = await storage.get<boolean>(STORES.SYSTEM, 'low_power_mode');
    
    if (saved) {
      this.state = { ...DEFAULT_STATE, ...saved };
      // Check Credit Reset on Init
      const today = new Date().toDateString();
      if (this.state.credits.lastReset !== today) {
          this.state.credits = { count: 20, lastReset: today };
          this.saveState();
      }
    }
    
    if (typeof lpMode === 'boolean') {
        this.lowPowerMode = lpMode;
    }
    this.isInitialized = true;
    
    // Background Consolidation Loop
    const interval = this.lowPowerMode ? 120000 : 10000; // 10s default

    if (typeof window !== 'undefined') {
       // @ts-ignore
       const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
       setInterval(() => idleCallback(() => this.runBackgroundConsolidation()), interval);
       
       window.addEventListener('beforeunload', () => this.handleUnload());
    }
  }

  // --- 1. CORE TRACKING API (NON-BLOCKING) ---

  async trackInteraction(
    appId: string, 
    action: InteractionEvent['action'], 
    metadata?: any
  ) {
    if (!this.isInitialized) await this.init();
    if (!this.state.telemetryEnabled && action === 'sys_event') return;

    // Run calculation in next tick to avoid blocking UI
    setTimeout(() => {
        const now = Date.now();
        let score = 0;

        // --- Scoring Logic (Local Heuristics) ---
        if (action === 'regenerate') {
            const timeDelta = now - this.state.lastGenerationTimestamp;
            if (timeDelta < 5000) { 
                score = SCORES.REGENERATE_FAST;
                this.state.activePromptVariant = this.state.activePromptVariant === 'A' ? 'B' : 'A';
            } else {
                score = SCORES.REGENERATE_SLOW;
            }
        } else if (action === 'generate') {
            this.state.lastGenerationTimestamp = now;
        }

        if (action === 'dwell') {
            score = (metadata?.duration || 0) > 5 ? SCORES.DWELL_LONG : SCORES.DWELL_SHORT;
        }

        if (action === 'edit' && metadata?.original && metadata?.final) {
            if (Math.abs(metadata.original.length - metadata.final.length) < 20) {
                score = SCORES.EDIT;
            }
        }

        if (action === 'copy') score = SCORES.COPY;
        if (action === 'download') score = SCORES.DOWNLOAD;
        if (action === 'success') score = SCORES.SUCCESS;
        if (action === 'dislike') score = SCORES.DISLIKE;
        if (action === 'install_app') score = SCORES.INSTALL;
        
        if (action === 'completion') {
            score = SCORES.COMPLETION;
            this.state.requestCount++;
            this.state.totalInputChars += (metadata?.inputLength || 0);
            this.state.totalOutputChars += (metadata?.outputLength || 0);
        }
        
        if (action === 'error') score = SCORES.ERROR;

        const event: InteractionEvent = { appId, action, timestamp: now, metadata, score };
        this.eventBuffer.push(event);
        this.state.sessionScore += score;

        // Buffer cap
        if (this.eventBuffer.length > 500) {
            this.eventBuffer = this.eventBuffer.slice(-250);
        }

        // Persist critical state periodically
        if (score >= 10 && !this.lowPowerMode) {
            this.saveState();
        }
    }, 0);
  }

  // Public API for Raw DOM Events
  trackRawEvent(type: 'click' | 'keypress' | 'scroll', label: string) {
      if (!this.state.telemetryEnabled) return;
      const cleanLabel = label.length > 40 ? label.substring(0, 40) + '...' : label;
      this.trackInteraction('SYSTEM', 'sys_event', { type, label: cleanLabel });
  }

  // --- 2. CREDIT SYSTEM (Centralized) ---
  
  getCredits(): number {
      return this.state.credits.count;
  }

  async useCredit(amount = 1): Promise<boolean> {
      if (this.state.credits.count < amount) return false;
      this.state.credits.count -= amount;
      await this.saveState();
      return true;
  }

  // --- 3. LEARNING & DREAMING (ALGORITHM LAYER) ---

  private async runBackgroundConsolidation() {
      if (this.eventBuffer.length === 0) return;

      this.analyzePatterns(); // Run local math

      // Determine Top App
      const appCounts: Record<string, number> = {};
      this.eventBuffer.forEach(e => {
          if (e.appId !== 'SYSTEM') {
            appCounts[e.appId] = (appCounts[e.appId] || 0) + 1;
          }
      });
      
      const apps = Object.keys(appCounts);
      if (apps.length > 0) {
        const topApp = apps.reduce((a, b) => appCounts[a] > appCounts[b] ? a : b);
        if (appCounts[topApp] > 10) { // Increased threshold
            this.addFact(`Frequent user of ${topApp}`, 'Global', 0.8, 'dwell');
        }
      }

      await this.saveState();
  }

  private analyzePatterns() {
      const recentEvents = this.eventBuffer.slice(-50); // Analyze last 50 events
      if (recentEvents.length < 5) return;

      const startTime = recentEvents[0].timestamp;
      const endTime = recentEvents[recentEvents.length - 1].timestamp;
      const durationSec = (endTime - startTime) / 1000;
      
      // 1. Velocity Analysis (Events per Second)
      const velocity = recentEvents.length / (durationSec || 1); 
      
      if (velocity > 3.0) {
          this.addInsight('High-velocity interaction detected. User is likely in a hurry or frustrated.', 'pattern', 0.85);
      } else if (velocity < 0.2) {
          this.addInsight('Low-velocity state. User is reading or thinking.', 'behavior', 0.6);
      }

      // 2. Context Switching (App Variance)
      const uniqueApps = new Set(recentEvents.map(e => e.appId).filter(id => id !== 'SYSTEM'));
      if (uniqueApps.size >= 3) {
          this.addInsight('Rapid context switching between apps observed.', 'pattern', 0.9);
      }

      // 3. Error Rate
      const errors = recentEvents.filter(e => e.action === 'error').length;
      if (errors > 2) {
          this.addInsight('Multiple errors detected. System stability or API quota may be impacting UX.', 'anomaly', 0.95);
      }
  }

  private addInsight(message: string, type: Insight['type'], confidence: number) {
      // Avoid duplicate recent insights
      const exists = this.state.insights.slice(0, 5).some(i => i.message === message);
      if (!exists) {
          this.state.insights.unshift({
              id: Date.now().toString(),
              type,
              message,
              confidence,
              timestamp: Date.now()
          });
          // Keep only last 20
          if (this.state.insights.length > 20) this.state.insights.pop();
      }
  }

  private addFact(content: string, scope: MemoryScope, confidence: number, source: any) {
      if (!this.state.learnedFacts.some(f => f.content === content)) {
          this.state.learnedFacts.push({
              content,
              scope,
              confidence,
              source,
              timestamp: Date.now()
          });
          // FIFO Memory Management
          if (this.state.learnedFacts.length > 50) {
              this.state.learnedFacts.sort((a, b) => a.confidence - b.confidence).shift(); 
          }
      }
  }

  private handleUnload() {
      const now = Date.now();
      if (now - this.state.lastGenerationTimestamp < 10000 && this.state.sessionScore < 0) {
          localStorage.setItem('sys_last_session_status', 'abandoned');
      }
  }

  // --- 4. PROMPT ENGINEERING & CONTEXT ---

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
      
      const lastEvent = this.eventBuffer[this.eventBuffer.length - 1];
      if (lastEvent && lastEvent.score === SCORES.REGENERATE_FAST) {
          temp = Math.min(1.0, temp + 0.3); // Increase randomness if user is regenerating quickly
      }
      return temp;
  }

  private saveState() {
    storage.set(STORES.SYSTEM_MEMORY, 'core_state_v3', this.state).catch(console.error);
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
          credits: this.state.credits.count // Exposed for UI
      };
  }

  getRecentEvents(limit = 20): InteractionEvent[] {
      return this.eventBuffer.slice(-limit).reverse();
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

  async setLowPowerMode(enabled: boolean) {
      this.lowPowerMode = enabled;
      await storage.set(STORES.SYSTEM, 'low_power_mode', enabled);
  }
  
  async lobotomy() {
      this.state = DEFAULT_STATE;
      this.eventBuffer = [];
      await this.saveState();
  }
}

export const systemCore = new SystemCoreService();