/*
 * Backfill existing subforums before enforcing the required compact code.
 * This mirrors the category migration and keeps populated installations valid.
 */
ALTER TABLE "subcategories" ADD COLUMN "abbreviation" varchar(5);
--> statement-breakpoint
UPDATE "subcategories"
SET "abbreviation" = upper(left(trim("name"), 5));
--> statement-breakpoint
ALTER TABLE "subcategories" ALTER COLUMN "abbreviation" SET NOT NULL;
