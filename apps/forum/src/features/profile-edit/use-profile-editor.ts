import { createSignal } from "solid-js";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { setProfileAvatarPreview } from "@/lib/profile-avatar";
import { userFacingError } from "@/lib/user-facing-error";
import { type EditableProfile, saveAvatar, saveProfile } from "./api";
import { MAX_PHOTOS, readImageFile } from "./image-file-policy";

/*
 * Profile editor controller (plan section 7.2). Owns form state, mutation
 * state, and the header avatar preview, so the route component stays a
 * thin shell and the header integration no longer depends on route-local
 * mutation details.
 *
 * Invalidation is narrow on purpose: avatar and display name are the only
 * values the rest of the app mirrors, and those come from the session, so
 * a session refetch is enough. No global route invalidation.
 */
export function createProfileEditor(initial: () => EditableProfile) {
  const session = useSession();

  const [displayName, setDisplayName] = createSignal(
    initial().displayName ?? "",
  );
  const [dateOfBirth, setDateOfBirth] = createSignal(
    initial().dateOfBirth ?? "",
  );
  const [profileText, setProfileText] = createSignal(
    initial().profileText ?? "",
  );
  const [location, setLocation] = createSignal(initial().location ?? "");
  const [website, setWebsite] = createSignal(initial().website ?? "");
  const [image, setImage] = createSignal<string | null>(initial().image);
  const [photoUrls, setPhotoUrls] = createSignal<string[]>(
    initial().photoUrls ?? [],
  );

  const [saving, setSaving] = createSignal(false);
  const [savingAvatar, setSavingAvatar] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [errorField, setErrorField] = createSignal<
    "dateOfBirth" | "website" | null
  >(null);
  const [success, setSuccess] = createSignal<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setErrorField(null);
    setSuccess(null);
  };

  const profileError = (error: unknown, fallback: string) => {
    if (
      error instanceof ApiError &&
      (error.code === "INVALID_INPUT" || error.code === "INVALID_PROFILE_FIELD")
    ) {
      if (error.field === "website") {
        return "Website moet een geldig adres zijn dat begint met http:// of https://.";
      }
      if (error.field === "dateOfBirth") {
        return "Controleer je geboortedatum.";
      }
      return "Controleer je profielgegevens en probeer het opnieuw.";
    }
    return userFacingError(error, fallback);
  };

  /** Refreshes only what the rest of the UI mirrors: the session. */
  const refreshSessionDerivedUi = async () => {
    await session().refetch();
    // The optimistic header preview has served its purpose once the session
    // carries the saved image.
    setProfileAvatarPreview(undefined);
  };

  const chooseAvatar = async (file: File) => {
    clearMessages();
    setSavingAvatar(true);
    try {
      const dataUrl = await readImageFile(file);
      // Preview immediately in the header, then persist.
      setProfileAvatarPreview(dataUrl);
      const saved = await saveAvatar(dataUrl);
      setImage(saved.image);
      await refreshSessionDerivedUi();
      setSuccess("Avatar bijgewerkt.");
    } catch (avatarError) {
      setProfileAvatarPreview(undefined);
      setError(
        avatarError instanceof Error
          ? avatarError.message
          : "De avatar kon niet worden opgeslagen.",
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    clearMessages();
    setSavingAvatar(true);
    try {
      setProfileAvatarPreview(null);
      await saveAvatar(null);
      setImage(null);
      await refreshSessionDerivedUi();
      setSuccess("Avatar verwijderd.");
    } catch (avatarError) {
      setProfileAvatarPreview(undefined);
      setError(
        profileError(avatarError, "De avatar kon niet worden verwijderd."),
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  const addPhotos = async (files: File[]) => {
    clearMessages();
    const availableSlots = MAX_PHOTOS - photoUrls().length;
    if (availableSlots <= 0) {
      setError(`Een profiel kan maximaal ${MAX_PHOTOS} foto's bevatten.`);
      return;
    }
    try {
      const accepted = await Promise.all(
        files.slice(0, availableSlots).map(readImageFile),
      );
      setPhotoUrls((current) => [...current, ...accepted]);
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : "De foto kon niet worden gelezen.",
      );
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((current) => current.filter((_, i) => i !== index));
  };

  const save = async () => {
    clearMessages();
    setSaving(true);
    try {
      /*
       * Every field is sent on every save: this is a replacement command,
       * so anything omitted here would be cleared server-side.
       */
      const saved = await saveProfile({
        displayName: displayName() || null,
        dateOfBirth: dateOfBirth() || null,
        profileText: profileText() || null,
        image: image(),
        location: location() || null,
        website: website() || null,
        photoUrls: photoUrls(),
      });
      setImage(saved.image);
      setPhotoUrls(saved.photoUrls ?? []);
      await refreshSessionDerivedUi();
      setSuccess("Profiel opgeslagen.");
    } catch (saveError) {
      setErrorField(
        saveError instanceof ApiError &&
          (saveError.field === "website" || saveError.field === "dateOfBirth")
          ? saveError.field
          : null,
      );
      setError(
        profileError(saveError, "Het profiel kon niet worden opgeslagen."),
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    fields: {
      displayName,
      setDisplayName,
      dateOfBirth,
      setDateOfBirth,
      profileText,
      setProfileText,
      location,
      setLocation,
      website,
      setWebsite,
      image,
      photoUrls,
    },
    saving,
    savingAvatar,
    error,
    errorField,
    success,
    clearMessages,
    chooseAvatar,
    removeAvatar,
    addPhotos,
    removePhoto,
    save,
  };
}

export type ProfileEditor = ReturnType<typeof createProfileEditor>;
