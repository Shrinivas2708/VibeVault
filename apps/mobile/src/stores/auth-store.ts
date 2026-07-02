import type { AuthResponse, User } from "@vibevault/types";
import { create } from "zustand";
import { ApiClientError, authApi } from "@/lib/api-client";
import { tokenStorage } from "@/lib/storage";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (response: AuthResponse) => void;
  clearSession: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

function persistSession(response: AuthResponse) {
  tokenStorage.setSession(
    response.tokens.accessToken,
    response.tokens.refreshToken,
    JSON.stringify(response.user),
  );
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,

  setSession: (response) => {
    persistSession(response);
    set({ user: response.user, isAuthenticated: true });
  },

  clearSession: () => {
    tokenStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const accessToken = tokenStorage.getAccessToken();
    const userJson = tokenStorage.getUserJson();

    if (!accessToken || !userJson) {
      set({ isHydrated: true, isAuthenticated: false, user: null });
      return;
    }

    try {
      const cachedUser = JSON.parse(userJson) as User;
      set({ user: cachedUser, isAuthenticated: true, isHydrated: true });

      try {
        const user = await authApi.me();
        tokenStorage.setSession(
          tokenStorage.getAccessToken()!,
          tokenStorage.getRefreshToken()!,
          JSON.stringify(user),
        );
        set({ user });
      } catch (error) {
        // Stay signed in offline; only clear when the server rejects the session.
        if (error instanceof ApiClientError && error.status === 401) {
          tokenStorage.clear();
          set({ user: null, isAuthenticated: false });
        }
      }
    } catch {
      tokenStorage.clear();
      set({ user: null, isAuthenticated: false, isHydrated: true });
    }
  },

  login: async (email, password) => {
    const response = await authApi.login({ email, password });
    get().setSession(response);
  },

  register: async (email, password, displayName) => {
    const response = await authApi.register({ email, password, displayName });
    get().setSession(response);
  },

  logout: async () => {
    await authApi.logout();
    get().clearSession();
  },

  refreshUser: async () => {
    const user = await authApi.me();
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();
    if (accessToken && refreshToken) {
      tokenStorage.setSession(accessToken, refreshToken, JSON.stringify(user));
    }
    set({ user });
  },
}));
