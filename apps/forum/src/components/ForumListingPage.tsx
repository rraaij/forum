import { Show } from "solid-js";
import type { BoardSummary, TopicListItem } from "@/features/forum-read/api";
import type { CreatedTopic } from "@/features/topic-discussion/api";
import ForumGrid from "./ForumGrid";
import PageHeader from "./PageHeader";
import TopicsList from "./TopicsList";

type ForumListingPageProps = {
  currentBoard: BoardSummary;
  rootCategorySlug: string;
  childBoards: BoardSummary[];
  topics: TopicListItem[];
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onTopicCreated: (topic: CreatedTopic) => void | Promise<void>;
};

const numberFormatter = new Intl.NumberFormat("nl-NL");

export function ForumListingPage(props: ForumListingPageProps) {
  const childCount = () => props.childBoards.length;
  const topicCount = () => props.currentBoard.directTopicCount;

  return (
    <div class="bg-base-200 text-base-content">
      <PageHeader
        forumCode={props.currentBoard.abbreviation}
        title={props.currentBoard.name}
        description={
          props.currentBoard.description ??
          "Bekijk de nieuwste gesprekken, begin een topic of duik verder een subforum in."
        }
        stats={[
          {
            label: childCount() === 1 ? "subforum" : "subforums",
            value: numberFormatter.format(childCount()),
          },
          {
            label: topicCount() === 1 ? "topic hier" : "topics hier",
            value: numberFormatter.format(topicCount()),
          },
        ]}
        createTopic={{
          boardId: props.currentBoard.id,
          allowNewTopics: props.currentBoard.allowNewTopics,
          onCreated: props.onTopicCreated,
        }}
      />

      <Show when={props.childBoards.length > 0}>
        <ForumGrid
          categorySlug={props.rootCategorySlug}
          boards={props.childBoards}
        />
      </Show>

      <TopicsList
        topics={props.topics}
        nextCursor={props.nextCursor}
        loadingMore={props.loadingMore}
        onLoadMore={props.onLoadMore}
      />
    </div>
  );
}
