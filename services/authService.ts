import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from "./firebaseConfig";

let cachedAdminClaim = false;
let cachedAdminUid: string | null = null;

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

  // Hook listener
  onUserChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        cachedAdminClaim = false;
        cachedAdminUid = null;
        callback(user);
        return;
      }

      cachedAdminUid = user.uid;
      cachedAdminClaim = false;
      void user.getIdTokenResult().then((result) => {
        cachedAdminClaim = result.claims.admin === true;
      }).catch(() => {
        cachedAdminClaim = false;
      });

      callback(user);
    });
  }
};
