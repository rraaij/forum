/*
 * Unique indexes cannot span two tables. These triggers close that gap so a
 * category and subcategory cannot share a name, slug, or abbreviation.
 */
CREATE OR REPLACE FUNCTION enforce_forum_identifier_cross_table_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'categories' THEN
    IF EXISTS (
      SELECT 1 FROM subcategories WHERE lower(name) = lower(NEW.name)
    ) THEN
      RAISE EXCEPTION 'Forum name must be unique'
        USING ERRCODE = '23505',
              CONSTRAINT = 'forum_name_cross_table_unique';
    END IF;
    IF EXISTS (
      SELECT 1 FROM subcategories WHERE lower(slug) = lower(NEW.slug)
    ) THEN
      RAISE EXCEPTION 'Forum slug must be unique'
        USING ERRCODE = '23505',
              CONSTRAINT = 'forum_slug_cross_table_unique';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM subcategories
      WHERE lower(abbreviation) = lower(NEW.abbreviation)
    ) THEN
      RAISE EXCEPTION 'Forum abbreviation must be unique'
        USING ERRCODE = '23505',
              CONSTRAINT = 'forum_abbreviation_cross_table_unique';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM categories WHERE lower(name) = lower(NEW.name)
    ) THEN
      RAISE EXCEPTION 'Forum name must be unique'
        USING ERRCODE = '23505',
              CONSTRAINT = 'forum_name_cross_table_unique';
    END IF;
    IF EXISTS (
      SELECT 1 FROM categories WHERE lower(slug) = lower(NEW.slug)
    ) THEN
      RAISE EXCEPTION 'Forum slug must be unique'
        USING ERRCODE = '23505',
              CONSTRAINT = 'forum_slug_cross_table_unique';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM categories
      WHERE lower(abbreviation) = lower(NEW.abbreviation)
    ) THEN
      RAISE EXCEPTION 'Forum abbreviation must be unique'
        USING ERRCODE = '23505',
              CONSTRAINT = 'forum_abbreviation_cross_table_unique';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER categories_cross_table_identifier_unique
BEFORE INSERT OR UPDATE OF name, slug, abbreviation
ON categories
FOR EACH ROW
EXECUTE FUNCTION enforce_forum_identifier_cross_table_uniqueness();
--> statement-breakpoint
CREATE TRIGGER subcategories_cross_table_identifier_unique
BEFORE INSERT OR UPDATE OF name, slug, abbreviation
ON subcategories
FOR EACH ROW
EXECUTE FUNCTION enforce_forum_identifier_cross_table_uniqueness();
