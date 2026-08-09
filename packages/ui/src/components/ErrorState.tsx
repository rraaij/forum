import type { JSX } from "solid-js";
import { children, Show, splitProps } from "solid-js";
import { StateHeading, type StateHeadingLevel } from "./StateHeading";

export type ErrorStateProps = Omit<JSX.HTMLAttributes<HTMLElement>, "title"> & {
  kicker?: JSX.Element;
  title: JSX.Element;
  description: JSX.Element;
  action?: JSX.Element;
  code?: JSX.Element;
  headingLevel?: StateHeadingLevel;
};

export function ErrorState(props: ErrorStateProps) {
  const [local, rest] = splitProps(props, [
    "kicker",
    "title",
    "description",
    "action",
    "code",
    "headingLevel",
    "class",
  ]);
  // Resolve JSX slots once so repeated Show checks retain the same subtrees
  // during server rendering and client hydration.
  const action = children(() => local.action);
  const code = children(() => local.code);

  return (
    <section
      {...rest}
      role="alert"
      class={`border border-brand-300 bg-flame-100 p-[30px] text-base-content ${local.class ?? ""}`}
    >
      <p class="mb-3 text-[11.5px] font-bold tracking-[0.06em] text-flame-700 uppercase">
        {local.kicker ?? "Fout"}
      </p>
      <StateHeading
        level={local.headingLevel}
        class="text-[21px] leading-tight font-semibold"
      >
        {local.title}
      </StateHeading>
      <p class="mt-2 max-w-[44ch] text-[14.5px] leading-[1.55] text-flame-800">
        {local.description}
      </p>
      <Show when={action() || code()}>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          {action()}
          <Show when={code()}>
            <p class="text-[12.5px] text-flame-700">{code()}</p>
          </Show>
        </div>
      </Show>
    </section>
  );
}
