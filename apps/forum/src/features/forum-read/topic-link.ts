/*
 * Canonical topic links (refactor plan section 7.1). The backend read model
 * decides which path is canonical; this mapper only translates its
 * routeParams into typed TanStack `to` + `params` — links never reproduce
 * hierarchy rules, and route params are never interpolated into `to`.
 */

import type { TopicRouteParams } from "./api";

export function topicLinkProps(routeParams: TopicRouteParams) {
  if (routeParams.kind === "rootTopic") {
    return {
      to: "/categories/$categorySlug/topics/$topicSlug",
      params: {
        categorySlug: routeParams.categorySlug,
        topicSlug: routeParams.topicSlug,
      },
    } as const;
  }
  return {
    to: "/categories/$categorySlug/subcategories/$boardId/topics/$topicSlug",
    params: {
      categorySlug: routeParams.categorySlug,
      boardId: routeParams.boardId,
      topicSlug: routeParams.topicSlug,
    },
  } as const;
}

/** Accumulated live-feed pages may resurface an ID; keep the first copy. */
export function dedupeById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const seen = new Set(existing.map((item) => item.id));
  return [...existing, ...incoming.filter((item) => !seen.has(item.id))];
}
