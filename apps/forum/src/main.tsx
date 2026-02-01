import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";
import "@forum/ui/styles.css";

const convexClient = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convexClient}>
      <RouterProvider router={router} />
    </ConvexAuthProvider>
  </React.StrictMode>
);
