/*
 * Forum read model (refactor plan section 5.2): four page-oriented queries
 * assembled from a fixed number of database reads. Queries never mutate
 * state. Board hierarchy math (tree, subtree totals, breadcrumbs, canonical
 * route params) happens in memory from one boards query.
 */

import {
  DEFAULT_PAGE_LIMIT,
  decodeReplyCursor,
  decodeTopicCursor,
  encodeReplyCursor,
  encodeTopicCursor,
  normalizePageLimit,
  type Page,
  type PageRequest,
} from "../shared/pagination";
import {
  type QuoteSnapshotV1,
  quoteSnapshotV1Schema,
} from "../shared/quote-snapshot";
import type { TopicRouteParams } from "../shared/route-params";
import {
  boardAncestryMismatch,
  categoryNotFound,
  forumTopicNotFound,
} from "./errors";
import type {
  BoardActivityRow,
  BoardRow,
  ForumReadStore,
  PostRow,
  TopicPageRow,
} from "./repository";
import type {
  AuthorSummary,
  BoardPageReadModel,
  BoardSummary,
  BoardTreeNode,
  BreadcrumbItem,
  CategoryPageReadModel,
  ForumIndexReadModel,
  ForumReadModel,
  PostView,
  TopicListItem,
  TopicPageReadModel,
} from "./types";

interface BoardsContext {
  byId: Map<string, BoardRow>;
  childrenOf: Map<string | null, BoardRow[]>;
  /** Direct + descendant topic count per board. */
  subtreeCounts: Map<string, number>;
  /** Newest activity in the board's subtree. */
  subtreeLatest: Map<string, BoardActivityRow>;
  directCounts: Map<string, number>;
  rootOf: Map<string, BoardRow>;
}

function sortSiblings(a: BoardRow, b: BoardRow): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

function buildContext(
  rows: BoardRow[],
  directCounts: Map<string, number>,
  latest: Map<string, BoardActivityRow>,
): BoardsContext {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenOf = new Map<string | null, BoardRow[]>();
  for (const row of rows) {
    const list = childrenOf.get(row.parentId) ?? [];
    list.push(row);
    childrenOf.set(row.parentId, list);
  }
  for (const list of childrenOf.values()) list.sort(sortSiblings);

  const subtreeCounts = new Map<string, number>();
  const subtreeLatest = new Map<string, BoardActivityRow>();
  const rootOf = new Map<string, BoardRow>();

  const visit = (row: BoardRow, root: BoardRow): void => {
    rootOf.set(row.id, root);
    let count = directCounts.get(row.id) ?? 0;
    let newest = latest.get(row.id);
    for (const child of childrenOf.get(row.id) ?? []) {
      visit(child, root);
      count += subtreeCounts.get(child.id) ?? 0;
      const childLatest = subtreeLatest.get(child.id);
      if (childLatest && (!newest || childLatest.at > newest.at)) {
        newest = childLatest;
      }
    }
    subtreeCounts.set(row.id, count);
    if (newest) subtreeLatest.set(row.id, newest);
  };
  for (const root of childrenOf.get(null) ?? []) visit(root, root);

  return {
    byId,
    childrenOf,
    subtreeCounts,
    subtreeLatest,
    directCounts,
    rootOf,
  };
}

function topicRouteParams(
  board: BoardRow,
  root: BoardRow,
  topicSlug: string,
): TopicRouteParams {
  return board.parentId === null
    ? { kind: "rootTopic", categorySlug: board.slug, topicSlug }
    : {
        kind: "boardTopic",
        categorySlug: root.slug,
        boardId: board.id,
        topicSlug,
      };
}

function boardSummary(ctx: BoardsContext, row: BoardRow): BoardSummary {
  const root = ctx.rootOf.get(row.id) ?? row;
  const newest = ctx.subtreeLatest.get(row.id);
  const activityBoard = newest ? ctx.byId.get(newest.boardId) : undefined;
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    slug: row.slug,
    abbreviation: row.abbreviation,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sortOrder,
    directTopicCount: ctx.directCounts.get(row.id) ?? 0,
    totalTopicCount: ctx.subtreeCounts.get(row.id) ?? 0,
    latestActivity:
      newest && activityBoard
        ? {
            topicId: newest.topicId,
            topicTitle: newest.topicTitle,
            at: newest.at.toISOString(),
            routeParams: topicRouteParams(
              activityBoard,
              ctx.rootOf.get(activityBoard.id) ?? root,
              newest.topicSlug,
            ),
          }
        : null,
  };
}

function boardTree(ctx: BoardsContext, row: BoardRow): BoardTreeNode {
  return {
    ...boardSummary(ctx, row),
    children: (ctx.childrenOf.get(row.id) ?? []).map((child) =>
      boardTree(ctx, child),
    ),
  };
}

function breadcrumbs(ctx: BoardsContext, board: BoardRow): BreadcrumbItem[] {
  const chain: BreadcrumbItem[] = [];
  let current: BoardRow | undefined = board;
  while (current) {
    chain.unshift({
      boardId: current.id,
      name: current.name,
      slug: current.slug,
      isRoot: current.parentId === null,
    });
    current = current.parentId ? ctx.byId.get(current.parentId) : undefined;
  }
  return chain;
}

function author(row: {
  authorId: string;
  authorName: string | null;
  authorDisplayName: string | null;
  authorImage: string | null;
}): AuthorSummary {
  return {
    id: row.authorId,
    name: row.authorName,
    displayName: row.authorDisplayName,
    image: row.authorImage,
  };
}

