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
    <blockquote class="relative rounded-sm border border-slate-200 bg-slate-100 px-5 py-3 text-slate-700">
      <Show when={props.onRemove}>
        {(onRemove) => (
          <button
            type="button"
            class="btn btn-ghost btn-xs absolute right-1 top-1 text-slate-500"
            onClick={onRemove()}
            aria-label="Remove quoted post"
          >
            ×
          </button>
        )}
      </Show>
      <p class="whitespace-pre-wrap pr-5 text-sm leading-relaxed">
        <span aria-hidden="true">“</span>
        {props.content}
        <span aria-hidden="true">”</span>
      </p>
      <footer class="mt-1 text-xs font-semibold text-slate-500">
        — {props.authorName}
      </footer>
    </blockquote>
  );
}
