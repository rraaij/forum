import type { JSX } from "solid-js";
import { createMemo, For, Show } from "solid-js";

type PaginationItem = number | "ellipsis";

export interface PaginationProps {
  currentPage?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  busy?: boolean;
  summary?: JSX.Element;
  previousLabel?: string;
  nextLabel?: string;
  ariaLabel?: string;
  class?: string;
}

function getPageItems(
  currentPage: number,
  pageCount: number,
): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", pageCount];
  }

  if (currentPage >= pageCount - 3) {
    return [
      1,
      "ellipsis",
      pageCount - 4,
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    pageCount,
  ];
}

export function Pagination(props: PaginationProps) {
  const pageItems = createMemo(() => {
    const currentPage = props.currentPage;
    const pageCount = props.pageCount;
    if (currentPage === undefined || pageCount === undefined || pageCount < 1) {
      return [];
    }
    return getPageItems(
      Math.min(Math.max(currentPage, 1), pageCount),
      pageCount,
    );
  });

  // Explicit availability props support opaque cursor pagination. Numbered
  // pages infer availability from their current position when totals exist.
  const canGoPrevious = () =>
    props.hasPrevious ??
    (props.currentPage !== undefined
      ? props.currentPage > 1
      : Boolean(props.onPrevious));
  const canGoNext = () =>
    props.hasNext ??
    (props.currentPage !== undefined && props.pageCount !== undefined
      ? props.currentPage < props.pageCount
      : Boolean(props.onNext));

  return (
    <nav
      aria-label={props.ariaLabel ?? "Paginering"}
      aria-busy={props.busy || undefined}
      class={`flex flex-wrap items-center gap-1 border-t-2 border-base-content py-4 ${props.class ?? ""}`}
    >
      <button
        type="button"
        class="min-h-11 px-3 text-sm font-semibold text-base-content transition-colors hover:bg-base-300 disabled:opacity-40 sm:min-h-[34px]"
        disabled={!canGoPrevious() || props.busy}
        onClick={() => props.onPrevious?.()}
      >
        ← {props.previousLabel ?? "Vorige"}
      </button>

      <For each={pageItems()}>
        {(item) => (
          <Show
            when={item !== "ellipsis" && item}
            fallback={
              <span
                class="inline-flex size-11 items-center justify-center text-brand-700 sm:size-[34px]"
                aria-hidden="true"
              >
                …
              </span>
            }
          >
            {(page) => {
              const isCurrent = () => page() === props.currentPage;
              return (
                <button
                  type="button"
                  class="inline-flex size-11 items-center justify-center rounded-none border text-sm transition-colors sm:size-[34px]"
                  classList={{
                    "border-primary bg-primary font-extrabold text-primary-content":
                      isCurrent(),
                    "border-brand-300 bg-base-300 font-semibold text-base-content hover:border-primary hover:bg-primary hover:text-primary-content":
                      !isCurrent(),
                  }}
                  aria-current={isCurrent() ? "page" : undefined}
                  aria-label={`Pagina ${page()}`}
                  disabled={isCurrent() || props.busy || !props.onPageChange}
                  onClick={() => props.onPageChange?.(page())}
                >
                  {page()}
                </button>
              );
            }}
          </Show>
        )}
      </For>

      <button
        type="button"
        class="min-h-11 bg-base-300 px-3 text-sm font-semibold text-base-content transition-colors hover:bg-primary hover:text-primary-content disabled:opacity-40 sm:min-h-[34px]"
        disabled={!canGoNext() || props.busy}
        onClick={() => props.onNext?.()}
      >
        {props.nextLabel ?? "Volgende"} →
      </button>

      <Show when={props.summary}>
        <p class="ml-auto pl-3 text-[12.5px] text-brand-700">{props.summary}</p>
      </Show>
    </nav>
  );
}
