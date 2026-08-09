import type { Page } from "../shared/pagination";
import type { TopicRouteParams } from "../shared/route-params";

export interface NotificationItem {
  id: string;
  postId: string;
  createdAt: string;
  readAt: string | null;
  actor: {
    id: string;
    name: string | null;
    displayName: string | null;
    image: string | null;
  };
  topic: {
    id: string;
    title: string;
  };
  routeParams: TopicRouteParams;
}

export interface TopicNotifications {
  getSubscription(
    userId: string,
    topicId: string,
  ): Promise<{ subscribed: boolean }>;
  setSubscription(
    userId: string,
    topicId: string,
    subscribed: boolean,
  ): Promise<{ subscribed: boolean }>;
  listForUser(
    userId: string,
    request: { cursor?: string; limit?: number },
  ): Promise<Page<NotificationItem>>;
  unreadCount(userId: string): Promise<{ count: number }>;
  markRead(userId: string, notificationId: string): Promise<void>;
}
