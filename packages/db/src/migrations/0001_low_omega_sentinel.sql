ALTER TABLE "savings_plans" ADD COLUMN "minimum_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "savings_plans" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
COMMENT ON COLUMN "savings_plans"."minimum_balance" IS 'Minimum balance that must be maintained in the plan';-- Add comments for documentation
COMMENT ON COLUMN "savings_plans"."version" IS 'Version number for optimistic concurrency control';
CREATE INDEX "savings_plans_version_idx" ON "savings_plans" USING btree ("version");
