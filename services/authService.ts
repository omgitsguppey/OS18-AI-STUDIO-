import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from "./firebaseConfig";

// The Master Key
const ADMIN_EMAIL = "uylusjohnson@gmail.com";

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
    return user?.email === ADMIN_EMAIL;
  },

  // Hook listener
  onUserChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};