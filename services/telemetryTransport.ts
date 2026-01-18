import type { InteractionEvent } from './systemCore';

/**
 * TELEMETRY TRANSPORT LAYER (v1.0)
 * "The Courier"
 * Role: Reliable, non-blocking transmission of events to the backend.
 * Features: Batching, Keep-Alive, and Beacon support for 100% data capture.
 */

// UPDATED: Pointing to your live Firebase Cloud Function
const ENDPOINT = 'https://us-central1-studio-324281196-ee8e6.cloudfunctions.net/telemeteryIngest';

const FLUSH_INTERVAL = 5000; // Send batch every 5 seconds
const BATCH_LIMIT = 10;      // ...or when we have 10 events

class TelemetryTransportService {
  private buffer: InteractionEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Ensure data is sent when user closes tab
      window.addEventListener('beforeunload', () => this.flushSync());
      
      // Ensure data is sent when user minimizes/switches tabs (mobile friendly)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  /**
   * Adds an event to the outbound queue.
   * Logic: Batches events to reduce network requests, but flushes 
   * immediately if the buffer is full to prevent memory growth.
   */
  track(event: InteractionEvent) {
    this.buffer.push(event);

    if (this.buffer.length >= BATCH_LIMIT) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), FLUSH_INTERVAL);
    }
  }

  /**
   * Asynchronous flush using fetch (keepalive).
   * Used during active sessions.
   */
  async flush() {
    if (this.buffer.length === 0) return;

    // Swap buffer immediately to prevent double-sending if await hangs
    const payload = [...this.buffer];
    this.buffer = [];
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            // In a real app, you'd inject the actual User ID from auth here.
            // For now, we trust the backend to default to 'anonymous' if missing,
            // or we can grab it from localStorage if available.
            userId: localStorage.getItem('user_uid') || 'anonymous',
            events: payload 
        }),
        keepalive: true // Critical: Keeps request alive even if component unmounts
      });
    } catch (err) {
      // In a "dumb" collector, we log and move on. 
      console.warn('[Telemetry] Flush failed:', err);
    }
  }

  /**
   * Synchronous-style flush using Beacon API.
   * Critical for "Abandon" and "Unload" events where fetch might be cancelled.
   */
  flushSync() {
    if (this.buffer.length === 0) return;
    
    const payload = JSON.stringify({ 
        userId: localStorage.getItem('user_uid') || 'anonymous',
        events: this.buffer 
    });
    
    const blob = new Blob([payload], { type: 'application/json' });
    
    // navigator.sendBeacon is designed specifically for this use case
    const success = navigator.sendBeacon(ENDPOINT, blob);
    
    if (success) {
      this.buffer = [];
    } else {
      console.warn('[Telemetry] Beacon failed to queue');
    }
  }
}

export const telemetryTransport = new TelemetryTransportService();