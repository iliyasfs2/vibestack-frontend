export interface TelemetryPayload {
  ingest_key?: string;
  event: string;
  path: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ClientErrorPayload {
  ingest_key?: string;
  source: "frontend";
  error_type: string;
  message: string;
  path: string;
  stack_trace?: string;
}

function sendBeaconJson(url: string, payload: unknown): void {
  try {
    const serialized = JSON.stringify(payload);
    if (typeof fetch === "function") {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
        keepalive: true,
      }).catch(() => undefined);
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([serialized], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    }
  } catch {
    return;
  }
}

function getTelemetryUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_TELEMETRY_URL;
  if (explicit) {
    return explicit;
  }
  const cockpitUrl = process.env.NEXT_PUBLIC_COCKPIT_URL;
  if (cockpitUrl) {
    return `${cockpitUrl.replace(/\/$/, "")}/api/v1/ingest/telemetry`;
  }
  return null;
}

function getErrorIngestUrl(): string | null {
  const cockpitUrl = process.env.NEXT_PUBLIC_COCKPIT_URL;
  if (!cockpitUrl) {
    return null;
  }
  return `${cockpitUrl.replace(/\/$/, "")}/api/v1/ingest/error`;
}

function matchKnownChannel(raw: string): string | null {
  const val = raw.trim().toLowerCase();
  if (!val) {
    return null;
  }
  if (val.includes("torob")) {
    return "torob";
  }
  if (val.includes("emalls")) {
    return "emalls";
  }
  if (val.includes("instagram") || val === "ig") {
    return "instagram";
  }
  if (val.includes("t.me") || val.includes("telegram")) {
    return "telegram";
  }
  if (val.includes("google")) {
    return "google";
  }
  if (val.includes("basalam")) {
    return "basalam";
  }
  if (val.includes("divar")) {
    return "divar";
  }
  if (val.includes("digikala")) {
    return "digikala";
  }
  if (val.includes("aparat")) {
    return "aparat";
  }
  if (val.includes("yektanet")) {
    return "yektanet";
  }
  return val.replace(/[^a-z0-9_-]/g, "").slice(0, 32) || null;
}

export function resolveTrafficSource(): string {
  if (typeof window === "undefined") {
    return "direct";
  }

  const storageKey = "vs_traffic_source";
  try {
    const params = new URLSearchParams(window.location.search);
    const paramCandidate =
      params.get("utm_source") || params.get("source") || params.get("ref") || "";
    const fromParam = matchKnownChannel(paramCandidate);
    if (fromParam) {
      window.sessionStorage.setItem(storageKey, fromParam);
      return fromParam;
    }

    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) {
      return existing;
    }

    if (typeof document !== "undefined" && document.referrer) {
      const refHost = new URL(document.referrer).hostname.replace(/^www\./i, "");
      if (refHost && refHost !== window.location.hostname.replace(/^www\./i, "")) {
        const stem = refHost.split(".")[0] || refHost;
        const fromRef = matchKnownChannel(refHost) ?? matchKnownChannel(stem);
        if (fromRef) {
          window.sessionStorage.setItem(storageKey, fromRef);
          return fromRef;
        }
      }
    }
  } catch {
    return "direct";
  }

  return "direct";
}

export function trackEvent(
  event: string,
  metadata?: Record<string, string | number | boolean>,
  pathOverride?: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const enabled = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "true";
  const endpoint = getTelemetryUrl();
  if (!enabled || !endpoint) {
    return;
  }

  const source = resolveTrafficSource();
  const enrichedMetadata: Record<string, string | number | boolean> = {
    source,
    ...metadata,
  };

  const payload: TelemetryPayload = {
    ingest_key: process.env.NEXT_PUBLIC_COCKPIT_INGEST_KEY || undefined,
    event,
    path: pathOverride || window.location.pathname,
    timestamp: new Date().toISOString(),
    metadata: enrichedMetadata,
  };

  sendBeaconJson(endpoint, payload);
}

export function reportClientError(
  errorType: string,
  message: string,
  stackTrace?: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const enabled = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "true";
  const endpoint = getErrorIngestUrl();
  const ingestKey = process.env.NEXT_PUBLIC_COCKPIT_INGEST_KEY;
  if (!enabled || !endpoint || !ingestKey) {
    return;
  }

  const payload: ClientErrorPayload = {
    ingest_key: ingestKey,
    source: "frontend",
    error_type: errorType.slice(0, 80) || "Error",
    message: message.slice(0, 500) || "Unknown frontend error",
    path: window.location.pathname,
    stack_trace: stackTrace ? stackTrace.slice(0, 4000) : undefined,
  };

  sendBeaconJson(endpoint, payload);
}

export function installGlobalErrorMonitor(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onError = (event: ErrorEvent) => {
    const errObj = event.error instanceof Error ? event.error : null;
    reportClientError(
      errObj?.name || "WindowError",
      event.message || errObj?.message || "Unhandled window error",
      errObj?.stack,
    );
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const isErr = reason instanceof Error;
    reportClientError(
      isErr ? reason.name : "UnhandledRejection",
      isErr ? reason.message : String(reason || "Promise rejected"),
      isErr ? reason.stack : undefined,
    );
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

function getOrCreateSessionId(): string {
  const storageKey = "vs_presence_session_id";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }
  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(storageKey, generated);
  return generated;
}

export function installPresenceHeartbeat(intervalMs = 30000): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (process.env.NEXT_PUBLIC_TELEMETRY_ENABLED !== "true") {
    return () => undefined;
  }

  const sendPing = () => {
    try {
      const sessionId = getOrCreateSessionId();
      void fetch("/api/proxy/api/v1/presence/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      return;
    }
  };

  sendPing();
  const timerId = window.setInterval(sendPing, intervalMs);
  return () => window.clearInterval(timerId);
}
