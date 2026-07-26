import { For, Show } from "solid-js";
import { ActivityTopicLink } from "./ActivityTopicLink";
import type { ProfileActivity } from "./api";

/*
 * Activity presentation, extracted from the profile route (plan Phase 7).
 * Every field is served by the ProfileActivity module: the post's own kind,
 * its deletion state, and the canonical link target.
 */

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ActivityPanel(props: {
  activity: ProfileActivity | undefined;
}) {
  const items = () => props.activity ?? [];

  return (
    <section class="card border border-base-content/10 bg-base-100 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="text-sm font-bold uppercase tracking-wide">Your activity</h2>
        <Show
          when={items().length > 0}
          fallback={<p class="text-sm text-base-content/60">No posts yet.</p>}
        >
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Kind</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                <For each={items()}>
                  {(item) => (
                    <tr>
                      <td>
                        <ActivityTopicLink activity={item} />
                      </td>
                      <td>
                        <span class="badge badge-ghost badge-sm">
                          {item.postKind === "opening"
                            ? "Opening post"
                            : "Reply"}
                        </span>
                      </td>
                      <td class="text-sm text-base-content/70">
                        {formatDateTime(item.postCreatedAt)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </section>
  );
}
