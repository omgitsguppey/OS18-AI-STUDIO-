import { doc, getDoc } from "firebase/firestore";
import { normalizeSystemState, type SystemState } from "./systemCore";
import { auth, db } from "./firebaseConfig";

const LOCAL_STATE_KEY = "core_state_v3";
const REFRESH_INTERVAL_MS = 60_000;
const SYSTEM_STATE_COLLECTION = "system";
const SYSTEM_STATE_DOC = "core_memory";

let cachedState: SystemState | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let hasStarted = false;

const loadCachedState = () => {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem(LOCAL_STATE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as SystemState;
    cachedState = normalizeSystemState(parsed);
  } catch (error) {
    console.warn("[SyncService] Failed to parse cached SystemState.", error);
  }
};

const saveCachedState = (state: SystemState) => {
  if (typeof window === "undefined") return;

  const normalized = normalizeSystemState(state);
  cachedState = normalized;
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(normalized));
};

const fetchSystemState = async (): Promise<SystemState | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const ref = doc(db, "users", user.uid, SYSTEM_STATE_COLLECTION, SYSTEM_STATE_DOC);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;

  return normalizeSystemState(snapshot.data() as SystemState);
};

class SyncService {
  async init() {
    if (hasStarted) return;
    hasStarted = true;

    loadCachedState();

    await this.refresh().catch((error) => {
      console.warn("[SyncService] Initial sync failed.", error);
    });

    refreshTimer = setInterval(() => {
      void this.refresh();
    }, REFRESH_INTERVAL_MS);
  }

  async refresh() {
    const latest = await fetchSystemState();
    if (!latest) return;

    saveCachedState(latest);
  }

  getState(): SystemState | null {
    if (!cachedState) return null;

    // defensive clone so callers can’t mutate core memory
    return JSON.parse(JSON.stringify(cachedState)) as SystemState;
  }
}

export const syncService = new SyncService();
