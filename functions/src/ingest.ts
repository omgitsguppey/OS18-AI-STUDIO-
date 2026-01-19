import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_EVENTS = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const ALLOWED_EVENT_TYPES = new Set([
  "open",
  "close",
  "navigation",
  "click",
  "input",
  "error",
  "performance",
  "save",
  "delete",
  "generate",
  "regenerate",
  "download",
  "copy",
  "dwell",
  "install",
  "import",
  "export",
  "submit",
  "success",
]);

type TelemetryEvent = {
  uid?: string;
  sessionId: string;
  appId: string;
  context: string;
  eventType: string;
  label: string;
  timestamp: number;
  meta?: Record<string, unknown> | null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsePayload = (payload: unknown): Record<string, unknown> | null => {
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return isPlainObject(parsed) ? parsed : null;
    } catch (error) {
      console.warn("Telemetry ingest JSON parse failed", error);
      return null;
    }
  }
  return isPlainObject(payload) ? payload : null;
};

const MAX_LABEL_LENGTH = 80;
const MAX_CONTEXT_LENGTH = 60;
const MAX_SESSION_LENGTH = 120;
const MAX_META_KEYS = 20;

const isSafeMetaKey = (key: string) => {
  const lowered = key.toLowerCase();
  return !(
    lowered.includes("password") ||
    lowered.includes("secret") ||
    lowered.includes("clipboard") ||
    lowered.includes("email") ||
    lowered.includes("content")
  );
};

const normalizeMeta = (
  value: unknown
): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (!isPlainObject(value)) return null;
  const entries = Object.entries(value).slice(0, MAX_META_KEYS);
  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of entries) {
    if (!isSafeMetaKey(key)) return null;
    if (typeof entry === "string") {
      sanitized[key] = entry.slice(0, 120);
    } else if (typeof entry === "number" || typeof entry === "boolean") {
      sanitized[key] = entry;
    } else if (Array.isArray(entry)) {
      sanitized[key] = entry.slice(0, 10).map((item) => {
        if (typeof item === "string") return item.slice(0, 60);
        if (typeof item === "number" || typeof item === "boolean") return item;
        return null;
      });
    }
  }
  return sanitized;
};

const normalizeEvents = (events: unknown): TelemetryEvent[] | null => {
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    return null;
  }

  const normalized: TelemetryEvent[] = [];
  for (const entry of events) {
    if (!isPlainObject(entry)) return null;
    const appId = entry.appId;
    const sessionId = entry.sessionId;
    const context = entry.context;
    const eventType = entry.eventType;
    const label = entry.label;
    const timestamp = entry.timestamp;
    const meta = normalizeMeta(entry.meta);

    if (typeof appId !== "string" || appId.length === 0) return null;
    if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > MAX_SESSION_LENGTH) return null;
    if (typeof context !== "string" || context.length === 0 || context.length > MAX_CONTEXT_LENGTH) return null;
    if (typeof eventType !== "string" || !ALLOWED_EVENT_TYPES.has(eventType)) return null;
    if (typeof label !== "string" || label.length === 0 || label.length > MAX_LABEL_LENGTH) return null;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;

    normalized.push({
      appId,
      sessionId,
      context,
      eventType,
      label,
      timestamp,
      meta,
    });
  }

  return normalized;
};

const countRateLimitedEvents = (events: TelemetryEvent[]): number =>
  events.filter((event) => event.eventType === "generate" || event.eventType === "regenerate")
    .length;

const formatDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 10);
};

