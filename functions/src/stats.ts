import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

const STORE_APP_MAP: Record<string, string> = {
  "lyrics_ai_data": "lyrics_ai",
  "albums_ai_data": "albums_ai",
  "drama_tracker_data": "drama",
  "just_sell_it_data": "sell_it",
  "link_flipper_data": "link_flipper",
  "captions_ai_data": "captions_ai",
  "passwords_data": "passwords",
  "markup_ai_data": "markup_ai",
  "content_ai_data": "content_ai",
  "analytics_ai_data": "analytics_ai",
  "career_ai_data": "career_ai",
  "trends_ai_data": "trends_ai",
  "get_famous_data": "get_famous",
  "priority_ai_data": "priority_ai",
  "brand_kit_ai_data": "brand_kit_ai",
  "viral_plan_ai_data": "viral_plan_ai",
  "ai_playground_data": "ai_playground",
  "playlist_ai_data": "playlist_ai",
  "achievements_data": "achievements",
  "nsfw_ai_data": "nsfw_ai",
  "trap_ai_data": "trap_ai",
  "speech_ai_data": "speech_ai",
  "shorts_studio_data": "shorts_studio",
  "user_wallpapers_data": "wallpaper_ai",
  "system_settings": "settings"
};

const estimateSizeBytes = (data: FirebaseFirestore.DocumentData | undefined) => {
  if (!data) return 0;
  const json = JSON.stringify(data);
  return Buffer.byteLength(json, "utf8");
};

const getStatRefs = (userId: string, appId: string) => {
  const db = admin.firestore();
  return {
    userApp: db.collection("stats").doc("users").collection(userId).doc("apps").collection(appId).doc("summary"),
    appGlobal: db.collection("stats").doc("apps").collection(appId).doc("summary"),
    userSummary: db.collection("stats_users").doc(userId)
  };
};

export const updateAppStorageStats = functions.firestore.onDocumentWritten(
  "users/{userId}/{storeName}/{docId}",
  async (event) => {
    const {userId, storeName} = event.params;
    const appId = STORE_APP_MAP[storeName];
    if (!appId || !userId) return;

    const beforeSize = estimateSizeBytes(event.data?.before?.data());
    const afterSize = estimateSizeBytes(event.data?.after?.data());
    const deltaBytes = afterSize - beforeSize;

    let deltaCount = 0;
    if (!event.data?.before?.exists && event.data?.after?.exists) {
      deltaCount = 1;
    } else if (event.data?.before?.exists && !event.data?.after?.exists) {
      deltaCount = -1;
    }

    const {userApp, appGlobal, userSummary} = getStatRefs(userId, appId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await admin.firestore().runTransaction(async (t) => {
      const updates = {
        count: admin.firestore.FieldValue.increment(deltaCount),
        sizeBytes: admin.firestore.FieldValue.increment(deltaBytes),
        lastActiveAt: now,
        updatedAt: now
      };
      t.set(userApp, updates, {merge: true});
      t.set(appGlobal, updates, {merge: true});
      t.set(
        userSummary,
        {
          uid: userId,
          totalCount: admin.firestore.FieldValue.increment(deltaCount),
          totalSizeBytes: admin.firestore.FieldValue.increment(deltaBytes),
          lastActiveAt: now,
          updatedAt: now
        },
        {merge: true}
      );
    });
  }
);
