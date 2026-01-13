import type { AuthContext, TransactionLimitType } from "@host/shared";
import type { Effect } from "effect";
import type {
  InsufficientKycTierError,
  AccountSuspendedError,
  UserNotFoundError,
  UnauthorizedError,
} from "../auth/errors";

import { Context } from "effect";

/**
 * Permission resource actions
 */
export type ResourceActions = {
  // Analytics Actions
  analytics: "read" | "export";
  // KYC Actions
  kyc: "submit" | "approve" | "review" | "reject";
  // User Actions
  user: "read" | "update" | "suspend" | "delete";
  // Wallet Actions
  wallet: "read" | "fund" | "withdraw" | "transfer";
  // Admin Actions
  admin: "transactions" | "groups" | "users" | "system" | "kyc";
  // Group Actions
  group: "create" | "read" | "join" | "manage" | "moderate" | "delete";
  // Savings Actions
  savings: "contribute" | "withdraw" | "update" | "create" | "delete" | "read";
};

/**
 * Permission resources
 */
export type Resources = keyof ResourceActions;

/**
 * Permission types for operations (access control list)
 */
export type Permission = {
  [K in Resources]: `${K}:${ResourceActions[K]}`;
}[Resources];

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
 * Operation context for authorization checks
 */
export interface OperationContext {
  readonly operation: string;
  readonly resource?: string;
  readonly resourceId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly requiredTier?: number;
  readonly requiredRole?: Role;
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

  /**
   * Check if user has required KYC tier (throws error if not)
   */
  readonly checkKycTier: (
    authContext: AuthContext,
    requiredTier: number,
    operation: string
  ) => Effect.Effect<void, InsufficientKycTierError>;

  /**
   * Check if user has permission (throws error if not)
   */
  readonly checkPermission: (
    authContext: AuthContext,
    permission: Permission
  ) => Effect.Effect<void, UnauthorizedError>;

  /**
   * Check if user has role (throws error if not)
   */
  readonly checkRole: (
    authContext: AuthContext,
    role: Role
  ) => Effect.Effect<void, UnauthorizedError>;

  /**
   * Check if account is active and not suspended (throws error if not)
   */
  readonly checkAccountStatus: (
    authContext: AuthContext
  ) => Effect.Effect<void, UnauthorizedError | AccountSuspendedError>;

  /**
   * Check transaction limits based on KYC tier (throws error if exceeded)
   */
  readonly checkTransactionLimit: (
    authContext: AuthContext,
    amount: number,
    limitType: TransactionLimitType
  ) => Effect.Effect<void, UnauthorizedError>;

  /**
   * Authorize operation with full context (throws error if not authorized)
   */
  readonly authorizeOperation: (
    authContext: AuthContext,
    operation: OperationContext
  ) => Effect.Effect<void, UnauthorizedError | AccountSuspendedError>;
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
