import type { InferRequestType, InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const notificationsGet = apiClient.api.notifications.$get;
const unreadCountGet = apiClient.api.notifications["unread-count"].$get;
const markReadPut = apiClient.api.notifications[":notificationId"].read.$put;
const subscriptionGet = apiClient.api.topics[":topicId"].subscription.$get;
const subscriptionPut = apiClient.api.topics[":topicId"].subscription.$put;
const subscriptionDelete =
  apiClient.api.topics[":topicId"].subscription.$delete;

export type NotificationPage = InferResponseType<typeof notificationsGet, 200>;
export type NotificationItem = NotificationPage["items"][number];
type NotificationRequest = InferRequestType<typeof notificationsGet>;
type MarkReadRequest = InferRequestType<typeof markReadPut>;
type SubscriptionRequest = InferRequestType<typeof subscriptionGet>;

export async function fetchNotifications(
  cursor?: NotificationRequest["query"]["cursor"],
): Promise<NotificationPage> {
  const res = await notificationsGet({ query: cursor ? { cursor } : {} });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await unreadCountGet();
  if (res.status !== 200) throw await toApiError(res);
  return (await res.json()).count;
}

export async function markNotificationRead(
  notificationId: MarkReadRequest["param"]["notificationId"],
): Promise<void> {
  const res = await markReadPut({ param: { notificationId } });
  if (res.status !== 204) throw await toApiError(res);
}

export async function fetchSubscription(
  topicId: SubscriptionRequest["param"]["topicId"],
): Promise<boolean> {
  const res = await subscriptionGet({ param: { topicId } });
  if (res.status !== 200) throw await toApiError(res);
  return (await res.json()).subscribed;
}

export async function setSubscription(
  topicId: SubscriptionRequest["param"]["topicId"],
  subscribed: boolean,
): Promise<boolean> {
  const res = subscribed
    ? await subscriptionPut({ param: { topicId } })
    : await subscriptionDelete({ param: { topicId } });
  if (res.status !== 200) throw await toApiError(res);
  return (await res.json()).subscribed;
}
