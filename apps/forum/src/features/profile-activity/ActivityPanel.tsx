import { Tag } from "@forum/ui";
import { For, Show } from "solid-js";
import { ActivityTopicLink } from "./ActivityTopicLink";
import type { ProfileActivity } from "./api";

function formatRelativeTime(value: string): string {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1_000),
  );
  if (elapsedSeconds < 60) return "net";
  if (elapsedSeconds < 3_600) {
    return `${Math.floor(elapsedSeconds / 60)} min geleden`;
  }
  if (elapsedSeconds < 86_400) return "vandaag";
  if (elapsedSeconds < 172_800) return "gisteren";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function ActivityPanel(props: {
  activity: ProfileActivity | undefined;
}) {
  const items = () => props.activity ?? [];

  return (
    <section
      aria-label="Wat je laatst deed"
      class="bg-base-100 px-7 py-6 sm:px-[30px]"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-[18px] font-semibold">Wat je laatst deed</h2>
        <a href="#profile-activity" class="text-[12.5px] text-primary">
          alles bekijken →
        </a>
      </div>

      <Show
        when={items().length > 0}
        fallback={
          <p class="mt-4 text-sm text-brand-700">
            Nog niets gedaan. Dat is ook weleens lekker.
          </p>
        }
      >
        <ul id="profile-activity" class="mt-4">
          <For each={items()}>
            {(item) => (
              <li
                data-activity-item
                class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-brand-300 py-3 last:border-b-0"
              >
                <Tag
                  variant={item.postKind === "opening" ? "secondary" : "base"}
                >
                  {item.postKind === "opening" ? "topic" : "reactie"}
                </Tag>
                <span class="min-w-0 truncate text-sm">
                  <ActivityTopicLink activity={item} />
                </span>
                <time
                  datetime={item.postCreatedAt}
                  class="text-[12.5px] text-brand-700"
                >
                  {formatRelativeTime(item.postCreatedAt)}
                </time>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}
