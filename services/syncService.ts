import { doc, getDoc } from "firebase/firestore";
import type { SystemState } from "./systemCore";
import { auth, db } from "./firebaseConfig";

const LOCAL_STATE_KEY = "core_state_v3";
const REFRESH_INTERVAL_MS = 60_000;

let cachedState: SystemState | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let hasStarted = false;

const loadCachedState = () => {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(LOCAL_STATE_KEY);
  if (!raw) return;
  try {
    cachedState = JSON.parse(raw) as SystemState;
  } catch (error) {
    console.warn("[SyncService] Failed to parse cached SystemState.", error);
  }
};

const saveCachedState = (state: SystemState) => {
  if (typeof window === "undefined") return;
  cachedState = state;
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
};

const fetchSystemState = async (): Promise<SystemState | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  // TODO: Confirm server-side SystemState document path before shipping.
  const ref = doc(db, "users", user.uid, "system", "core_memory");
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data() as SystemState;
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
    return JSON.parse(JSON.stringify(cachedState)) as SystemState;
  }
}

export const syncService = new SyncService();
