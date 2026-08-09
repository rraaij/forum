import type { JSX, ParentProps } from "solid-js";
import { children, Show } from "solid-js";

export interface AppShellProps {
  brand: JSX.Element;
  navigation: JSX.Element;
  account?: JSX.Element;
  unreadCount?: number;
  unreadBadge?: JSX.Element;
  secondary?: JSX.Element;
  secondaryAction?: JSX.Element;
  secondaryOnMobile?: boolean;
  mobileMenu?: JSX.Element;
  navigationLabel?: string;
  secondaryLabel?: string;
  class?: string;
}

export function AppShell(props: ParentProps<AppShellProps>) {
  // JSX-valued props are getters in Solid. Resolve optional slots once so
  // checking whether a slot exists does not create and detach a second DOM
  // subtree during hydration.
  const mobileMenu = children(() => props.mobileMenu);
  const secondary = children(() => props.secondary);
  const secondaryAction = children(() => props.secondaryAction);
  const unreadBadge = children(() => props.unreadBadge);

  return (
    <div class={props.class}>
      <header>
        <div
          class="flex min-h-[50px] items-stretch bg-neutral text-neutral-content"
          classList={{ "border-b-2 border-base-content": !secondary() }}
        >
          <div class="flex shrink-0 items-center border-r border-ink-600 px-[18px] text-base font-black">
            {props.brand}
          </div>

          <nav
            aria-label={props.navigationLabel ?? "Apps"}
            class="hidden items-stretch sm:flex [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:px-[14px] [&_a]:text-[13.5px] [&_a]:font-medium [&_a]:text-ink-300 [&_a]:transition-colors [&_a:hover]:text-neutral-content [&_a[aria-current]]:font-bold [&_a[aria-current]]:text-flame-400"
          >
            {props.navigation}
          </nav>

          <div class="ml-auto flex items-center gap-3 px-[14px] text-[13px] text-ink-200">
            <Show when={props.unreadCount}>
              {(count) => (
                <span class="inline-flex min-h-6 min-w-6 items-center justify-center rounded-none bg-secondary px-[7px] py-0.5 text-[11.5px] font-extrabold text-secondary-content">
                  {count()}
                </span>
              )}
            </Show>
            {unreadBadge()}
            {props.account}
            <Show when={mobileMenu()}>
              {(menu) => (
                <div class="flex min-h-11 min-w-11 items-center justify-center sm:hidden">
                  {menu()}
                </div>
              )}
            </Show>
          </div>
        </div>

        <Show when={secondary() || secondaryAction()}>
          <nav
            aria-label={props.secondaryLabel ?? "Section navigation"}
            class={`min-h-11 items-center overflow-x-auto border-b-2 border-base-content bg-base-300 px-[18px] text-[13.5px] text-base-content [&_a]:transition-colors [&_a:hover]:text-primary [&_a[aria-current]]:font-bold [&_a[aria-current]]:text-primary ${
              props.secondaryOnMobile === false ? "hidden sm:flex" : "flex"
            }`}
          >
            <Show when={secondary()}>
              {(content) => <div class="min-w-0">{content()}</div>}
            </Show>
            <Show when={secondaryAction()}>
              {(action) => <div class="ml-auto shrink-0 pl-4">{action()}</div>}
            </Show>
          </nav>
        </Show>
      </header>
      {props.children}
    </div>
  );
}
