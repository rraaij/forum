/*
 * Profile activity adapter (refactor plan section 6). A pure adapter: the
 * actor comes from the session, the module produces the read model, and the
 * route adds no query logic of its own.
 */

import { Hono } from "hono";
import type { ProfileActivity } from "../modules/profile-activity/types";
import { isDomainError } from "../modules/shared/errors";
import { respondWithDomainError } from "../transport/error-envelope";
import { requireActor } from "../transport/validator";
import type { AppEnv } from "../types";

export function createProfileActivityRoutes(activity: ProfileActivity) {
  return new Hono<AppEnv>().get("/activity", requireActor, async (c) => {
    // biome-ignore lint/style/noNonNullAssertion: requireActor ran
    const user = c.get("user")!;
    try {
      return c.json(await activity.getAllForUser(user.id));
    } catch (error) {
      if (isDomainError(error)) return respondWithDomainError(c, error);
      throw error;
    }
  });
}
