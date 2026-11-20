import type { ApiErrorResponse } from "@/shared/types/api";

const API_PROXY_PREFIX = "/api/proxy";
const SKIP_REFRESH_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
]);

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: QueryParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

function buildUrl(path: string, params?: QueryParams): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullPath = `${API_PROXY_PREFIX}${normalizedPath}`;
  if (!params) {
    return fullPath;
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${fullPath}?${query}` : fullPath;
}

async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as Partial<ApiErrorResponse>;
    if (data.error) {
      return new ApiError(
        response.status,
        data.error.code,
        data.error.message,
        data.error.details,
      );
    }
  } catch {
    return new ApiError(response.status, "HTTP_ERROR", response.statusText || "Request failed");
  }
  return new ApiError(response.status, "HTTP_ERROR", response.statusText || "Request failed");
}

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_PROXY_PREFIX}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, headers = {}, signal, skipAuthRefresh = false } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const requestHeaders: Record<string, string> = { ...headers };
  let serializedBody: BodyInit | undefined;

  if (isFormData) {
    serializedBody = body;
  } else if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    serializedBody = JSON.stringify(body);
  }

  const url = buildUrl(path, params);
  const execute = (): Promise<Response> =>
    fetch(url, {
      method,
      headers: requestHeaders,
      body: serializedBody,
      credentials: "include",
      signal,
    });

  let response = await execute();

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !SKIP_REFRESH_PATHS.has(path)
  ) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await execute();
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams, signal?: AbortSignal): Promise<T> =>
    apiRequest<T>(path, { method: "GET", params, signal }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> =>
    apiRequest<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown): Promise<T> =>
    apiRequest<T>(path, { method: "PUT", body }),

  patch: <T>(path: string, body?: unknown): Promise<T> =>
    apiRequest<T>(path, { method: "PATCH", body }),

  delete: <T = void>(path: string): Promise<T> =>
    apiRequest<T>(path, { method: "DELETE" }),

  upload: <T>(path: string, formData: FormData): Promise<T> =>
    apiRequest<T>(path, { method: "POST", body: formData }),
};
