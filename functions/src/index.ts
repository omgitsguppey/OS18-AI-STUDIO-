import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

import {ingest} from "./ingest";
import {DreamingEngine} from "./dreamingEngine";
import {
  incrementStoreCounter,
  decrementStoreCounter,
} from "./storeCounters";

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({maxInstances: 10});

// 1. Export the HTTP Ingest Endpoint (The "Ear")
export const telemeteryIngest = ingest;

// 2. Export the Background Processor (The "Brain")
export const processTelemetryQueue = functions.firestore.onDocumentCreated(
  "telemetry_queue/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const {userId, events} = data;

    if (!userId || !events || events.length === 0) {
      console.log(
        `[Dreaming] Skipping empty/invalid batch: ${event.params.docId}`
      );
      return;
    }

    console.log(
      `[Dreaming] Waking up for user: ${userId} (${events.length} events)`
    );

    try {
      const engine = new DreamingEngine();
      const result = await engine.processEvents(userId, events);

      console.log(
        `[Dreaming] Analysis complete. Processed: ${result.processed}`
      );

      await snapshot.ref.delete();
    } catch (error) {
      console.error("[Dreaming] Nightmare (Error):", error);
    }
  }
);

export {incrementStoreCounter, decrementStoreCounter};
