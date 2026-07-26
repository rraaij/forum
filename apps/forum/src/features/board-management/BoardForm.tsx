import { createSignal, Show } from "solid-js";
import type { BoardFields } from "./api";

type BoardFormProps = {
  title: string;
  submitLabel: string;
  initial?: Partial<BoardFields>;
  disabled?: boolean;
  onSubmit: (fields: BoardFields) => Promise<void>;
  onCancel?: () => void;
};

/*
 * One form for both creation and editing. It only collects and submits
 * fields — normalization and uniqueness are server-side domain rules, so
 * this component deliberately does not pre-validate slugs or casing.
 */
export function BoardForm(props: BoardFormProps) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [slug, setSlug] = createSignal(props.initial?.slug ?? "");
  const [abbreviation, setAbbreviation] = createSignal(
    props.initial?.abbreviation ?? "",
  );
  const [description, setDescription] = createSignal(
    props.initial?.description ?? "",
  );
  const [icon, setIcon] = createSignal(props.initial?.icon ?? "");
  const [sortOrder, setSortOrder] = createSignal(
    String(props.initial?.sortOrder ?? 0),
  );

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    await props.onSubmit({
      name: name(),
      slug: slug(),
      abbreviation: abbreviation(),
      description: description() || null,
      icon: icon() || null,
      sortOrder: Number(sortOrder()) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-3">
      <h3 class="font-bold">{props.title}</h3>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Name</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            placeholder="General Discussion"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
            disabled={props.disabled}
            required
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Slug</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            placeholder="general-discussion"
            value={slug()}
            onInput={(event) => setSlug(event.currentTarget.value)}
            disabled={props.disabled}
            required
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">
            Abbreviation (max 5)
          </span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            placeholder="GEN"
            maxLength={5}
            value={abbreviation()}
            onInput={(event) => setAbbreviation(event.currentTarget.value)}
            disabled={props.disabled}
            required
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Sort order</span>
          <input
            type="number"
            min="0"
            class="input input-bordered input-sm w-full"
            value={sortOrder()}
            onInput={(event) => setSortOrder(event.currentTarget.value)}
            disabled={props.disabled}
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Icon</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            placeholder="💬"
            value={icon()}
            onInput={(event) => setIcon(event.currentTarget.value)}
            disabled={props.disabled}
          />
        </label>

        <label class="form-control gap-1 sm:col-span-2">
          <span class="label-text text-xs font-semibold">Description</span>
          <textarea
            class="textarea textarea-bordered textarea-sm w-full"
            rows={2}
            value={description() ?? ""}
            onInput={(event) => setDescription(event.currentTarget.value)}
            disabled={props.disabled}
          />
        </label>
      </div>

      <div class="flex justify-end gap-2">
        <Show when={props.onCancel}>
          {(onCancel) => (
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              onClick={onCancel()}
              disabled={props.disabled}
            >
              Cancel
            </button>
          )}
        </Show>
        <button
          type="submit"
          class="btn btn-primary btn-sm"
          disabled={props.disabled}
        >
          {props.submitLabel}
        </button>
      </div>
    </form>
  );
}
