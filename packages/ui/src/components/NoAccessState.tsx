import type { JSX } from "solid-js";
import { children, Show, splitProps } from "solid-js";
import { StateHeading, type StateHeadingLevel } from "./StateHeading";

export type NoAccessStateProps = Omit<
  JSX.HTMLAttributes<HTMLElement>,
  "title"
> & {
  kicker?: JSX.Element;
  title: JSX.Element;
  description: JSX.Element;
  action?: JSX.Element;
  secondaryAction?: JSX.Element;
  headingLevel?: StateHeadingLevel;
};

export function NoAccessState(props: NoAccessStateProps) {
  const [local, rest] = splitProps(props, [
    "kicker",
    "title",
    "description",
    "action",
    "secondaryAction",
    "headingLevel",
    "class",
  ]);
  // Resolve JSX slots once so the condition and rendered content share nodes
  // across SSR and hydration rather than consuming getter output twice.
  const action = children(() => local.action);
  const secondaryAction = children(() => local.secondaryAction);

  return (
    <section
      {...rest}
      class={`border border-brand-300 bg-base-300 p-[30px] text-base-content ${local.class ?? ""}`}
    >
      <p class="mb-3 text-[11.5px] font-bold tracking-[0.06em] text-brand-700 uppercase">
        {local.kicker ?? "Geen toegang"}
      </p>
      <StateHeading
        level={local.headingLevel}
        class="text-[21px] leading-tight font-semibold"
      >
        {local.title}
      </StateHeading>
      <p class="mt-2 max-w-[44ch] text-[14.5px] leading-[1.55] text-brand-800">
        {local.description}
      </p>
      <Show when={action() || secondaryAction()}>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          {action()}
          {secondaryAction()}
        </div>
      </Show>
    </section>
  );
}
