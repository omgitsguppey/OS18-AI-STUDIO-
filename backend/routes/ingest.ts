import type { IncomingMessage, ServerResponse } from 'node:http';
import admin from 'firebase-admin';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_EVENTS = 50;
const ALLOWED_ACTIONS = new Set([
  'open',
  'generate',
  'regenerate',
  'edit',
  'copy',
  'download',
  'dwell',
  'abandon',
  'success',
  'dislike',
  'completion',
  'error',
  'sys_event',
  'install_app',
  'open_app'
]);

type TelemetryEvent = {
  appId: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown> | null;
  score?: number;
};

type JsonPayload = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

class PayloadError extends Error {
  code: 'too_large' | 'invalid_json';
  constructor(message: string, code: 'too_large' | 'invalid_json') {
    super(message);
    this.code = code;
  }
}

const extractBearerToken = (headerValue: string | undefined): string | null => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
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

    if (typeof appId !== 'string' || appId.length === 0) return null;
    if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) return null;
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;
    if (metadata !== undefined && metadata !== null && !isPlainObject(metadata)) return null;
    if (score !== undefined && (typeof score !== 'number' || !Number.isFinite(score))) {
      return null;
    }

    normalized.push({
      appId,
      action,
      timestamp,
      metadata: metadata ?? null,
      score: typeof score === 'number' ? score : undefined
    });
  }

  return normalized;
};

const readJsonBody = (req: IncomingMessage): Promise<JsonPayload | null> =>
  new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_PAYLOAD_BYTES) {
        reject(new PayloadError('Payload too large', 'too_large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(isPlainObject(parsed) ? parsed : null);
      } catch (error) {
        reject(new PayloadError('Invalid JSON', 'invalid_json'));
      }
    });
    req.on('error', reject);
  });

if (!admin.apps.length) {
  admin.initializeApp();
}

export const handleIngest = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.statusCode = 401;
    res.end();
    return;
  }

  let decodedUserId: string | null = null;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    decodedUserId = decoded.uid || null;
  } catch (error) {
    console.warn('Telemetry auth verification failed', error);
  }

  if (!decodedUserId) {
    res.statusCode = 401;
    res.end();
    return;
  }

  let payload: JsonPayload | null = null;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    if (error instanceof PayloadError && error.code === 'too_large') {
      res.statusCode = 413;
      res.end();
      return;
    }
    res.statusCode = 400;
    res.end();
    return;
  }

  if (!payload) {
    res.statusCode = 400;
    res.end();
    return;
  }

  const events = normalizeEvents(payload.events);
  if (!events) {
    res.statusCode = 400;
    res.end();
    return;
  }

  try {
    await admin.firestore().collection('telemetry_queue').add({
      userId: decodedUserId,
      events,
      ip: req.socket.remoteAddress ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      clientTimestamp: Date.now(),
      processed: false,
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Telemetry ingest write failed', error);
    res.statusCode = 500;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, queued: events.length }));
};
