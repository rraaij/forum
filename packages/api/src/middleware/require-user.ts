import type { Context, Next } from "hono";
import type { AppEnv } from "../types";

/*
 * Explicit 401 gate placed BEFORE request validators on authenticated legacy
 * writes. Without it, adding Zod middleware would flip the historical
 * ordering (characterized in tests): a request that is both unauthenticated
 * and malformed must keep returning 401, not 400.
 */
export async function requireUser(c: Context<AppEnv>, next: Next) {
  if (!c.get("user")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
}
