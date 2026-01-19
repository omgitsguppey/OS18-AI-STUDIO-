import type { TelemetryEvent } from '../types';
import { auth } from './firebaseConfig';

const ENDPOINT = '/api/telemetry/ingest';
const FLUSH_INTERVAL_MS = 10_000;
const BATCH_LIMIT = 10;
const MAX_QUEUE_SIZE = 120;
const STORAGE_KEY = 'os18_telemetry_queue';

type TelemetryPayload = {
  token?: string | null;
  events: TelemetryEvent[];
};

let queue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let lastAuthToken: string | null = null;

const isNavigatorOnline = () =>
  typeof navigator === 'undefined' ? true : navigator.onLine !== false;

const loadQueue = () => {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as TelemetryEvent[];
    if (Array.isArray(parsed)) {
      queue = [...parsed, ...queue].slice(-MAX_QUEUE_SIZE);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const persistQueue = () => {
  if (typeof window === 'undefined') return;
  if (queue.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
};

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
};

const getAuthToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const token = await user.getIdToken();
    lastAuthToken = token;
    return token;
  } catch {
    return lastAuthToken;
  }
};

const sendBatch = async (payload: TelemetryPayload) => {
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload.token ? { Authorization: `Bearer ${payload.token}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch {
    // Fail silently to avoid impacting UI.
  }
};

const flush = async () => {
  if (isFlushing || queue.length === 0) return;
  if (!isNavigatorOnline()) {
    persistQueue();
    scheduleFlush();
    return;
  }

  isFlushing = true;
  const payloadEvents = queue.slice(0, BATCH_LIMIT);
  queue = queue.slice(payloadEvents.length);
  persistQueue();

  const token = await getAuthToken();
  await sendBatch({ events: payloadEvents, token });
  isFlushing = false;

  if (queue.length > 0) {
    scheduleFlush();
  }
};

const flushSync = () => {
  if (queue.length === 0) return;
  const payloadEvents = queue.slice(0, BATCH_LIMIT);
  queue = queue.slice(payloadEvents.length);
  persistQueue();

  const payload: TelemetryPayload = {
    events: payloadEvents,
    token: lastAuthToken
  };

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(ENDPOINT, blob);
    } else {
      void sendBatch(payload);
    }
  } catch {
    // Fail silently to avoid impacting UI.
  }
};

if (typeof window !== 'undefined') {
  loadQueue();
  window.addEventListener('beforeunload', flushSync);
  window.addEventListener('online', () => void flush());
}

export function logEvent(event: TelemetryEvent): void {
  queue.push(event);
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(-MAX_QUEUE_SIZE);
  }
  persistQueue();

  if (queue.length >= BATCH_LIMIT) {
    void flush();
    return;
  }
  scheduleFlush();
}
