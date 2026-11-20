"use client";

import { useCallback, useState } from "react";

import { api, isApiError } from "@/shared/lib/api-client";
import type {
  PaginatedResponse,
  PaymentInitiateInput,
  PaymentInitiateResponse,
  PaymentTransactionOut,
  PaymentVerifyInput,
} from "@/shared/types/api";

export function usePaymentFlow() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = useCallback(async (input: PaymentInitiateInput) => {
    setIsLoading(true);
    setError(null);
    try {
      return await api.post<PaymentInitiateResponse>("/api/v1/payments/initiate", input);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to start payment");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyPayment = useCallback(async (input: PaymentVerifyInput) => {
    setIsLoading(true);
    setError(null);
    try {
      return await api.post<PaymentTransactionOut>("/api/v1/payments/verify", input);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to verify payment");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyPayments = useCallback(async (limit = 20, offset = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      return await api.get<PaginatedResponse<PaymentTransactionOut>>("/api/v1/payments/my", {
        limit,
        offset,
      });
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load payments");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    initiatePayment,
    verifyPayment,
    fetchMyPayments,
  };
}
