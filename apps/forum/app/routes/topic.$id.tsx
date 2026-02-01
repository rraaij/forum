import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "@convex-dev/auth/react";
import { Header, Card, CardHeader, CardTitle, CardContent } from "@forum/ui";
import { useQuery } from "convex/react";
import { api } from "../../../../packages/convex/convex/_generated/api";

export const Route = createFileRoute("/topic/$id")({
  component: Topic,
});

function Topic() {
  const { id } = Route.useParams();
  const { isAuthenticated } = useConvexAuth();
  const topic = useQuery(api.topics.get, { id });
  const posts = useQuery(api.posts.listByTopic, { topicId: id });

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={isAuthenticated} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">{topic?.title || "Loading..."}</h1>
        <div className="grid gap-4">
          {posts?.map((post, index) => (
            <Card key={post._id}>
              <CardHeader>
                <CardTitle className="text-sm font-normal text-muted-foreground">
                  Post #{index + 1} by {post.authorId}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{post.content}</p>
              </CardContent>
            </Card>
          ))}
          {!posts && (
            <div className="text-muted-foreground">Loading posts...</div>
          )}
        </div>
      </main>
    </div>
  );
}
