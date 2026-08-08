import { Avatar, Button, EmptyState, Tag } from "@forum/ui";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";
import { type BoardTreeNode, fetchForumIndex } from "@/features/forum-read/api";
import { topicLinkProps } from "@/features/forum-read/topic-link";

export const Route = createFileRoute("/")({
  // One page-oriented request; the loader may run on server or client.
  loader: () => fetchForumIndex(),
  component: Home,
});

interface BoardChip {
  board: BoardTreeNode;
  categorySlug: string;
}

interface RecentActivity {
  topicId: string;
  topicTitle: string;
  at: string;
  routeParams: NonNullable<BoardTreeNode["latestActivity"]>["routeParams"];
  boardName: string;
  boardAbbreviation: string;
  boardTopicCount: number;
}

const categoryDescriptions: Partial<Record<string, string>> = {
  general: "Kennismaken, klagen over het weer, en alles daartussenin.",
  technology: "Van bundlers tot bouwen: code, hardware en de serverkast.",
  meta: "Wat kapot is en wat er nog bij mag — over het forum zelf.",
};

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

function formatRelativeTime(value: string): string {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1_000),
  );

  if (elapsedSeconds < 60) return "net";
  if (elapsedSeconds < 3_600) {
    return `${Math.floor(elapsedSeconds / 60)} min geleden`;
  }
  if (elapsedSeconds < 86_400) {
    return `${Math.floor(elapsedSeconds / 3_600)} uur geleden`;
  }
  if (elapsedSeconds < 172_800) return "gisteren";

  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function formatClockTime(value: string): string {
  return new Date(value).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Home() {
  const index = Route.useLoaderData();
  const categories = () => index().categories;

  const boardChips = createMemo(() =>
    categories().flatMap((category) =>
      flattenBoards(category.children, category.slug),
    ),
  );

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
          boardAbbreviation: board.abbreviation,
          boardTopicCount: board.totalTopicCount,
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
    <div class="-mx-4 -my-2 bg-base-200 text-base-content">
      <section class="px-6 py-9 sm:px-10 sm:py-10">
        <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p class="text-[13.5px] text-brand-700">
              Goedemorgen — er zijn{" "}
              <strong class="font-extrabold text-flame-700">
                17 nieuwe reacties
              </strong>{" "}
              sinds je laatste bezoek.
            </p>
            <h1 class="mt-2 max-w-[13ch] text-[42px] leading-[0.98] font-semibold tracking-[-0.02em] text-wrap-balance sm:text-[54px]">
              Waar wil je vandaag rondkijken?
            </h1>
          </div>

          <div class="max-w-[38ch] lg:pb-1">
            <p class="text-[15.5px] leading-relaxed text-brand-800">
              Drie categorieën, twaalf subforums, één heel lange donderdagavond
              aan meningen.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <Button variant="primary">Nieuw topic</Button>
              <Button variant="surface">Actieve topics</Button>
            </div>
          </div>
        </div>

        <Show when={boardChips().length > 0}>
          <nav aria-label="Subforums" class="mt-8 flex flex-wrap gap-1.5">
            <For each={boardChips()}>
              {({ board, categorySlug }) => (
                <Link
                  to="/categories/$categorySlug/subcategories/$boardId"
                  params={{ categorySlug, boardId: board.id }}
                  class="group"
                >
                  <Tag class="px-[11px] py-1.5 text-[12.5px] font-semibold transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-content">
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
            class="border-x-0 border-b-0"
            kicker="Forum"
            title="Nog niets hier"
            description="Er zijn nog geen categorieën. Zodra die er zijn, kun je hier rondkijken."
          />
        }
      >
        <section
          id="forum-categories"
          aria-label="Forumcategorieën"
          class="grid border-y-2 border-base-content md:grid-cols-3"
        >
          <For each={categories()}>
            {(category, categoryIndex) => {
              const subforumCount = () => countSubforums(category);
              const latestActivity = () => category.latestActivity;

              return (
                <article class="flex min-h-[232px] flex-col border-b border-brand-300 bg-base-300 px-6 py-6 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0">
                  <div class="flex items-center gap-3">
                    <Tag
                      variant="secondary"
                      class="size-[38px] shrink-0 justify-center p-0 text-base"
                    >
                      {categoryIndex() + 1}
                    </Tag>
                    <h2 class="text-[23px] leading-tight font-semibold">
                      <Link
                        to="/categories/$categorySlug"
                        params={{ categorySlug: category.slug }}
                        class="transition-colors hover:text-primary"
                      >
                        {category.name}
                      </Link>
                    </h2>
                  </div>

                  <p class="mt-3 min-h-12 text-[13.5px] leading-relaxed text-brand-800">
                    {categoryDescriptions[category.slug] ??
                      category.description ??
                      "Praat mee over alles wat in dit deel van het forum thuishoort."}
                  </p>
                  <p class="mt-3 text-[12.5px] text-brand-700">
                    {subforumCount()}{" "}
                    {subforumCount() === 1 ? "subforum" : "subforums"}
                    {" · "}
                    {category.totalTopicCount}{" "}
                    {category.totalTopicCount === 1 ? "topic" : "topics"}
                  </p>

                  <div class="mt-auto border-t border-brand-300 pt-3">
                    <Show
                      when={latestActivity()}
                      fallback={
                        <span class="text-[12.5px] text-brand-700">
                          Nog geen reacties
                        </span>
                      }
                    >
                      {(activity) => (
                        <Link
                          {...topicLinkProps(activity().routeParams)}
                          class="flex items-center gap-2 text-[12.5px] text-brand-800 transition-colors hover:text-primary"
                        >
                          <Avatar
                            name={category.abbreviation}
                            size="xs"
                            alt=""
                          />
                          <span>
                            Laatste reactie {formatRelativeTime(activity().at)}
                          </span>
                        </Link>
                      )}
                    </Show>
                  </div>
                </article>
              );
            }}
          </For>
        </section>
      </Show>

      <section id="actieve-topics" class="px-6 py-6 sm:px-10">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-[20px] font-semibold">Waar nu over gepraat wordt</h2>
          <a
            href="#forum-categories"
            class="text-[12.5px] font-medium text-primary hover:underline"
          >
            alles bekijken →
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
                  class="group grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-brand-300 py-3 last:border-b-0"
                >
                  <Avatar name={activity.boardAbbreviation} size="sm" alt="" />
                  <span class="min-w-0">
                    <span class="block truncate text-[15px] font-bold transition-colors group-hover:text-primary">
                      {activity.topicTitle}
                    </span>
                    <span class="block truncate text-[12.5px] text-brand-700">
                      in {activity.boardName} · {activity.boardTopicCount}{" "}
                      {activity.boardTopicCount === 1 ? "topic" : "topics"} ·{" "}
                      {formatRelativeTime(activity.at)}
                    </span>
                  </span>
                  <time
                    datetime={activity.at}
                    class="text-[12.5px] text-brand-800"
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
