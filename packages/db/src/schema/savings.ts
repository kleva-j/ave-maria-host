import {
  timestamp,
  pgTable,
  integer,
  boolean,
  varchar,
  decimal,
  index,
  uuid,
  date,
  time,
} from "drizzle-orm/pg-core";

import { DEFAULT_CURRENCY } from "@host/shared";
import { user } from "./auth";

/**
 * Savings plans table
 */
export const savingsPlans = pgTable(
  "savings_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    planName: varchar("plan_name", { length: 100 }).notNull(),
    dailyAmount: decimal("daily_amount", { precision: 15, scale: 2 }).notNull(),
    cycleDuration: integer("cycle_duration").notNull(), // days
    targetAmount: decimal("target_amount", { precision: 15, scale: 2 }),
    currentAmount: decimal("current_amount", { precision: 15, scale: 2 })
      .default("0.00")
      .notNull(),
    autoSaveEnabled: boolean("auto_save_enabled").default(false).notNull(),
    autoSaveTime: time("auto_save_time").default("09:00:00").notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(), // active, paused, completed, cancelled
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    interestRate: decimal("interest_rate", { precision: 5, scale: 4 })
      .default("0.0000")
      .notNull(),
    contributionStreak: integer("contribution_streak").default(0).notNull(),
    totalContributions: integer("total_contributions").default(0).notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("savings_plans_user_idx").on(table.userId),
    index("savings_plans_status_idx").on(table.status),
    index("savings_plans_auto_save_idx").on(
      table.autoSaveEnabled,
      table.autoSaveTime
    ),
    index("savings_plans_end_date_idx").on(table.endDate),
  ]
);

/**
 * Transactions table
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    planId: uuid("plan_id").references(() => savingsPlans.id, {
      onDelete: "set null",
    }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    type: varchar("type", { length: 20 }).notNull(), // contribution, withdrawal, interest, penalty, refund
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, completed, failed, cancelled
    reference: varchar("reference", { length: 100 }).notNull().unique(),
    description: varchar("description", { length: 255 }),
    metadata: varchar("metadata", { length: 1000 }), // JSON string for additional data
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("transactions_user_idx").on(table.userId),
    index("transactions_plan_idx").on(table.planId),
    index("transactions_status_idx").on(table.status),
    index("transactions_type_idx").on(table.type),
    index("transactions_reference_idx").on(table.reference),
    index("transactions_created_at_idx").on(table.createdAt),
  ]
);

/**
 * Wallets table
 */
export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    balance: decimal("balance", { precision: 15, scale: 2 })
      .default("0.00")
      .notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("wallets_user_idx").on(table.userId),
    index("wallets_is_active_idx").on(table.isActive),
  ]
);
