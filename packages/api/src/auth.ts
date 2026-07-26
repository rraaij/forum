import { accounts, sessions, users } from "@forum/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db";
import { getEnv } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // users cannot set their own role
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  // No fallbacks: the startup env schema guarantees these exist and that
  // AUTH_SECRET is at least 32 characters (refactor plan section 8.1).
  secret: getEnv().AUTH_SECRET,
  baseURL: getEnv().API_URL,
  trustedOrigins: [getEnv().APP_URL],
});

export type Session = typeof auth.$Infer.Session;
