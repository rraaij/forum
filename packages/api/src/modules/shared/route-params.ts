/*
 * Canonical frontend route-param result types (refactor plan section 7.1).
 *
 * Backend read models return these so links never reproduce hierarchy rules:
 * a topic under a root board uses the direct category path, a topic under any
 * nested board uses the UUID-based subcategory path. Deliberately free of
 * TanStack Router imports — the frontend maps `kind` to its typed `to` paths.
 */

export interface CategoryRouteParams {
  kind: "category";
  categorySlug: string;
}

export interface BoardRouteParams {
  kind: "board";
  categorySlug: string;
  boardId: string;
}

export interface RootTopicRouteParams {
  kind: "rootTopic";
  categorySlug: string;
  topicSlug: string;
}

export interface BoardTopicRouteParams {
  kind: "boardTopic";
  categorySlug: string;
  boardId: string;
  topicSlug: string;
}

export type TopicRouteParams = RootTopicRouteParams | BoardTopicRouteParams;

export type ForumRouteParams =
  | CategoryRouteParams
  | BoardRouteParams
  | TopicRouteParams;
