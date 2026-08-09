import { createFileRoute } from "@tanstack/solid-router";
import { fetchTopicPage } from "@/features/forum-read/api";
import { TopicDetailPage } from "@/features/topic-discussion/TopicDetailPage";

// Canonical path for topics on any nested board, addressed by board UUID.
export const Route = createFileRoute(
  "/categories/$categorySlug/subcategories/$boardId/topics/$topicSlug/",
)({
  validateSearch: (search: Record<string, unknown>): { post?: string } =>
    typeof search.post === "string" ? { post: search.post } : {},
  loaderDeps: ({ search }) => ({ post: search.post }),
  loader: ({ params, deps }) =>
    fetchTopicPage(params.topicSlug, undefined, deps.post),
  component: BoardTopicRoute,
});

function BoardTopicRoute() {
  const page = Route.useLoaderData();
  return <TopicDetailPage page={page} />;
}
