"use client";

import { useCallback, useEffect, useState } from "react";

import { api, isApiError } from "@/shared/lib/api-client";
import type {
  ContentBlockCreateInput,
  ContentBlockOut,
  ContentBlockUpdateInput,
  SiteConfigOut,
  SiteConfigUpdateInput,
} from "@/shared/types/api";

function getErrorMessage(err: unknown): string {
  return isApiError(err) ? err.message : "Failed to load site data";
}

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfigOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<SiteConfigOut>("/api/v1/site/config");
      setConfig(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { config, isLoading, error, refetch };
}

export function useContentBlocks(section?: string) {
  const [blocks, setBlocks] = useState<ContentBlockOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<ContentBlockOut[]>("/api/v1/site/blocks", { section });
      setBlocks(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { blocks, isLoading, error, refetch };
}

export function useSiteAdmin() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    updateConfig: (input: SiteConfigUpdateInput) =>
      run(() => api.put<SiteConfigOut>("/api/v1/admin/site/config", input)),
    listAdminBlocks: (section?: string) =>
      run(() => api.get<ContentBlockOut[]>("/api/v1/admin/site/blocks", { section })),
    createBlock: (input: ContentBlockCreateInput) =>
      run(() => api.post<ContentBlockOut>("/api/v1/admin/site/blocks", input)),
    updateBlock: (blockId: string, input: ContentBlockUpdateInput) =>
      run(() => api.patch<ContentBlockOut>(`/api/v1/admin/site/blocks/${blockId}`, input)),
    deleteBlock: (blockId: string) =>
      run(() => api.delete(`/api/v1/admin/site/blocks/${blockId}`)),
  };
}
