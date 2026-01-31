import { AuthProvider, Header } from "@forum/ui";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";

import styleCss from "../styles.css?url";

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [{ rel: "stylesheet", href: styleCss }],
  }),
  shellComponent: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HydrationScript />
      </head>
      <body>
        <HeadContent />
        <AuthProvider>
          <Suspense>
            <Header />

            <div class="max-w-6xl mx-auto p-4">
              <Outlet />
            </div>
            <TanStackRouterDevtools />
          </Suspense>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
