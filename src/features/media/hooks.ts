"use client";

import { useCallback, useState } from "react";

import { api, isApiError } from "@/shared/lib/api-client";
import type { MediaFileOut, PaginatedResponse } from "@/shared/types/api";

export function useMediaAdmin() {
  const [items, setItems] = useState<MediaFileOut[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = useCallback(async (limit = 20, offset = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<PaginatedResponse<MediaFileOut>>("/api/v1/admin/media", {
        limit,
        offset,
      });
      setItems(data.items);
      setTotal(data.total);
      return data;
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load media");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const created = await api.upload<MediaFileOut>("/api/v1/admin/media", formData);
      setItems((prev) => [created, ...prev]);
      setTotal((prev) => prev + 1);
      return created;
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to upload image");
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteMedia = useCallback(async (mediaId: string) => {
    setError(null);
    try {
      await api.delete(`/api/v1/admin/media/${mediaId}`);
      setItems((prev) => prev.filter((item) => item.id !== mediaId));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to delete media");
      throw err;
    }
  }, []);

  return {
    items,
    total,
    isLoading,
    isUploading,
    error,
    fetchMedia,
    uploadImage,
    deleteMedia,
  };
}
