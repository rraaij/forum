ALTER TABLE "categories" DROP CONSTRAINT "categories_slug_unique";--> statement-breakpoint
DROP INDEX "subcategories_category_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique_idx" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique_idx" ON "categories" USING btree (lower("slug"));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_abbreviation_unique_idx" ON "categories" USING btree (lower("abbreviation"));--> statement-breakpoint
CREATE UNIQUE INDEX "subcategories_name_unique_idx" ON "subcategories" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "subcategories_slug_unique_idx" ON "subcategories" USING btree (lower("slug"));--> statement-breakpoint
CREATE UNIQUE INDEX "subcategories_abbreviation_unique_idx" ON "subcategories" USING btree (lower("abbreviation"));