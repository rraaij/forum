import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite";
import viteSolid from "vite-plugin-solid";

export default defineConfig({
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: process.env.API_URL || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  plugins: [
    tanstackStart(),
    // viteSolid must come after tanstackStart
    viteSolid({ ssr: true }),
    tailwindcss(),
  ],
});
