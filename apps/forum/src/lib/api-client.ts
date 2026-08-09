/*
 * Typed transport client derived from the exported Hono AppType (refactor
 * plan section 6.2). This is the composition seam feature APIs migrate to in
 * Phases 4-7; request/response transport types are inferred, never
 * hand-maintained. The import is type-only, so no server code is bundled.
 */

import type { AppType } from "@forum/api/app";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getRequestHeader } from "@tanstack/solid-start/server";
import { hc } from "hono/client";

/*
 * Same base-URL rules as lib/api.ts: SSR and configured production use an
 * absolute origin; the browser in development uses the Vite proxy via a
 * relative base.
 */
const API_ORIGIN =
  import.meta.env.SSR || import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL ?? "http://localhost:4000")
    : "";

/*
 * Browser fetch attaches cookies through `credentials`. During SSR there is no
 * browser cookie jar, so forward only the current request's Cookie header.
 * This keeps viewer-aware loaders correct without exposing session data to the
 * client bundle or turning the API response into shared cacheable content.
 */
const sessionFetch = createIsomorphicFn()
  .server((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const cookie = getRequestHeader("cookie");
    if (cookie) headers.set("cookie", cookie);
    return fetch(input, { ...init, headers });
  })
  .client((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

export const apiClient = hc<AppType>(API_ORIGIN, {
  init: { credentials: "include" },
  fetch: sessionFetch,
});

export type ApiClient = typeof apiClient;
