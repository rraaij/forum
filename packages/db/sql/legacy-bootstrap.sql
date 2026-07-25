/*
 * TEST-ONLY legacy bootstrap: reconstructs the exact pre-0000 schema.
 *
 * The committed migration history starts from a database that already had the
 * forum tables (the project previously used drizzle-kit push without
 * migrations): 0000_romantic_blackheart.sql ALTERs "categories" instead of
 * creating anything. This file recreates that starting point so an EMPTY,
 * safety-checked *_test database can run the complete history.
 *
 * Derived from migrations/meta/0000_snapshot.json minus the single change made
 * by migration 0000 (categories.abbreviation). Names matter: migration 0002
 * drops the "categories_slug_unique" constraint and the
 * "subcategories_category_slug_idx" index by name.
 *
 * Idempotent by construction (IF NOT EXISTS / guarded ALTERs). It must only
 * ever run against an empty, fail-closed-checked _test database; the runner
 * in scripts/safe-db.ts and the test helpers enforce that.
 */

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "role" text DEFAULT 'user' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text DEFAULT 'credential' NOT NULL,
  "password" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "sessions_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "icon" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "subcategories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL,
  "parent_subcategory_id" uuid,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "topics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid,
  "subcategory_id" uuid,
  "author_id" text NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "view_count" integer DEFAULT 0 NOT NULL,
  "post_count" integer DEFAULT 0 NOT NULL,
  "last_post_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "topic_id" uuid NOT NULL,
  "author_id" text NOT NULL,
  "content" text NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "edited_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "emoji" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "value" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_users_id_fk') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subcategories_category_id_categories_id_fk') THEN
    ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subcategories_parent_subcategory_id_subcategories_id_fk') THEN
    ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_parent_subcategory_id_subcategories_id_fk"
      FOREIGN KEY ("parent_subcategory_id") REFERENCES "subcategories"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_category_id_categories_id_fk') THEN
    ALTER TABLE "topics" ADD CONSTRAINT "topics_category_id_categories_id_fk"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_subcategory_id_subcategories_id_fk') THEN
    ALTER TABLE "topics" ADD CONSTRAINT "topics_subcategory_id_subcategories_id_fk"
      FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_author_id_users_id_fk') THEN
    ALTER TABLE "topics" ADD CONSTRAINT "topics_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_topic_id_topics_id_fk') THEN
    ALTER TABLE "posts" ADD CONSTRAINT "posts_topic_id_topics_id_fk"
      FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_author_id_users_id_fk') THEN
    ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reactions_post_id_posts_id_fk') THEN
    ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk"
      FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reactions_user_id_users_id_fk') THEN
    ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_post_id_posts_id_fk') THEN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_posts_id_fk"
      FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_user_id_users_id_fk') THEN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "subcategories_category_slug_idx" ON "subcategories" USING btree ("category_id", "slug");
CREATE INDEX IF NOT EXISTS "topics_subcategory_idx" ON "topics" USING btree ("subcategory_id");
CREATE INDEX IF NOT EXISTS "topics_category_idx" ON "topics" USING btree ("category_id");
CREATE INDEX IF NOT EXISTS "topics_author_idx" ON "topics" USING btree ("author_id");
CREATE INDEX IF NOT EXISTS "posts_topic_idx" ON "posts" USING btree ("topic_id");
CREATE INDEX IF NOT EXISTS "posts_author_idx" ON "posts" USING btree ("author_id");
CREATE UNIQUE INDEX IF NOT EXISTS "reactions_post_user_emoji_idx" ON "reactions" USING btree ("post_id", "user_id", "emoji");
CREATE UNIQUE INDEX IF NOT EXISTS "votes_post_user_idx" ON "votes" USING btree ("post_id", "user_id");
