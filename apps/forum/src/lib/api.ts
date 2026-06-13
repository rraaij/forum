// SSR always needs an absolute URL (Vite proxy is dev-only, Node fetch requires absolute URLs).
// In the browser: use absolute URL if VITE_API_URL is set (production), else fall back to
// the Vite proxy path /api (development).
const API_BASE =
  import.meta.env.SSR || import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api`
    : "/api";

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
    const payload = await res.json().catch(() => ({ error: res.statusText }));
    const message =
      typeof payload.error === "string" ? payload.error : res.statusText;

    // Include the HTTP status because SSR route errors otherwise flatten API
    // failures into a vague "Internal Server Error" page.
    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }

  return res.json();
}
