/*
 * Runtime validation for the reaction and vote endpoints (refactor plan
 * sections 5.6 and 6.1).
 *
 * These two endpoints deliberately kept their original HTTP contract through
 * the refactor, including the `{ error: string }` failure shape, because
 * redesigning reactions and votes was an explicit non-goal. Everything else
 * speaks the structured envelope in transport/validator.ts. The split is
 * intentional and permanent, not migration debt.
 */

import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";

// Transport bounds fixed by the plan (section 6.1).
export const TITLE_MIN = 3;
export const TITLE_MAX = 200;
export const CONTENT_MAX = 50_000;
export const EMOJI_MAX_CODE_POINTS = 32;
export const JSON_BODY_LIMIT = 64 * 1024; // 64 KiB
export const PROFILE_BODY_LIMIT = 34 * 1024 * 1024; // 34 MiB

const invalidJsonBody = { error: "Request body must be valid JSON" };

// zValidator hands over the zod/v4 core error type, so accept the minimal
// shape instead of the classic ZodError class.
function firstIssueMessage(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const path = issue.path.join(".");
  // Custom messages already name their field; only prefix bare zod messages.
  return path && /^(Invalid|Expected|Required|Too)/i.test(issue.message)
    ? `${path}: ${issue.message}`
    : issue.message;
}

type ValidationTarget = "json" | "param" | "query";

/*
 * `Target` is generic so the literal survives inference. Typing the
 * parameter as the union instead makes Hono believe every route validates
 * all three targets, which breaks hc<AppType> for its callers.
 */
export function legacyValidator<
  T extends z.ZodType,
  Target extends ValidationTarget,
>(target: Target, schema: T) {
  return zValidator(target, schema, (result, c: Context) => {
    if (!result.success) {
      return c.json({ error: firstIssueMessage(result.error) }, 400);
    }
  });
}

export function legacyJsonBodyLimit(maxSize = JSON_BODY_LIMIT) {
  return bodyLimit({
    maxSize,
    onError: (c) => c.json({ error: "Request body too large" }, 413),
  });
}

// Hono's json validator responds with its own error when the body is not
// JSON at all; normalize that path to the legacy shape via a tiny wrapper.
export const jsonBodyRequired = {
  invalidJsonBody,
};

export const uuid = (field: string) =>
  z.uuid({ message: `${field} must be a valid ID` });

// Better Auth issues text IDs, not UUIDs (plan section 6.1 exception).
export const topicTitle = z
  .string({ message: "title must be text" })
  .trim()
  .min(TITLE_MIN, `title must contain at least ${TITLE_MIN} characters`)
  .max(TITLE_MAX, `title must contain at most ${TITLE_MAX} characters`);

export const postContent = z
  .string({ message: "content must be text" })
  .trim()
  .min(1, "content is required")
  .max(CONTENT_MAX, `content must contain at most ${CONTENT_MAX} characters`);

export const reactionEmoji = z
  .string({ message: "emoji must be text" })
  .min(1, "emoji is required")
  .refine((value) => [...value].length <= EMOJI_MAX_CODE_POINTS, {
    message: `emoji must contain at most ${EMOJI_MAX_CODE_POINTS} characters`,
  });

export const sortOrder = z
  .int("sortOrder must be a non-negative integer")
  .min(0, "sortOrder must be a non-negative integer");
