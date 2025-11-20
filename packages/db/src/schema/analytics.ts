import {
  timestamp,
  pgTable,
  integer,
  varchar,
  decimal,
  index,
  jsonb,
  uuid,
  date,
} from "drizzle-orm/pg-core";

import { DEFAULT_CURRENCY } from "@host/shared";
import { savingsPlans } from "./savings";
import { user } from "./auth";

/**
 * User analytics table
 * Tracks user behavior and savings patterns
 */
export const userAnalytics = pgTable(
  "user_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    totalSaved: decimal("total_saved", { precision: 15, scale: 2 })
      .default("0.00")
      .notNull(),
    totalWithdrawn: decimal("total_withdrawn", { precision: 15, scale: 2 })
      .default("0.00")
      .notNull(),
    currentStreak: integer("current_streak").default(0).notNull(), // Days
    longestStreak: integer("longest_streak").default(0).notNull(),
    totalContributions: integer("total_contributions").default(0).notNull(),
    completedPlans: integer("completed_plans").default(0).notNull(),
    activePlans: integer("active_plans").default(0).notNull(),
    totalInterestEarned: decimal("total_interest_earned", {
      precision: 15,
      scale: 2,
    })
      .default("0.00")
      .notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    lastContributionDate: date("last_contribution_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_analytics_user_idx").on(table.userId),
    index("user_analytics_streak_idx").on(table.currentStreak),
  ]
);

/**
 * Savings milestones table
 * Tracks achievement of savings goals and milestones
 */
export const savingsMilestones = pgTable(
  "savings_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    planId: uuid("plan_id").references(() => savingsPlans.id, {
      onDelete: "cascade",
    }),
    milestoneType: varchar("milestone_type", { length: 50 }).notNull(), // first_save, streak_7, streak_30, goal_reached, etc.
    milestoneName: varchar("milestone_name", { length: 100 }).notNull(),
    description: varchar("description", { length: 255 }),
    badgeIcon: varchar("badge_icon", { length: 100 }), // Icon identifier
    rewardPoints: integer("reward_points").default(0).notNull(),
    achievedAt: timestamp("achieved_at").defaultNow().notNull(),
  },
  (table) => [
    index("savings_milestones_user_idx").on(table.userId),
    index("savings_milestones_plan_idx").on(table.planId),
    index("savings_milestones_type_idx").on(table.milestoneType),
    index("savings_milestones_achieved_at_idx").on(table.achievedAt),
  ]
);

/**
 * Rewards table
 * Tracks user rewards and incentives
 */
export const rewards = pgTable(
  "rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    rewardType: varchar("reward_type", { length: 50 }).notNull(), // points, discount, cashback, badge
    rewardName: varchar("reward_name", { length: 100 }).notNull(),
    description: varchar("description", { length: 255 }),
    value: decimal("value", { precision: 15, scale: 2 }), // Monetary value if applicable
    points: integer("points").default(0).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(), // active, redeemed, expired
    expiresAt: timestamp("expires_at"),
    redeemedAt: timestamp("redeemed_at"),
    metadata: jsonb("metadata"), // Additional reward data
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rewards_user_idx").on(table.userId),
    index("rewards_type_idx").on(table.rewardType),
    index("rewards_status_idx").on(table.status),
    index("rewards_expires_at_idx").on(table.expiresAt),
  ]
);

/**
 * Daily analytics snapshots
 * Stores daily aggregated metrics for reporting
 */
export const dailyAnalytics = pgTable(
  "daily_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    totalUsers: integer("total_users").default(0).notNull(),
    activeUsers: integer("active_users").default(0).notNull(),
    newUsers: integer("new_users").default(0).notNull(),
    totalSavingsPlans: integer("total_savings_plans").default(0).notNull(),
    activeSavingsPlans: integer("active_savings_plans").default(0).notNull(),
    totalContributions: integer("total_contributions").default(0).notNull(),
    totalContributionAmount: decimal("total_contribution_amount", {
      precision: 15,
      scale: 2,
    })
      .default("0.00")
      .notNull(),
    totalWithdrawals: integer("total_withdrawals").default(0).notNull(),
    totalWithdrawalAmount: decimal("total_withdrawal_amount", {
      precision: 15,
      scale: 2,
    })
      .default("0.00")
      .notNull(),
    activeAjoGroups: integer("active_ajo_groups").default(0).notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("daily_analytics_date_idx").on(table.date)]
);
