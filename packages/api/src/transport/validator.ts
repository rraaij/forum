/*
 * Transport middleware for REPLACEMENT adapters (refactor plan section 6.1).
 * Unlike validation/legacy.ts these speak the standard error envelope from
 * day one: { error: { code, message, field? } }.
 */

import { zValidator } from "@hono/zod-validator";
import type { Context, Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { z } from "zod";
import type { AppEnv } from "../types";
import type { ErrorResponse } from "./error-envelope";

export const TRANSPORT_JSON_LIMIT = 64 * 1024; // 64 KiB

function envelope(
  code: string,
  message: string,
  field?: string,
): ErrorResponse {
  return { error: { code, message, ...(field ? { field } : {}) } };
}

type ValidationTarget = "json" | "param" | "query";

/*
 * `Target` is generic so the literal ("json" | "param" | "query") survives
 * inference. Typing the parameter as the union instead makes Hono believe
 * every route validates all three targets, which breaks hc<AppType>.
 */
export function transportValidator<
  T extends z.ZodType,
  Target extends ValidationTarget,
>(target: Target, schema: T) {
  return zValidator(target, schema, (result, c: Context) => {
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path.join(".") || undefined;
      return c.json(
        envelope("INVALID_INPUT", issue?.message ?? "Invalid request", field),
        400,
      );
    }
  });
}

export function transportBodyLimit(maxSize = TRANSPORT_JSON_LIMIT) {
  return bodyLimit({
    maxSize,
    onError: (c) =>
      c.json(envelope("BODY_TOO_LARGE", "Request body too large"), 413),
  });
}

/*
 * Envelope-shaped 401 gate. Hono middleware remains the security boundary
 * that establishes actor identity; modules receive the actor as input.
 */
export async function requireActor(c: Context<AppEnv>, next: Next) {
  if (!c.get("user")) {
    return c.json(envelope("UNAUTHENTICATED", "Authentication required"), 401);
  }
  await next();
}
