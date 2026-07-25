CREATE TYPE "public"."post_kind" AS ENUM('opening', 'reply');--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"abbreviation" varchar(5) NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "boards_no_self_parent_check" CHECK ("boards"."id" <> "boards"."parent_id"),
	CONSTRAINT "boards_sort_order_check" CHECK ("boards"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "topic_views" (
	"topic_id" uuid NOT NULL,
	"browser_session_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topic_views_topic_id_browser_session_id_pk" PRIMARY KEY("topic_id","browser_session_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "kind" "post_kind";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "quote_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "board_id" uuid;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "reply_count" integer;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "last_activity_at" timestamp;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_parent_id_boards_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_views" ADD CONSTRAINT "topic_views_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_root_slug_unique_idx" ON "boards" USING btree (lower("slug")) WHERE "boards"."parent_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_sibling_slug_unique_idx" ON "boards" USING btree ("parent_id",lower("slug")) WHERE "boards"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_root_name_unique_idx" ON "boards" USING btree (lower("name")) WHERE "boards"."parent_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_sibling_name_unique_idx" ON "boards" USING btree ("parent_id",lower("name")) WHERE "boards"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_root_abbreviation_unique_idx" ON "boards" USING btree (lower("abbreviation")) WHERE "boards"."parent_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_sibling_abbreviation_unique_idx" ON "boards" USING btree ("parent_id",lower("abbreviation")) WHERE "boards"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "boards_parent_traversal_idx" ON "boards" USING btree ("parent_id","sort_order","name");--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "posts_topic_opening_unique_idx" ON "posts" USING btree ("topic_id") WHERE "posts"."kind" = 'opening';--> statement-breakpoint
CREATE INDEX "posts_reply_keyset_idx" ON "posts" USING btree ("topic_id","created_at","id") WHERE "posts"."kind" = 'reply';--> statement-breakpoint
CREATE INDEX "topics_board_idx" ON "topics" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "topics_board_keyset_idx" ON "topics" USING btree ("board_id","is_pinned" DESC NULLS LAST,"last_activity_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_quote_reply_only_check" CHECK ("posts"."quote_snapshot" IS NULL OR "posts"."kind" = 'reply');--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_deleted_at_consistency_check" CHECK ("posts"."deleted_at" IS NULL OR "posts"."is_deleted");--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_reply_count_check" CHECK ("topics"."reply_count" >= 0);--> statement-breakpoint
/*
 * Authoritative cycle prevention for the boards adjacency list (refactor
 * plan section 4.1). The board-management module performs the same check to
 * return a useful typed error; this trigger protects direct SQL and races.
 */
CREATE OR REPLACE FUNCTION enforce_board_hierarchy_acyclic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Board cannot be its own parent'
      USING ERRCODE = '23514', CONSTRAINT = 'boards_no_cycle';
  END IF;

  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT b.id, b.parent_id
      FROM boards b
      WHERE b.id = NEW.parent_id
      UNION ALL
      SELECT b.id, b.parent_id
      FROM boards b
      JOIN ancestors a ON b.id = a.parent_id
    )
    SELECT 1 FROM ancestors WHERE ancestors.id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Board hierarchy cannot contain cycles'
      USING ERRCODE = '23514', CONSTRAINT = 'boards_no_cycle';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER boards_hierarchy_acyclic
BEFORE INSERT OR UPDATE OF parent_id
ON boards
FOR EACH ROW
EXECUTE FUNCTION enforce_board_hierarchy_acyclic();