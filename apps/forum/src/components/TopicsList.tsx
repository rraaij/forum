import { Avatar } from "@forum/ui";
import { Link } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show } from "solid-js";
import type { TopicListItem } from "@/features/forum-read/api";
import { topicLinkProps } from "@/features/forum-read/topic-link";

type TopicsListProps = {
  topics: TopicListItem[];
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
};

type TopicSort = "default" | "newest" | "replies" | "views";

/*
 * Keep timestamp formatting beside the table that displays it. Every board
 * page uses this component, so no route maintains its own date labels.
 */
const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No activity yet";

export default function TopicsList(props: TopicsListProps) {
  /*
   * Sorting belongs to this component rather than the route. It only
   * rearranges the currently accumulated page items.
   */
  const [sort, setSort] = createSignal<TopicSort>("default");

  const pinnedTopics = createMemo(() =>
    props.topics.filter((topic) => topic.isPinned),
  );

  const openTopics = createMemo(() => {
    const topics = props.topics.filter((topic) => !topic.isPinned);
    return [...topics].sort((left, right) => {
      switch (sort()) {
        case "newest":
          return (
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
          );
        case "replies":
          return right.replyCount - left.replyCount;
        case "views":
          return right.viewCount - left.viewCount;
        default:
          return 0;
      }
    });
  });

  const topicLink = (topic: TopicListItem, pinned = false) => (
    /*
     * The backend read model supplies canonical route params: direct root-
     * board topics use the category path, nested-board topics the UUID
     * subcategory path. Links never reproduce hierarchy rules.
     */
    <Link
      {...topicLinkProps(topic.routeParams)}
      class={
        pinned
          ? "font-bold text-info hover:underline"
          : "font-semibold text-info hover:underline"
      }
    >
      <Show when={pinned}>
        <span class="badge badge-secondary mr-2">Pinned</span>
      </Show>
      <Show when={topic.isLocked}>
        <span class="badge badge-warning mr-2">Locked</span>
      </Show>
      {topic.title}
    </Link>
  );

  const topicRow = (topic: TopicListItem, pinned = false) => (
    <tr>
      <td>{topicLink(topic, pinned)}</td>
      <td>
        <div class="flex items-center gap-2">
          <Avatar
            src={topic.author.image}
            name={topic.author.displayName ?? topic.author.name}
            size="xs"
            class="shrink-0 rounded-full ring-1 ring-base-content/10"
          />
          <span>
            {topic.author.displayName ?? topic.author.name ?? "Unknown"}
          </span>
        </div>
      </td>
      <td class="text-right">{topic.replyCount}</td>
      <td class="text-right">{topic.viewCount}</td>
      <td class="text-sm text-base-content/70">
        {formatDateTime(topic.lastActivityAt)}
      </td>
    </tr>
  );

  return (
    <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
      <div class="overflow-x-auto">
        <table class="table table-zebra">
          <caption class="caption-top border-b border-base-content/10 bg-base-100 px-4 py-3 text-left">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="btn btn-sm btn-neutral">
                  custom menu
                </button>
                <button type="button" class="btn btn-sm btn-ghost">
                  abonnement
                </button>
                <button type="button" class="btn btn-sm btn-ghost">
                  actieve topics
                </button>
                <button type="button" class="btn btn-sm btn-ghost">
                  nieuwe topics
                </button>
              </div>

              <select
                class="select select-sm w-44"
                value={sort()}
                onChange={(event) =>
                  setSort(event.currentTarget.value as TopicSort)
                }
                aria-label="Sorteer topics"
              >
                <option value="default">Meer / minder topics</option>
                <option value="newest">Nieuwste eerst</option>
                <option value="replies">Meeste reacties</option>
                <option value="views">Meeste views</option>
              </select>
            </div>
          </caption>

          <Show when={pinnedTopics().length > 0}>
            <thead class="bg-secondary/10 text-[11px] uppercase tracking-wide">
              <tr>
                <th>Sticky topics</th>
                <th>topicstarter</th>
                <th class="text-right">reacties</th>
                <th class="text-right">views</th>
                <th>laatste reactie</th>
              </tr>
            </thead>
            <tbody>
              <For each={pinnedTopics()}>
                {(topic) => topicRow(topic, true)}
              </For>
            </tbody>
          </Show>

          <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
            <tr>
              <th>Open topics</th>
              <th>topicstarter</th>
              <th class="text-right">reacties</th>
              <th class="text-right">views</th>
              <th>laatste reactie</th>
            </tr>
          </thead>
          <tbody>
            <For
              each={openTopics()}
              fallback={
                <tr>
                  <td colspan="5" class="py-8 text-center text-base-content/60">
                    No topics yet. Start the first discussion in this board.
                  </td>
                </tr>
              }
            >
              {(topic) => topicRow(topic)}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={props.nextCursor}>
        <div class="flex justify-center border-t border-base-content/10 py-3">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            onClick={() => void props.onLoadMore()}
            disabled={props.loadingMore}
          >
            {props.loadingMore ? (
              <span class="loading loading-spinner loading-xs" />
            ) : (
              "Load more topics"
            )}
          </button>
        </div>
      </Show>
    </section>
  );
}
