ALTER TABLE "daily_challenges" ADD COLUMN "event_context" text;--> statement-breakpoint
ALTER TABLE "daily_challenges" ADD COLUMN "technique_id" text;--> statement-breakpoint
ALTER TABLE "daily_challenges" ADD COLUMN "reality_check" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "staged_articles" ADD COLUMN "article_excerpt" text;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "used_lifelines" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "reality_choice_index" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "reality_correct" boolean;