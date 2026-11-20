import { describe, expect, it, vi } from "vitest";

import { ApiError, api, isApiError } from "@/shared/lib/api-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api-client", () => {
  it("builds query parameters and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await api.get<{ items: unknown[]; total: number }>("/api/v1/site/blocks", {
      section: "faq",
      ignored: undefined,
    });

    expect(data).toEqual({ items: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy/api/v1/site/blocks?section=faq",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
  });

  it("parses FastAPI error shape into ApiError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "CONFLICT",
            message: "Email is already registered",
            details: { field: "email" },
          },
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.post("/api/v1/auth/register", {})).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Email is already registered",
      details: { field: "email" },
    });

    try {
      await api.post("/api/v1/auth/register", {});
    } catch (err) {
      expect(isApiError(err)).toBe(true);
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it("deduplicates concurrent 401 refresh calls and retries original requests", async () => {
    let meAttempts = 0;
    let refreshCount = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/proxy/api/v1/auth/refresh") {
        refreshCount += 1;
        return jsonResponse({ ok: true }, 200);
      }
      if (url === "/api/proxy/api/v1/auth/me") {
        meAttempts += 1;
        if (meAttempts <= 2) {
          return jsonResponse({ error: { code: "UNAUTHORIZED", message: "Expired" } }, 401);
        }
        return jsonResponse({ id: "u1", full_name: "Ali" }, 200);
      }
      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      api.get<{ id: string }>("/api/v1/auth/me"),
      api.get<{ id: string }>("/api/v1/auth/me"),
    ]);

    expect(first.id).toBe("u1");
    expect(second.id).toBe("u1");
    expect(refreshCount).toBe(1);
    expect(meAttempts).toBe(4);
  });

  it("handles 204 No Content and FormData uploads cleanly", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ id: "m1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const delResult = await api.delete("/api/v1/admin/site/blocks/1");
    expect(delResult).toBeUndefined();

    const formData = new FormData();
    formData.append("file", new Blob(["abc"], { type: "image/png" }), "test.png");
    const uploadResult = await api.upload<{ id: string }>("/api/v1/admin/media", formData);
    expect(uploadResult.id).toBe("m1");

    const uploadCallHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(uploadCallHeaders["Content-Type"]).toBeUndefined();
  });
});
