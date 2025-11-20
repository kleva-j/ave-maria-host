import {
  timestamp,
  pgTable,
  boolean,
  varchar,
  unique,
  index,
  uuid,
  text,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Roles table
 * Defines system roles for RBAC
 */
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(), // System roles cannot be deleted
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("roles_name_idx").on(table.name)]
);

/**
 * Permissions table
 * Defines granular permissions in the system
 */
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    displayName: varchar("display_name", { length: 150 }).notNull(),
    description: text("description"),
    resource: varchar("resource", { length: 50 }).notNull(), // e.g., 'savings', 'wallet', 'group'
    action: varchar("action", { length: 50 }).notNull(), // e.g., 'create', 'read', 'update', 'delete'
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("permissions_resource_idx").on(table.resource),
    index("permissions_action_idx").on(table.action),
    index("permissions_name_idx").on(table.name),
  ]
);

/**
 * Role permissions table
 * Maps permissions to roles (many-to-many)
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("role_permission_unique").on(table.roleId, table.permissionId),
    index("role_permissions_permission_idx").on(table.permissionId),
    index("role_permissions_role_idx").on(table.roleId),
  ]
);

/**
 * User roles table
 * Assigns roles to users (many-to-many)
 */
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    assignedBy: uuid("assigned_by").references(() => user.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"), // Optional expiration for temporary roles
  },
  (table) => [
    unique("user_role_unique").on(table.userId, table.roleId),
    index("user_roles_user_idx").on(table.userId),
    index("user_roles_role_idx").on(table.roleId),
  ]
);

/**
 * User permissions table
 * Direct permission assignments to users (for exceptions)
 */
export const userPermissions = pgTable(
  "user_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.id, { onDelete: "cascade" })
      .notNull(),
    assignedBy: uuid("assigned_by").references(() => user.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    unique("user_permission_unique").on(table.userId, table.permissionId),
    index("user_permissions_permission_idx").on(table.permissionId),
    index("user_permissions_user_idx").on(table.userId),
  ]
);

/**
 * Audit log table
 * Tracks all permission-related changes and security events
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g., 'user.login', 'savings.create', 'wallet.withdraw'
    resource: varchar("resource", { length: 50 }).notNull(),
    resourceId: uuid("resource_id"), // ID of the affected resource
    status: varchar("status", { length: 20 }).notNull(), // success, failure, denied
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    metadata: text("metadata"), // JSON string with additional context
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_status_idx").on(table.status),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_resource_idx").on(table.resource),
    index("audit_log_created_at_idx").on(table.createdAt),
  ]
);
