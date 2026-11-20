"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/store";
import type { UserRole } from "@/shared/types/api";

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    if (!store.isInitialized) {
      void store.hydrate();
    }
  }, [store.isInitialized, store.hydrate]);

  return store;
}

export function useRequireAuth(redirectTo = "/login") {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isInitialized && !auth.isLoading && !auth.user) {
      router.replace(redirectTo);
    }
  }, [auth.isInitialized, auth.isLoading, auth.user, redirectTo, router]);

  return {
    user: auth.user,
    isReady: auth.isInitialized && !auth.isLoading && auth.user !== null,
  };
}

export function useRequireRole(allowedRoles: UserRole[], redirectTo = "/") {
  const router = useRouter();
  const auth = useAuth();
  const isAllowed = auth.user !== null && allowedRoles.includes(auth.user.role);

  useEffect(() => {
    if (auth.isInitialized && !auth.isLoading && !isAllowed) {
      router.replace(redirectTo);
    }
  }, [auth.isInitialized, auth.isLoading, isAllowed, redirectTo, router]);

  return {
    user: auth.user,
    isAllowed,
    isReady: auth.isInitialized && !auth.isLoading && isAllowed,
  };
}
