import type { IncomingMessage, ServerResponse } from 'node:http';
import admin from 'firebase-admin';

const MAX_BODY_BYTES = 64 * 1024;

if (!admin.apps.length) {
  admin.initializeApp();
}

interface TelemetryEvent {
  appId: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown> | null;
  score?: number;
}

const readJsonBody = (req: IncomingMessage, maxBytes: number): Promise<unknown> => new Promise((resolve, reject) => {
  let body = '';
  let bytes = 0;
  req.on('data', (chunk) => {
    bytes += Buffer.byteLength(chunk);
    if (bytes > maxBytes) {
      reject(new Error('PayloadTooLarge'));
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
      resolve(JSON.parse(body));
    } catch (error) {
      reject(error);
    }
  });
  req.on('error', reject);
});

const parseBearerToken = (req: IncomingMessage): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
};

const isValidEvent = (event: unknown): event is TelemetryEvent => {
  if (!event || typeof event !== 'object') return false;
  const data = event as Partial<TelemetryEvent>;
  if (typeof data.appId !== 'string' || !data.appId.trim()) return false;
  if (typeof data.action !== 'string' || !data.action.trim()) return false;
  if (typeof data.timestamp !== 'number' || Number.isNaN(data.timestamp)) return false;
  if (data.metadata !== undefined && data.metadata !== null && typeof data.metadata !== 'object') return false;
  if (data.score !== undefined && typeof data.score !== 'number') return false;
  return true;
};

export const handleIngest = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  let payload: unknown = null;
  try {
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength && contentLength > MAX_BODY_BYTES) {
      res.statusCode = 413;
      res.end('Payload Too Large');
      return;
    }
    payload = await readJsonBody(req, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof Error && error.message === 'PayloadTooLarge') {
      res.statusCode = 413;
      res.end('Payload Too Large');
      return;
    }
    res.statusCode = 400;
    res.end('Invalid JSON payload');
    return;
  }

  if (!payload || typeof payload !== 'object') {
    res.statusCode = 400;
    res.end('Invalid payload');
    return;
  }

  const token = parseBearerToken(req);
  if (!token) {
    res.statusCode = 401;
    res.end('Missing Authorization token');
    return;
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch (error) {
    res.statusCode = 401;
    res.end('Invalid token');
    return;
  }

  const data = payload as { events?: unknown };
  if (!Array.isArray(data.events) || data.events.length === 0) {
    res.statusCode = 400;
    res.end("Invalid Payload: 'events' array required.");
    return;
  }

  const events = data.events.filter(isValidEvent);
  if (events.length === 0 || events.length !== data.events.length) {
    res.statusCode = 400;
    res.end('Invalid event payload');
    return;
  }

  try {
    await admin.firestore().collection('telemetry_queue').add({
      userId: decoded.uid,
      events,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      clientTimestamp: Date.now(),
      processed: false,
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Telemetry ingest failed', error);
    res.statusCode = 500;
    res.end('Ingest Failure');
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};
