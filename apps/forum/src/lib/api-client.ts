/*
 * Typed transport client derived from the exported Hono AppType (refactor
 * plan section 6.2). This is the composition seam feature APIs migrate to in
 * Phases 4-7; request/response transport types are inferred, never
 * hand-maintained. The import is type-only, so no server code is bundled.
 */

import type { AppType } from "@forum/api/app";
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

export const apiClient = hc<AppType>(API_ORIGIN, {
  init: { credentials: "include" },
});

export type ApiClient = typeof apiClient;
