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
  const [isGuestVisible, setIsGuestVisible] = createSignal(
    props.initial?.isGuestVisible ?? true,
  );
  const [allowNewTopics, setAllowNewTopics] = createSignal(
    props.initial?.allowNewTopics ?? true,
  );

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    await props.onSubmit({
      name: name(),
      slug: slug(),
      abbreviation: abbreviation(),
      description: description() || null,
      icon: icon() || null,
      isGuestVisible: isGuestVisible(),
      allowNewTopics: allowNewTopics(),
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
          class="input min-h-11"
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

      <div class="grid gap-0">
        <label class="flex min-h-11 items-center justify-between gap-4 border-x-0 border-y border-brand-300 bg-transparent px-0 py-2 text-sm font-normal text-brand-800">
          <span>Zichtbaar voor gasten</span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            checked={isGuestVisible()}
            onChange={(event) => setIsGuestVisible(event.currentTarget.checked)}
            disabled={props.disabled}
          />
        </label>
        <label class="flex min-h-11 items-center justify-between gap-4 border-x-0 border-t-0 border-b border-brand-300 bg-transparent px-0 py-2 text-sm font-normal text-brand-800">
          <span>Nieuwe topics toegestaan</span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            checked={allowNewTopics()}
            onChange={(event) => setAllowNewTopics(event.currentTarget.checked)}
            disabled={props.disabled}
          />
        </label>
      </div>

      <details class="border-t border-brand-300 pt-3" open={!props.initial}>
        <summary class="min-h-11 cursor-pointer py-3 text-sm font-bold text-primary">
          Geavanceerd
        </summary>
        <div class="grid gap-3 sm:grid-cols-2">
          <Field label="Slug" for="board-slug">
            <input
              id="board-slug"
              type="text"
              class="input min-h-11"
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
              class="input min-h-11"
              placeholder="GEN"
              maxLength={5}
              value={abbreviation()}
              onInput={(event) => setAbbreviation(event.currentTarget.value)}
              disabled={props.disabled}
              required
            />
          </Field>

          <Field label="Icoon" for="board-icon">
            <input
              id="board-icon"
              type="text"
              class="input min-h-11"
              placeholder="💬"
              value={icon()}
              onInput={(event) => setIcon(event.currentTarget.value)}
              disabled={props.disabled}
            />
          </Field>
        </div>
      </details>

      <div class="flex flex-wrap gap-2 pt-1">
        <Button
          type="submit"
          variant="primary"
          class="min-h-11"
          loading={props.disabled}
        >
          {props.submitLabel}
        </Button>
        <Show when={props.onCancel}>
          {(onCancel) => (
            <Button
              type="button"
              variant="surface"
              class="min-h-11"
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
