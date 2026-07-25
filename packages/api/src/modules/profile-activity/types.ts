/*
 * Profile activity contract (refactor plan section 5.5). Implementation
 * arrives in Phase 7. Items expose explicit post kind, deletion state, board
 * breadcrumbs, and canonical route params — never window-position inference
 * or legacy URL construction. All activity is returned; pagination is an
 * accepted non-goal.
 */

import type { BreadcrumbItem } from "../forum-read/types";
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
  breadcrumbs: BreadcrumbItem[];
  routeParams: TopicRouteParams;
}

export interface ProfileActivity {
  getAllForUser(userId: string): Promise<ProfileActivityItem[]>;
}
