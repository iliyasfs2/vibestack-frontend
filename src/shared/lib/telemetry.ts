export interface TelemetryPayload {
  event: string;
  path: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export function trackEvent(
  event: string,
  metadata?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const enabled = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "true";
  const endpoint = process.env.NEXT_PUBLIC_TELEMETRY_URL;
  if (!enabled || !endpoint) {
    return;
  }

  const payload: TelemetryPayload = {
    event,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    metadata,
  };

  try {
    const serialized = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([serialized], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: serialized,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    return;
  }
}
