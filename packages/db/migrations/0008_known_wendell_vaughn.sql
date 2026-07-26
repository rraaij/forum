ALTER TABLE "posts" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3);--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "last_activity_at" SET DATA TYPE timestamp (3);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
/*
 * Direct SQL must participate in the same hierarchy serialization protocol
 * as the BoardManagement module. Without this lock, two concurrent trigger
 * executions can each validate against the pre-move tree and commit a cycle.
 */
CREATE OR REPLACE FUNCTION enforce_board_hierarchy_acyclic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('forum_board_hierarchy'));

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
$$;
