import { Tag } from "@forum/ui";
import { For, Show } from "solid-js";
import { RelativeTime } from "@/components/RelativeTime";
import { ActivityTopicLink } from "./ActivityTopicLink";
import type { ProfileActivity } from "./api";

export function ActivityPanel(props: {
  activity: ProfileActivity | undefined;
}) {
  // The profile is a summary surface; the reference deliberately shows the
  // three most recent rows rather than an unbounded activity archive.
  const items = () => (props.activity ?? []).slice(0, 3);

  return (
    <section
      aria-label="Wat je laatst deed"
      class="bg-base-100 px-7 py-6 sm:px-[30px]"
    >
      <h2 class="text-[18px] font-semibold">Wat je laatst deed</h2>

      <Show
        when={items().length > 0}
        fallback={
          <p class="mt-4 text-sm text-brand-700">
            Nog niets gedaan. Dat is ook weleens lekker.
          </p>
        }
      >
        <ul class="mt-4">
          <For each={items()}>
            {(item) => (
              <li
                data-activity-item
                class="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-brand-300 py-3 transition-colors last:border-b-0 hover:bg-base-200 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <Tag>{item.postKind === "opening" ? "topic" : "reactie"}</Tag>
                <span class="min-w-0 truncate text-[15px]">
                  <ActivityTopicLink activity={item} />
                </span>
                <RelativeTime
                  value={item.postCreatedAt}
                  class="col-start-2 whitespace-nowrap text-[12.5px] text-brand-700 sm:col-start-auto"
                />
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}
