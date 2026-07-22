/*
 * Serialize writes that participate in cross-table uniqueness. Without this
 * transaction lock, simultaneous inserts into different tables could each
 * check before the other commits and both pass.
 */
CREATE OR REPLACE FUNCTION enforce_forum_identifier_cross_table_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('forum_identifier_uniqueness'));

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
