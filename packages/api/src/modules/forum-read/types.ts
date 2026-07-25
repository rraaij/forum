/*
 * Forum read model contract (refactor plan section 5.2). Page-oriented
 * queries only; reads never mutate state. Implementation arrives in Phase 4.
 */

import type { Page, PageRequest } from "../shared/pagination";
import type { QuoteSnapshotV1 } from "../shared/quote-snapshot";
import type { TopicRouteParams } from "../shared/route-params";

export interface AuthorSummary {
  id: string;
  name: string | null;
  displayName: string | null;
  image: string | null;
}

export interface BreadcrumbItem {
  boardId: string;
  name: string;
  slug: string;
  /** Root boards are presented as categories (plan section 2). */
  isRoot: boolean;
}

export interface BoardSummary {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  abbreviation: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  /** Topics directly on this board. */
  directTopicCount: number;
  /** Topics on this board and every descendant. */
  totalTopicCount: number;
  latestActivity: {
    topicId: string;
    topicTitle: string;
    at: string;
    routeParams: TopicRouteParams;
  } | null;
}

export interface BoardTreeNode extends BoardSummary {
  children: BoardTreeNode[];
}

export interface TopicListItem {
  id: string;
  slug: string;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  lastActivityAt: string;
  author: AuthorSummary;
  routeParams: TopicRouteParams;
}

export interface PostView {
  id: string;
  kind: "opening" | "reply";
  content: string;
  isDeleted: boolean;
  deletedAt: string | null;
  editedAt: string | null;
  createdAt: string;
  author: AuthorSummary;
  quote: QuoteSnapshotV1 | null;
}

export interface ForumIndexReadModel {
  /** Root boards with recursively nested children. */
  categories: BoardTreeNode[];
}

export interface CategoryPageReadModel {
  category: BoardSummary;
  breadcrumbs: BreadcrumbItem[];
  childBoards: BoardSummary[];
  topics: Page<TopicListItem>;
}

export interface BoardPageReadModel {
  board: BoardSummary;
  breadcrumbs: BreadcrumbItem[];
  childBoards: BoardSummary[];
  topics: Page<TopicListItem>;
}

export interface TopicPageReadModel {
  topic: {
    id: string;
    slug: string;
    title: string;
    isPinned: boolean;
    isLocked: boolean;
    replyCount: number;
    viewCount: number;
    createdAt: string;
    lastActivityAt: string;
    author: AuthorSummary;
  };
  routeParams: TopicRouteParams;
  breadcrumbs: BreadcrumbItem[];
  /** Explicit opening post; it never consumes reply-page capacity. */
  openingPost: PostView;
  replies: Page<PostView>;
}

export interface ForumReadModel {
  getForumIndex(): Promise<ForumIndexReadModel>;
  getCategoryPage(input: {
    categorySlug: string;
    topics: PageRequest;
  }): Promise<CategoryPageReadModel>;
  getBoardPage(input: {
    categorySlug: string;
    boardId: string;
    topics: PageRequest;
  }): Promise<BoardPageReadModel>;
  getTopicPage(input: {
    topicSlug: string;
    replies: PageRequest;
  }): Promise<TopicPageReadModel>;
}
