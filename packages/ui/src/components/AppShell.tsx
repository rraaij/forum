import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";

export interface AppShellProps {
  brand: JSX.Element;
  navigation: JSX.Element;
  account?: JSX.Element;
  unreadCount?: number;
  secondary?: JSX.Element;
  mobileMenu?: JSX.Element;
  navigationLabel?: string;
  secondaryLabel?: string;
  class?: string;
}

export function AppShell(props: ParentProps<AppShellProps>) {
  return (
    <div class={props.class}>
      <header>
        <div
          class="flex min-h-[50px] items-stretch bg-neutral text-neutral-content"
          classList={{ "border-b-2 border-base-content": !props.secondary }}
        >
          <div class="flex shrink-0 items-center border-r border-ink-600 px-[18px] py-[13px] text-base font-black">
            {props.brand}
          </div>

          <nav
            aria-label={props.navigationLabel ?? "Apps"}
            class="hidden items-stretch sm:flex [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:px-[14px] [&_a]:text-[13.5px] [&_a]:font-medium [&_a]:text-ink-300 [&_a]:transition-colors [&_a:hover]:text-neutral-content [&_a[aria-current=page]]:font-bold [&_a[aria-current=page]]:text-flame-400"
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
            {props.account}
            <Show when={props.mobileMenu}>
              <div class="flex min-h-11 min-w-11 items-center justify-center sm:hidden">
                {props.mobileMenu}
              </div>
            </Show>
          </div>
        </div>

        <Show when={props.secondary}>
          <nav
            aria-label={props.secondaryLabel ?? "Section navigation"}
            class="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2 border-b-2 border-base-content bg-base-300 px-[18px] py-[9px] text-[13.5px] text-base-content [&_a]:transition-colors [&_a:hover]:text-primary [&_a[aria-current=page]]:font-bold [&_a[aria-current=page]]:text-primary"
          >
            {props.secondary}
          </nav>
        </Show>
      </header>
      {props.children}
    </div>
  );
}
