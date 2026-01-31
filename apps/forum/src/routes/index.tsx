import { forumApi } from "@forum/api/client";
import { createMutation, createQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { ChevronRight, FolderIcon, Loader2, MessageSquare } from "lucide-solid";
import { For, Show } from "solid-js";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const categories = createQuery(() => ({
    queryKey: ["categories", "main"],
    queryFn: () => forumApi.listCategories(),
  }));

  const seed = createMutation(() => ({
    mutationFn: () => forumApi.seed(),
    onSuccess: () => {
      categories.refetch();
    },
  }));

  const handleSeed = async () => {
    try {
      await seed.mutateAsync();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div class="space-y-8">
      <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10">
          <h1 class="text-4xl font-bold mb-2">Welcome to the Forum</h1>
          <p class="text-blue-100 text-lg">
            Join the conversation and explore various topics.
          </p>
        </div>
        <div class="absolute top-0 right-0 -tr-y-1/2 opacity-10">
          <MessageSquare size={200} />
        </div>
      </div>

      <div class="grid gap-6">
        <h2 class="text-2xl font-bold text-gray-800">Categories</h2>
        <Show
          when={categories.data && categories.data.length > 0}
          fallback={
            <div class="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p class="text-gray-500">
                No categories found. Seed the database to get started!
              </p>
              <button
                class="mt-4 btn btn-primary gap-2"
                onClick={handleSeed}
                disabled={seed.isPending}
              >
                <Show
                  when={seed.isPending}
                  fallback={<span>Seed Database</span>}
                >
                  <Loader2 class="animate-spin" size={18} />
                  <span>Seeding...</span>
                </Show>
              </button>
            </div>
          }
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={categories.data}>
              {(category) => (
                <Link
                  to="/category/$categoryId"
                  params={{ categoryId: category._id }}
                  class="group block bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex gap-4">
                      <div class="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FolderIcon size={24} />
                      </div>
                      <div>
                        <h3 class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {category.title}
                        </h3>
                        <p class="text-gray-500 mt-1">{category.description}</p>
                      </div>
                    </div>
                    <ChevronRight class="text-gray-300 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
