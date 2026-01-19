import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, startAfter, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { AppID, SystemPolicy } from '../types';
import { APP_MODEL_CONFIG } from './ai/core';

export type UserSummary = {
  uid: string;
  totalCount: number;
  totalSizeBytes: number;
  telemetryCount: number;
  lastActiveAt?: number | null;
  lastTelemetryAt?: number | null;
};

export type AppStats = {
  count: number;
  sizeBytes: number;
  lastActiveAt?: number | null;
};

export type TelemetryAppStats = {
  eventCount: number;
  errorCount: number;
  lastEventAt?: number | null;
  lastTtiMs?: number | null;
};

const POLICY_DOC = doc(db, 'system', 'policy');

const parseTimestamp = (value: unknown) => {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const asAny = value as { toMillis: () => number };
    return asAny.toMillis();
  }
  if (typeof value === 'number') return value;
  return null;
};

export const getSystemPolicy = async (): Promise<SystemPolicy> => {
  const snap = await getDoc(POLICY_DOC);
  const data = snap.exists() ? snap.data() : {};
  const tokenPolicy = data?.tokenPolicy && typeof data.tokenPolicy === 'object' ? data.tokenPolicy : {};
  const modelMapping = data?.modelMapping && typeof data.modelMapping === 'object' ? data.modelMapping : {};
  return {
    tokenPolicy: {
      defaultDailyTokens: typeof tokenPolicy.defaultDailyTokens === 'number' ? tokenPolicy.defaultDailyTokens : 5000,
      defaultPerMinute: typeof tokenPolicy.defaultPerMinute === 'number' ? tokenPolicy.defaultPerMinute : 60,
      killSwitchEnabled: tokenPolicy.killSwitchEnabled === true,
      tiers: typeof tokenPolicy.tiers === 'object' && tokenPolicy.tiers ? tokenPolicy.tiers : {
        free: { dailyTokens: 1000, perMinute: 20 },
        pro: { dailyTokens: 8000, perMinute: 120 },
        admin: { dailyTokens: 100000, perMinute: 600 }
      }
    },
    modelMapping: {
      ...APP_MODEL_CONFIG,
      ...modelMapping
    },
    updatedAt: parseTimestamp(data?.updatedAt) ?? Date.now()
  };
};

export const updateSystemPolicy = async (policy: SystemPolicy) => {
  await setDoc(POLICY_DOC, { ...policy, updatedAt: Date.now() }, { merge: true });
};

export const getUserSummaries = async (pageSize: number, cursor?: unknown) => {
  const base = query(
    collection(db, 'stats_users'),
    orderBy('lastActiveAt', 'desc'),
    limit(pageSize)
  );
  const finalQuery = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(finalQuery);
  const items = snap.docs.map((docSnap) => {
    const data = docSnap.data() ?? {};
    return {
      uid: data.uid || docSnap.id,
      totalCount: typeof data.totalCount === 'number' ? data.totalCount : 0,
      totalSizeBytes: typeof data.totalSizeBytes === 'number' ? data.totalSizeBytes : 0,
      telemetryCount: typeof data.telemetryCount === 'number' ? data.telemetryCount : 0,
      lastActiveAt: parseTimestamp(data.lastActiveAt),
      lastTelemetryAt: parseTimestamp(data.lastTelemetryAt)
    } as UserSummary;
  });
  const nextCursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
};

export const getTotalUsersCount = async () => {
  const snap = await getCountFromServer(collection(db, 'stats_users'));
  return snap.data().count;
};

export const getUserAppStats = async (uid: string, appIds: AppID[]) => {
  const results: Record<string, AppStats> = {};
  await Promise.all(appIds.map(async (appId) => {
    const ref = doc(db, 'stats', 'users', uid, 'apps', appId, 'summary');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      results[appId] = { count: 0, sizeBytes: 0 };
      return;
    }
    const data = snap.data() ?? {};
    results[appId] = {
      count: typeof data.count === 'number' ? data.count : 0,
      sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : 0,
      lastActiveAt: parseTimestamp(data.lastActiveAt)
    };
  }));
  return results;
};

export const getAppStats = async (appIds: AppID[]) => {
  const results: Record<string, AppStats> = {};
  await Promise.all(appIds.map(async (appId) => {
    const ref = doc(db, 'stats', 'apps', appId, 'summary');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      results[appId] = { count: 0, sizeBytes: 0 };
      return;
    }
    const data = snap.data() ?? {};
    results[appId] = {
      count: typeof data.count === 'number' ? data.count : 0,
      sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : 0,
      lastActiveAt: parseTimestamp(data.lastActiveAt)
    };
  }));
  return results;
};

export const getTelemetryDaily = async (dateKey: string) => {
  const ref = doc(db, 'stats', 'telemetry', 'daily', dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { eventCount: 0, lastIngestAt: null };
  }
  const data = snap.data() ?? {};
  return {
    eventCount: typeof data.eventCount === 'number' ? data.eventCount : 0,
    lastIngestAt: parseTimestamp(data.lastIngestAt)
  };
};

export const getTelemetryAppStats = async (appIds: AppID[]) => {
  const results: Record<string, TelemetryAppStats> = {};
  await Promise.all(appIds.map(async (appId) => {
    const ref = doc(db, 'stats', 'telemetry', 'apps', appId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      results[appId] = { eventCount: 0, errorCount: 0 };
      return;
    }
    const data = snap.data() ?? {};
    results[appId] = {
      eventCount: typeof data.eventCount === 'number' ? data.eventCount : 0,
      errorCount: typeof data.errorCount === 'number' ? data.errorCount : 0,
      lastEventAt: parseTimestamp(data.lastEventAt),
      lastTtiMs: typeof data.lastTtiMs === 'number' ? data.lastTtiMs : null
    };
  }));
  return results;
};

export const getSystemHealth = async () => {
  const ref = doc(db, 'stats', 'system', 'health', 'summary');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { lastIngestAt: null, lastUserId: null };
  }
  const data = snap.data() ?? {};
  return {
    lastIngestAt: parseTimestamp(data.lastIngestAt),
    lastUserId: typeof data.lastUserId === 'string' ? data.lastUserId : null
  };
};

export const updateUserTokenPolicy = async (
  uid: string,
  policy: { dailyTokens: number; perMinute: number; tier: string }
) => {
  const ref = doc(db, 'system_user_policies', uid);
  await setDoc(ref, { uid, ...policy, updatedAt: Date.now() }, { merge: true });
};

export const getUserTokenPolicy = async (uid: string) => {
  const ref = doc(db, 'system_user_policies', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data() ?? {};
  return {
    dailyTokens: typeof data.dailyTokens === 'number' ? data.dailyTokens : 0,
    perMinute: typeof data.perMinute === 'number' ? data.perMinute : 0,
    tier: typeof data.tier === 'string' ? data.tier : 'free'
  };
};
