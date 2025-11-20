import {
  timestamp,
  pgTable,
  boolean,
  varchar,
  index,
  jsonb,
  uuid,
  text,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Notification preferences table
 * Stores user preferences for different notification types
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    // Push notifications
    pushEnabled: boolean("push_enabled").default(true).notNull(),
    pushContributionReminders: boolean("push_contribution_reminders")
      .default(true)
      .notNull(),
    pushMilestones: boolean("push_milestones").default(true).notNull(),
    pushGroupActivity: boolean("push_group_activity").default(true).notNull(),
    pushPaymentUpdates: boolean("push_payment_updates").default(true).notNull(),
    // SMS notifications
    smsEnabled: boolean("sms_enabled").default(false).notNull(),
    smsContributionReminders: boolean("sms_contribution_reminders")
      .default(false)
      .notNull(),
    smsMilestones: boolean("sms_milestones").default(false).notNull(),
    smsPaymentUpdates: boolean("sms_payment_updates").default(true).notNull(),
    // Email notifications
    emailEnabled: boolean("email_enabled").default(true).notNull(),
    emailWeeklyReport: boolean("email_weekly_report").default(true).notNull(),
    emailMilestones: boolean("email_milestones").default(true).notNull(),
    emailGroupActivity: boolean("email_group_activity").default(true).notNull(),
    emailPaymentUpdates: boolean("email_payment_updates")
      .default(true)
      .notNull(),
    // Quiet hours
    quietHoursEnabled: boolean("quiet_hours_enabled").default(false).notNull(),
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:MM format
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:MM format
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("notification_preferences_user_idx").on(table.userId)]
);

/**
 * Notifications table
 * Stores all notifications sent to users
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(), // contribution_reminder, milestone, group_activity, payment_update, etc.
    channel: varchar("channel", { length: 20 }).notNull(), // push, sms, email
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    data: jsonb("data"), // Additional structured data
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, failed, read
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at"),
    sentAt: timestamp("sent_at"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_type_idx").on(table.type),
    index("notifications_status_idx").on(table.status),
    index("notifications_is_read_idx").on(table.isRead),
    index("notifications_created_at_idx").on(table.createdAt),
  ]
);

/**
 * Scheduled notifications table
 * Manages scheduled/recurring notifications
 */
export const scheduledNotifications = pgTable(
  "scheduled_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    channel: varchar("channel", { length: 20 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    data: jsonb("data"),
    scheduledFor: timestamp("scheduled_for").notNull(),
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurringPattern: varchar("recurring_pattern", { length: 50 }), // daily, weekly, monthly
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, cancelled
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("scheduled_notifications_scheduled_for_idx").on(table.scheduledFor),
    index("scheduled_notifications_status_idx").on(table.status),
    index("scheduled_notifications_user_idx").on(table.userId),
  ]
);

/**
 * Push notification tokens table
 * Stores device tokens for push notifications
 */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    platform: varchar("platform", { length: 20 }).notNull(), // ios, android, web
    deviceId: varchar("device_id", { length: 255 }),
    deviceName: varchar("device_name", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("push_tokens_user_idx").on(table.userId),
    index("push_tokens_token_idx").on(table.token),
    index("push_tokens_is_active_idx").on(table.isActive),
  ]
);
