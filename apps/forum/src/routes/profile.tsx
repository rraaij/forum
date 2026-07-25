import { Avatar } from "@forum/ui";
import { createFileRoute, Link, useRouter } from "@tanstack/solid-router";
import {
  createEffect,
  createResource,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { apiFetch } from "@/lib/api";
import { changePassword, useSession } from "@/lib/auth-client";
import { setProfileAvatarPreview } from "@/lib/profile-avatar";
import type { UserPostActivity, UserProfile } from "@/types/forum";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

const MAX_PHOTOS = 12;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function readImageFile(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error("Choose a JPEG, PNG, WebP, or GIF image."));
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(new Error(`${file.name} is larger than 2 MB.`));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(`${file.name} could not be read.`));
    };
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });
}

function ActivityTopicLink(props: { activity: UserPostActivity }) {
  const [previewPosition, setPreviewPosition] = createSignal<{
    top: number;
    left: number;
  }>();

  const showPreview = (trigger: HTMLElement) => {
    const bounds = trigger.getBoundingClientRect();
    const previewWidth = 384;
    const renderedWidth = Math.min(previewWidth, window.innerWidth - 24);
    const estimatedHeight = 220;
    const left = Math.max(
      12,
      Math.min(bounds.left, window.innerWidth - renderedWidth - 12),
    );
    const top =
      bounds.bottom + estimatedHeight + 8 > window.innerHeight
        ? Math.max(12, bounds.top - estimatedHeight - 8)
        : bounds.bottom + 8;

    setPreviewPosition({ top, left });
  };

  return (
    <>
      <Show
        when={props.activity.categorySlug}
        fallback={
          <button
            type="button"
            class="font-semibold"
            onMouseEnter={(event) => showPreview(event.currentTarget)}
            onMouseLeave={() => setPreviewPosition(undefined)}
            onFocus={(event) => showPreview(event.currentTarget)}
            onBlur={() => setPreviewPosition(undefined)}
            aria-describedby={`post-preview-${props.activity.postId}`}
          >
            {props.activity.topicTitle}
          </button>
        }
      >
        {(categorySlug) => (
          /*
           * TEMPORARY bridge until Phase 7 moves profile activity onto the
           * ProfileActivity module. The legacy endpoint still returns
           * category/subcategory slugs, but topic slugs are globally unique
           * and the topic loader resolves by slug alone, so the canonical
           * root-topic path renders the right topic. Phase 7 replaces this
           * with backend-supplied canonical route params.
           */
          <Link
            to="/categories/$categorySlug/topics/$topicSlug"
            params={{
              categorySlug: categorySlug(),
              topicSlug: props.activity.topicSlug,
            }}
            class="font-semibold text-info hover:underline"
            onMouseEnter={(event) => showPreview(event.currentTarget)}
            onMouseLeave={() => setPreviewPosition(undefined)}
            onFocus={(event) => showPreview(event.currentTarget)}
            onBlur={() => setPreviewPosition(undefined)}
            aria-describedby={`post-preview-${props.activity.postId}`}
          >
            {props.activity.topicTitle}
          </Link>
        )}
      </Show>

      <Show when={previewPosition()}>
        {(position) => (
          <Portal>
            {/*
             * Portaling keeps the hover modal above the table's horizontal
             * scroller. Pointer events remain disabled so it cannot trap the
             * cursor or interfere with clicking the topic link beneath it.
             */}
            <aside
              id={`post-preview-${props.activity.postId}`}
              role="tooltip"
              class="pointer-events-none fixed z-50 w-96 max-w-[calc(100vw-1.5rem)] rounded-sm border border-base-content/15 bg-base-100 p-4 text-left shadow-2xl"
              style={{
                top: `${position().top}px`,
                left: `${position().left}px`,
              }}
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <strong class="text-sm">{props.activity.topicTitle}</strong>
                <span class="badge badge-ghost badge-sm">
                  {props.activity.isTopicStart ? "Opening post" : "Reply"}
                </span>
              </div>
              <p
                classList={{
                  "max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed": true,
                  "italic text-base-content/55": props.activity.postDeleted,
                  "text-base-content/80": !props.activity.postDeleted,
                }}
              >
                {props.activity.postDeleted
                  ? "This post has been deleted."
                  : props.activity.postContent}
              </p>
            </aside>
          </Portal>
        )}
      </Show>
    </>
  );
}

