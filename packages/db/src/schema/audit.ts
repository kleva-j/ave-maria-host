import {
  AuditLogStatusSchema,
  AuditSeveritySchema,
  AuditCategorySchema,
  AUDIT_LOG_STATUS,
  AUDIT_SEVERITY,
  AUDIT_CATEGORY,
} from "@host/shared";

import {
  timestamp,
  varchar,
  pgTable,
  index,
  jsonb,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Audit Log Table
 *
 * Stores immutable records of system activities for security and compliance.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    category: varchar("category", { length: 50 })
      .notNull()
      .default(AuditCategorySchema.make(AUDIT_CATEGORY.SYSTEM)), // authentication, financial, etc.
    severity: varchar("severity", { length: 20 })
      .notNull()
      .default(AuditSeveritySchema.make(AUDIT_SEVERITY.LOW)), // low, medium, high, critical
    action: varchar("action", { length: 100 }).notNull(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
    userEmail: text("user_email"), // Snapshot of email at time of event
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    resource: varchar("resource", { length: 100 }),
    resourceId: text("resource_id"),
    status: varchar("status", { length: 20 })
      .notNull()
      .default(AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS)), // success, failure, warning
    details: jsonb("details"), // Structured event details
    metadata: jsonb("metadata"), // Additional context
  },
  (table) => [
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_category_idx").on(table.category),
    index("audit_log_timestamp_idx").on(table.timestamp),
    index("audit_log_resource_idx").on(table.resource, table.resourceId),
  ]
);
