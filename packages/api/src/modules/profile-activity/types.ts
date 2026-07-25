/*
 * Profile activity contract (refactor plan section 5.5). Implementation
 * arrives in Phase 7. Items expose explicit post kind, deletion state, board
 * breadcrumbs, and canonical route params — never window-position inference
 * or legacy URL construction. All activity is returned; pagination is an
 * accepted non-goal.
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
   * Null when the topic predates the board hierarchy and cannot be linked.
   * Every row is still returned — activity is the author's record, so an
   * unlinkable topic is presented without a link rather than hidden. Phase 8
   * makes topics.board_id NOT NULL and retires the case.
   */
  routeParams: TopicRouteParams | null;
}

export interface ProfileActivity {
  getAllForUser(userId: string): Promise<ProfileActivityItem[]>;
}
