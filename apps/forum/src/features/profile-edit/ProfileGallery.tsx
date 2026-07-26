import { For, Show } from "solid-js";
import { MAX_PHOTOS } from "./image-file-policy";
import type { ProfileEditor } from "./use-profile-editor";

type ProfileGalleryProps = {
  editor: ProfileEditor;
};

/*
 * Photo gallery editing. Selected files become data URLs in the browser and
 * are persisted by the profile save; the server re-validates every image.
 */
export function ProfileGallery(props: ProfileGalleryProps) {
  const photos = () => props.editor.fields.photoUrls();

  return (
    <section class="card border border-base-content/10 bg-base-100 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-bold uppercase tracking-wide">
            Photos ({photos().length}/{MAX_PHOTOS})
          </h2>
          <label
            class="btn btn-outline btn-xs"
            for="profile-photos"
            aria-disabled={photos().length >= MAX_PHOTOS}
          >
            Add photos
          </label>
          <input
            id="profile-photos"
            type="file"
            multiple
            class="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={photos().length >= MAX_PHOTOS}
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (files.length > 0) void props.editor.addPhotos(files);
            }}
          />
        </div>

        <Show
          when={photos().length > 0}
          fallback={<p class="text-sm text-base-content/60">No photos yet.</p>}
        >
          <ul class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <For each={photos()}>
              {(photo, index) => (
                <li class="relative">
                  <img
                    src={photo}
                    alt={`Gallery item ${index() + 1}`}
                    class="aspect-square w-full rounded object-cover"
                  />
                  <button
                    type="button"
                    class="btn btn-circle btn-xs absolute right-1 top-1"
                    aria-label={`Remove photo ${index() + 1}`}
                    onClick={() => props.editor.removePhoto(index())}
                  >
                    ×
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </section>
  );
}
