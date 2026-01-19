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
  metadata?: unknown;
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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeRecord = (
  value: unknown
): Record<string, unknown> => (isPlainObject(value) ? value : {});

const normalizeStringArrayRecord = (
  value: unknown
): Record<string, string[]> => {
  const record = normalizeRecord(value);
  const normalized: Record<string, string[]> = {};
  Object.entries(record).forEach(([key, entry]) => {
    if (Array.isArray(entry)) {
      normalized[key] = entry.filter(
        (item): item is string => typeof item === "string"
      );
    }
  });
  return normalized;
};

const normalizeNumberRecord = (value: unknown): Record<string, number> => {
  const record = normalizeRecord(value);
  const normalized: Record<string, number> = {};
  Object.entries(record).forEach(([key, entry]) => {
    if (isFiniteNumber(entry)) {
      normalized[key] = entry;
    }
  });
  return normalized;
};

const normalizeArrayRecord = (value: unknown): Record<string, unknown[]> => {
  const record = normalizeRecord(value);
  const normalized: Record<string, unknown[]> = {};
  Object.entries(record).forEach(([key, entry]) => {
    if (Array.isArray(entry)) {
      normalized[key] = entry;
    }
  });
  return normalized;
};

const normalizeLearnedFacts = (value: unknown): LearnedFact[] => {
  if (!Array.isArray(value)) return [];
  const normalized: LearnedFact[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const content = entry.content;
    const scope = entry.scope;
    const confidence = entry.confidence;
    const source = entry.source;
    const timestamp = entry.timestamp;

    if (typeof content !== "string") continue;
    if (scope !== "Global" &&
        scope !== "Creative" &&
        scope !== "Business" &&
        scope !== "Utility") {
      continue;
    }
    if (!isFiniteNumber(confidence)) continue;
    if (source !== "implicit_edit" &&
        source !== "explicit_save" &&
        source !== "clipboard" &&
        source !== "dwell") {
      continue;
    }
    if (!isFiniteNumber(timestamp)) continue;

    normalized.push({
      content,
      scope,
      confidence,
      source,
      timestamp,
    });
  }
  return normalized;
};

const normalizeInsights = (value: unknown): Insight[] => {
  if (!Array.isArray(value)) return [];
  const normalized: Insight[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const id = entry.id;
    const type = entry.type;
    const message = entry.message;
    const confidence = entry.confidence;
    const timestamp = entry.timestamp;

    if (typeof id !== "string") continue;
    if (type !== "pattern" && type !== "anomaly" && type !== "behavior") {
      continue;
    }
    if (typeof message !== "string") continue;
    if (!isFiniteNumber(confidence)) continue;
    if (!isFiniteNumber(timestamp)) continue;

    normalized.push({
      id,
      type,
      message,
      confidence,
      timestamp,
    });
  }
  return normalized;
};

const normalizeSystemState = (raw: unknown): SystemState => {
  const defaults: SystemState = {
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

  if (!isPlainObject(raw)) {
    return defaults;
  }

  const creditsRaw = isPlainObject(raw.credits) ? raw.credits : {};
  const creditCount = isFiniteNumber(creditsRaw.count) ? creditsRaw.count : defaults.credits.count;
  const lastReset = typeof creditsRaw.lastReset === "string" ? creditsRaw.lastReset : defaults.credits.lastReset;

  return {
    userArchetype: typeof raw.userArchetype === "string" ? raw.userArchetype : defaults.userArchetype,
    activePromptVariant: raw.activePromptVariant === "B" ? "B" : "A",
    learnedFacts: normalizeLearnedFacts(raw.learnedFacts),
    insights: normalizeInsights(raw.insights),
    telemetryEnabled: typeof raw.telemetryEnabled === "boolean" ? raw.telemetryEnabled : defaults.telemetryEnabled,
    keywordWeights: normalizeNumberRecord(raw.keywordWeights),
    negativeConstraints: normalizeStringArrayRecord(raw.negativeConstraints),
    goldenTemplates: normalizeArrayRecord(raw.goldenTemplates),
    sessionScore: isFiniteNumber(raw.sessionScore) ? raw.sessionScore : defaults.sessionScore,
    lastGenerationTimestamp: isFiniteNumber(raw.lastGenerationTimestamp) ?
      raw.lastGenerationTimestamp : defaults.lastGenerationTimestamp,
    totalInputChars: isFiniteNumber(raw.totalInputChars) ? raw.totalInputChars : defaults.totalInputChars,
    totalOutputChars: isFiniteNumber(raw.totalOutputChars) ? raw.totalOutputChars : defaults.totalOutputChars,
    requestCount: isFiniteNumber(raw.requestCount) ? raw.requestCount : defaults.requestCount,
    credits: {count: creditCount, lastReset},
  };
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
        state = normalizeSystemState(null);
      } else {
        state = normalizeSystemState(doc.data());
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
      this.updateAggregateMetrics(scoredEvents, state);

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
    const {action} = event;
    const metadata = isPlainObject(event.metadata) ? event.metadata : null;

    if (action === "regenerate") {
      score = SCORES.REGENERATE_SLOW;
    }
    if (action === "dwell") {
      const duration = metadata && typeof metadata.duration === "number" ?
        metadata.duration : 0;
      score = duration > 5 ?
        SCORES.DWELL_LONG : SCORES.DWELL_SHORT;
    }
    if (action === "edit" && metadata) {
      const original = metadata.original;
      const final = metadata.final;
      if (typeof original === "string" && typeof final === "string") {
        if (Math.abs(original.length - final.length) < 20) {
          score = SCORES.EDIT;
        }
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
   * Aggregates usage metrics from validated completion events.
   * @param {InteractionEvent[]} events - Events to analyze.
   * @param {SystemState} state - State to update.
   */
  private updateAggregateMetrics(events: InteractionEvent[], state: SystemState) {
    for (const event of events) {
      if (event.action !== "completion") continue;
      const metadata = isPlainObject(event.metadata) ? event.metadata : null;
      if (!metadata) continue;

      const inputLength = metadata.inputLength;
      const outputLength = metadata.outputLength;

      if (typeof inputLength === "number" && Number.isFinite(inputLength)) {
        state.totalInputChars += inputLength;
      }

      if (typeof outputLength === "number" && Number.isFinite(outputLength)) {
        state.totalOutputChars += outputLength;
      }

      if (typeof event.timestamp === "number" && Number.isFinite(event.timestamp)) {
        state.lastGenerationTimestamp = Math.max(
          state.lastGenerationTimestamp,
          event.timestamp
        );
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

}