const updateTelemetryStats = async (userId: string, events: TelemetryEvent[]) => {
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const dateKey = formatDateKey(Date.now());
  const dailyRef = db.collection("stats").doc("telemetry").collection("daily").doc(dateKey);
  const healthRef = db.collection("stats").doc("system").collection("health").doc("summary");
  const userSummaryRef = db.collection("stats_users").doc(userId);

  const appCounts: Record<string, number> = {};
  const appErrors: Record<string, number> = {};
  const appTti: Record<string, number> = {};

  events.forEach((event) => {
    appCounts[event.appId] = (appCounts[event.appId] || 0) + 1;
    if (event.eventType === "error") {
      appErrors[event.appId] = (appErrors[event.appId] || 0) + 1;
    }
    if (event.eventType === "performance" && event.label === "time_to_interactive") {
      const tti = event.meta?.ttiMs;
      if (typeof tti === "number" && Number.isFinite(tti)) {
        appTti[event.appId] = Math.max(appTti[event.appId] || 0, tti);
      }
    }
  });

  await db.runTransaction(async (t) => {
    t.set(
      dailyRef,
      {
        eventCount: admin.firestore.FieldValue.increment(events.length),
        lastIngestAt: now,
      },
      {merge: true}
    );
    t.set(
      healthRef,
      {
        lastIngestAt: now,
        lastUserId: userId,
      },
      {merge: true}
    );
    t.set(
      userSummaryRef,
      {
        uid: userId,
        telemetryCount: admin.firestore.FieldValue.increment(events.length),
        lastTelemetryAt: now,
        updatedAt: now
      },
      {merge: true}
    );

    Object.entries(appCounts).forEach(([appId, count]) => {
      const ref = db.collection("stats").doc("telemetry").collection("apps").doc(appId);
      const errorCount = appErrors[appId] || 0;
      const tti = appTti[appId];
      t.set(
        ref,
        {
          eventCount: admin.firestore.FieldValue.increment(count),
          errorCount: admin.firestore.FieldValue.increment(errorCount),
          lastEventAt: now,
          lastTtiMs: typeof tti === "number" ? tti : admin.firestore.FieldValue.delete()
        },
        {merge: true}
      );
    });
  });
};

const enforceRateLimit = async (
  userId: string,
  eventCount: number
): Promise<boolean> => {
  if (eventCount === 0) return true;
  const ref = admin.firestore().collection("ai_rate_limits").doc(userId);
  const now = Date.now();

  const allowed = await admin.firestore().runTransaction(async (t) => {
    const snap = await t.get(ref);
    let windowStart = now;
    let count = 0;

    if (snap.exists) {
      const data = snap.data() || {};
      const storedStart = typeof data.windowStart === "number" ? data.windowStart : now;
      const storedCount = typeof data.count === "number" ? data.count : 0;
      if (now - storedStart < RATE_LIMIT_WINDOW_MS) {
        windowStart = storedStart;
        count = storedCount;
      }
    }

    const nextCount = count + eventCount;
    if (nextCount > RATE_LIMIT_MAX) {
      t.set(ref, {windowStart, count}, {merge: true});
      return false;
    }

    t.set(
      ref,
      {
        windowStart,
        count: nextCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    return true;
  });

  return allowed;
};

const extractBearerToken = (headerValue: string | undefined): string | null => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

/**
 * INGEST HANDLER (The Valve)
 * Accepts raw telemetry events and pushes them to the processing queue.
 */
export const ingest = onRequest(
  {cors: true, maxInstances: 10},
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const rawBodyLength = req.rawBody
      ? req.rawBody.length
      : Buffer.byteLength(
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body ?? "")
      );
    if (rawBodyLength > MAX_PAYLOAD_BYTES) {
      res.status(413).send("Payload Too Large");
      return;
    }

    const payload = parsePayload(req.body);
    const headerToken = extractBearerToken(req.headers.authorization);
    const bodyToken = isPlainObject(payload) ? payload.token : null;
    const token = headerToken || (typeof bodyToken === "string" ? bodyToken : null);
    if (!token) {
      res.status(401).send("Unauthorized");
      return;
    }

    let decodedUserId: string | null = null;
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      decodedUserId = decoded.uid || null;
    } catch (error) {
      console.warn("Telemetry auth verification failed", error);
    }

    if (!decodedUserId) {
      res.status(401).send("Unauthorized");
      return;
    }

    if (!payload) {
      res.status(400).send("Invalid Payload");
      return;
    }

    const events = normalizeEvents(payload.events);
    if (!events) {
      res.status(400).send("Invalid Payload: 'events' array required.");
      return;
    }

    const rateLimitedCount = countRateLimitedEvents(events);
    const allowed = await enforceRateLimit(decodedUserId, rateLimitedCount);
    if (!allowed) {
      res.status(429).send("Rate limit exceeded");
      return;
    }

    try {
      const sessionId = events[0]?.sessionId;
      const batchRef = admin.firestore()
        .collection("telemetry_sessions")
        .doc(decodedUserId)
        .collection("sessions")
        .doc(sessionId)
        .collection("batches")
        .doc();

      await batchRef.set({
        userId: decodedUserId,
        sessionId,
        events,
        eventCount: events.length,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        clientTimestamp: Date.now(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      await updateTelemetryStats(decodedUserId, events);

      res.status(200).json({success: true, queued: events.length});
    } catch (error) {
      console.error("Telemetry Ingest Failed:", error);
      res.status(500).send("Ingest Failure");
    }
  }
);
