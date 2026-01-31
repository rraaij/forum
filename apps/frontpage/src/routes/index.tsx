import { forumApi } from "@forum/api/client";
import { createQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { ArrowUp, MessageSquare } from "lucide-solid";
import { For, Show } from "solid-js";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  // Use existing topic list for now, we will add a feed later
  const feed = createQuery(() => ({
    queryKey: ["feed"],
    queryFn: () => forumApi.listTopics("all"), // TODO: Backend support for 'all'
  }));

  return (
    <div class="space-y-8">
      <div class="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10">
          <h1 class="text-4xl font-bold mb-2">Frontpage News</h1>
          <p class="text-indigo-200 text-lg">
            The latest and greatest from around the web.
          </p>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="divide-y divide-gray-100">
          <Show
            when={feed.data}
            fallback={
              <div class="p-8 text-center text-gray-400">Loading news...</div>
            }
          >
            <For each={feed.data}>
              {(item, index) => (
                <div class="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
                  <div class="flex flex-col items-center gap-1 pt-1 min-w-[32px]">
                    <span class="text-indigo-600 font-bold text-lg">
                      {index() + 1}.
                    </span>
                    <button class="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                      <ArrowUp size={20} />
                    </button>
                  </div>

                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 leading-tight block mb-1">
                      <Link
                        to="/topic/$topicId"
                        params={{ topicId: item._id }}
                        class="hover:text-indigo-600 transition-colors"
                      >
                        {item.title}
                      </Link>
                      <span class="text-gray-400 font-normal text-sm ml-2">
                        ({new URL("https://example.com").hostname})
                      </span>
                    </h3>

                    <div class="flex items-center gap-3 text-xs text-gray-500">
                      <span>128 points</span>
                      <span>
                        by{" "}
                        <span class="font-medium text-gray-700">
                          {item.authorId}
                        </span>
                      </span>
                      <span>
                        {new Date(item._creationTime).toLocaleDateString()}
                      </span>
                      <span class="flex items-center gap-1 hover:text-indigo-600 cursor-pointer">
                        <MessageSquare size={12} />
                        42 comments
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>
    </div>
  );
}
