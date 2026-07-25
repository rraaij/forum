// SSR always needs an absolute URL (Vite proxy is dev-only, Node fetch requires absolute URLs).
// In the browser: use absolute URL if VITE_API_URL is set (production), else fall back to
// the Vite proxy path /api (development).
const API_BASE =
  import.meta.env.SSR || import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api`
    : "/api";

/*
 * Typed client error carrying the HTTP status and, when the API returned the
 * structured envelope { error: { code, message, field? } }, its domain code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly field?: string;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; field?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.field = options?.field;
  }
}

/*
 * Understands BOTH error shapes during the migration: the structured
 * envelope used by replacement endpoints and the legacy { error: string }
 * from routes that have not been replaced yet (admin, profile,
 * reactions/votes). Remove the legacy branch when those are deleted.
 */
export async function toApiError(res: {
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return new ApiError(res.status, `${res.status} ${res.statusText}`);
  }

  if (payload && typeof payload === "object" && "error" in payload) {
    const raw = (payload as { error: unknown }).error;
    if (typeof raw === "string") {
      return new ApiError(res.status, raw);
    }
    if (raw && typeof raw === "object" && "message" in raw) {
      const envelope = raw as {
        code?: string;
        message: string;
        field?: string;
      };
      return new ApiError(res.status, envelope.message, {
        code: envelope.code,
        field: envelope.field,
      });
    }
  }
  return new ApiError(res.status, `${res.status} ${res.statusText}`);
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  return res.json();
}
