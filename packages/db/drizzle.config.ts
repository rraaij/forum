import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || "admin",
    password: process.env.POSTGRES_PASSWORD || "",
    database: process.env.POSTGRES_DB || "forum-db",
    ssl: false,
  },
});
