import { Link } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show } from "solid-js";
import type { TopicSummary } from "@/types/forum";

type OpenTopicsProps = {
  topics: TopicSummary[];
  categorySlug: string;
  subcategorySlug?: string;
};

type TopicSort = "default" | "newest" | "replies" | "views";

/*
 * Keep timestamp formatting beside the table that displays it. Both category
 * and subcategory pages now use this component, so neither route needs to
 * maintain its own date-label implementation.
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

export default function TopicsList(props: OpenTopicsProps) {
  /*
   * Sorting belongs to this component rather than the route. This keeps a
   * user's table choice from changing any sibling data or page-level state.
   */
  const [sort, setSort] = createSignal<TopicSort>("default");

  /*
   * Sticky topics remain visually separate, but they now live in the same
   * table as open topics. Their server-defined order is preserved so pinned
   * announcements do not unexpectedly move when open-topic sorting changes.
   */
  const pinnedTopics = createMemo(() =>
    props.topics.filter((topic) => topic.isPinned),
  );

  const openTopics = createMemo(() => {
    const topics = props.topics.filter((topic) => !topic.isPinned);

    /*
     * Copy before sorting because route loader data is shared and should be
     * treated as immutable. Each option therefore affects only this table.
     */
    return [...topics].sort((left, right) => {
      switch (sort()) {
        case "newest":
          return (
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
          );
        case "replies":
          return right.postCount - left.postCount;
        case "views":
          return right.viewCount - left.viewCount;
        default:
          return 0;
      }
    });
  });

  const topicLink = (topic: TopicSummary, pinned = false) => (
    /*
     * The single dynamic topic route accepts either a real subforum slug or
     * the reserved `topics` segment for topics directly under a category.
     */
    <Link
      to="/$category/$sub/$topic"
      params={{
        category: props.categorySlug,
        sub: props.subcategorySlug ?? "topics",
        topic: topic.slug,
      }}
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

  const topicRow = (topic: TopicSummary, pinned = false) => (
    <tr>
      <td>{topicLink(topic, pinned)}</td>
      <td>{topic.authorName ?? "Unknown"}</td>
      <td class="text-right">{Math.max(0, topic.postCount - 1)}</td>
      <td class="text-right">{topic.viewCount}</td>
      <td class="text-sm text-base-content/70">
        {formatDateTime(topic.lastPostAt ?? topic.createdAt)}
      </td>
    </tr>
  );

  return (
    <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
      <div class="overflow-x-auto">
        <table class="table table-zebra">
          {/*
           * A caption makes the controls structurally part of this table. Their
           * state is also local to OpenTopics, so no choice leaks into sibling
           * sections or route-level data.
           */}
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
    </section>
  );
}
