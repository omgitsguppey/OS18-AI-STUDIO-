import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

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

    const payload = req.body;
    // Support text/plain parsing if needed
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const {events, userId} = data;

    if (!events || !Array.isArray(events)) {
      res.status(400).send("Invalid Payload: 'events' array required.");
      return;
    }

    try {
      await admin.firestore().collection("telemetry_queue").add({
        userId: userId || "anonymous",
        events: events,
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
