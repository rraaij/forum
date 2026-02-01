import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Header, Card, CardHeader, CardTitle } from "@forum/ui";
import { api } from "../../../../packages/convex/convex/_generated/api";

export const Route = createFileRoute("/")({
  component: Frontpage,
});

function Frontpage() {
  const { isAuthenticated } = useConvexAuth();
  const topics = useQuery(api.topics.listByCategory, { categoryId: "all" });

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={isAuthenticated} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Latest Topics</h1>
        <div className="grid gap-4">
          {topics?.map((topic) => (
            <a
              key={topic._id}
              href={`http://localhost:3000/topic/${topic._id}`}
              className="block"
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{topic.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Posted {new Date(topic.createdAt).toLocaleDateString()}
                  </div>
                </CardHeader>
              </Card>
            </a>
          ))}
          {!topics && (
            <div className="text-muted-foreground">Loading topics...</div>
          )}
          {topics?.length === 0 && (
            <div className="text-muted-foreground">No topics yet.</div>
          )}
        </div>
      </main>
    </div>
  );
}
