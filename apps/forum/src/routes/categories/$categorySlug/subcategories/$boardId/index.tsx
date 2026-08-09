import {
  createFileRoute,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/solid-router";
import { ForumListingPage } from "@/components/ForumListingPage";
import { fetchBoardPage } from "@/features/forum-read/api";
import { topicLinkProps } from "@/features/forum-read/topic-link";
import { createPageAccumulator } from "@/features/forum-read/use-page-accumulator";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute(
  "/categories/$categorySlug/subcategories/$boardId/",
)({
  // One page-oriented request; ancestry is verified server-side.
  loader: async ({ params }) => {
    try {
      return await fetchBoardPage(params.categorySlug, params.boardId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  component: BoardPage,
});

function BoardPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const page = Route.useLoaderData();
  const board = () => page().board;
  const rootSlug = () => page().breadcrumbs[0]?.slug ?? "";

  const topics = createPageAccumulator(
    () => page().topics,
    (cursor) =>
      fetchBoardPage(rootSlug(), board().id, cursor).then(
        (next) => next.topics,
      ),
  );

  return (
    <ForumListingPage
      currentBoard={board()}
      rootCategorySlug={rootSlug()}
      childBoards={page().childBoards}
      topics={topics.items()}
      nextCursor={topics.nextCursor()}
      loadingMore={topics.loading()}
      onLoadMore={topics.loadMore}
      onTopicCreated={async (topic) => {
        await router.invalidate();
        await navigate(topicLinkProps(topic.routeParams));
      }}
    />
  );
}
