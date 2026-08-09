import { Avatar } from "@forum/ui";
import { Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { RelativeTime } from "@/components/RelativeTime";
import { topicLinkProps } from "@/features/forum-read/topic-link";
import type { SearchResult } from "./api";

function authorName(result: SearchResult): string {
  return result.author.displayName ?? result.author.name ?? "onbekend";
}

export function SearchResultRow(props: { result: SearchResult }) {
  return (
    <Link
      {...topicLinkProps(props.result.routeParams)}
      search={
        props.result.targetReplyId
          ? { post: props.result.targetReplyId }
          : undefined
      }
      hash={
        props.result.targetReplyId
          ? `post-${props.result.targetReplyId}`
          : undefined
      }
      class="group grid min-w-0 grid-cols-[34px_minmax(0,1fr)] gap-3 border-b border-brand-300 bg-base-100 px-4 py-4 transition-colors hover:bg-base-200 sm:px-8"
    >
      <Avatar
        src={props.result.author.image}
        name={authorName(props.result)}
        size="sm"
        alt=""
        class="mt-0.5"
      />
      <span class="min-w-0">
        <span class="block min-w-0 text-[15.5px] font-bold [overflow-wrap:anywhere] group-hover:text-primary">
          <For each={props.result.titleSegments}>
            {(segment) => (
              <Show when={segment.highlighted} fallback={segment.text}>
                <mark class="bg-flame-100 text-flame-700">{segment.text}</mark>
              </Show>
            )}
          </For>
        </span>
        <span class="mt-1 line-clamp-2 text-[13.5px] leading-[1.5] text-brand-800 [overflow-wrap:anywhere]">
          <For each={props.result.snippetSegments}>
            {(segment) => (
              <Show when={segment.highlighted} fallback={segment.text}>
                <mark class="bg-flame-100 text-flame-700">{segment.text}</mark>
              </Show>
            )}
          </For>
        </span>
        <span class="mt-[5px] block text-[12.5px] text-brand-700">
          {authorName(props.result)} in {props.result.board.name} ·{" "}
          {props.result.replyCount}{" "}
          {props.result.replyCount === 1 ? "reactie" : "reacties"} ·{" "}
          <RelativeTime value={props.result.matchedAt} />
        </span>
      </span>
    </Link>
  );
}
