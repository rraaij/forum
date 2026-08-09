import { X } from "lucide-solid";
import { Show } from "solid-js";

/*
 * Renders the immutable quote snapshot returned by the API (plan section
 * 4.3). Later edits or deletion of the source post never change what is
 * shown here — the snapshot is the record.
 */
type QuoteSnapshotProps = {
  authorName: string;
  content: string;
  onRemove?: () => void;
};

export function QuoteSnapshot(props: QuoteSnapshotProps) {
  return (
    <blockquote class="relative border-l-4 border-accent bg-base-300 px-4 py-3 text-brand-800">
      <Show when={props.onRemove}>
        {(onRemove) => (
          <button
            type="button"
            class="absolute top-1 right-1 min-h-11 min-w-11 text-sm font-bold text-brand-700 hover:text-primary"
            onClick={onRemove()}
            aria-label="Quote verwijderen"
          >
            <X aria-hidden="true" class="mx-auto size-4" strokeWidth={2} />
          </button>
        )}
      </Show>
      <p class="pr-7 text-[11.5px] text-base-content md:text-[13px]">
        <strong class="font-bold">{props.authorName}</strong> schreef:
      </p>
      <p class="mt-1 max-w-[70ch] whitespace-pre-wrap text-[13.5px] leading-[1.5] [overflow-wrap:anywhere] md:text-sm md:leading-[1.55]">
        {props.content}
      </p>
    </blockquote>
  );
}
