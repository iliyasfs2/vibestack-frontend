"use client";

import { create } from "zustand";

import { api, isApiError } from "@/shared/lib/api-client";
import type { AuthResponse, LoginInput, RegisterInput, UserOut } from "@/shared/types/api";

export interface AuthState {
  user: UserOut | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  hydrate: (force?: boolean) => Promise<UserOut | null>;
  login: (input: LoginInput) => Promise<UserOut>;
  register: (input: RegisterInput) => Promise<UserOut>;
  updateProfile: (fullName: string) => Promise<UserOut>;
  logout: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

function extractErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Unexpected error";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  reset: () => set({ user: null, isLoading: false, isInitialized: false, error: null }),

  hydrate: async (force = false) => {
    const state = get();
    if (state.isInitialized && !force) {
      return state.user;
    }

    set({ isLoading: true, error: null });
    try {
      const user = await api.get<UserOut>("/api/v1/auth/me");
      set({ user, isLoading: false, isInitialized: true });
      return user;
    } catch {
      set({ user: null, isLoading: false, isInitialized: true });
      return null;
    }
  },

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>("/api/v1/auth/login", input);
      set({ user: res.user, isLoading: false, isInitialized: true });
      return res.user;
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>("/api/v1/auth/register", input);
      set({ user: res.user, isLoading: false, isInitialized: true });
      return res.user;
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  updateProfile: async (fullName) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.patch<UserOut>("/api/v1/auth/me", { full_name: fullName });
      set({ user, isLoading: false });
      return user;
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/auth/logout");
    } finally {
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },
}));
