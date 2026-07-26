/*
 * Forum read model (refactor plan section 5.2): four page-oriented queries
 * assembled from a fixed number of database reads. Queries never mutate
 * state. Board hierarchy math (tree, subtree totals, breadcrumbs, canonical
 * route params) happens in memory from one boards query.
 */

import {
  type BoardHierarchy,
  buildBoardHierarchy,
} from "../shared/board-hierarchy";
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
  ForumReadTx,
  PostRow,
  TopicPageRow,
} from "./repository";
import type {
  AuthorSummary,
  BoardPageReadModel,
  BoardSummary,
  BoardTreeNode,
  CategoryPageReadModel,
  ForumIndexReadModel,
  ForumReadModel,
  PostView,
  TopicListItem,
  TopicPageReadModel,
} from "./types";

interface BoardsContext {
  /** Ancestry, breadcrumbs and route params (shared mapper). */
  hierarchy: BoardHierarchy<BoardRow>;
  /** Direct + descendant topic count per board. */
  subtreeCounts: Map<string, number>;
  /** Newest activity in the board's subtree. */
  subtreeLatest: Map<string, BoardActivityRow>;
  directCounts: Map<string, number>;
}

function buildContext(
  rows: BoardRow[],
  directCounts: Map<string, number>,
  latest: Map<string, BoardActivityRow>,
): BoardsContext {
  const hierarchy = buildBoardHierarchy(rows);
  const subtreeCounts = new Map<string, number>();
  const subtreeLatest = new Map<string, BoardActivityRow>();

  const visit = (row: BoardRow): void => {
    let count = directCounts.get(row.id) ?? 0;
    let newest = latest.get(row.id);
    for (const child of hierarchy.childrenOf.get(row.id) ?? []) {
      visit(child);
      count += subtreeCounts.get(child.id) ?? 0;
      const childLatest = subtreeLatest.get(child.id);
      if (childLatest && (!newest || childLatest.at > newest.at)) {
        newest = childLatest;
      }
    }
    subtreeCounts.set(row.id, count);
    if (newest) subtreeLatest.set(row.id, newest);
  };
  for (const root of hierarchy.roots) visit(root);

  return { hierarchy, subtreeCounts, subtreeLatest, directCounts };
}

function boardSummary(ctx: BoardsContext, row: BoardRow): BoardSummary {
  const newest = ctx.subtreeLatest.get(row.id);
  const activityRoute = newest
    ? ctx.hierarchy.topicRouteParams(newest.boardId, newest.topicSlug)
    : null;
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
      newest && activityRoute
        ? {
            topicId: newest.topicId,
            topicTitle: newest.topicTitle,
            at: newest.at.toISOString(),
            routeParams: activityRoute,
          }
        : null,
  };
}

function boardTree(ctx: BoardsContext, row: BoardRow): BoardTreeNode {
  return {
    ...boardSummary(ctx, row),
    children: (ctx.hierarchy.childrenOf.get(row.id) ?? []).map((child) =>
      boardTree(ctx, child),
    ),
  };
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
  routeParams: TopicRouteParams,
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
    routeParams,
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

async function loadContext(tx: ForumReadTx): Promise<BoardsContext> {
  // Three fixed queries regardless of hierarchy size or depth.
  const rows = await tx.allBoards();
  const counts = await tx.directTopicCounts();
  const latest = await tx.latestActivityByBoard();
  return buildContext(rows, counts, latest);
}

async function topicPageFor(
  tx: ForumReadTx,
  ctx: BoardsContext,
  board: BoardRow,
  request: PageRequest,
): Promise<Page<TopicListItem>> {
  const limit = normalizePageLimit(request.limit ?? DEFAULT_PAGE_LIMIT);
  const cursor = request.cursor ? decodeTopicCursor(request.cursor) : null;
  const rows = await tx.topicPage(board.id, cursor, limit + 1);
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);
  return {
    // The board was reached through the hierarchy, so route params always
    // resolve; the guard exists so a listed topic is never rendered unlinked.
    items: pageRows.flatMap((row) => {
      const routeParams = ctx.hierarchy.topicRouteParams(board.id, row.slug);
      return routeParams ? [topicListItem(row, routeParams)] : [];
    }),
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
      return store.transaction(async (tx) => {
        const ctx = await loadContext(tx);
        return {
          categories: ctx.hierarchy.roots.map((root) => boardTree(ctx, root)),
        };
      });
    },

    async getCategoryPage(input): Promise<CategoryPageReadModel> {
      return store.transaction(async (tx) => {
        const ctx = await loadContext(tx);
        const category = ctx.hierarchy.roots.find(
          (row) => row.slug.toLowerCase() === input.categorySlug.toLowerCase(),
        );
        if (!category) throw categoryNotFound();
        return {
          category: boardSummary(ctx, category),
          breadcrumbs: ctx.hierarchy.breadcrumbs(category.id),
          childBoards: (ctx.hierarchy.childrenOf.get(category.id) ?? []).map(
            (child) => boardSummary(ctx, child),
          ),
          topics: await topicPageFor(tx, ctx, category, input.topics),
        };
      });
    },

    async getBoardPage(input): Promise<BoardPageReadModel> {
      return store.transaction(async (tx) => {
        const ctx = await loadContext(tx);
        const board = ctx.hierarchy.byId.get(input.boardId);
        const root = board ? ctx.hierarchy.rootOf(board.id) : undefined;
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
          breadcrumbs: ctx.hierarchy.breadcrumbs(board.id),
          childBoards: (ctx.hierarchy.childrenOf.get(board.id) ?? []).map(
            (child) => boardSummary(ctx, child),
          ),
          topics: await topicPageFor(tx, ctx, board, input.topics),
        };
      });
    },

    async getTopicPage(input): Promise<TopicPageReadModel> {
      return store.transaction(async (tx) => {
        const header = await tx.topicHeaderBySlug(input.topicSlug);
        if (!header) throw forumTopicNotFound();

        const ctx = await loadContext(tx);
        const routeParams = ctx.hierarchy.topicRouteParams(
          header.boardId,
          header.slug,
        );
        if (!routeParams) throw forumTopicNotFound();

        const opening = await tx.openingPost(header.id);
        if (!opening) throw forumTopicNotFound();

        const limit = normalizePageLimit(
          input.replies.limit ?? DEFAULT_PAGE_LIMIT,
        );
        const cursor = input.replies.cursor
          ? decodeReplyCursor(input.replies.cursor)
          : null;
        const rows = await tx.replyPage(header.id, cursor, limit + 1);
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
          routeParams,
          breadcrumbs: ctx.hierarchy.breadcrumbs(header.boardId),
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
      });
    },
  };
}
