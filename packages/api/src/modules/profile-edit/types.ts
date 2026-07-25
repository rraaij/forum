/*
 * Profile edit contract (refactor plan section 5.4). Implementation arrives
 * in Phase 6. updateProfile has REPLACEMENT semantics: omitted optional
 * fields become null, matching the characterized current behavior. Password
 * changes stay in Better Auth and are not part of this module.
 */

export interface EditableProfile {
  /** Better Auth name, exposed read-only; never writable here. */
  username: string;
  email: string;
  displayName: string | null;
  dateOfBirth: string | null;
  profileText: string | null;
  image: string | null;
  location: string | null;
  website: string | null;
  photoUrls: string[];
}

export interface UpdateProfileInput {
  userId: string;
  displayName?: string | null;
  dateOfBirth?: string | null;
  profileText?: string | null;
  image?: string | null;
  location?: string | null;
  website?: string | null;
  photoUrls: string[];
}

export interface UpdateAvatarInput {
  userId: string;
  image: string | null;
}

export interface ProfileEdit {
  getProfile(userId: string): Promise<EditableProfile>;
  updateProfile(input: UpdateProfileInput): Promise<EditableProfile>;
  updateAvatar(input: UpdateAvatarInput): Promise<{ image: string | null }>;
}
