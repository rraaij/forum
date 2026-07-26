/*
 * Profile activity contract (refactor plan section 5.5). Items expose
 * explicit post kind, deletion state, board breadcrumbs, and canonical route
 * params — never window-position inference or URL construction. All activity
 * is returned; pagination is an accepted non-goal.
 */

import type { BreadcrumbItem } from "../shared/board-hierarchy";
import type { TopicRouteParams } from "../shared/route-params";

export interface ProfileActivityItem {
  postId: string;
  postKind: "opening" | "reply";
  postContent: string;
  postCreatedAt: string;
  isDeleted: boolean;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  /** Root-first ancestry; empty when the topic has no reachable board. */
  breadcrumbs: BreadcrumbItem[];
  /*
   * Null when the topic's board cannot be resolved. Since Phase 8 made
   * topics.board_id NOT NULL this means the board was purged between the
   * posts read and the boards read. Every row is still returned — activity
   * is the author's own record, so an unlinkable topic is presented without
   * a link rather than hidden.
   */
  routeParams: TopicRouteParams | null;
}

export interface ProfileActivity {
  getAllForUser(userId: string): Promise<ProfileActivityItem[]>;
}
