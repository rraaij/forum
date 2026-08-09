import { Avatar } from "@forum/ui";
import { Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import type { BoardSummary } from "@/features/forum-read/api";
import { RelativeTime } from "./RelativeTime";

type ForumGridProps = {
  categorySlug: string;
  boards: BoardSummary[];
};

const numberFormatter = new Intl.NumberFormat("nl-NL");

function authorName(board: BoardSummary) {
  const author = board.latestActivity?.author;
  return author?.displayName ?? author?.name ?? "Onbekend";
}

export default function ForumGrid(props: ForumGridProps) {
  return (
    <section
      aria-labelledby="subforums-heading"
      class="border-b-2 border-base-content"
    >
      <div class="flex items-end justify-between gap-4 px-4 py-4 sm:px-10">
        <div>
          <p class="text-[11.5px] font-bold tracking-[0.06em] text-brand-700 uppercase">
            Verder kijken
          </p>
          <h2 id="subforums-heading" class="mt-1 text-[22px] font-semibold">
            Subforums
          </h2>
        </div>
        <p class="text-[12.5px] text-brand-700">
          {props.boards.length}{" "}
          {props.boards.length === 1 ? "subforum" : "subforums"}
        </p>
      </div>

      <div class="grid gap-px border-t border-brand-300 bg-brand-300 sm:grid-cols-2 lg:grid-cols-3">
        <For each={props.boards}>
          {(board) => (
            <Link
              to="/categories/$categorySlug/subcategories/$boardId"
              params={{ categorySlug: props.categorySlug, boardId: board.id }}
              aria-label={board.name}
              class="group flex min-h-11 bg-base-300 px-4 py-4 transition-colors hover:bg-base-200 sm:min-h-[176px] sm:px-6 sm:py-5"
            >
              <article class="flex min-w-0 w-full flex-col">
                <div class="flex min-w-0 items-center gap-3">
                  <Avatar name={board.abbreviation} size="sm" alt="" />
                  <h3 class="min-w-0 text-[19px] leading-tight font-semibold transition-colors [overflow-wrap:anywhere] group-hover:text-primary">
                    {board.name}
                  </h3>
                </div>

                <Show when={board.description}>
                  {(description) => (
                    <p class="mt-3 line-clamp-2 text-[14px] leading-[1.55] text-brand-800">
                      {description()}
                    </p>
                  )}
                </Show>

                <p class="mt-3 text-[12.5px] text-brand-700 sm:mt-auto sm:border-t sm:border-brand-300 sm:pt-3">
                  {numberFormatter.format(board.totalTopicCount)}{" "}
                  {board.totalTopicCount === 1 ? "topic" : "topics"}
                  <Show when={board.latestActivity}>
                    {(activity) => (
                      <>
                        {" · "}
                        {authorName(board)},{" "}
                        <RelativeTime value={activity().at} />
                      </>
                    )}
                  </Show>
                </p>
              </article>
            </Link>
          )}
        </For>
        <Show when={props.boards.length % 2 === 1}>
          <span
            aria-hidden="true"
            class="hidden bg-base-300 sm:block lg:hidden"
          />
        </Show>
        <For
          each={Array.from({
            length: (3 - (props.boards.length % 3)) % 3,
          })}
        >
          {() => (
            <span aria-hidden="true" class="hidden bg-base-300 lg:block" />
          )}
        </For>
      </div>
    </section>
  );
}
