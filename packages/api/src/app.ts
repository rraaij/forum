import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { getDb, getDbTarget, getDbUnavailableMessage } from "./db";
import { getEnv } from "./env";
import { sessionMiddleware } from "./middleware/session";
import { mountRoutes } from "./routes";
import type { AppEnv } from "./types";

function hasDatabaseConnectionFailure(error: unknown): boolean {
  // Drizzle wraps driver failures in DrizzleQueryError, so walk through `cause`
  // links until we find the original postgres/node networking error.
  let current: unknown = error;

  while (current && typeof current === "object") {
    const maybeError = current as { cause?: unknown; code?: unknown };

    // ECONNREFUSED is the common case here: the NAS/Postgres service is stopped
    // or the configured host/port is not accepting connections. The extra
    // network codes cover DNS, routing, timeout, and dropped-connection cases.
    if (
      maybeError.code === "ECONNREFUSED" ||
      maybeError.code === "ECONNRESET" ||
      maybeError.code === "ENOTFOUND" ||
      maybeError.code === "EHOSTUNREACH" ||
      maybeError.code === "ETIMEDOUT"
    ) {
      return true;
    }

    current = maybeError.cause;
  }

  return false;
}

export function createApp() {
  const app = new Hono<AppEnv>();

  // Middleware
  app.use(
    "*",
    cors({
      origin: getEnv().APP_URL,
      credentials: true,
    }),
  );
  app.use("*", logger());
  app.use("/api/*", sessionMiddleware);

  // Routes and health checks are chained so the returned instance carries
  // the full route schema into AppType (see routes/index.ts).
  const routes = mountRoutes(app)
    .get("/health", (c) => c.json({ status: "ok" }))
    .get("/health/db", async (c) => {
      // Unlike /health, this route actually opens a database connection. Use
      // it when the forum page shows a data-loading error and you need a fast
      // yes/no answer for the configured POSTGRES_* target.
      await getDb().execute(sql`select 1`);

      return c.json({
        status: "ok",
        database: getDbTarget(),
      });
    });

  routes.onError((err, c) => {
    // Framework-raised request errors (e.g. malformed JSON from the request
    // validator) keep their status and the plain { error: string } shape.
    if (err instanceof HTTPException) {
      return c.json({ error: err.message || "Request error" }, err.status);
    }

    // Return a specific status/message for the failure that caused the generic
    // "Internal Server Error" page: the API cannot connect to PostgreSQL.
    // This keeps the server log detailed while making the browser-facing error
    // actionable for local development.
    if (hasDatabaseConnectionFailure(err)) {
      console.error(`[API] Database unavailable (${getDbTarget()})`, err);

      return c.json(
        {
          code: "DATABASE_UNAVAILABLE",
          database: getDbTarget(),
          error: getDbUnavailableMessage(),
        },
        503,
      );
    }

    console.error("[API] Unhandled error", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return routes;
}

/*
 * Exported Hono route schema (refactor plan section 6.2). The frontend
 * creates its transport client with hc<AppType> and infers request/response
 * types from it instead of maintaining them by hand.
 */
export type AppType = ReturnType<typeof createApp>;
