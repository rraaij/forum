import { For, Show } from "solid-js";
import { MAX_PHOTOS } from "./image-file-policy";
import type { ProfileEditor } from "./use-profile-editor";

type ProfileGalleryProps = {
  editor: ProfileEditor;
};

/*
 * Selected files become data URLs in the browser and are persisted by the
 * existing profile save. The visual add slot never bypasses server validation.
 */
export function ProfileGallery(props: ProfileGalleryProps) {
  const photos = () => props.editor.fields.photoUrls();
  const canAddPhotos = () => photos().length < MAX_PHOTOS;

  return (
    <section class="border-b border-brand-300 bg-base-100 px-7 py-6 sm:px-[30px]">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-[18px] font-semibold">Je fotoboek</h2>
        <p class="text-[12.5px] text-brand-700">
          {photos().length} van de {MAX_PHOTOS} plekken gebruikt
        </p>
      </div>

      <ul class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        <For each={photos()}>
          {(photo, index) => (
            <li class="group relative aspect-square border border-brand-300 bg-base-300">
              <img
                src={photo}
                alt={`Foto ${index() + 1}`}
                class="size-full object-cover"
              />
              <button
                type="button"
                class="absolute top-1 right-1 min-h-8 min-w-8 bg-base-content font-bold text-base-100 opacity-0 transition-colors group-focus-within:opacity-100 group-hover:opacity-100"
                aria-label={`Foto ${index() + 1} verwijderen`}
                onClick={() => props.editor.removePhoto(index())}
              >
                ×
              </button>
            </li>
          )}
        </For>

        <Show when={canAddPhotos()}>
          <li class="aspect-square">
            <label
              for="profile-photos"
              class="flex size-full cursor-pointer items-center justify-center border border-dashed border-brand-500 bg-base-100 text-[12.5px] font-medium text-brand-700 transition-colors hover:border-primary hover:bg-primary hover:text-primary-content"
              aria-disabled={!canAddPhotos()}
            >
              + toevoegen
            </label>
          </li>
        </Show>
      </ul>

      <input
        id="profile-photos"
        type="file"
        multiple
        class="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={!canAddPhotos()}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length > 0) void props.editor.addPhotos(files);
        }}
      />
    </section>
  );
}
