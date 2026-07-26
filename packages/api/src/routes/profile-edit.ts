/*
 * Profile edit adapters (plan section 6). PUT, not PATCH: updateProfile
 * replaces every editable field, and the method should say so. Field-level
 * rules live in the module; the schemas here only bound what may enter it.
 */

import { Hono } from "hono";
import type { ProfileEdit } from "../modules/profile-edit/types";
import { isDomainError } from "../modules/shared/errors";
import { respondWithDomainError } from "../transport/error-envelope";
import {
  updateAvatarBodySchema,
  updateProfileBodySchema,
} from "../transport/schemas";
import {
  PROFILE_BODY_LIMIT,
  requireActor,
  transportBodyLimit,
  transportValidator,
} from "../transport/validator";
import type { AppEnv } from "../types";

export function createProfileEditRoutes(profiles: ProfileEdit) {
  return (
    new Hono<AppEnv>()
      .get("/", requireActor, async (c) => {
        // biome-ignore lint/style/noNonNullAssertion: requireActor ran
        const user = c.get("user")!;
        try {
          return c.json(await profiles.getProfile(user.id));
        } catch (error) {
          if (isDomainError(error)) return respondWithDomainError(c, error);
          throw error;
        }
      })
      // Replacement command: omitted fields are cleared.
      .put(
        "/",
        requireActor,
        transportBodyLimit(PROFILE_BODY_LIMIT),
        transportValidator("json", updateProfileBodySchema),
        async (c) => {
          // biome-ignore lint/style/noNonNullAssertion: requireActor ran
          const user = c.get("user")!;
          try {
            return c.json(
              await profiles.updateProfile({
                ...c.req.valid("json"),
                userId: user.id,
              }),
            );
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      // Separate so choosing an avatar does not commit in-progress form edits.
      .put(
        "/avatar",
        requireActor,
        transportBodyLimit(PROFILE_BODY_LIMIT),
        transportValidator("json", updateAvatarBodySchema),
        async (c) => {
          // biome-ignore lint/style/noNonNullAssertion: requireActor ran
          const user = c.get("user")!;
          try {
            return c.json(
              await profiles.updateAvatar({
                userId: user.id,
                image: c.req.valid("json").image,
              }),
            );
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
  );
}