function ChangePasswordDialog(props: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handlePasswordChange = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword().length < 8) {
      setError("The new password must contain at least 8 characters.");
      return;
    }
    if (newPassword() !== confirmPassword()) {
      setError("The new passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePassword({
        currentPassword: currentPassword(),
        newPassword: newPassword(),
        // Keep the user's other signed-in devices active.
        revokeOtherSessions: false,
      });

      if (result.error) {
        throw new Error(result.error.message || "Password change failed.");
      }

      // Never retain password values in component state after a successful
      // credential change.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      props.onSuccess();
    } catch (passwordError) {
      setError(
        passwordError instanceof Error
          ? passwordError.message
          : "The password could not be changed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      class="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div class="modal-box rounded-sm">
        <h2 id="change-password-title" class="text-xl font-bold">
          Change password
        </h2>
        <p class="mt-1 text-sm text-base-content/60">
          Confirm your existing password before choosing a new one.
        </p>

        <form onSubmit={handlePasswordChange} class="mt-5 space-y-4">
          <label class="form-control">
            <span class="label-text mb-1 font-semibold">Current password</span>
            <input
              type="password"
              class="input input-bordered w-full"
              autocomplete="current-password"
              value={currentPassword()}
              onInput={(event) => {
                setCurrentPassword(event.currentTarget.value);
                setError(null);
              }}
              disabled={submitting()}
              required
            />
          </label>

          <label class="form-control">
            <span class="label-text mb-1 font-semibold">New password</span>
            <input
              type="password"
              class="input input-bordered w-full"
              autocomplete="new-password"
              minlength="8"
              value={newPassword()}
              onInput={(event) => {
                setNewPassword(event.currentTarget.value);
                setError(null);
              }}
              disabled={submitting()}
              required
            />
          </label>

          <label class="form-control">
            <span class="label-text mb-1 font-semibold">
              Confirm new password
            </span>
            <input
              type="password"
              class="input input-bordered w-full"
              autocomplete="new-password"
              minlength="8"
              value={confirmPassword()}
              onInput={(event) => {
                setConfirmPassword(event.currentTarget.value);
                setError(null);
              }}
              disabled={submitting()}
              required
            />
          </label>

          <Show when={error()}>
            {(message) => (
              <div class="alert alert-error py-2 text-sm" role="alert">
                <span>{message()}</span>
              </div>
            )}
          </Show>
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={props.onClose}
              disabled={submitting()}
            >
              Close
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={submitting()}
            >
              {submitting() ? (
                <span class="loading loading-spinner loading-sm" />
              ) : (
                "Update password"
              )}
            </button>
          </div>
        </form>
      </div>

      <button
        type="button"
        class="modal-backdrop"
        aria-label="Close change password dialog"
        onClick={props.onClose}
      />
    </div>
  );
}

