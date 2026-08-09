import { EmptyState } from "@forum/ui";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/solid-router";
import { ForumListingPage } from "@/components/ForumListingPage";
import { fetchCategoryPage } from "@/features/forum-read/api";
import { topicLinkProps } from "@/features/forum-read/topic-link";
import { createPageAccumulator } from "@/features/forum-read/use-page-accumulator";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/categories/$categorySlug/")({
  // One page-oriented request replaces the old per-board N+1 composition.
  loader: async ({ params }) => {
    try {
      return await fetchCategoryPage(params.categorySlug);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  component: CategoryPage,
  notFoundComponent: CategoryNotFound,
});

function CategoryNotFound() {
  return (
    <EmptyState
      class="my-8"
      kicker="404"
      headingLevel={1}
      title="Deze forumcategorie bestaat niet"
      description="De categorie is misschien verplaatst of verwijderd, of het adres klopt niet."
      action={
        <Link
          to="/"
          class="inline-flex min-h-11 items-center bg-primary px-4 font-bold text-primary-content transition-colors hover:bg-brand-700 active:bg-brand-700"
        >
          Terug naar het forum
        </Link>
      }
    />
  );
}

function CategoryPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const page = Route.useLoaderData();
  const category = () => page().category;

  const topics = createPageAccumulator(
    () => page().topics,
    (cursor) =>
      fetchCategoryPage(category().slug, cursor).then((next) => next.topics),
  );

  return (
    <ForumListingPage
      currentBoard={category()}
      rootCategorySlug={category().slug}
      childBoards={page().childBoards}
      topics={topics.items()}
      nextCursor={topics.nextCursor()}
      loadingMore={topics.loading()}
      onLoadMore={topics.loadMore}
      onTopicCreated={async (topic) => {
        // The backend owns canonical root-versus-nested topic routing.
        await router.invalidate();
        await navigate(topicLinkProps(topic.routeParams));
      }}
    />
  );
}
