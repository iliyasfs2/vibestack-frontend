import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePaymentFlow } from "@/features/payments/hooks";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("usePaymentFlow", () => {
  it("initiates and verifies a payment", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          transaction: {
            id: "tx-1",
            user_id: "u-1",
            amount_toman: 120000,
            description: "Cafe order",
            gateway: "mock",
            authority: "MOCK-123",
            ref_id: null,
            status: "pending",
            idempotency_key: "key-1",
            reference_type: "order",
            reference_id: "ord-1",
            error_detail: null,
            created_at: "2026-11-20T00:00:00Z",
          },
          payment_url: "http://localhost:8000/mock-gateway/pay/MOCK-123",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "tx-1",
          user_id: "u-1",
          amount_toman: 120000,
          description: "Cafe order",
          gateway: "mock",
          authority: "MOCK-123",
          ref_id: "REF-123",
          status: "paid",
          idempotency_key: "key-1",
          reference_type: "order",
          reference_id: "ord-1",
          error_detail: null,
          created_at: "2026-11-20T00:00:00Z",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePaymentFlow());

    let initiatedUrl = "";
    await act(async () => {
      const res = await result.current.initiatePayment({
        amount_toman: 120000,
        description: "Cafe order",
        reference_type: "order",
        reference_id: "ord-1",
        idempotency_key: "key-1",
      });
      initiatedUrl = res.payment_url;
    });
    expect(initiatedUrl).toContain("MOCK-123");

    let finalStatus = "";
    await act(async () => {
      const verified = await result.current.verifyPayment({
        authority: "MOCK-123",
        status: "OK",
      });
      finalStatus = verified.status;
    });
    expect(finalStatus).toBe("paid");
    expect(result.current.error).toBeNull();
  });
});
