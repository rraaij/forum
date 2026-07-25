/*
 * Profile edit commands (refactor plan section 5.4).
 *
 * updateProfile has REPLACEMENT semantics, deliberately: every editable
 * field is written on every call, so an omitted field becomes null. It is
 * not a partial patch, and the HTTP method (PUT) says so. updateAvatar is
 * separate precisely so selecting an image can update author imagery
 * everywhere without committing unrelated in-progress form edits.
 *
 * Password changes stay in Better Auth and are not part of this module.
 */

import { profileUserNotFound } from "./errors";
import { normalizeGallery, optionalImage, optionalUrl } from "./image-policy";
import { toEditableProfile } from "./mapper";
import type { ProfileEditStore } from "./repository";
import type { EditableProfile, ProfileEdit, UpdateProfileInput } from "./types";
import {
  DISPLAY_NAME_MAX,
  LOCATION_MAX,
  normalizeDateOfBirth,
  optionalText,
  PROFILE_TEXT_MAX,
} from "./validation";

export function createProfileEdit(store: ProfileEditStore): ProfileEdit {
  return {
    async getProfile(userId: string): Promise<EditableProfile> {
      const user = await store.findUser(userId);
      if (!user) throw profileUserNotFound();
      return toEditableProfile(user);
    },

    async updateProfile(input: UpdateProfileInput): Promise<EditableProfile> {
      /*
       * Validate EVERYTHING before writing anything: a bad final gallery
       * item must not leave the other profile fields partially updated.
       */
      const dateOfBirth = normalizeDateOfBirth(input.dateOfBirth);
      const photoUrls = normalizeGallery(input.photoUrls);
      const displayName = optionalText(
        input.displayName,
        "Display name",
        "displayName",
        DISPLAY_NAME_MAX,
      );
      const profileText = optionalText(
        input.profileText,
        "Profile text",
        "profileText",
        PROFILE_TEXT_MAX,
      );
      const location = optionalText(
        input.location,
        "Location",
        "location",
        LOCATION_MAX,
      );
      const website = optionalUrl(input.website, "Website", "website");
      const image = optionalImage(input.image, "Avatar", "image");

      const updated = await store.updateUser(input.userId, {
        displayName,
        dateOfBirth,
        profileText,
        image,
        location,
        website,
        photoUrls,
        updatedAt: new Date(),
      });
      if (!updated) throw profileUserNotFound();
      return toEditableProfile(updated);
    },

    async updateAvatar(input): Promise<{ image: string | null }> {
      const image = optionalImage(input.image, "Avatar", "image");
      const updated = await store.updateUser(input.userId, {
        image,
        updatedAt: new Date(),
      });
      if (!updated) throw profileUserNotFound();
      return { image: updated.image };
    },
  };
}
