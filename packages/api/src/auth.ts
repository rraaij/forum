import { accounts, sessions, users } from "@forum/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db";

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
  secret:
    process.env.AUTH_SECRET || "development-secret-min-32-characters-long",
  baseURL: process.env.API_URL || "http://localhost:4000",
  trustedOrigins: [process.env.APP_URL || "http://localhost:3001"],
});

export type Session = typeof auth.$Infer.Session;
