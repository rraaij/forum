import { Avatar, EmptyState, Tag } from "@forum/ui";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { ArrowRight } from "lucide-solid";
import { createMemo, For, Show } from "solid-js";
import { RelativeTime } from "@/components/RelativeTime";
import { type BoardTreeNode, fetchForumIndex } from "@/features/forum-read/api";
import { topicLinkProps } from "@/features/forum-read/topic-link";
import { formatClockTime } from "@/lib/date-time";

export const Route = createFileRoute("/")({
  // One page-oriented request; the loader may run on server or client.
  loader: () => fetchForumIndex(),
  component: Home,
});

interface BoardChip {
  board: BoardTreeNode;
  categorySlug: string;
}

type RecentActivity = NonNullable<BoardTreeNode["latestActivity"]> & {
  boardName: string;
};

const numberFormatter = new Intl.NumberFormat("nl-NL");

function flattenBoards(
  boards: BoardTreeNode[],
  categorySlug: string,
): BoardChip[] {
  return boards.flatMap((board) => [
    { board, categorySlug },
    ...flattenBoards(board.children, categorySlug),
  ]);
}

function countSubforums(board: BoardTreeNode): number {
  return board.children.reduce(
    (total, child) => total + 1 + countSubforums(child),
    0,
  );
}

function authorName(
  author: NonNullable<BoardTreeNode["latestActivity"]>["author"],
) {
  return author.displayName ?? author.name ?? "Onbekend";
}

