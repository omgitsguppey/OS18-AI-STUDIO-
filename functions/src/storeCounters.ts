import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

const COUNTER_SHARDS = 20;

const getShardId = (docId: string) => {
  let hash = 0;
  for (let i = 0; i < docId.length; i += 1) {
    hash = (hash << 5) - hash + docId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % COUNTER_SHARDS;
};

const getShardRef = (userId: string, storeName: string, docId: string) => {
  const shardId = getShardId(docId);
  return admin
    .firestore()
    .collection("store_counters")
    .doc(userId)
    .collection("stores")
    .doc(storeName)
    .collection("shards")
    .doc(shardId.toString());
};

const updateCounter = async (
  userId: string,
  storeName: string,
  docId: string,
  delta: number
) => {
  const shardRef = getShardRef(userId, storeName, docId);
  await shardRef.set(
    {count: admin.firestore.FieldValue.increment(delta)},
    {merge: true}
  );
};

export const incrementStoreCounter = functions.firestore.onDocumentCreated(
  "users/{userId}/{storeName}/{docId}",
  async (event) => {
    const {userId, storeName, docId} = event.params;
    if (!userId || !storeName || !docId) return;
    await updateCounter(userId, storeName, docId, 1);
  }
);

export const decrementStoreCounter = functions.firestore.onDocumentDeleted(
  "users/{userId}/{storeName}/{docId}",
  async (event) => {
    const {userId, storeName, docId} = event.params;
    if (!userId || !storeName || !docId) return;
    await updateCounter(userId, storeName, docId, -1);
  }
);
