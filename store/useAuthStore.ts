import { create } from 'zustand';
import { AuthUser, UserRole } from '../types';

interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  hydrateSession: () => void;
}

const SESSION_STORAGE_KEY = 'societyos_session_auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isHydrated: false,

  hydrateSession: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed: AuthUser = JSON.parse(raw);
        set({
          user: parsed,
          role: parsed.role,
          isAuthenticated: true,
          isHydrated: true
        });
        return;
      }
    } catch {
      // Ignore corrupted session storage
    }
    set({ isHydrated: true });
  },

  login: (user: AuthUser) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } catch {
        // Fallback for storage restrictions
      }
    }
    set({
      user,
      role: user.role,
      isAuthenticated: true,
      isHydrated: true
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Fallback
      }
    }
    set({
      user: null,
      role: null,
      isAuthenticated: false
    });
  }
}));
