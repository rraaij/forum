import { createRouter } from "@tanstack/solid-router";

import { setupRouterSsrQueryIntegration } from "@tanstack/solid-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/provider";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

function NotFound() {
  return (
    <div class="p-6">
      <h1 class="text-2xl font-bold">Not Found</h1>
      <p class="mt-2 text-gray-500">The page you requested does not exist.</p>
    </div>
  );
}

// Create a new router instance
export const getRouter = () => {
  const rqContext = getContext();

  const router = createRouter({
    routeTree,
    context: { ...rqContext },
    defaultPreload: "intent",
    defaultNotFoundComponent: NotFound,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  return router;
};
