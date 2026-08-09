import { Avatar, Button, EmptyState, Tag } from "@forum/ui";
import { Link } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show } from "solid-js";
import type { TopicListItem } from "@/features/forum-read/api";
import { topicLinkProps } from "@/features/forum-read/topic-link";
import { RelativeTime } from "./RelativeTime";

type TopicsListProps = {
  topics: TopicListItem[];
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
};

type TopicSort = "default" | "newest" | "replies" | "views";

const numberFormatter = new Intl.NumberFormat("nl-NL");

function isTopicSort(value: string): value is TopicSort {
  return ["default", "newest", "replies", "views"].includes(value);
}

function authorName(topic: TopicListItem) {
  return topic.author.displayName ?? topic.author.name ?? "Onbekend";
}

export default function TopicsList(props: TopicsListProps) {
  const [sort, setSort] = createSignal<TopicSort>("default");
  const [loadError, setLoadError] = createSignal(false);

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

  const loadMore = async () => {
    setLoadError(false);
    try {
      await props.onLoadMore();
    } catch {
      setLoadError(true);
    }
  };

  const topicRow = (topic: TopicListItem, pinned = false) => (
    <li data-topic-item class="border-b border-brand-300">
      <Link
        {...topicLinkProps(topic.routeParams)}
        aria-label={topic.title}
        class="group grid min-h-11 grid-cols-[32px_1fr] items-center gap-3 px-4 py-4 transition-colors hover:bg-base-200 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:px-10"
        classList={{ "bg-flame-100": pinned, "bg-base-100": !pinned }}
      >
        <Avatar
          src={topic.author.image}
          name={authorName(topic)}
          size="sm"
          alt=""
        />
        <span class="min-w-0">
          <span class="flex flex-wrap items-center gap-2">
            <Show when={pinned}>
              <Tag variant="secondary">Vastgepind</Tag>
            </Show>
            <Show when={topic.isLocked}>
              <Tag>Gesloten</Tag>
            </Show>
            <span class="min-w-0 truncate text-[15px] font-bold transition-colors group-hover:text-primary">
              {topic.title}
            </span>
          </span>
          <span class="mt-1 block truncate text-[12.5px] text-brand-700">
            {authorName(topic)} · {numberFormatter.format(topic.replyCount)}{" "}
            {topic.replyCount === 1 ? "reactie" : "reacties"} ·{" "}
            {numberFormatter.format(topic.viewCount)} keer bekeken · activiteit{" "}
            <RelativeTime value={topic.lastActivityAt} />
          </span>
        </span>
        <RelativeTime
          value={topic.lastActivityAt}
          class="hidden text-[12.5px] text-brand-800 sm:block"
        />
      </Link>
    </li>
  );

  const hasTopics = () => pinnedTopics().length > 0 || openTopics().length > 0;

  return (
    <section aria-labelledby="topics-heading" class="bg-base-100">
      <div class="flex flex-wrap items-end justify-between gap-3 border-b-2 border-base-content bg-base-200 px-4 py-4 sm:px-10">
        <div>
          <p class="text-[11.5px] font-bold tracking-[0.06em] text-brand-700 uppercase">
            Gesprekken
          </p>
          <h2 id="topics-heading" class="mt-1 text-[22px] font-semibold">
            Topics
          </h2>
        </div>

        <label class="grid gap-1 text-[12px] font-bold tracking-[0.05em] text-brand-700 uppercase">
          Sorteren
          <select
            class="select min-h-11 w-48 rounded-none border-brand-300 bg-base-100 text-sm font-medium text-base-content normal-case"
            value={sort()}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (isTopicSort(value)) setSort(value);
            }}
          >
            <option value="default">Laatste activiteit</option>
            <option value="newest">Nieuwste topic</option>
            <option value="replies">Meeste reacties</option>
            <option value="views">Meest bekeken</option>
          </select>
        </label>
      </div>

      <Show
        when={hasTopics()}
        fallback={
          <EmptyState
            class="border-x-0 border-t-0"
            title="Nog geen topics"
            description="Dit forum is nog leeg. Iemand moet het eerste topic beginnen — dat mag jij zijn."
          />
        }
      >
        <ul
          data-topic-list
          classList={{
            "[&>li:last-child]:border-b-0": !(
              pinnedTopics().length > 0 && openTopics().length === 0
            ),
          }}
        >
          <For each={pinnedTopics()}>{(topic) => topicRow(topic, true)}</For>
          <For each={openTopics()}>{(topic) => topicRow(topic)}</For>
        </ul>
        <Show when={pinnedTopics().length > 0 && openTopics().length === 0}>
          <p
            class="border-brand-300 px-4 py-4 text-sm text-brand-700 sm:px-10"
            classList={{ "border-b": !props.nextCursor }}
          >
            Geen open topics naast de vastgepinde gesprekken.
          </p>
        </Show>
      </Show>

      <Show when={loadError()}>
        <p
          class="border-t border-error bg-error/10 px-4 py-3 text-sm text-error sm:px-10"
          role="alert"
        >
          Meer topics laden is niet gelukt. Probeer het nog eens.
        </p>
      </Show>

      <Show when={props.nextCursor}>
        <div class="flex justify-center border-t-2 border-base-content bg-base-200 px-4 py-4">
          <Button
            variant="surface"
            loading={props.loadingMore}
            onClick={() => void loadMore()}
          >
            {props.loadingMore ? "Topics laden…" : "Meer topics laden"}
          </Button>
        </div>
      </Show>
    </section>
  );
}
