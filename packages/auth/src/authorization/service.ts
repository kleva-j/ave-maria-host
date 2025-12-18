import type { UnauthorizedError, UserNotFoundError } from "../effects";
import type { AuthContext } from "..";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Permission types in the system
 */
export type Permission =
  // User management
  | "user:read"
  | "user:update"
  | "user:delete"
  | "user:suspend"

  // Savings operations
  | "savings:create"
  | "savings:read"
  | "savings:update"
  | "savings:delete"
  | "savings:contribute"
  | "savings:withdraw"

  // Group operations
  | "group:create"
  | "group:read"
  | "group:join"
  | "group:manage"
  | "group:moderate"
  | "group:delete"

  // Wallet operations
  | "wallet:read"
  | "wallet:fund"
  | "wallet:withdraw"
  | "wallet:transfer"

  // Admin operations
  | "admin:users"
  | "admin:groups"
  | "admin:transactions"
  | "admin:kyc"
  | "admin:system"

  // KYC operations
  | "kyc:submit"
  | "kyc:review"
  | "kyc:approve"
  | "kyc:reject"

  // Analytics
  | "analytics:read"
  | "analytics:export";

/**
 * User roles in the system
 */
export type Role =
  | "user" // Regular user (KYC Tier 0-2)
  | "moderator" // Group moderator
  | "admin" // System administrator
  | "super_admin" // Super administrator
  | "kyc_reviewer" // KYC reviewer
  | "support"; // Customer support

/**
 * Resource types that can be protected
 */
export type Resource =
  | "user"
  | "savings_plan"
  | "group"
  | "transaction"
  | "wallet"
  | "kyc_verification"
  | "system";

/**
 * Authorization context for permission checks
 */
export interface AuthorizationContext {
  readonly authContext: AuthContext;
  readonly roles: Role[];
  readonly kycTier: number;
  readonly permissions: Permission[];
  readonly isActive: boolean;
  readonly isSuspended: boolean;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly requiredPermission?: Permission;
  readonly requiredRole?: Role;
  readonly requiredKycTier?: number;
}

/**
 * Audit log entry for authorization events
 */
export interface AuthorizationAuditLog {
  readonly id: string;
  readonly userId: string;
  readonly action: string;
  readonly resource: Resource;
  readonly resourceId?: string;
  readonly permission: Permission;
  readonly allowed: boolean;
  readonly reason?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: Date;
}

/**
 * Authorization service interface
 */
export interface AuthorizationService {
  /**
   * Check if user has a specific permission
   */
  readonly hasPermission: (
    authContext: AuthContext,
    permission: Permission,
    resource?: Resource,
    resourceId?: string
  ) => Effect.Effect<boolean, UnauthorizedError | UserNotFoundError>;

  /**
   * Check if user has a specific role
   */
  readonly hasRole: (
    authContext: AuthContext,
    role: Role
  ) => Effect.Effect<boolean, UserNotFoundError>;

  /**
   * Check if user can perform an action on a resource
   */
  readonly canPerformAction: (
    authContext: AuthContext,
    action: string,
    resource: Resource,
    resourceId?: string
  ) => Effect.Effect<PermissionResult, UserNotFoundError>;

  /**
   * Get user's authorization context
   */
  readonly getAuthorizationContext: (
    authContext: AuthContext
  ) => Effect.Effect<AuthorizationContext, UserNotFoundError>;

  /**
   * Assign role to user
   */
  readonly assignRole: (
    authContext: AuthContext,
    role: Role,
    assignedBy: string
  ) => Effect.Effect<void, UnauthorizedError | UserNotFoundError>;

  /**
   * Remove role from user
   */
  readonly removeRole: (
    authContext: AuthContext,
    role: Role,
    removedBy: string
  ) => Effect.Effect<void, UnauthorizedError | UserNotFoundError>;

  /**
   * Grant permission to user
   */
  readonly grantPermission: (
    authContext: AuthContext,
    permission: Permission,
    grantedBy: string
  ) => Effect.Effect<void, UnauthorizedError | UserNotFoundError>;

  /**
   * Revoke permission from user
   */
  readonly revokePermission: (
    authContext: AuthContext,
    permission: Permission,
    revokedBy: string
  ) => Effect.Effect<void, UnauthorizedError | UserNotFoundError>;

  /**
   * Check resource ownership
   */
  readonly isResourceOwner: (
    authContext: AuthContext,
    resource: Resource,
    resourceId: string
  ) => Effect.Effect<boolean, UserNotFoundError>;

  /**
   * Log authorization event for audit
   */
  readonly logAuthorizationEvent: (
    event: Omit<AuthorizationAuditLog, "id" | "timestamp">
  ) => Effect.Effect<void, never>;

  /**
   * Get authorization audit logs
   */
  readonly getAuditLogs: (
    authContext: AuthContext,
    resource?: Resource,
    limit?: number,
    offset?: number
  ) => Effect.Effect<AuthorizationAuditLog[], never>;

  /**
   * Validate KYC tier requirement
   */
  readonly validateKycTier: (
    authContext: AuthContext,
    requiredTier: number,
    operation: string
  ) => Effect.Effect<boolean, UnauthorizedError | UserNotFoundError>;
}

/**
 * Context tag for the AuthorizationService
 */
export const AuthorizationService = Context.GenericTag<AuthorizationService>(
  "@host/auth/AuthorizationService"
);

/**
 * Type alias for AuthorizationService dependency
 */
export type AuthorizationServiceDeps = typeof AuthorizationService.Service;

/**
 * Default role-based permissions mapping
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [
    "user:read",
    "user:update",
    "savings:create",
    "savings:read",
    "savings:update",
    "savings:contribute",
    "savings:withdraw",
    "group:join",
    "wallet:read",
    "wallet:fund",
    "wallet:withdraw",
    "kyc:submit",
    "analytics:read",
  ],
  moderator: ["group:manage", "group:moderate"],
  admin: [
    "admin:users",
    "admin:groups",
    "admin:transactions",
    "user:suspend",
    "group:delete",
  ],
  super_admin: ["admin:system", "user:delete"],
  kyc_reviewer: ["kyc:review", "kyc:approve", "kyc:reject", "admin:kyc"],
  support: [
    "user:read",
    "savings:read",
    "group:read",
    "wallet:read",
    "analytics:read",
  ],
};

/**
 * KYC tier-based permissions
 */
export const KYC_TIER_PERMISSIONS: Record<number, Permission[]> = {
  0: ["user:read", "user:update", "wallet:read", "kyc:submit"],
  1: [
    "savings:create",
    "savings:read",
    "savings:update",
    "savings:contribute",
    "group:join",
    "wallet:fund",
    "analytics:read",
  ],
  2: [
    "savings:withdraw",
    "group:create",
    "group:manage",
    "wallet:withdraw",
    "wallet:transfer",
    "analytics:export",
  ],
};
