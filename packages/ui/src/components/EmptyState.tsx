import type { JSX } from "solid-js";
import { children, Show, splitProps } from "solid-js";
import { StateHeading, type StateHeadingLevel } from "./StateHeading";

export type EmptyStateProps = Omit<JSX.HTMLAttributes<HTMLElement>, "title"> & {
  kicker?: JSX.Element;
  title: JSX.Element;
  description: JSX.Element;
  action?: JSX.Element;
  headingLevel?: StateHeadingLevel;
};

export function EmptyState(props: EmptyStateProps) {
  const [local, rest] = splitProps(props, [
    "kicker",
    "title",
    "description",
    "action",
    "headingLevel",
    "class",
  ]);
  // JSX-valued props are getters in Solid. Resolve the optional subtree once
  // so Show's condition and content cannot create and detach separate nodes.
  const action = children(() => local.action);

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
      <StateHeading
        level={local.headingLevel}
        class="text-[21px] leading-tight font-semibold"
      >
        {local.title}
      </StateHeading>
      <p class="mt-2 max-w-[42ch] text-[14.5px] leading-[1.55] text-brand-800">
        {local.description}
      </p>
      <Show when={action()}>
        <div class="mt-4">{action()}</div>
      </Show>
    </section>
  );
}
