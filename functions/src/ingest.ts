import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_EVENTS = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const ALLOWED_ACTIONS = new Set([
  "open",
  "generate",
  "regenerate",
  "edit",
  "copy",
  "download",
  "dwell",
  "abandon",
  "success",
  "dislike",
  "completion",
  "error",
  "sys_event",
  "install_app",
  "open_app",
]);

type TelemetryEvent = {
  appId: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown> | null;
  score?: number;
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

const normalizeEvents = (events: unknown): TelemetryEvent[] | null => {
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    return null;
  }

  const normalized: TelemetryEvent[] = [];
  for (const entry of events) {
    if (!isPlainObject(entry)) return null;
    const appId = entry.appId;
    const action = entry.action;
    const timestamp = entry.timestamp;
    const metadata = entry.metadata;
    const score = entry.score;

    if (typeof appId !== "string" || appId.length === 0) return null;
    if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) return null;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;
    if (metadata !== undefined && metadata !== null && !isPlainObject(metadata)) return null;
    if (score !== undefined && (typeof score !== "number" || !Number.isFinite(score))) {
      return null;
    }

    normalized.push({
      appId,
      action,
      timestamp,
      metadata: metadata ?? null,
      score: typeof score === "number" ? score : undefined,
    });
  }

  return normalized;
};

const countRateLimitedEvents = (events: TelemetryEvent[]): number =>
  events.filter((event) => event.action === "generate" || event.action === "regenerate")
    .length;

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

    const token = extractBearerToken(req.headers.authorization);
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

    const payload = parsePayload(req.body);
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
      await admin.firestore().collection("telemetry_queue").add({
        userId: decodedUserId,
        events,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        clientTimestamp: Date.now(),
        processed: false,
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({success: true, queued: events.length});
    } catch (error) {
      console.error("Telemetry Ingest Failed:", error);
      res.status(500).send("Ingest Failure");
    }
  }
);
