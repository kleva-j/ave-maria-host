CREATE TABLE "daily_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"total_users" integer DEFAULT 0 NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"new_users" integer DEFAULT 0 NOT NULL,
	"total_savings_plans" integer DEFAULT 0 NOT NULL,
	"active_savings_plans" integer DEFAULT 0 NOT NULL,
	"total_contributions" integer DEFAULT 0 NOT NULL,
	"total_contribution_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_withdrawals" integer DEFAULT 0 NOT NULL,
	"total_withdrawal_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"active_ajo_groups" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_type" varchar(50) NOT NULL,
	"reward_name" varchar(100) NOT NULL,
	"description" varchar(255),
	"value" numeric(15, 2),
	"points" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp,
	"redeemed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"milestone_type" varchar(50) NOT NULL,
	"milestone_name" varchar(100) NOT NULL,
	"description" varchar(255),
	"badge_icon" varchar(100),
	"reward_points" integer DEFAULT 0 NOT NULL,
	"achieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_saved" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_withdrawn" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_contributions" integer DEFAULT 0 NOT NULL,
	"completed_plans" integer DEFAULT 0 NOT NULL,
	"active_plans" integer DEFAULT 0 NOT NULL,
	"total_interest_earned" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"last_contribution_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_analytics_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biometric_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"device_name" varchar(255),
	"public_key" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"date_of_birth" date,
	"address" text,
	"government_id_type" varchar(50),
	"government_id_number" varchar(100),
	"government_id_image" text,
	"selfie_image" text,
	"verification_data" jsonb,
	"verified_by" uuid,
	"verified_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"otp" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"device_id" varchar(255),
	"last_activity_at" timestamp,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token"),
	CONSTRAINT "session_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"phone_number" varchar(20),
	"phone_verified" boolean DEFAULT false,
	"date_of_birth" date,
	"kyc_tier" integer DEFAULT 0 NOT NULL,
	"kyc_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"kyc_data" jsonb,
	"kyc_verified_at" timestamp,
	"biometric_enabled" boolean DEFAULT false,
	"biometric_public_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_suspended" boolean DEFAULT false,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ajo_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"description" text,
	"member_count" integer NOT NULL,
	"current_member_count" integer DEFAULT 1 NOT NULL,
	"contribution_amount" numeric(15, 2) NOT NULL,
	"contribution_frequency" varchar(20) NOT NULL,
	"rotation_order" varchar(20) NOT NULL,
	"current_round" integer DEFAULT 1 NOT NULL,
	"current_position" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'recruiting' NOT NULL,
	"service_fee_rate" numeric(5, 4) DEFAULT '0.0200' NOT NULL,
	"total_collected" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_disbursed" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"start_date" date,
	"next_payout_date" date,
	"end_date" date,
	"is_private" boolean DEFAULT false NOT NULL,
	"invite_code" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ajo_groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "group_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"transaction_id" uuid,
	"due_date" date NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"invited_user_id" uuid,
	"invited_phone" varchar(20),
	"invited_email" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"position" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"has_received_payout" boolean DEFAULT false NOT NULL,
	"payout_received_at" timestamp,
	"total_contributed" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"missed_contributions" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp,
	"removal_reason" text,
	CONSTRAINT "group_user_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"service_fee" numeric(15, 2) NOT NULL,
	"net_amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"transaction_id" uuid,
	"scheduled_date" date NOT NULL,
	"disbursed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"daily_amount" numeric(15, 2) NOT NULL,
	"cycle_duration" integer NOT NULL,
	"target_amount" numeric(15, 2),
	"current_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"auto_save_enabled" boolean DEFAULT false NOT NULL,
	"auto_save_time" time DEFAULT '09:00:00' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"interest_rate" numeric(5, 4) DEFAULT '0.0000' NOT NULL,
	"contribution_streak" integer DEFAULT 0 NOT NULL,
	"total_contributions" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reference" varchar(100) NOT NULL,
	"description" varchar(255),
	"metadata" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(50) NOT NULL,
	"resource_id" uuid,
	"status" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(150) NOT NULL,
	"description" text,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permission_unique" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "user_permission_unique" UNIQUE("user_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "user_role_unique" UNIQUE("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"push_contribution_reminders" boolean DEFAULT true NOT NULL,
	"push_milestones" boolean DEFAULT true NOT NULL,
	"push_group_activity" boolean DEFAULT true NOT NULL,
	"push_payment_updates" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"sms_contribution_reminders" boolean DEFAULT false NOT NULL,
	"sms_milestones" boolean DEFAULT false NOT NULL,
	"sms_payment_updates" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"email_weekly_report" boolean DEFAULT true NOT NULL,
	"email_milestones" boolean DEFAULT true NOT NULL,
	"email_group_activity" boolean DEFAULT true NOT NULL,
	"email_payment_updates" boolean DEFAULT true NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"sent_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" varchar(20) NOT NULL,
	"device_id" varchar(255),
	"device_name" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "scheduled_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_pattern" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_milestones" ADD CONSTRAINT "savings_milestones_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_milestones" ADD CONSTRAINT "savings_milestones_plan_id_savings_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."savings_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_analytics" ADD CONSTRAINT "user_analytics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_auth" ADD CONSTRAINT "biometric_auth_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajo_groups" ADD CONSTRAINT "ajo_groups_organizer_id_user_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_contributions" ADD CONSTRAINT "group_contributions_group_id_ajo_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ajo_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_contributions" ADD CONSTRAINT "group_contributions_member_id_group_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_contributions" ADD CONSTRAINT "group_contributions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_id_ajo_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ajo_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invited_user_id_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_ajo_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ajo_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_payouts" ADD CONSTRAINT "group_payouts_group_id_ajo_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ajo_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_payouts" ADD CONSTRAINT "group_payouts_member_id_group_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_payouts" ADD CONSTRAINT "group_payouts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_plans" ADD CONSTRAINT "savings_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plan_id_savings_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."savings_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_analytics_date_idx" ON "daily_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "rewards_user_idx" ON "rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rewards_type_idx" ON "rewards" USING btree ("reward_type");--> statement-breakpoint
CREATE INDEX "rewards_status_idx" ON "rewards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rewards_expires_at_idx" ON "rewards" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "savings_milestones_user_idx" ON "savings_milestones" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_milestones_plan_idx" ON "savings_milestones" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "savings_milestones_type_idx" ON "savings_milestones" USING btree ("milestone_type");--> statement-breakpoint
CREATE INDEX "savings_milestones_achieved_at_idx" ON "savings_milestones" USING btree ("achieved_at");--> statement-breakpoint
CREATE INDEX "user_analytics_user_idx" ON "user_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_analytics_streak_idx" ON "user_analytics" USING btree ("current_streak");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "biometric_auth_user_idx" ON "biometric_auth" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "biometric_auth_device_idx" ON "biometric_auth" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "biometric_auth_is_active_idx" ON "biometric_auth" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "kyc_verification_user_idx" ON "kyc_verification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kyc_verification_status_idx" ON "kyc_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_verification_tier_idx" ON "kyc_verification" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "phone_verification_phone_idx" ON "phone_verification" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "phone_verification_expires_at_idx" ON "phone_verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_phone_idx" ON "user" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "user_kyc_tier_idx" ON "user" USING btree ("kyc_tier");--> statement-breakpoint
CREATE INDEX "user_kyc_status_idx" ON "user" USING btree ("kyc_status");--> statement-breakpoint
CREATE INDEX "user_is_active_idx" ON "user" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ajo_groups_organizer_idx" ON "ajo_groups" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "ajo_groups_status_idx" ON "ajo_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ajo_groups_invite_code_idx" ON "ajo_groups" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "group_contributions_group_idx" ON "group_contributions" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_contributions_member_idx" ON "group_contributions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "group_contributions_user_idx" ON "group_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_contributions_status_idx" ON "group_contributions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_contributions_round_idx" ON "group_contributions" USING btree ("round");--> statement-breakpoint
CREATE INDEX "group_invitations_group_idx" ON "group_invitations" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_invitations_invited_user_idx" ON "group_invitations" USING btree ("invited_user_id");--> statement-breakpoint
CREATE INDEX "group_invitations_status_idx" ON "group_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_members_status_idx" ON "group_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_payouts_group_idx" ON "group_payouts" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_payouts_member_idx" ON "group_payouts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "group_payouts_user_idx" ON "group_payouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_payouts_status_idx" ON "group_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_payouts_round_idx" ON "group_payouts" USING btree ("round");--> statement-breakpoint
CREATE INDEX "savings_plans_user_idx" ON "savings_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_plans_status_idx" ON "savings_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "savings_plans_auto_save_idx" ON "savings_plans" USING btree ("auto_save_enabled","auto_save_time");--> statement-breakpoint
CREATE INDEX "savings_plans_end_date_idx" ON "savings_plans" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "transactions_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_plan_idx" ON "transactions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transactions_reference_idx" ON "transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wallets_user_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallets_is_active_idx" ON "wallets" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_status_idx" ON "audit_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "permissions_resource_idx" ON "permissions" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "permissions_action_idx" ON "permissions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "permissions_name_idx" ON "permissions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "user_permissions_permission_idx" ON "user_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "user_permissions_user_idx" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_user_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "push_tokens_user_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_tokens_is_active_idx" ON "push_tokens" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scheduled_notifications_scheduled_for_idx" ON "scheduled_notifications" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "scheduled_notifications_status_idx" ON "scheduled_notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scheduled_notifications_user_idx" ON "scheduled_notifications" USING btree ("user_id");
