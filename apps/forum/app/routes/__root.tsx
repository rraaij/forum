import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "@forum/ui/styles.css";

const convexClient = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ConvexAuthProvider client={convexClient}>
      <Outlet />
    </ConvexAuthProvider>
  );
}
