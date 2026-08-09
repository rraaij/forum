import type { TopicRouteParams } from "../shared/route-params";

export type SearchSort = "newest" | "relevance";

export interface ForumSearchRequest {
  q: string;
  boardId?: string;
  topicsOnly?: boolean;
  authorId?: string;
  latestMonth?: boolean;
  sort?: SearchSort;
  cursor?: string;
  limit?: number;
  viewer?: { isAuthenticated: boolean };
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export interface SearchResultItem {
  topicId: string;
  title: string;
  titleSegments: HighlightSegment[];
  snippetSegments: HighlightSegment[];
  matchKind: "topic" | "opening" | "reply";
  targetReplyId: string | null;
  matchedAt: string;
  author: {
    id: string;
    name: string | null;
    displayName: string | null;
    image: string | null;
  };
  board: { id: string; name: string };
  replyCount: number;
  routeParams: TopicRouteParams;
}

export interface ForumSearchPage {
  items: SearchResultItem[];
  nextCursor: string | null;
  totalCount: number;
  sort: SearchSort;
  appliedFilters: {
    boardName: string | null;
    authorName: string | null;
  };
}

export interface ForumSearch {
  search(input: ForumSearchRequest): Promise<ForumSearchPage>;
}
