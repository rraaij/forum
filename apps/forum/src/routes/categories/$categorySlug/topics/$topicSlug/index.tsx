import { createFileRoute } from "@tanstack/solid-router";
import { fetchTopicPage } from "@/features/forum-read/api";
import { TopicDetailPage } from "@/features/topic-discussion/TopicDetailPage";

// Canonical path for topics that live directly on a root board (category).
export const Route = createFileRoute(
  "/categories/$categorySlug/topics/$topicSlug/",
)({
  loader: ({ params }) => fetchTopicPage(params.topicSlug),
  component: RootTopicRoute,
});

function RootTopicRoute() {
  const page = Route.useLoaderData();
  return <TopicDetailPage page={page} />;
}
