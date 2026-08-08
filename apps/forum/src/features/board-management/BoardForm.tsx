import { Button, Field } from "@forum/ui";
import { createSignal, Show } from "solid-js";
import type { BoardFields } from "./api";

type BoardFormProps = {
  title: string;
  showTitle?: boolean;
  submitLabel: string;
  initial?: Partial<BoardFields>;
  disabled?: boolean;
  onSubmit: (fields: BoardFields) => Promise<void>;
  onCancel?: () => void;
};

/*
 * One form collects both creation and update fields. Normalization and
 * uniqueness remain server-owned domain rules; this only changes presentation.
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
    <form onSubmit={handleSubmit} class="space-y-3" aria-label={props.title}>
      <Show when={props.showTitle !== false}>
        <h2 class="text-[22px] font-semibold">{props.title}</h2>
      </Show>

      <Field label="Naam" for="board-name">
        <input
          id="board-name"
          type="text"
          class="input h-[38px]"
          placeholder="General Discussion"
          value={name()}
          onInput={(event) => setName(event.currentTarget.value)}
          disabled={props.disabled}
          required
        />
      </Field>

      <Field label="Omschrijving" for="board-description">
        <textarea
          id="board-description"
          class="textarea min-h-[70px]"
          value={description() ?? ""}
          onInput={(event) => setDescription(event.currentTarget.value)}
          disabled={props.disabled}
        />
      </Field>

      <div class="grid grid-cols-2 gap-3">
        <Field label="Slug" for="board-slug">
          <input
            id="board-slug"
            type="text"
            class="input h-[38px]"
            placeholder="general-discussion"
            value={slug()}
            onInput={(event) => setSlug(event.currentTarget.value)}
            disabled={props.disabled}
            required
          />
        </Field>

        <Field label="Afkorting (max. 5)" for="board-abbreviation">
          <input
            id="board-abbreviation"
            type="text"
            class="input h-[38px]"
            placeholder="GEN"
            maxLength={5}
            value={abbreviation()}
            onInput={(event) => setAbbreviation(event.currentTarget.value)}
            disabled={props.disabled}
            required
          />
        </Field>

        <Field label="Volgorde" for="board-sort-order">
          <input
            id="board-sort-order"
            type="number"
            min="0"
            class="input h-[38px]"
            value={sortOrder()}
            onInput={(event) => setSortOrder(event.currentTarget.value)}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Icoon" for="board-icon">
          <input
            id="board-icon"
            type="text"
            class="input h-[38px]"
            placeholder="💬"
            value={icon()}
            onInput={(event) => setIcon(event.currentTarget.value)}
            disabled={props.disabled}
          />
        </Field>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={props.disabled}
        >
          {props.submitLabel}
        </Button>
        <Show when={props.onCancel}>
          {(onCancel) => (
            <Button
              type="button"
              variant="surface"
              size="sm"
              onClick={onCancel()}
              disabled={props.disabled}
            >
              Annuleren
            </Button>
          )}
        </Show>
      </div>
    </form>
  );
}
