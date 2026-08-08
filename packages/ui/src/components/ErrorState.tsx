import type { JSX } from "solid-js";
import { Show, splitProps } from "solid-js";

export type ErrorStateProps = Omit<JSX.HTMLAttributes<HTMLElement>, "title"> & {
  kicker?: JSX.Element;
  title: JSX.Element;
  description: JSX.Element;
  action?: JSX.Element;
  code?: JSX.Element;
};

export function ErrorState(props: ErrorStateProps) {
  const [local, rest] = splitProps(props, [
    "kicker",
    "title",
    "description",
    "action",
    "code",
    "class",
  ]);

  return (
    <section
      {...rest}
      role="alert"
      class={`border border-brand-300 bg-flame-100 p-[30px] text-base-content ${local.class ?? ""}`}
    >
      <p class="mb-3 text-[11.5px] font-bold tracking-[0.06em] text-flame-700 uppercase">
        {local.kicker ?? "Fout"}
      </p>
      <h4 class="text-[21px] leading-tight font-semibold">{local.title}</h4>
      <p class="mt-2 max-w-[42ch] leading-relaxed text-flame-800">
        {local.description}
      </p>
      <Show when={local.action || local.code}>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          {local.action}
          <Show when={local.code}>
            <p class="text-[12.5px] text-flame-700">{local.code}</p>
          </Show>
        </div>
      </Show>
    </section>
  );
}
