import { notFoundError } from "../shared/errors";

export const notificationNotFound = () =>
  notFoundError("NOTIFICATION_NOT_FOUND", "Notification not found");

export const subscriptionTopicNotFound = () =>
  notFoundError("TOPIC_NOT_FOUND", "Topic not found");
