/*
 * DESTRUCTIVE contract/reset migration (refactor plan sections 4.5 and 8).
 *
 * This migration DELETES ALL FORUM CONTENT. There is no migration of legacy
 * topics, posts, quotes, or the category/subcategory hierarchy by design:
 * the redesigned columns cannot be back-filled from legacy rows, so the
 * forum is reset instead of converted. Boards are cleared too; the
 * development seed recreates them.
 *
 * It MUST NOT touch authentication or profile data. No statement below
 * references users, sessions, or accounts, and none may be added: every
 * profile column lives on `users` and must survive byte-for-byte.
 *
 * drizzle-kit runs each migration file in one transaction, so a failure
 * anywhere leaves the database on the previous schema.
 */

/*
 * 1. Delete dependent forum content in dependency order. Cascades would
 * cover most of this, but the explicit order documents what is destroyed
 * and keeps the blast radius auditable.
 */
DELETE FROM "votes";--> statement-breakpoint
DELETE FROM "reactions";--> statement-breakpoint
DELETE FROM "topic_views";--> statement-breakpoint
DELETE FROM "posts";--> statement-breakpoint
DELETE FROM "topics";--> statement-breakpoint
-- Expand-phase board rows; the Board-only development seed recreates them.
DELETE FROM "boards";--> statement-breakpoint

/*
 * 2. Drop the legacy hierarchy. Dropping the tables removes their rows and
 * their cross-table uniqueness triggers; the shared trigger FUNCTION is not
 * owned by either table and must go explicitly.
 */
ALTER TABLE "topics" DROP CONSTRAINT "topics_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "topics" DROP CONSTRAINT "topics_subcategory_id_subcategories_id_fk";--> statement-breakpoint
DROP TABLE "subcategories";--> statement-breakpoint
DROP TABLE "categories";--> statement-breakpoint
DROP FUNCTION IF EXISTS enforce_forum_identifier_cross_table_uniqueness();--> statement-breakpoint

-- 3. Drop the legacy topic columns and their indexes.
DROP INDEX "topics_subcategory_idx";--> statement-breakpoint
DROP INDEX "topics_category_idx";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "subcategory_id";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "post_count";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "last_post_at";--> statement-breakpoint

/*
 * 4. Promote the redesign columns to required. These succeed only because
 * every legacy row was deleted above — that is the whole reason this
 * migration resets rather than converts.
 */
ALTER TABLE "posts" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "board_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "reply_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "last_activity_at" SET NOT NULL;--> statement-breakpoint

/*
 * 5. Final constraints. Topic slugs address a topic globally, so uniqueness
 * is global and case-insensitive. Post deletion state is one fact in two
 * columns, which may never disagree.
 */
CREATE UNIQUE INDEX "topics_slug_unique_idx" ON "topics" USING btree (lower("slug"));--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_deleted_at_consistency_check";--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_deleted_at_consistency_check" CHECK (("posts"."is_deleted" = false AND "posts"."deleted_at" IS NULL)
          OR ("posts"."is_deleted" = true AND "posts"."deleted_at" IS NOT NULL));
