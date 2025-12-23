ALTER TABLE "daily_analytics" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_analytics" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ajo_groups" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "group_contributions" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "group_payouts" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "savings_plans" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_source" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "failure_reason" varchar(255);--> statement-breakpoint
CREATE INDEX "transactions_payment_source_idx" ON "transactions" USING btree ("payment_source");