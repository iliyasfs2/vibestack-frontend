import { afterEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "@/shared/lib/telemetry";

describe("telemetry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does nothing when telemetry is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_URL", "https://monitor.example.com/ingest");
    const sendBeaconMock = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon: sendBeaconMock });

    trackEvent("view_menu");

    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it("sends event via sendBeacon when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_URL", "https://monitor.example.com/ingest");
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { sendBeacon: sendBeaconMock });

    trackEvent("checkout_started", { total: 150000 });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(sendBeaconMock).toHaveBeenCalledWith(
      "https://monitor.example.com/ingest",
      expect.any(Blob),
    );
  });
});
