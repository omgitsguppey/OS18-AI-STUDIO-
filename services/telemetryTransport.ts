import type { InteractionEvent } from '../types';

const ENDPOINT = '/api/telemetry/ingest';
const FLUSH_INTERVAL_MS = 10_000;
const BATCH_LIMIT = 10;

let queue: InteractionEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
};

const postBatch = (events: InteractionEvent[]) => {
  if (events.length === 0) return;
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // TODO: Add auth headers when server-side auth is available.
      },
      body: JSON.stringify({ events })
      // TODO: Add retry/backoff strategy once telemetry SLA is defined.
    }).catch(() => {
      // Fail silently to avoid impacting UI.
    });
  } catch {
    // Fail silently to avoid impacting UI.
  }
};

const flush = () => {
  if (queue.length === 0) return;
  const payload = queue;
  queue = [];
  postBatch(payload);
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
      postBatch(pending);
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
