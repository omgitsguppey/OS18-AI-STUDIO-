import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { SystemPolicy } from '../types';

const POLICY_DOC = doc(db, 'system', 'policy');
const CACHE_KEY = 'os18_policy_cache';
const CACHE_TTL_MS = 60_000;

let inMemoryPolicy: SystemPolicy | null = null;
let lastFetchedAt = 0;

const readCache = (): SystemPolicy | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SystemPolicy;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const writeCache = (policy: SystemPolicy) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(policy));
};

export const getCachedPolicy = async (): Promise<SystemPolicy | null> => {
  const now = Date.now();
  if (inMemoryPolicy && now - lastFetchedAt < CACHE_TTL_MS) {
    return inMemoryPolicy;
  }
  const cached = readCache();
  if (cached && (lastFetchedAt === 0 || now - lastFetchedAt < CACHE_TTL_MS)) {
    inMemoryPolicy = cached;
    lastFetchedAt = now;
    return cached;
  }
  try {
    const snap = await getDoc(POLICY_DOC);
    if (!snap.exists()) {
      return null;
    }
    const policy = snap.data() as SystemPolicy;
    inMemoryPolicy = policy;
    lastFetchedAt = now;
    writeCache(policy);
    return policy;
  } catch {
    return cached;
  }
};
