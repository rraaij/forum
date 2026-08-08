import type { JSX } from "solid-js";
import { Show, splitProps } from "solid-js";

export type EmptyStateProps = Omit<JSX.HTMLAttributes<HTMLElement>, "title"> & {
  kicker?: JSX.Element;
  title: JSX.Element;
  description: JSX.Element;
  action?: JSX.Element;
};

export function EmptyState(props: EmptyStateProps) {
  const [local, rest] = splitProps(props, [
    "kicker",
    "title",
    "description",
    "action",
    "class",
  ]);

  return (
    <section
      {...rest}
      class={`border border-brand-300 bg-base-100 p-[30px] text-base-content ${local.class ?? ""}`}
    >
      <Show when={local.kicker}>
        <p class="mb-3 text-[11.5px] font-bold tracking-[0.06em] text-brand-700 uppercase">
          {local.kicker}
        </p>
      </Show>
      <h4 class="text-[21px] leading-tight font-semibold">{local.title}</h4>
      <p class="mt-2 max-w-[42ch] leading-relaxed text-brand-800">
        {local.description}
      </p>
      <Show when={local.action}>
        <div class="mt-4">{local.action}</div>
      </Show>
    </section>
  );
}
