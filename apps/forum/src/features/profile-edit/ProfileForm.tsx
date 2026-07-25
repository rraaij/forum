import { Avatar } from "@forum/ui";
import { Show } from "solid-js";
import type { EditableProfile } from "./api";
import type { ProfileEditor } from "./use-profile-editor";

type ProfileFormProps = {
  profile: EditableProfile;
  editor: ProfileEditor;
};

/*
 * Identity, avatar, and the editable text fields. Field rules are enforced
 * by the server; this form only collects values and reports what the
 * server said.
 */
export function ProfileForm(props: ProfileFormProps) {
  const fields = () => props.editor.fields;

  return (
    <section class="card border border-base-content/10 bg-base-100 shadow-sm">
      <div class="card-body gap-4">
        <div class="flex flex-wrap items-center gap-4">
          <Avatar
            src={fields().image()}
            name={fields().displayName() || props.profile.username}
            size="lg"
          />
          <div class="space-y-1">
            <p class="text-lg font-bold">{props.profile.username}</p>
            <p class="text-sm text-base-content/60">{props.profile.email}</p>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <label
                class="btn btn-outline btn-xs"
                for="profile-avatar"
                aria-disabled={props.editor.savingAvatar()}
              >
                Change avatar
              </label>
              <input
                id="profile-avatar"
                type="file"
                class="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={props.editor.savingAvatar()}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void props.editor.chooseAvatar(file);
                }}
              />
              <Show when={fields().image()}>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  disabled={props.editor.savingAvatar()}
                  onClick={() => void props.editor.removeAvatar()}
                >
                  Remove avatar
                </button>
              </Show>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="form-control gap-1">
            <span class="label-text text-xs font-semibold">Display name</span>
            <input
              type="text"
              class="input input-bordered input-sm w-full"
              value={fields().displayName()}
              onInput={(event) =>
                fields().setDisplayName(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </label>

          <label class="form-control gap-1">
            <span class="label-text text-xs font-semibold">Date of birth</span>
            <input
              type="date"
              class="input input-bordered input-sm w-full"
              value={fields().dateOfBirth()}
              onInput={(event) =>
                fields().setDateOfBirth(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </label>

          <label class="form-control gap-1">
            <span class="label-text text-xs font-semibold">Location</span>
            <input
              type="text"
              class="input input-bordered input-sm w-full"
              value={fields().location()}
              onInput={(event) =>
                fields().setLocation(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </label>

          <label class="form-control gap-1">
            <span class="label-text text-xs font-semibold">Website</span>
            <input
              type="url"
              class="input input-bordered input-sm w-full"
              placeholder="https://example.com"
              value={fields().website()}
              onInput={(event) =>
                fields().setWebsite(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </label>

          <label class="form-control gap-1 sm:col-span-2">
            <span class="label-text text-xs font-semibold">About me</span>
            <textarea
              class="textarea textarea-bordered w-full"
              rows={4}
              value={fields().profileText()}
              onInput={(event) =>
                fields().setProfileText(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
