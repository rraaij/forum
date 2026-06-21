import { boolean, date, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Better Auth tables — IDs are text (Better Auth generates its own)

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  // Better Auth's original name remains the immutable forum username. Profile
  // presentation fields live separately so editing a display name cannot
  // silently change author identity throughout historical posts.
  name: text("name"),
  displayName: text("display_name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  // The existing Better Auth image column is used as the profile avatar URL.
  image: text("image"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  profileText: text("profile_text"),
  location: text("location"),
  website: text("website"),
  // The gallery stores validated image data URLs directly in PostgreSQL. This
  // keeps media portable without introducing a separate object-storage service.
  photoUrls: text("photo_urls").array().notNull().default([]),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull().default("credential"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
