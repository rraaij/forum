/*
 * Forum read model contract (refactor plan section 5.2). Page-oriented
 * queries only; reads never mutate state.
 */

import type { Page, PageRequest } from "../shared/pagination";
import type { QuoteSnapshotV1 } from "../shared/quote-snapshot";
import type { TopicRouteParams } from "../shared/route-params";

// Breadcrumbs are hierarchy navigation, owned by the shared mapper.
export type { BreadcrumbItem } from "../shared/board-hierarchy";

import type { BreadcrumbItem } from "../shared/board-hierarchy";

export interface AuthorSummary {
  id: string;
  name: string | null;
  displayName: string | null;
  image: string | null;
}

export interface PostAuthorSummary extends AuthorSummary {
  memberSince: string | null;
  /** Lifetime participation includes soft-deleted posts. */
  postCount: number;
  tagline: string | null;
  role: string;
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
  isGuestVisible: boolean;
  allowNewTopics: boolean;
  /** Topics directly on this board. */
  directTopicCount: number;
  /** Topics on this board and every descendant. */
  totalTopicCount: number;
  /** Retained posts directly in topics on this board. */
  directPostCount: number;
  /** Retained posts on this board and every descendant. */
  totalPostCount: number;
  latestActivity: {
    topicId: string;
    topicTitle: string;
    at: string;
    replyCount: number;
    author: AuthorSummary;
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
  author: PostAuthorSummary;
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
  /** Number of replies preceding the first loaded row. */
  replyStartIndex: number;
  replies: Page<PostView>;
}

export interface ForumReadModel {
  getForumIndex(input?: { viewer?: ForumViewer }): Promise<ForumIndexReadModel>;
  getCategoryPage(input: {
    categorySlug: string;
    topics: PageRequest;
    viewer?: ForumViewer;
  }): Promise<CategoryPageReadModel>;
  getBoardPage(input: {
    categorySlug: string;
    boardId: string;
    topics: PageRequest;
    viewer?: ForumViewer;
  }): Promise<BoardPageReadModel>;
  getTopicPage(input: {
    topicSlug: string;
    replies: PageRequest & { targetReplyId?: string };
    viewer?: ForumViewer;
  }): Promise<TopicPageReadModel>;
}

export interface ForumViewer {
  isAuthenticated: boolean;
}
