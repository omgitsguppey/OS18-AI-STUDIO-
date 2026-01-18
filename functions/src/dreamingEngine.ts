import * as admin from "firebase-admin";

// --- Shared Types ---
export type MemoryScope = "Global" | "Creative" | "Business" | "Utility";

export interface LearnedFact {
  content: string;
  scope: MemoryScope;
  confidence: number;
  source: "implicit_edit" | "explicit_save" | "clipboard" | "dwell";
  timestamp: number;
}

export interface Insight {
  id: string;
  type: "pattern" | "anomaly" | "behavior";
  message: string;
  confidence: number;
  timestamp: number;
}

export interface InteractionEvent {
  appId: string;
  action: "open" | "generate" | "regenerate" | "edit" | "copy" |
          "download" | "dwell" | "abandon" | "success" | "dislike" |
          "completion" | "error" | "sys_event" | "install_app" | "open_app";
  timestamp: number;
  metadata?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  score?: number;
}

export interface SystemState {
  userArchetype: string;
  activePromptVariant: "A" | "B";
  learnedFacts: LearnedFact[];
  insights: Insight[];
  telemetryEnabled: boolean;
  keywordWeights: Record<string, number>;
  negativeConstraints: Record<string, string[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// --- HVA Scoring Matrix ---
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
  INSTALL: 15,
};

/**
 * The Dreaming Engine: Server-side heuristic analysis and memory consolidation.
 */
export class DreamingEngine {
  private db = admin.firestore();

  /**
   * Processes a batch of raw events for a specific user.
   * @param {string} userId - The user's ID.
   * @param {InteractionEvent[]} events - List of raw events.
   * @return {Promise<{processed: number}>} - Result summary.
   */
  async processEvents(userId: string, events: InteractionEvent[]) {
    const userRef = this.db.collection("users").doc(userId);
    const systemMemRef = userRef.collection("system").doc("core_memory");

    await this.db.runTransaction(async (t) => {
      const doc = await t.get(systemMemRef);
      let state: SystemState;

      if (!doc.exists) {
        state = this.getDefaultState();
      } else {
        state = doc.data() as SystemState;
      }

      let batchScore = 0;
      const scoredEvents = events.map((event) => {
        const score = this.calculateScore(event);
        batchScore += score;
        return {...event, score};
      });

      state.sessionScore += batchScore;
      state.requestCount += events.filter(
        (e) => e.action === "completion"
      ).length;

      this.analyzePatterns(scoredEvents, state);
      this.consolidateMemories(scoredEvents, state);

      t.set(systemMemRef, state, {merge: true});
    });

    return {processed: events.length};
  }

  /**
   * Calculates the HVA score for a single event.
   * @param {InteractionEvent} event - The event to score.
   * @return {number} - The calculated score.
   */
  private calculateScore(event: InteractionEvent): number {
    let score = 0;
    const {action, metadata} = event;

    if (action === "regenerate") {
      score = SCORES.REGENERATE_SLOW;
    }
    if (action === "dwell") {
      score = (metadata?.duration || 0) > 5 ?
        SCORES.DWELL_LONG : SCORES.DWELL_SHORT;
    }
    if (action === "edit" && metadata?.original && metadata?.final) {
      if (Math.abs(metadata.original.length - metadata.final.length) < 20) {
        score = SCORES.EDIT;
      }
    }

    if (action === "copy") score = SCORES.COPY;
    if (action === "download") score = SCORES.DOWNLOAD;
    if (action === "success") score = SCORES.SUCCESS;
    if (action === "dislike") score = SCORES.DISLIKE;
    if (action === "install_app") score = SCORES.INSTALL;
    if (action === "completion") score = SCORES.COMPLETION;
    if (action === "error") score = SCORES.ERROR;

    return score;
  }

  /**
   * Analyzes event streams for velocity and context switching.
   * @param {InteractionEvent[]} events - Recent events.
   * @param {SystemState} state - Current system state to update.
   */
  private analyzePatterns(events: InteractionEvent[], state: SystemState) {
    if (events.length < 5) return;

    const startTime = events[0].timestamp;
    const endTime = events[events.length - 1].timestamp;
    const durationSec = (endTime - startTime) / 1000;

    const velocity = events.length / (durationSec || 1);

    if (velocity > 3.0) {
      this.addInsight(state,
        "High-velocity interaction. User is in a hurry.", "pattern", 0.85);
    } else if (velocity < 0.2) {
      this.addInsight(state,
        "Low-velocity state. User is reading/thinking.", "behavior", 0.6);
    }

    const uniqueApps = new Set(
      events.map((e) => e.appId).filter((id) => id !== "SYSTEM")
    );
    if (uniqueApps.size >= 3) {
      this.addInsight(state,
        "Rapid context switching observed.", "pattern", 0.9);
    }

    const errors = events.filter((e) => e.action === "error").length;
    if (errors > 2) {
      this.addInsight(state,
        "Multiple errors detected.", "anomaly", 0.95);
    }
  }

  /**
   * Consolidates raw events into long-term memories (Facts).
   * @param {InteractionEvent[]} events - Events to analyze.
   * @param {SystemState} state - State to update.
   */
  private consolidateMemories(events: InteractionEvent[], state: SystemState) {
    const appCounts: Record<string, number> = {};
    events.forEach((e) => {
      if (e.appId !== "SYSTEM") {
        appCounts[e.appId] = (appCounts[e.appId] || 0) + 1;
      }
    });

    const apps = Object.keys(appCounts);
    if (apps.length > 0) {
      const topApp = apps.reduce((a, b) =>
        appCounts[a] > appCounts[b] ? a : b
      );
      if (appCounts[topApp] > 5) {
        this.addFact(state,
          `Frequent user of ${topApp}`, "Global", 0.8, "dwell");
      }
    }
  }

  /**
   * Adds a new insight to the state.
   * @param {SystemState} state - The system state to update.
   * @param {string} message - The insight message.
   * @param {string} type - The type of insight.
   * @param {number} confidence - The confidence score.
   */
  private addInsight(
    state: SystemState,
    message: string,
    type: Insight["type"],
    confidence: number
  ) {
    const exists = state.insights.slice(0, 5).some(
      (i) => i.message === message
    );
    if (!exists) {
      state.insights.unshift({
        id: Date.now().toString(),
        type,
        message,
        confidence,
        timestamp: Date.now(),
      });
      if (state.insights.length > 20) state.insights.pop();
    }
  }

  /**
   * Adds a new learned fact to the state.
   * @param {SystemState} state - The system state to update.
   * @param {string} content - The fact content.
   * @param {MemoryScope} scope - The scope of the memory.
   * @param {number} confidence - The confidence score.
   * @param {any} source - The source of the fact.
   */
  private addFact(
    state: SystemState,
    content: string,
    scope: MemoryScope,
    confidence: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: any
  ) {
    if (!state.learnedFacts.some((f) => f.content === content)) {
      state.learnedFacts.push({
        content,
        scope,
        confidence,
        source,
        timestamp: Date.now(),
      });
      if (state.learnedFacts.length > 50) {
        state.learnedFacts.sort((a, b) => a.confidence - b.confidence).shift();
      }
    }
  }

  /**
   * Returns the default blank state.
   * @return {SystemState} Default state object.
   */
  private getDefaultState(): SystemState {
    return {
      userArchetype: "General User",
      activePromptVariant: "A",
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
      credits: {count: 20, lastReset: new Date().toDateString()},
    };
  }
}
