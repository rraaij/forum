import { Avatar, Field, Tag } from "@forum/ui";
import { Show } from "solid-js";
import type { ProfileActivity } from "@/features/profile-activity/api";
import { useSession } from "@/lib/auth-client";
import type { EditableProfile } from "./api";
import type { ProfileEditor } from "./use-profile-editor";

type ProfileFormProps = {
  profile: EditableProfile;
  activity: ProfileActivity | undefined;
  editor: ProfileEditor;
};

const numberFormatter = new Intl.NumberFormat("nl-NL");

/*
 * Identity and editable fields share one grid with the gallery and activity
 * sections. The route owns that grid; this fragment contributes its left
 * sidebar and the first right-hand section without changing editor state.
 */
export function ProfileForm(props: ProfileFormProps) {
  const session = useSession();
  const fields = () => props.editor.fields;
  const user = () => session().data?.user;
  const postCount = () => props.activity?.length ?? 0;
  const topicCount = () =>
    props.activity?.filter((item) => item.postKind === "opening").length ?? 0;

  const memberSince = () => {
    const createdAt = user()?.createdAt;
    if (!createdAt) return "onbekend";
    return new Date(createdAt).toLocaleDateString("nl-NL", {
      month: "long",
      year: "numeric",
    });
  };

  const roleLabel = () => {
    const role = (user() as { role?: string } | undefined)?.role;
    if (role === "admin") return "beheerder";
    if (role === "moderator") return "moderator";
    return "lid";
  };

  return (
    <>
      <aside class="row-span-3 border-b border-brand-300 bg-base-300 px-7 py-7 md:border-r md:border-b-0">
        <Avatar
          src={fields().image()}
          name={fields().displayName() || props.profile.username}
          size="xl"
          alt=""
        />
        <p class="mt-4 text-[21px] leading-tight font-extrabold">
          {props.profile.username}
        </p>
        <p class="mt-1 break-all text-[12.5px] text-brand-700">
          {props.profile.email}
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <label
            class="btn btn-outline btn-sm rounded-none border-brand-500 font-bold shadow-none"
            for="profile-avatar"
            aria-disabled={props.editor.savingAvatar()}
          >
            Avatar kiezen
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
              class="min-h-9 px-3 text-sm font-bold text-brand-700 hover:text-primary disabled:opacity-40"
              disabled={props.editor.savingAvatar()}
              onClick={() => void props.editor.removeAvatar()}
            >
              Verwijderen
            </button>
          </Show>
        </div>

        <dl class="mt-6 space-y-3 border-t border-brand-300 pt-4 text-[13px] text-brand-800">
          <div class="flex items-center justify-between gap-4">
            <dt>lid sinds</dt>
            <dd class="font-bold text-base-content">{memberSince()}</dd>
          </div>
          <div class="flex items-center justify-between gap-4">
            <dt>posts</dt>
            <dd class="font-bold text-base-content">
              {numberFormatter.format(postCount())}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4">
            <dt>topics gestart</dt>
            <dd class="font-bold text-base-content">
              {numberFormatter.format(topicCount())}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4">
            <dt>rol</dt>
            <dd>
              <Tag variant="secondary">{roleLabel()}</Tag>
            </dd>
          </div>
        </dl>
      </aside>

      <section class="border-b border-brand-300 bg-base-100 px-7 py-6 sm:px-[30px]">
        <h2 class="text-[18px] font-semibold">Over jou</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-x-5">
          <Field label="Weergavenaam" for="profile-display-name">
            <input
              id="profile-display-name"
              type="text"
              class="input h-[38px]"
              value={fields().displayName()}
              onInput={(event) =>
                fields().setDisplayName(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </Field>

          <Field label="Geboortedatum" for="profile-date-of-birth">
            <input
              id="profile-date-of-birth"
              type="date"
              class="input h-[38px]"
              value={fields().dateOfBirth()}
              onInput={(event) =>
                fields().setDateOfBirth(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </Field>

          <Field label="Woonplaats" for="profile-location">
            <input
              id="profile-location"
              type="text"
              class="input h-[38px]"
              value={fields().location()}
              onInput={(event) =>
                fields().setLocation(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </Field>

          <Field label="Website" for="profile-website">
            <input
              id="profile-website"
              type="url"
              class="input h-[38px]"
              placeholder="https://voorbeeld.nl"
              value={fields().website()}
              onInput={(event) =>
                fields().setWebsite(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </Field>

          <Field label="Over mij" for="profile-about" class="sm:col-span-2">
            <textarea
              id="profile-about"
              class="textarea min-h-[76px]"
              value={fields().profileText()}
              onInput={(event) =>
                fields().setProfileText(event.currentTarget.value)
              }
              disabled={props.editor.saving()}
            />
          </Field>
        </div>
      </section>
    </>
  );
}
