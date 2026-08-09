import { For, Show } from "solid-js";
import type { CreatedTopic } from "@/features/topic-discussion/api";
import { CreateTopicPanel } from "@/features/topic-discussion/CreateTopicPanel";

type HeaderStat = {
  label: string;
  value: string;
};

type ForumPageHeaderProps = {
  forumCode: string;
  title: string;
  description: string;
  stats?: HeaderStat[];
  createTopic?: {
    boardId: string;
    allowNewTopics: boolean;
    onCreated: (topic: CreatedTopic) => void | Promise<void>;
  };
};

export default function PageHeader(props: ForumPageHeaderProps) {
  return (
    <header class="border-b-2 border-base-content bg-base-200 px-4 py-6 sm:px-10 sm:py-8">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end">
        <div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-brand-700">
            <span class="font-extrabold tracking-[0.06em] uppercase">
              {props.forumCode}
            </span>
            <For each={props.stats}>
              {(stat) => (
                <span>
                  <span aria-hidden="true">· </span>
                  {stat.value} {stat.label}
                </span>
              )}
            </For>
          </div>
          <h1 class="mt-2 min-w-0 text-[32px] leading-[1.02] font-semibold tracking-[-0.02em] text-wrap-balance [overflow-wrap:anywhere] sm:text-[42px]">
            {props.title}
          </h1>
          <p class="mt-3 max-w-[62ch] whitespace-pre-wrap text-[14px] leading-[1.55] text-brand-800 sm:text-[15px] sm:leading-[1.6]">
            {props.description}
          </p>
        </div>

        <Show when={props.createTopic}>
          {(createTopic) => (
            <CreateTopicPanel
              boardId={createTopic().boardId}
              allowNewTopics={createTopic().allowNewTopics}
              onCreated={createTopic().onCreated}
            />
          )}
        </Show>
      </div>
    </header>
  );
}
