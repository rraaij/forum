import { z } from "zod";

/*
 * Runtime environment schema, validated before API/Auth/DB composition.
 * There are no fallback values on purpose: a missing or weak AUTH_SECRET or
 * an incomplete database target must stop the process at startup instead of
 * surfacing as confusing behavior later (refactor plan section 8.1).
 */
const envSchema = z.object({
  POSTGRES_HOST: z.string().min(1, "POSTGRES_HOST is required"),
  POSTGRES_PORT: z.coerce
    .number({ message: "POSTGRES_PORT must be a port number" })
    .int()
    .min(1)
    .max(65_535),
  POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required"),
  POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required"),
  POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.url({ message: "APP_URL must be a valid URL" }),
  API_URL: z.url({ message: "API_URL must be a valid URL" }),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(values: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(values);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid environment configuration — ${issues}. Check your env file against .env.example.`,
    );
  }
  return parsed.data;
}

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = parseEnv(process.env);
  }
  return cached;
}