function Home() {
  const index = Route.useLoaderData();
  const categories = () => index().categories;
  const firstCategory = () => categories()[0];

  const boardChips = createMemo(() =>
    categories().flatMap((category) =>
      flattenBoards(category.children, category.slug),
    ),
  );

  const forumStats = createMemo(() => ({
    categories: categories().length,
    subforums: categories().reduce(
      (total, category) => total + countSubforums(category),
      0,
    ),
    topics: categories().reduce(
      (total, category) => total + category.totalTopicCount,
      0,
    ),
  }));

  const recentActivity = createMemo(() => {
    const byTopicId = new Map<string, RecentActivity>();

    const visit = (board: BoardTreeNode) => {
      const activity = board.latestActivity;
      if (activity) {
        // Parent boards inherit their descendants' latest activity. Visiting
        // children afterwards keeps the most specific board label per topic.
        byTopicId.set(activity.topicId, {
          ...activity,
          boardName: board.name,
        });
      }
      for (const child of board.children) visit(child);
    };

    for (const category of categories()) visit(category);

    return [...byTopicId.values()]
      .sort(
        (left, right) =>
          new Date(right.at).getTime() - new Date(left.at).getTime(),
      )
      .slice(0, 4);
  });

  return (
    <div class="bg-base-200 text-base-content">
      <section class="px-4 py-5 sm:px-10 sm:pt-[34px] sm:pb-5">
        <div class="grid gap-5 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p class="text-[13.5px] text-brand-700">
              <Show
                when={recentActivity().length > 0}
                fallback="Welkom terug — het is nog rustig op het forum."
              >
                Welkom terug — {recentActivity().length}{" "}
                {recentActivity().length === 1
                  ? "recent gesprek"
                  : "recente gesprekken"}{" "}
                om bij te lezen.
              </Show>
            </p>
            <h1 class="mt-2 text-[28px] leading-[1.02] font-semibold tracking-[-0.02em] text-wrap-balance sm:max-w-[19ch] sm:text-[54px] sm:leading-[0.98]">
              Waar wil je vandaag rondkijken?
            </h1>
          </div>

          <div class="lg:max-w-[38ch] lg:pb-1">
            <p class="hidden text-[15px] leading-[1.6] text-brand-800 sm:block">
              {numberFormatter.format(forumStats().categories)}{" "}
              {forumStats().categories === 1 ? "categorie" : "categorieën"},{" "}
              {numberFormatter.format(forumStats().subforums)}{" "}
              {forumStats().subforums === 1 ? "subforum" : "subforums"} en{" "}
              {numberFormatter.format(forumStats().topics)}{" "}
              {forumStats().topics === 1 ? "topic" : "topics"} om in te
              verdwalen.
            </p>
            <div class="flex flex-wrap gap-2 sm:mt-4">
              <Show when={firstCategory()}>
                {(category) => (
                  <Link
                    to="/categories/$categorySlug"
                    params={{ categorySlug: category().slug }}
                    class="inline-flex min-h-11 w-full items-center bg-primary px-4 font-bold text-primary-content transition-colors hover:bg-brand-700 active:bg-brand-700 sm:w-auto"
                  >
                    Nieuw topic
                  </Link>
                )}
              </Show>
              <a
                href="#actieve-topics"
                class="hidden min-h-11 items-center border border-brand-300 bg-base-300 px-4 font-bold text-base-content transition-colors hover:border-primary hover:bg-primary hover:text-primary-content active:border-brand-700 active:bg-brand-700 sm:inline-flex"
              >
                Actieve topics
              </a>
            </div>
          </div>
        </div>

        <Show when={boardChips().length > 0}>
          <nav
            aria-label="Subforums"
            class="mt-8 hidden flex-wrap gap-1.5 sm:flex"
          >
            <For each={boardChips()}>
              {({ board, categorySlug }) => (
                <Link
                  to="/categories/$categorySlug/subcategories/$boardId"
                  params={{ categorySlug, boardId: board.id }}
                  class="group inline-flex min-h-11 items-center"
                >
                  <Tag class="px-[11px] py-1.5 text-[12.5px] font-semibold transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-content group-active:border-brand-700 group-active:bg-brand-700">
                    {board.name}
                  </Tag>
                </Link>
              )}
            </For>
          </nav>
        </Show>
      </section>

      <Show
        when={categories().length > 0}
        fallback={
          <EmptyState
            class="border-x-0 border-y-2 border-base-content"
            kicker="Forum"
            title="Nog niets hier"
            description="Er zijn nog geen categorieën. Zodra die er zijn, kun je hier rondkijken."
          />
        }
      >
        <section
          id="forum-categories"
          aria-label="Forumcategorieën"
          class="grid gap-px border-y-2 border-base-content bg-brand-300 lg:grid-cols-3"
        >
          <For each={categories()}>
            {(category, categoryIndex) => {
              const subforumCount = () => countSubforums(category);
              const latestActivity = () => category.latestActivity;

              return (
                <Link
                  to="/categories/$categorySlug"
                  params={{ categorySlug: category.slug }}
                  aria-label={category.name}
                  class="group flex bg-base-300 px-4 py-4 transition-colors hover:bg-base-200 lg:min-h-[232px] lg:px-6 lg:py-6"
                >
                  <article class="flex min-w-0 w-full flex-col">
                    <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <Tag
                        variant="secondary"
                        class="size-[30px] shrink-0 justify-center p-0 text-sm sm:size-[38px] sm:text-base"
                      >
                        {categoryIndex() + 1}
                      </Tag>
                      <h2 class="min-w-0 text-[20px] leading-tight font-semibold transition-colors [overflow-wrap:anywhere] group-hover:text-primary sm:text-[23px]">
                        {category.name}
                      </h2>
                    </div>

                    <p class="mt-3 hidden min-h-12 text-[14px] leading-[1.55] text-brand-800 sm:block">
                      {category.description ??
                        "Praat mee over alles wat in dit deel van het forum thuishoort."}
                    </p>
                    <p class="mt-3 text-[12.5px] text-brand-700">
                      {subforumCount()}{" "}
                      {subforumCount() === 1 ? "subforum" : "subforums"}
                      {" · "}
                      {numberFormatter.format(category.totalTopicCount)}{" "}
                      {category.totalTopicCount === 1 ? "topic" : "topics"}
                      <Show when={latestActivity()}>
                        {(activity) => (
                          <span class="sm:hidden">
                            {" · "}
                            {authorName(activity().author)},{" "}
                            <RelativeTime value={activity().at} />
                          </span>
                        )}
                      </Show>
                    </p>

                    <div class="mt-auto hidden border-t border-brand-300 pt-3 sm:block">
                      <Show
                        when={latestActivity()}
                        fallback={
                          <span class="text-[12.5px] text-brand-700">
                            Nog geen gesprekken
                          </span>
                        }
                      >
                        {(activity) => (
                          <span class="flex items-center gap-2 text-[12.5px] text-brand-800">
                            <Avatar
                              src={activity().author.image}
                              name={authorName(activity().author)}
                              size="xs"
                              alt=""
                            />
                            <span>
                              Topic van {authorName(activity().author)} ·
                              activiteit <RelativeTime value={activity().at} />
                            </span>
                          </span>
                        )}
                      </Show>
                    </div>
                  </article>
                </Link>
              );
            }}
          </For>
          <For
            each={Array.from({
              length: (3 - (categories().length % 3)) % 3,
            })}
          >
            {() => (
              <span aria-hidden="true" class="hidden bg-base-300 lg:block" />
            )}
          </For>
        </section>
      </Show>

      <section id="actieve-topics" class="px-4 py-4 sm:px-10 sm:py-6">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-[20px] font-semibold">Waar nu over gepraat wordt</h2>
          <a
            href="#forum-categories"
            class="hidden min-h-11 items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline sm:inline-flex"
          >
            alles bekijken
            <ArrowRight aria-hidden="true" size={14} strokeWidth={2} />
          </a>
        </div>

        <Show
          when={recentActivity().length > 0}
          fallback={
            <p class="mt-6 border-t border-brand-300 py-6 text-sm text-brand-700">
              Nog geen gesprekken — tijd om de eerste te beginnen.
            </p>
          }
        >
          <div class="mt-5">
            <For each={recentActivity()}>
              {(activity) => (
                <Link
                  {...topicLinkProps(activity.routeParams)}
                  class="group grid grid-cols-[32px_1fr] items-center gap-2.5 border-b border-brand-300 py-3 transition-colors last:border-b-0 hover:bg-base-200 sm:grid-cols-[32px_1fr_auto] sm:gap-3"
                >
                  <Avatar
                    src={activity.author.image}
                    name={authorName(activity.author)}
                    size="sm"
                    alt=""
                  />
                  <span class="min-w-0">
                    <span class="block truncate text-[15px] font-bold transition-colors group-hover:text-primary">
                      {activity.topicTitle}
                    </span>
                    <span class="block truncate text-[12.5px] text-brand-700">
                      <span class="hidden sm:inline">
                        {authorName(activity.author)} in{" "}
                      </span>
                      {activity.boardName} ·{" "}
                      {numberFormatter.format(activity.replyCount)}{" "}
                      {activity.replyCount === 1 ? "reactie" : "reacties"} ·{" "}
                      <RelativeTime value={activity.at} />
                    </span>
                  </span>
                  <time
                    datetime={activity.at}
                    class="hidden text-[12.5px] text-brand-800 sm:block"
                  >
                    {formatClockTime(activity.at)}
                  </time>
                </Link>
              )}
            </For>
          </div>
        </Show>
      </section>
    </div>
  );
}