function topicListItem(
  row: TopicPageRow,
  board: BoardRow,
  root: BoardRow,
): TopicListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    isPinned: row.isPinned,
    isLocked: row.isLocked,
    replyCount: row.replyCount ?? 0,
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
    author: author(row),
    routeParams: topicRouteParams(board, root, row.slug),
  };
}

function postView(row: PostRow): PostView {
  const parsedQuote = quoteSnapshotV1Schema.safeParse(row.quoteSnapshot);
  return {
    id: row.id,
    kind: row.kind === "opening" ? "opening" : "reply",
    content: row.content,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    author: author(row),
    quote: parsedQuote.success ? (parsedQuote.data as QuoteSnapshotV1) : null,
  };
}

async function loadContext(store: ForumReadStore): Promise<BoardsContext> {
  // Three fixed queries regardless of hierarchy size or depth.
  const [rows, counts, latest] = await Promise.all([
    store.allBoards(),
    store.directTopicCounts(),
    store.latestActivityByBoard(),
  ]);
  return buildContext(rows, counts, latest);
}

async function topicPageFor(
  store: ForumReadStore,
  ctx: BoardsContext,
  board: BoardRow,
  request: PageRequest,
): Promise<Page<TopicListItem>> {
  const limit = normalizePageLimit(request.limit ?? DEFAULT_PAGE_LIMIT);
  const cursor = request.cursor ? decodeTopicCursor(request.cursor) : null;
  const root = ctx.rootOf.get(board.id) ?? board;
  const rows = await store.topicPage(board.id, cursor, limit + 1);
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((row) => topicListItem(row, board, root)),
    nextCursor:
      rows.length > limit && last
        ? encodeTopicCursor({
            isPinned: last.isPinned,
            lastActivityAt: last.lastActivityAt.toISOString(),
            id: last.id,
          })
        : null,
  };
}

export function createForumReadModel(store: ForumReadStore): ForumReadModel {
  return {
    async getForumIndex(): Promise<ForumIndexReadModel> {
      const ctx = await loadContext(store);
      return {
        categories: (ctx.childrenOf.get(null) ?? []).map((root) =>
          boardTree(ctx, root),
        ),
      };
    },

    async getCategoryPage(input): Promise<CategoryPageReadModel> {
      const ctx = await loadContext(store);
      const category = (ctx.childrenOf.get(null) ?? []).find(
        (row) => row.slug.toLowerCase() === input.categorySlug.toLowerCase(),
      );
      if (!category) throw categoryNotFound();
      return {
        category: boardSummary(ctx, category),
        breadcrumbs: breadcrumbs(ctx, category),
        childBoards: (ctx.childrenOf.get(category.id) ?? []).map((child) =>
          boardSummary(ctx, child),
        ),
        topics: await topicPageFor(store, ctx, category, input.topics),
      };
    },

    async getBoardPage(input): Promise<BoardPageReadModel> {
      const ctx = await loadContext(store);
      const board = ctx.byId.get(input.boardId);
      const root = board ? ctx.rootOf.get(board.id) : undefined;
      // A root board is addressed by the category path, never this one; a
      // board whose root slug differs from the URL is presented as absent.
      if (
        !board ||
        board.parentId === null ||
        !root ||
        root.slug.toLowerCase() !== input.categorySlug.toLowerCase()
      ) {
        throw boardAncestryMismatch();
      }
      return {
        board: boardSummary(ctx, board),
        breadcrumbs: breadcrumbs(ctx, board),
        childBoards: (ctx.childrenOf.get(board.id) ?? []).map((child) =>
          boardSummary(ctx, child),
        ),
        topics: await topicPageFor(store, ctx, board, input.topics),
      };
    },

    async getTopicPage(input): Promise<TopicPageReadModel> {
      const header = await store.topicHeaderBySlug(input.topicSlug);
      if (!header) throw forumTopicNotFound();

      const ctx = await loadContext(store);
      const board = ctx.byId.get(header.boardId);
      const root = board ? ctx.rootOf.get(board.id) : undefined;
      if (!board || !root) throw forumTopicNotFound();

      const opening = await store.openingPost(header.id);
      if (!opening) throw forumTopicNotFound();

      const limit = normalizePageLimit(
        input.replies.limit ?? DEFAULT_PAGE_LIMIT,
      );
      const cursor = input.replies.cursor
        ? decodeReplyCursor(input.replies.cursor)
        : null;
      const rows = await store.replyPage(header.id, cursor, limit + 1);
      const pageRows = rows.slice(0, limit);
      const last = pageRows.at(-1);

      return {
        topic: {
          id: header.id,
          slug: header.slug,
          title: header.title,
          isPinned: header.isPinned,
          isLocked: header.isLocked,
          replyCount: header.replyCount ?? 0,
          viewCount: header.viewCount,
          createdAt: header.createdAt.toISOString(),
          lastActivityAt: header.lastActivityAt.toISOString(),
          author: author(header),
        },
        routeParams: topicRouteParams(board, root, header.slug),
        breadcrumbs: breadcrumbs(ctx, board),
        openingPost: postView(opening),
        replies: {
          items: pageRows.map(postView),
          nextCursor:
            rows.length > limit && last
              ? encodeReplyCursor({
                  createdAt: last.createdAt.toISOString(),
                  id: last.id,
                })
              : null,
        },
      };
    },
  };
}
