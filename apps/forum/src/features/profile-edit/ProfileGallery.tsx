import { Plus, X } from "lucide-solid";
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

      <ul class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <For each={photos()}>
          {(photo, index) => (
            <li class="group relative aspect-square border border-brand-300 bg-base-300">
              <img
                src={photo}
                alt={`Foto ${index() + 1}`}
                class="size-full object-cover"
                width="160"
                height="160"
                loading="lazy"
                decoding="async"
              />
              <button
                type="button"
                class="absolute top-1 right-1 min-h-11 min-w-11 bg-base-content font-bold text-base-100 transition-colors sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                aria-label={`Foto ${index() + 1} verwijderen`}
                onClick={() => props.editor.removePhoto(index())}
              >
                <X aria-hidden="true" class="mx-auto size-4" strokeWidth={2} />
              </button>
            </li>
          )}
        </For>

        <Show when={canAddPhotos()}>
          <li class="aspect-square">
            <label class="relative flex size-full cursor-pointer items-center justify-center gap-1.5 overflow-hidden border border-dashed border-brand-500 bg-base-100 text-[12.5px] font-medium text-brand-700 transition-colors hover:border-primary hover:bg-primary hover:text-primary-content focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary active:border-brand-700 active:bg-brand-700">
              <Plus aria-hidden="true" size={15} strokeWidth={2} />
              toevoegen
              <input
                id="profile-photos"
                name="photos"
                type="file"
                multiple
                class="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={!canAddPhotos()}
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                  if (files.length > 0) void props.editor.addPhotos(files);
                }}
              />
            </label>
          </li>
        </Show>
      </ul>
    </section>
  );
}
