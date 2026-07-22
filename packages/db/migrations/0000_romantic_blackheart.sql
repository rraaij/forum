/*
 * Existing installations already have the forum tables because the project
 * previously used schema push without committed migration history. Add the new
 * column in three steps so populated category rows receive a valid value before
 * the NOT NULL constraint is applied.
 */
ALTER TABLE "categories" ADD COLUMN "abbreviation" varchar(5);
--> statement-breakpoint
UPDATE "categories"
SET "abbreviation" = upper(left(trim("name"), 5));
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "abbreviation" SET NOT NULL;
