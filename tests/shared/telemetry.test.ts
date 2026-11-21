import { afterEach, describe, expect, it, vi } from "vitest";

import {
  installGlobalErrorMonitor,
  installPresenceHeartbeat,
  reportClientError,
  trackEvent,
} from "@/shared/lib/telemetry";

describe("telemetry", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing when telemetry is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_COCKPIT_URL", "https://cockpit.example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    trackEvent("view_menu");
    reportClientError("TypeError", "Broken");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends telemetry event via Cockpit URL when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_COCKPIT_URL", "https://cockpit.example.com");
    vi.stubEnv("NEXT_PUBLIC_COCKPIT_INGEST_KEY", "vs_key_1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    trackEvent("checkout_started", { total: 150000 }, "/checkout");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      event: "checkout_started",
      path: "/checkout",
    });
  });

  it("reports window errors to Cockpit ingest error endpoint", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_COCKPIT_URL", "https://cockpit.example.com");
    vi.stubEnv("NEXT_PUBLIC_COCKPIT_INGEST_KEY", "vs_key_1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const cleanup = installGlobalErrorMonitor();
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "Cannot read undefined",
        error: new TypeError("Cannot read undefined"),
      }),
    );
    cleanup();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cockpit.example.com/api/v1/ingest/error",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
  });

  it("pings backend presence endpoint when telemetry is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "true");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ active_users: 1, peak_users: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const stop = installPresenceHeartbeat(60000);
    stop();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy/api/v1/presence/ping",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("attributes Torob traffic across navigation from landing to purchase", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_COCKPIT_URL", "https://cockpit.example.com");
    vi.stubEnv("NEXT_PUBLIC_COCKPIT_INGEST_KEY", "vs_key_1");
    window.history.replaceState({}, "", "/products/shoe-1?utm_source=torob");

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    trackEvent("page_view");
    // Later on checkout without query param, session attribution remains "torob"
    window.history.replaceState({}, "", "/checkout");
    trackEvent("payment_completed", { amount: 950000 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(firstInit.body)).metadata.source).toBe("torob");
    expect(JSON.parse(String(secondInit.body)).metadata).toMatchObject({
      source: "torob",
      amount: 950000,
    });
  });
});
