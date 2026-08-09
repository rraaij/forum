import { Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import type { Breadcrumb } from "@/features/forum-read/api";

type ForumBreadcrumbsProps = {
  breadcrumbs: Breadcrumb[];
  currentTitle?: string;
};

export function ForumBreadcrumbs(props: ForumBreadcrumbsProps) {
  const rootSlug = () => props.breadcrumbs[0]?.slug ?? "";

  return (
    <ol class="flex min-w-0 flex-wrap items-center gap-x-2 sm:min-w-max sm:flex-nowrap">
      <li>
        <Link to="/" class="inline-flex min-h-11 items-center">
          Forum
        </Link>
      </li>
      <For each={props.breadcrumbs}>
        {(crumb, index) => {
          const isCurrent = () =>
            !props.currentTitle && index() === props.breadcrumbs.length - 1;

          return (
            <li class="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" class="text-brand-500">
                ›
              </span>
              <Show
                when={!isCurrent()}
                fallback={
                  <span
                    aria-current="page"
                    class="min-w-0 font-bold [overflow-wrap:anywhere]"
                  >
                    {crumb.name}
                  </span>
                }
              >
                <Show
                  when={crumb.isRoot}
                  fallback={
                    <Link
                      to="/categories/$categorySlug/subcategories/$boardId"
                      params={{
                        categorySlug: rootSlug(),
                        boardId: crumb.boardId,
                      }}
                      class="inline-flex min-h-11 min-w-0 items-center [overflow-wrap:anywhere]"
                    >
                      {crumb.name}
                    </Link>
                  }
                >
                  <Link
                    to="/categories/$categorySlug"
                    params={{ categorySlug: crumb.slug }}
                    class="inline-flex min-h-11 min-w-0 items-center [overflow-wrap:anywhere]"
                  >
                    {crumb.name}
                  </Link>
                </Show>
              </Show>
            </li>
          );
        }}
      </For>
      <Show when={props.currentTitle}>
        {(title) => (
          <li class="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" class="text-brand-500">
              ›
            </span>
            <span
              aria-current="page"
              class="min-w-0 font-bold [overflow-wrap:anywhere]"
            >
              {title()}
            </span>
          </li>
        )}
      </Show>
    </ol>
  );
}
