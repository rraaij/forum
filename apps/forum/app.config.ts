import { resolve } from "node:path";
import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: process.env.API_URL || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
  },
});
