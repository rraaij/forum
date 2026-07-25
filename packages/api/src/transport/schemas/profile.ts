import { z } from "zod";

/*
 * Structural bounds only (plan section 6.1): deep image validation (MIME,
 * decoded byte size) is domain policy and lives in the profile-edit module.
 * PUT /api/profile is a REPLACEMENT command; photoUrls is always required.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const PROFILE_MAX_PHOTOS = 12;

// PUT /api/profile
export const updateProfileBodySchema = z.object({
  displayName: z.string().trim().max(80).nullish(),
  dateOfBirth: z.string().regex(DATE_PATTERN, "Use YYYY-MM-DD").nullish(),
  profileText: z.string().max(2_000).nullish(),
  image: z.string().nullish(),
  location: z.string().trim().max(100).nullish(),
  website: z.string().max(2_000).nullish(),
  photoUrls: z.array(z.string()).max(PROFILE_MAX_PHOTOS),
});

// PUT /api/profile/avatar
export const updateAvatarBodySchema = z.object({
  image: z.string().nullable(),
});
