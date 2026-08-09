ALTER TABLE "boards" ADD COLUMN "is_guest_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "allow_new_topics" boolean DEFAULT true NOT NULL;