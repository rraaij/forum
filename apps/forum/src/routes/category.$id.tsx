import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Header, Card, CardHeader, CardTitle, Button } from "@forum/ui";
import { api } from "../../../../packages/convex/convex/_generated/api";

export const Route = createFileRoute("/category/$id")({
  component: Category,
});

function Category() {
  const { id } = Route.useParams();
  const { isAuthenticated } = useConvexAuth();
  const category = useQuery(api.categories.get, { id });
  const topics = useQuery(api.topics.listByCategory, { categoryId: id });

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={isAuthenticated} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">{category?.title || "Loading..."}</h1>
            {category?.description && (
              <p className="text-muted-foreground mt-2">{category.description}</p>
            )}
          </div>
          {isAuthenticated && <Button>New Topic</Button>}
        </div>
        <div className="grid gap-4">
          {topics?.map((topic) => (
            <a key={topic._id} href={`/topic/${topic._id}`} className="block">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{topic.title}</CardTitle>
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