function ProfilePage() {
  const router = useRouter();
  const session = useSession();
  const user = () => session().data?.user;

  /*
   * Fetch only after Better Auth has resolved an authenticated user. Keeping
   * this browser-side also ensures apiFetch can send the active session cookie.
   */
  const [profile, { mutate }] = createResource(
    () => user()?.id,
    () => apiFetch<UserProfile>("/profile"),
  );
  const [activity] = createResource(
    () => user()?.id,
    () => apiFetch<UserPostActivity[]>("/profile/activity"),
  );

  const [displayName, setDisplayName] = createSignal("");
  const [dateOfBirth, setDateOfBirth] = createSignal("");
  const [profileText, setProfileText] = createSignal("");
  const [image, setImage] = createSignal("");
  const [persistedImage, setPersistedImage] = createSignal("");
  const [location, setLocation] = createSignal("");
  const [website, setWebsite] = createSignal("");
  const [photoUrls, setPhotoUrls] = createSignal<string[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [avatarSaving, setAvatarSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [saved, setSaved] = createSignal(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = createSignal(false);
  const [passwordToastVisible, setPasswordToastVisible] = createSignal(false);
  let passwordToastTimer: ReturnType<typeof setTimeout> | undefined;

  // Do not let an unsaved avatar selection leak into other pages after the
  // profile editor unmounts. Saved images remain available via the session.
  onCleanup(() => {
    setProfileAvatarPreview(undefined);
    if (passwordToastTimer) clearTimeout(passwordToastTimer);
  });

  const handlePasswordChanged = () => {
    setPasswordDialogOpen(false);
    setPasswordToastVisible(true);

    // Restart the dismissal window if another successful change occurs before
    // an earlier toast has disappeared.
    if (passwordToastTimer) clearTimeout(passwordToastTimer);
    passwordToastTimer = setTimeout(
      () => setPasswordToastVisible(false),
      4_000,
    );
  };

  // Hydrate the form whenever a different signed-in user's profile is loaded.
  createEffect(() => {
    const loadedProfile = profile();
    if (!loadedProfile) return;

    setDisplayName(loadedProfile.displayName ?? "");
    setDateOfBirth(loadedProfile.dateOfBirth ?? "");
    setProfileText(loadedProfile.profileText ?? "");
    setImage(loadedProfile.image ?? "");
    setPersistedImage(loadedProfile.image ?? "");
    setLocation(loadedProfile.location ?? "");
    setWebsite(loadedProfile.website ?? "");
    setPhotoUrls(loadedProfile.photoUrls);
  });

  const persistAvatar = async (nextImage: string) => {
    setAvatarSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updatedProfile = await apiFetch<UserProfile>("/profile/avatar", {
        method: "PATCH",
        body: JSON.stringify({ image: nextImage }),
      });

      setImage(updatedProfile.image ?? "");
      setPersistedImage(updatedProfile.image ?? "");
      await Promise.all([session().refetch(), router.invalidate()]);
      setProfileAvatarPreview(undefined);
      setSaved(true);
    } catch (submissionError) {
      // Roll an optimistic header preview back to the last database value.
      setImage(persistedImage());
      setProfileAvatarPreview(undefined);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The avatar could not be saved.",
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleAvatarSelection = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const selectedImage = await readImageFile(file);
      setImage(selectedImage);
      // The persistent header reacts immediately, before the user clicks Save.
      setProfileAvatarPreview(selectedImage);
      await persistAvatar(selectedImage);
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "The avatar could not be read.",
      );
    } finally {
      // Reset so selecting the same file again still triggers a change event.
      input.value = "";
    }
  };

  const handlePhotoSelection = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    const availableSlots = MAX_PHOTOS - photoUrls().length;
    if (files.length > availableSlots) {
      setError(`You can add ${availableSlots} more photo(s).`);
      input.value = "";
      return;
    }

    try {
      // File reads are independent, so process a multi-select in parallel.
      const selectedPhotos = await Promise.all(files.map(readImageFile));
      setPhotoUrls((current) => [...current, ...selectedPhotos]);
      setError(null);
      setSaved(false);
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "The selected photos could not be read.",
      );
    } finally {
      input.value = "";
    }
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updatedProfile = await apiFetch<UserProfile>("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName(),
          dateOfBirth: dateOfBirth(),
          profileText: profileText(),
          image: image(),
          location: location(),
          website: website(),
          photoUrls: photoUrls(),
        }),
      });

      // Keep the resource and every preview synchronized with normalized values
      // returned by the server after a successful save.
      mutate(updatedProfile);
      setPersistedImage(updatedProfile.image ?? "");
      /*
       * Refresh Better Auth's cached user for the persistent header and clear
       * stale route data so topic and post author avatars use the database
       * value on their next render.
       */
      await Promise.all([session().refetch(), router.invalidate()]);
      setProfileAvatarPreview(undefined);
      setSaved(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The profile could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Show
      when={!session().isPending}
      fallback={
        <div class="flex justify-center py-16">
          <span class="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <Show
        when={user()}
        fallback={
          <section class="mx-auto max-w-lg rounded-sm border border-base-content/10 bg-base-100 p-8 text-center shadow">
            <h1 class="text-2xl font-bold">Sign in to edit your profile</h1>
            <p class="mt-2 text-base-content/65">
              Profile settings are available only to the account owner.
            </p>
            <Link to="/auth/sign-in" class="btn btn-primary mt-5">
              Sign In
            </Link>
          </section>
        }
      >
        <div class="mx-auto max-w-5xl space-y-4">
          <div>
            <h1 class="text-3xl font-black">Your profile</h1>
            <p class="text-sm text-base-content/65">
              Manage how other forum members see you.
            </p>
          </div>

          <Show
            when={profile()}
            fallback={
              <div class="flex justify-center py-16">
                <span class="loading loading-spinner loading-lg" />
              </div>
            }
          >
            {(loadedProfile) => (
              <form onSubmit={handleSubmit} class="space-y-4">
                <div class="space-y-4">
                  {/* Profile fields are grouped by identity, biography, and media. */}
                  <section class="rounded-sm border border-base-content/10 bg-base-100 p-5 shadow-sm">
                    <h2 class="mb-4 text-lg font-bold">Account identity</h2>
                    <div class="grid gap-5 sm:grid-cols-[112px_minmax(0,1fr)]">
                      <div class="flex flex-col items-center gap-2">
                        {/*
                         * The hidden file input is activated by its label, so
                         * the avatar itself is the compact, obvious selector.
                         */}
                        <label
                          for="profile-avatar"
                          class="group cursor-pointer text-center"
                          title="Choose a new avatar"
                        >
                          <span class="relative inline-block">
                            <Avatar
                              src={image()}
                              name={displayName() || loadedProfile().username}
                              size="lg"
                              class="rounded-full ring-2 ring-base-content/15 ring-offset-2 ring-offset-base-100 transition group-hover:ring-primary/60"
                            />
                            <span class="absolute inset-x-0 bottom-0 rounded-b-full bg-black/60 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                              Change
                            </span>
                          </span>
                          <span class="mt-2 block text-xs text-base-content/55">
                            Click to select
                          </span>
                        </label>
                        <input
                          id="profile-avatar"
                          type="file"
                          class="sr-only"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleAvatarSelection}
                          disabled={avatarSaving()}
                        />
                        <Show when={image()}>
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs"
                            disabled={avatarSaving()}
                            onClick={() => {
                              setImage("");
                              setProfileAvatarPreview(null);
                              void persistAvatar("");
                            }}
                          >
                            Remove
                          </button>
                        </Show>
                      </div>

                      <div class="grid gap-4 sm:grid-cols-2">
                        <label class="form-control">
                          <span class="label-text mb-1 font-semibold">
                            Username
                          </span>
                          <input
                            class="input input-bordered w-full bg-base-200"
                            value={loadedProfile().username}
                            readOnly
                            aria-describedby="username-help"
                          />
                          <span
                            id="username-help"
                            class="mt-1 text-xs text-base-content/55"
                          >
                            Your username cannot be changed.
                          </span>
                        </label>

                        <label class="form-control">
                          <span class="label-text mb-1 font-semibold">
                            Email
                          </span>
                          <input
                            class="input input-bordered w-full bg-base-200"
                            value={loadedProfile().email}
                            readOnly
                          />
                        </label>

                        <label class="form-control">
                          <span class="label-text mb-1 font-semibold">
                            Display name
                          </span>
                          <input
                            class="input input-bordered w-full"
                            maxlength="80"
                            value={displayName()}
                            onInput={(event) => {
                              setDisplayName(event.currentTarget.value);
                              setSaved(false);
                            }}
                          />
                        </label>

                        <label class="form-control">
                          <span class="label-text mb-1 font-semibold">
                            Date of birth
                          </span>
                          <input
                            type="date"
                            class="input input-bordered w-full"
                            max={new Date().toISOString().slice(0, 10)}
                            value={dateOfBirth()}
                            onInput={(event) => {
                              setDateOfBirth(event.currentTarget.value);
                              setSaved(false);
                            }}
                          />
                        </label>

                        <div class="sm:col-span-2">
                          <button
                            type="button"
                            class="link link-primary text-sm font-semibold"
                            onClick={() => setPasswordDialogOpen(true)}
                          >
                            Change password
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section class="rounded-sm border border-base-content/10 bg-base-100 p-5 shadow-sm">
                    <h2 class="mb-4 text-lg font-bold">About you</h2>
                    <div class="space-y-4">
                      <label class="form-control">
                        <span class="label-text mb-1 font-semibold">
                          Profile text
                        </span>
                        <textarea
                          class="textarea textarea-bordered min-h-36 w-full"
                          maxlength="2000"
                          placeholder="Tell the forum a little about yourself..."
                          value={profileText()}
                          onInput={(event) => {
                            setProfileText(event.currentTarget.value);
                            setSaved(false);
                          }}
                        />
                        <span class="mt-1 text-right text-xs text-base-content/50">
                          {profileText().length}/2000
                        </span>
                      </label>

                      <div class="grid gap-4 sm:grid-cols-2">
                        <label class="form-control">
                          <span class="label-text mb-1 font-semibold">
                            Location
                          </span>
                          <input
                            class="input input-bordered w-full"
                            maxlength="100"
                            value={location()}
                            onInput={(event) => {
                              setLocation(event.currentTarget.value);
                              setSaved(false);
                            }}
                          />
                        </label>

                        <label class="form-control">
                          <span class="label-text mb-1 font-semibold">
                            Website
                          </span>
                          <input
                            type="url"
                            class="input input-bordered w-full"
                            placeholder="https://example.com"
                            value={website()}
                            onInput={(event) => {
                              setWebsite(event.currentTarget.value);
                              setSaved(false);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  <section class="rounded-sm border border-base-content/10 bg-base-100 p-5 shadow-sm">
                    <h2 class="mb-1 text-lg font-bold">Photos</h2>
                    <p class="mb-4 text-sm text-base-content/60">
                      Select up to 12 images. Each image may be at most 2 MB and
                      will be saved in the database with your profile.
                    </p>

                    <input
                      type="file"
                      class="file-input file-input-bordered w-full"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handlePhotoSelection}
                      disabled={photoUrls().length >= MAX_PHOTOS}
                    />

                    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <For each={photoUrls()}>
                        {(photoUrl, index) => (
                          <figure class="group relative aspect-square overflow-hidden rounded-sm border border-base-content/10 bg-base-200">
                            <img
                              src={photoUrl}
                              alt={`Profile gallery item ${index() + 1}`}
                              class="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              class="btn btn-error btn-xs absolute right-2 top-2 opacity-90"
                              onClick={() => {
                                setPhotoUrls((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index(),
                                  ),
                                );
                                setSaved(false);
                              }}
                            >
                              Remove
                            </button>
                          </figure>
                        )}
                      </For>
                    </div>
                  </section>

                  <Show when={error()}>
                    {(message) => (
                      <div class="alert alert-error" role="alert">
                        <span>{message()}</span>
                      </div>
                    )}
                  </Show>
                  <Show when={saved()}>
                    <div class="alert alert-success" role="status">
                      <span>Your profile has been saved.</span>
                    </div>
                  </Show>

                  <button
                    type="submit"
                    class="btn btn-primary"
                    disabled={saving() || avatarSaving()}
                  >
                    {saving() ? (
                      <span class="loading loading-spinner loading-sm" />
                    ) : (
                      "Save profile"
                    )}
                  </button>
                </div>
              </form>
            )}
          </Show>

          <Show when={passwordDialogOpen()}>
            <ChangePasswordDialog
              onClose={() => setPasswordDialogOpen(false)}
              onSuccess={handlePasswordChanged}
            />
          </Show>

          <section class="overflow-hidden rounded-sm border border-base-content/10 bg-base-100 shadow-sm">
            <div class="border-b border-base-content/10 px-5 py-4">
              <h2 class="text-lg font-bold">Your posts and topics</h2>
              <p class="text-sm text-base-content/60">
                Every contribution you have made, newest first.
              </p>
            </div>

            <Show
              when={activity()}
              fallback={
                <div class="flex justify-center py-10">
                  <span class="loading loading-spinner loading-md" />
                </div>
              }
            >
              {(items) => (
                <div class="overflow-x-auto">
                  <table class="table table-zebra">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Topic</th>
                        <th>Topic created</th>
                        <th>Post placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For
                        each={items()}
                        fallback={
                          <tr>
                            <td
                              colspan="4"
                              class="py-10 text-center text-base-content/60"
                            >
                              You have not posted anything yet.
                            </td>
                          </tr>
                        }
                      >
                        {(item) => (
                          <tr>
                            <td>
                              <span
                                class={
                                  item.isTopicStart
                                    ? "badge badge-primary whitespace-nowrap"
                                    : "badge badge-ghost"
                                }
                              >
                                {item.isTopicStart ? "Topic started" : "Reply"}
                              </span>
                            </td>
                            <td class="min-w-52">
                              <ActivityTopicLink activity={item} />
                            </td>
                            <td class="whitespace-nowrap text-sm">
                              {formatDateTime(item.topicCreatedAt)}
                            </td>
                            <td class="whitespace-nowrap text-sm">
                              {formatDateTime(item.postCreatedAt)}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              )}
            </Show>
          </section>

          <Show when={passwordToastVisible()}>
            <div class="toast toast-top toast-end z-[70]">
              <div class="alert alert-success shadow-lg" role="status">
                <span>Your password has been changed.</span>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </Show>
  );
}
