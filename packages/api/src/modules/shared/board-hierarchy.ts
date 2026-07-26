/*
 * Board hierarchy navigation shared by every read model (refactor plan
 * sections 5.2, 5.5 and 7.1).
 *
 * Ancestry, breadcrumbs and canonical route params are policy, not data
 * access: they are derived ONCE here from a flat board list, so no query and
 * no component reproduces the rule that a topic on a root board uses the
 * category path while anything deeper uses the UUID-based board path.
 */

import type { TopicRouteParams } from "./route-params";

/** The columns any read model must select to navigate the hierarchy. */
export interface HierarchyBoardRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface BreadcrumbItem {
  boardId: string;
  name: string;
  slug: string;
  /** Root boards are presented as categories (plan section 2). */
  isRoot: boolean;
}

export interface BoardHierarchy<Row extends HierarchyBoardRow> {
  byId: Map<string, Row>;
  /** Children per parent id, `null` keyed to the roots, siblings sorted. */
  childrenOf: Map<string | null, Row[]>;
  roots: Row[];
  /** The root ancestor of a board; a root board is its own root. */
  rootOf(boardId: string): Row | undefined;
  /** Root-first ancestry chain, ending with the board itself. */
  breadcrumbs(boardId: string): BreadcrumbItem[];
  /** `null` when the board is unknown — callers decide how to degrade. */
  topicRouteParams(boardId: string, topicSlug: string): TopicRouteParams | null;
}

function sortSiblings(a: HierarchyBoardRow, b: HierarchyBoardRow): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

export function buildBoardHierarchy<Row extends HierarchyBoardRow>(
  rows: Row[],
): BoardHierarchy<Row> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenOf = new Map<string | null, Row[]>();
  for (const row of rows) {
    const siblings = childrenOf.get(row.parentId) ?? [];
    siblings.push(row);
    childrenOf.set(row.parentId, siblings);
  }
  for (const siblings of childrenOf.values()) siblings.sort(sortSiblings);

  const roots = childrenOf.get(null) ?? [];

  /*
   * Resolved by descent from the roots rather than by walking parents per
   * lookup: the walk is O(depth) each time and, more importantly, a row whose
   * parent is missing from `rows` would otherwise masquerade as a root.
   */
  const rootIdOf = new Map<string, Row>();
  const descend = (row: Row, root: Row): void => {
    rootIdOf.set(row.id, root);
    for (const child of childrenOf.get(row.id) ?? []) descend(child, root);
  };
  for (const root of roots) descend(root, root);

  return {
    byId,
    childrenOf,
    roots,

    rootOf(boardId) {
      return rootIdOf.get(boardId);
    },

    breadcrumbs(boardId) {
      const chain: BreadcrumbItem[] = [];
      let current = byId.get(boardId);
      while (current) {
        chain.unshift({
          boardId: current.id,
          name: current.name,
          slug: current.slug,
          isRoot: current.parentId === null,
        });
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return chain;
    },

    topicRouteParams(boardId, topicSlug) {
      const board = byId.get(boardId);
      if (!board) return null;
      if (board.parentId === null) {
        return { kind: "rootTopic", categorySlug: board.slug, topicSlug };
      }
      const root = rootIdOf.get(board.id);
      if (!root) return null;
      return {
        kind: "boardTopic",
        categorySlug: root.slug,
        boardId: board.id,
        topicSlug,
      };
    },
  };
}
