import { Link } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";
import type { TopicSummary } from "@/types/forum";

type OpenTopicsProps = {
  topics: TopicSummary[];
  categorySlug: string;
  subcategorySlug?: string;
};

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

export default function OpenTopics(props: OpenTopicsProps) {
  /*
   * Pinned discussions have their own table on subcategory pages. Filtering
   * here ensures this shared "Open topics" section never duplicates them and
   * applies the same rule when it is rendered on a category page.
   */
  const openTopics = createMemo(() =>
    props.topics.filter((topic) => !topic.isPinned),
  );

  return (
    <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
      <div class="overflow-x-auto">
        <table class="table table-zebra">
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
              {(topic) => (
                <tr>
                  <td>
                    {/*
                     * Direct category topics have a dedicated static
                     * `/topics/` path. Subcategory topics retain their existing
                     * three-parameter route.
                     */}
                    <Show
                      when={props.subcategorySlug}
                      fallback={
                        <Link
                          to="/$category/topics/$topic"
                          params={{
                            category: props.categorySlug,
                            topic: topic.slug,
                          }}
                          class="font-semibold text-info hover:underline"
                        >
                          <Show when={topic.isLocked}>
                            <span class="badge badge-warning mr-2">Locked</span>
                          </Show>
                          {topic.title}
                        </Link>
                      }
                    >
                      {(subcategorySlug) => (
                        <Link
                          to="/$category/$sub/$topic"
                          params={{
                            category: props.categorySlug,
                            sub: subcategorySlug(),
                            topic: topic.slug,
                          }}
                          class="font-semibold text-info hover:underline"
                        >
                          <Show when={topic.isLocked}>
                            <span class="badge badge-warning mr-2">Locked</span>
                          </Show>
                          {topic.title}
                        </Link>
                      )}
                    </Show>
                  </td>
                  <td>{topic.authorName ?? "Unknown"}</td>
                  <td class="text-right">{Math.max(0, topic.postCount - 1)}</td>
                  <td class="text-right">{topic.viewCount}</td>
                  <td class="text-sm text-base-content/70">
                    {formatDateTime(topic.lastPostAt ?? topic.createdAt)}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </section>
  );
}
