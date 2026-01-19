import type { InteractionEvent } from '../types';
import { auth } from './firebaseConfig';

const ENDPOINT = '/api/telemetry/ingest';
const FLUSH_INTERVAL_MS = 10_000;
const BATCH_LIMIT = 10;

let queue: InteractionEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let tokenCache: { token: string; expiry: number } | null = null;

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
};

const getAuthToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const now = Date.now();
  if (tokenCache && tokenCache.expiry > now + 30_000) {
    return tokenCache.token;
  }
  const token = await user.getIdToken();
  tokenCache = { token, expiry: now + 55 * 60 * 1000 };
  return token;
};

const postBatch = async (events: InteractionEvent[]): Promise<boolean> => {
  if (events.length === 0) return true;
  try {
    const token = await getAuthToken();
    if (!token) {
      console.warn('Telemetry dropped: no auth token available.');
      return false;
    }
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ events })
    });
    return response.ok;
  } catch {
    return false;
  }
};

const flush = () => {
  if (queue.length === 0) return;
  const payload = queue;
  queue = [];
  void postBatch(payload).then((ok) => {
    if (!ok) {
      queue = payload.concat(queue);
    }
  });
};

const flushSync = () => {
  if (queue.length === 0) return;
  const pending = queue;
  queue = [];
  try {
    void postBatch(pending);
  } catch {
    // Fail silently to avoid impacting UI.
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flushSync());
}

export function logEvent(event: InteractionEvent): void {
  queue.push(event);
  if (queue.length >= BATCH_LIMIT) {
    flush();
    return;
  }
  scheduleFlush();
}
