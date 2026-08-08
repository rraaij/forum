import type { JSX, ParentProps } from "solid-js";
import { createUniqueId, Show, splitProps } from "solid-js";

export interface FieldProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: JSX.Element;
  for?: string;
  hint?: JSX.Element;
  error?: JSX.Element;
  hintId?: string;
  errorId?: string;
  required?: boolean;
}

export function Field(props: ParentProps<FieldProps>) {
  const [local, rest] = splitProps(props, [
    "label",
    "for",
    "hint",
    "error",
    "hintId",
    "errorId",
    "required",
    "class",
    "children",
  ]);
  const id = createUniqueId();
  const hintId = () => local.hintId ?? `${id}-hint`;
  const errorId = () => local.errorId ?? `${id}-error`;

  return (
    <div
      {...rest}
      class={`grid gap-1.5 [&_.input]:w-full [&_.input]:rounded-none [&_.input]:border-brand-300 [&_.input]:bg-base-100 [&_.select]:w-full [&_.select]:rounded-none [&_.select]:border-brand-300 [&_.select]:bg-base-100 [&_.textarea]:w-full [&_.textarea]:rounded-none [&_.textarea]:border-brand-300 [&_.textarea]:bg-base-100 ${local.class ?? ""}`}
      data-invalid={local.error ? "true" : undefined}
    >
      <label
        for={local.for}
        class="text-[12px] font-bold tracking-[0.05em] text-brand-700 uppercase"
      >
        {local.label}
        <Show when={local.required}>
          <span class="ml-1 text-primary" aria-hidden="true">
            *
          </span>
        </Show>
      </label>
      {local.children}
      <Show when={local.hint && !local.error}>
        <p id={hintId()} class="text-[12px] text-brand-700">
          {local.hint}
        </p>
      </Show>
      <Show when={local.error}>
        <p
          id={errorId()}
          role="alert"
          class="text-[12px] font-semibold text-error"
        >
          {local.error}
        </p>
      </Show>
    </div>
  );
}
