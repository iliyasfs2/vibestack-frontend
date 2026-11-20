import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sampleUser = {
  id: "user-1",
  full_name: "Sara Karimi",
  email: "sara@example.com",
  phone: "09121112233",
  role: "customer" as const,
  is_active: true,
  created_at: "2026-11-20T00:00:00Z",
};

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("logs in, updates profile, and logs out", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ user: sampleUser, access_token: "tok", token_type: "bearer" }))
      .mockResolvedValueOnce(jsonResponse({ ...sampleUser, full_name: "Sara Updated" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const loggedIn = await useAuthStore.getState().login({
      identifier: "sara@example.com",
      password: "Password123",
    });
    expect(loggedIn.full_name).toBe("Sara Karimi");
    expect(useAuthStore.getState().user?.id).toBe("user-1");

    const updated = await useAuthStore.getState().updateProfile("Sara Updated");
    expect(updated.full_name).toBe("Sara Updated");
    expect(useAuthStore.getState().user?.full_name).toBe("Sara Updated");

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it("stores readable error message on failed login", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      useAuthStore.getState().login({ identifier: "wrong@example.com", password: "bad" }),
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().error).toBe("Invalid credentials");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("hydrates to null gracefully when unauthenticated", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "Missing token" } }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await useAuthStore.getState().hydrate();
    expect(result).toBeNull();
    expect(useAuthStore.getState().isInitialized).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
