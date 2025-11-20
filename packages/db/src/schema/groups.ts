import {
  timestamp,
  pgTable,
  integer,
  boolean,
  varchar,
  decimal,
  uuid,
  date,
  text,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { DEFAULT_CURRENCY } from "@host/shared";
import { user } from "./auth";

/**
 * Ajo/Esusu groups table
 * Represents rotating savings and credit associations (ROSCA)
 */
export const ajoGroups = pgTable(
  "ajo_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    groupName: varchar("group_name", { length: 100 }).notNull(),
    description: text("description"),
    memberCount: integer("member_count").notNull(),
    currentMemberCount: integer("current_member_count").default(1).notNull(), // Starts with organizer
    contributionAmount: decimal("contribution_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    contributionFrequency: varchar("contribution_frequency", {
      length: 20,
    }).notNull(), // daily, weekly, monthly
    rotationOrder: varchar("rotation_order", { length: 20 }).notNull(), // manual, random, sequential
    currentRound: integer("current_round").default(1).notNull(),
    currentPosition: integer("current_position").default(0).notNull(), // Current position in rotation
    status: varchar("status", { length: 20 }).default("recruiting").notNull(), // recruiting, active, completed, cancelled
    serviceFeeRate: decimal("service_fee_rate", {
      precision: 5,
      scale: 4,
    })
      .default("0.0200")
      .notNull(), // 2% default
    totalCollected: decimal("total_collected", { precision: 15, scale: 2 })
      .default("0.00")
      .notNull(),
    totalDisbursed: decimal("total_disbursed", { precision: 15, scale: 2 })
      .default("0.00")
      .notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    startDate: date("start_date"),
    nextPayoutDate: date("next_payout_date"),
    endDate: date("end_date"),
    isPrivate: boolean("is_private").default(false).notNull(), // Private groups require invitation
    inviteCode: varchar("invite_code", { length: 20 }).unique(), // For joining private groups
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ajo_groups_organizer_idx").on(table.organizerId),
    index("ajo_groups_status_idx").on(table.status),
    index("ajo_groups_invite_code_idx").on(table.inviteCode),
  ]
);

/**
 * Group members table
 * Tracks membership in Ajo/Esusu groups
 */
export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => ajoGroups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).default("member").notNull(), // organizer, member
    position: integer("position"), // Position in rotation order
    status: varchar("status", { length: 20 }).default("active").notNull(), // active, suspended, removed
    hasReceivedPayout: boolean("has_received_payout").default(false).notNull(),
    payoutReceivedAt: timestamp("payout_received_at"),
    totalContributed: decimal("total_contributed", { precision: 15, scale: 2 })
      .default("0.00")
      .notNull(),
    missedContributions: integer("missed_contributions").default(0).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    removedAt: timestamp("removed_at"),
    removalReason: text("removal_reason"),
  },
  (table) => [
    unique("group_user_unique").on(table.groupId, table.userId),
    index("group_members_group_idx").on(table.groupId),
    index("group_members_user_idx").on(table.userId),
    index("group_members_status_idx").on(table.status),
  ]
);

/**
 * Group contributions table
 * Tracks individual contributions to Ajo/Esusu groups
 */
export const groupContributions = pgTable(
  "group_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => ajoGroups.id, { onDelete: "cascade" })
      .notNull(),
    memberId: uuid("member_id")
      .references(() => groupMembers.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    round: integer("round").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, completed, failed, late
    transactionId: uuid("transaction_id"), // Link to main transactions table
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("group_contributions_group_idx").on(table.groupId),
    index("group_contributions_member_idx").on(table.memberId),
    index("group_contributions_user_idx").on(table.userId),
    index("group_contributions_status_idx").on(table.status),
    index("group_contributions_round_idx").on(table.round),
  ]
);

/**
 * Group payouts table
 * Tracks payouts to group members
 */
export const groupPayouts = pgTable(
  "group_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => ajoGroups.id, { onDelete: "cascade" })
      .notNull(),
    memberId: uuid("member_id")
      .references(() => groupMembers.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    round: integer("round").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    serviceFee: decimal("service_fee", { precision: 15, scale: 2 }).notNull(),
    netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 })
      .default(DEFAULT_CURRENCY)
      .notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, failed
    transactionId: uuid("transaction_id"), // Link to main transactions table
    scheduledDate: date("scheduled_date").notNull(),
    disbursedAt: timestamp("disbursed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("group_payouts_group_idx").on(table.groupId),
    index("group_payouts_member_idx").on(table.memberId),
    index("group_payouts_user_idx").on(table.userId),
    index("group_payouts_status_idx").on(table.status),
    index("group_payouts_round_idx").on(table.round),
  ]
);

/**
 * Group invitations table
 * Manages invitations to join groups
 */
export const groupInvitations = pgTable(
  "group_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => ajoGroups.id, { onDelete: "cascade" })
      .notNull(),
    invitedBy: uuid("invited_by")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    invitedUserId: uuid("invited_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    invitedPhone: varchar("invited_phone", { length: 20 }), // For users not yet registered
    invitedEmail: varchar("invited_email", { length: 255 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, rejected, expired
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    rejectedAt: timestamp("rejected_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("group_invitations_group_idx").on(table.groupId),
    index("group_invitations_invited_user_idx").on(table.invitedUserId),
    index("group_invitations_status_idx").on(table.status),
  ]
);
