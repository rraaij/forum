import { createApp } from "./app";

const app = createApp();
const port = Number(process.env.API_PORT) || 4000;

console.log(`[API] Starting on port ${port}`);

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`[API] Listening on http://localhost:${port}`);
