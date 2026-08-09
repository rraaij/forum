import { buildBoardHierarchy } from "../shared/board-hierarchy";
import { visibleBoards } from "../shared/board-visibility";
import { notFoundError, validationError } from "../shared/errors";
import { normalizePageLimit } from "../shared/pagination";
import {
  decodeSearchCursor,
  encodeSearchCursor,
  searchFingerprint,
} from "./cursor";
import type { ForumSearchStore, SearchBoardRow } from "./repository";
import type {
  ForumSearch,
  HighlightSegment,
  SearchResultItem,
  SearchSort,
} from "./types";

function normalizeQuery(value: string): string {
  const q = value.trim().replace(/\s+/g, " ");
  if (q.length < 2 || q.length > 200 || !/[\p{L}\p{N}]/u.test(q)) {
    throw validationError(
      "INVALID_SEARCH_QUERY",
      "Search query must contain 2 to 200 characters",
      "q",
    );
  }
  return q;
}

function descendants(rows: SearchBoardRow[], rootId: string): string[] {
  const hierarchy = buildBoardHierarchy(rows);
  const ids: string[] = [];
  const visit = (id: string): void => {
    ids.push(id);
    for (const child of hierarchy.childrenOf.get(id) ?? []) visit(child.id);
  };
  visit(rootId);
  return ids;
}

function terms(q: string): string[] {
  return [
    ...new Set(q.toLocaleLowerCase("nl").match(/[\p{L}\p{N}_-]+/gu) ?? []),
  ]
    .filter((term) => term.length > 1)
    .sort((a, b) => b.length - a.length);
}

function highlighted(
  text: string,
  q: string,
  snippet: boolean,
): HighlightSegment[] {
  const searchTerms = terms(q);
  let source = text;
  if (snippet && source.length > 240) {
    const lower = source.toLocaleLowerCase("nl");
    const first = searchTerms
      .map((term) => lower.indexOf(term))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0];
    const start = Math.max(0, (first ?? 0) - 70);
    source = `${start > 0 ? "…" : ""}${source.slice(start, start + 220)}${
      start + 220 < text.length ? "…" : ""
    }`;
  }
  if (searchTerms.length === 0) return [{ text: source, highlighted: false }];
  const pattern = new RegExp(
    `(${searchTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "giu",
  );
  return source
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      highlighted: searchTerms.includes(part.toLocaleLowerCase("nl")),
    }));
}

export function createForumSearch(store: ForumSearchStore): ForumSearch {
  return {
    search(input) {
      const q = normalizeQuery(input.q);
      const sort: SearchSort = input.sort ?? "newest";
      const topicsOnly = input.topicsOnly ?? false;
      const latestMonth = input.latestMonth ?? false;
      const limit = normalizePageLimit(input.limit);
      const fingerprint = searchFingerprint({
        q,
        boardId: input.boardId,
        topicsOnly,
        authorId: input.authorId,
        latestMonth,
        sort,
      });
      const decoded = input.cursor
        ? decodeSearchCursor(input.cursor, fingerprint, sort)
        : null;
      const cutoff = latestMonth
        ? decoded?.cutoff
          ? new Date(decoded.cutoff)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : null;

      return store.transaction(async (tx) => {
        const allBoards = await tx.allBoards();
        const visible = visibleBoards(
          allBoards,
          input.viewer?.isAuthenticated ?? false,
        );
        const hierarchy = buildBoardHierarchy(visible);
        const scope = input.boardId
          ? hierarchy.byId.has(input.boardId)
            ? descendants(visible, input.boardId)
            : null
          : visible.map((board) => board.id);
        if (!scope) throw notFoundError("BOARD_NOT_FOUND", "Board not found");

        const rows = await tx.searchRows({
          q,
          boardIds: scope,
          topicsOnly,
          authorId: input.authorId,
          cutoff,
          sort,
          cursor: decoded,
          limitPlusOne: limit + 1,
        });
        const pageRows = rows.slice(0, limit);
        const last = pageRows.at(-1);
        const items = pageRows.flatMap<SearchResultItem>((row) => {
          const routeParams = hierarchy.topicRouteParams(row.boardId, row.slug);
          const board = hierarchy.byId.get(row.boardId);
          if (!routeParams || !board) return [];
          return [
            {
              topicId: row.topicId,
              title: row.title,
              titleSegments: highlighted(row.title, q, false),
              snippetSegments: highlighted(row.sourceText, q, true),
              matchKind: row.matchKind,
              targetReplyId: row.targetReplyId,
              matchedAt: row.matchedAt.toISOString(),
              author: {
                id: row.authorId,
                name: row.authorName,
                displayName: row.authorDisplayName,
                image: row.authorImage,
              },
              board: { id: board.id, name: board.name },
              replyCount: row.replyCount,
              routeParams,
            },
          ];
        });
        return {
          items,
          nextCursor:
            rows.length > limit && last
              ? encodeSearchCursor({
                  fingerprint,
                  sort,
                  matchedAt: last.matchedAt.toISOString(),
                  topicId: last.topicId,
                  ...(sort === "relevance" ? { rank: last.rank } : {}),
                  cutoff: cutoff?.toISOString() ?? null,
                })
              : null,
          totalCount: rows[0]?.totalCount ?? 0,
          sort,
          appliedFilters: {
            boardName: input.boardId
              ? (hierarchy.byId.get(input.boardId)?.name ?? null)
              : null,
            authorName: input.authorId
              ? await tx.authorName(input.authorId)
              : null,
          },
        };
      });
    },
  };
}
