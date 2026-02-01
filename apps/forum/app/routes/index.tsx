import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "@convex-dev/auth/react";
import { Header, Card, CardHeader, CardTitle, CardDescription } from "@forum/ui";
import { useQuery } from "convex/react";
import { api } from "../../../../packages/convex/convex/_generated/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { isAuthenticated } = useConvexAuth();
  const categories = useQuery(api.categories.list, { parentId: undefined });

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={isAuthenticated} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Forum Categories</h1>
        <div className="grid gap-4">
          {categories?.map((category) => (
            <a
              key={category._id}
              href={`/category/${category._id}`}
              className="block"
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{category.title}</CardTitle>
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </a>
          ))}
          {!categories && (
            <div className="text-muted-foreground">Loading categories...</div>
          )}
        </div>
      </main>
    </div>
  );
}
