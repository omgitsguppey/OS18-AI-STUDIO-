import type { InteractionEvent } from '../types';
import { auth } from './firebaseConfig';

const ENDPOINT = '/api/telemetry/ingest';
const FLUSH_INTERVAL_MS = 10_000;
const BATCH_LIMIT = 10;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 500;

let queue: InteractionEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const user = auth.currentUser;
  if (!user) return headers;

  try {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } catch {
    // Skip auth header if token fetch fails.
  }

  return headers;
};

const postBatch = async (events: InteractionEvent[]) => {
  if (events.length === 0) return;
  const payload = JSON.stringify({ events });
  const headers = await buildHeaders();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers,
        body: payload
      });
      if (response.ok) return;
      if (response.status < 500) return;
    } catch {
      // Retry on network failures.
    }

    if (attempt < MAX_RETRIES) {
      await delay(BASE_RETRY_DELAY_MS * 2 ** attempt);
    }
  }
};

const flush = () => {
  if (queue.length === 0) return;
  const payload = queue;
  queue = [];
  void postBatch(payload);
};

const flushSync = () => {
  if (queue.length === 0) return;
  const payload = JSON.stringify({ events: queue });
  const pending = queue;
  queue = [];
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(ENDPOINT, blob);
    } else {
      void postBatch(pending);
    }
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
