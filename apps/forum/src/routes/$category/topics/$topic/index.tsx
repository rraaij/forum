import { createFileRoute, useParams } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import TopicDetailPage from "@/components/TopicDetailPage";
import { apiFetch } from "@/lib/api";
import type { Category, TopicDetail, TopicSummary } from "@/types/forum";

/*
 * Category topics do not have a subcategory slug in their data model. Resolve
 * the topic through the category's direct topic collection, then load the same
 * detailed post payload used by subcategory topics.
 */
const fetchCategoryTopic = createServerFn({ method: "GET" })
  .validator((params: { categorySlug: string; topicSlug: string }) => params)
  .handler(async ({ data }) => {
    const category = await apiFetch<Category>(
      `/categories/${data.categorySlug}`,
    );
    const topics = await apiFetch<TopicSummary[]>(
      `/topics?categoryId=${category.id}`,
    );
    const topic = topics.find((item) => item.slug === data.topicSlug);

    if (!topic) throw new Error("Topic not found");

    return apiFetch<TopicDetail>(`/topics/${topic.id}`);
  });

export const Route = createFileRoute("/$category/topics/$topic/")({
  loader: ({ params }) =>
    fetchCategoryTopic({
      data: {
        categorySlug: params.category,
        topicSlug: params.topic,
      },
    }),
  component: CategoryTopicPage,
});

function CategoryTopicPage() {
  // Params remain reactive when navigating between topics without remounting.
  const params = useParams({ from: "/$category/topics/$topic/" });
  const topic = Route.useLoaderData();

  return <TopicDetailPage topic={topic()} categorySlug={params().category} />;
}
