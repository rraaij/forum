import { createApp } from "./app";
import { getDbTarget } from "./db";

const app = createApp();
const port = Number(process.env.API_PORT) || 4000;

console.log(`[API] Starting on port ${port}`);
// Print the active database target at process startup so stale .env values are
// obvious before the first request fails. The password is intentionally omitted.
console.log(`[API] Database target: ${getDbTarget()}`);

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`[API] Listening on http://localhost:${port}`);
