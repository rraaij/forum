import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { sql } from "drizzle-orm";
import { getDb, getDbTarget, getDbUnavailableMessage } from "./db";
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
      origin: process.env.APP_URL || "http://localhost:3001",
      credentials: true,
    }),
  );
  app.use("*", logger());
  app.use("/api/*", sessionMiddleware);

  // Routes
  mountRoutes(app);

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/health/db", async (c) => {
    // Unlike /health, this route actually opens a database connection. Use it
    // when the forum page shows a data-loading error and you need a fast yes/no
    // answer for the configured POSTGRES_* target.
    await getDb().execute(sql`select 1`);

    return c.json({
      status: "ok",
      database: getDbTarget(),
    });
  });

  app.onError((err, c) => {
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

  return app;
}
