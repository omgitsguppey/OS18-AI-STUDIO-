import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from "./firebaseConfig";

let cachedAdminClaim = false;
let cachedAdminUid: string | null = null;
const adminListeners = new Set<(isAdmin: boolean) => void>();

const notifyAdminListeners = (isAdmin: boolean) => {
  adminListeners.forEach((listener) => listener(isAdmin));
};

const setCachedAdminClaim = (user: User | null, isAdmin: boolean) => {
  cachedAdminUid = user ? user.uid : null;
  cachedAdminClaim = isAdmin;
  notifyAdminListeners(isAdmin);
};

const resolveAdminClaim = async (user: User): Promise<boolean> => {
  try {
    const result = await user.getIdTokenResult();
    return result.claims.admin === true;
  } catch (error) {
    console.warn("Failed to resolve admin claim", error);
    return false;
  }
};

export const authService = {
  login: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    window.location.reload(); // Refresh to clear state
  },

  isAdmin: (user: User | null) => {
    if (!user) return false;
    return cachedAdminUid === user.uid && cachedAdminClaim;
  },

  refreshAdminClaim: async (user: User | null) => {
    if (!user) {
      setCachedAdminClaim(null, false);
      return false;
    }

    setCachedAdminClaim(user, false);
    const isAdmin = await resolveAdminClaim(user);
    setCachedAdminClaim(user, isAdmin);
    return isAdmin;
  },

  onAdminClaimChange: (callback: (isAdmin: boolean) => void) => {
    adminListeners.add(callback);
    callback(cachedAdminClaim);
    return () => {
      adminListeners.delete(callback);
    };
  },

  // Hook listener
  onUserChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCachedAdminClaim(null, false);
        callback(user);
        return;
      }

      setCachedAdminClaim(user, false);
      void authService.refreshAdminClaim(user);

      callback(user);
    });
  }
};
