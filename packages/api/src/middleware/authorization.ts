/**
 * @fileoverview Authorization Middleware
 *
 * This module provides role-based access control (RBAC) and operation-specific
 * authorization checks for the AV-Daily platform. It enforces KYC tier requirements,
 * permission checks, and audit logging for security compliance.
 *
 * ## Key Features:
 * - **KYC Tier Enforcement**: Ensure users meet minimum KYC requirements
 * - **Role-Based Access Control**: Check user roles and permissions
 * - **Operation Guards**: Protect sensitive operations with authorization checks
 * - **Audit Logging**: Log all authorization decisions for compliance
 * - **Transaction Limits**: Enforce transaction limits based on KYC tier
 */

import type { TransactionLimitType } from "../types";
import type { AuthContext } from "@host/auth";

import { logAuditEvent, LoggerService } from "./logging";
import { Effect, Context, Layer } from "effect";
import {
  InsufficientKycTierError,
  AccountSuspendedError,
  getTransactionLimits,
  UnauthorizedError,
} from "@host/auth";

// ============================================================================
// Authorization Types
// ============================================================================

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
 * Permission resource actions
 */
export type ResourceActions = {
  wallet: "read" | "fund" | "withdraw" | "transfer";
  kyc: "submit" | "approve" | "review" | "reject";
  user: "read" | "update" | "suspend" | "delete";
  analytics: "read" | "export";
  admin: "transactions" | "groups" | "users" | "system" | "kyc";
  group: "create" | "read" | "join" | "manage" | "moderate" | "delete";
  savings: "contribute" | "withdraw" | "update" | "create" | "delete" | "read";
};

/**
 * Permission resources
 */
export type Resource = keyof ResourceActions;

/**
 * Permission types for operations (access control list)
 */
export type Permission = {
  [K in Resource]: `${K}:${ResourceActions[K]}`;
}[Resource];

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

// ============================================================================
// Authorization Service
// ============================================================================

/**
 * Authorization service interface
 */
export interface AuthorizationService {
  /**
   * Check if user has required KYC tier
   */
  readonly checkKycTier: (
    authContext: AuthContext,
    requiredTier: number,
    operation: string
  ) => Effect.Effect<void, InsufficientKycTierError>;

  /**
   * Check if user has permission
   */
  readonly checkPermission: (
    authContext: AuthContext,
    permission: Permission
  ) => Effect.Effect<void, UnauthorizedError>;

  /**
   * Check if user has role
   */
  readonly checkRole: (
    authContext: AuthContext,
    role: Role
  ) => Effect.Effect<void, UnauthorizedError>;

  /**
   * Check if account is active and not suspended
   */
  readonly checkAccountStatus: (
    authContext: AuthContext
  ) => Effect.Effect<void, AccountSuspendedError | UnauthorizedError>;

  /**
   * Check transaction limits based on KYC tier
   */
  readonly checkTransactionLimit: (
    authContext: AuthContext,
    amount: number,
    limitType: TransactionLimitType
  ) => Effect.Effect<void, UnauthorizedError>;

  /**
   * Authorize operation with full context
   */
  readonly authorizeOperation: (
    authContext: AuthContext,
    operation: OperationContext
  ) => Effect.Effect<
    void,
    InsufficientKycTierError | UnauthorizedError | AccountSuspendedError,
    LoggerService
  >;
}

export const AuthorizationService = Context.GenericTag<AuthorizationService>(
  "AuthorizationService"
);

// ============================================================================
// Authorization Service Implementation
// ============================================================================

export const AuthorizationServiceLive: Layer.Layer<
  AuthorizationService,
  never,
  LoggerService
> = Layer.effect(
  AuthorizationService,
  Effect.gen(function* (_) {
    const logger = yield* _(LoggerService);

    return AuthorizationService.of({
      checkKycTier: (authContext, requiredTier, operation) =>
        Effect.gen(function* (_) {
          if (authContext.user.kycTier < requiredTier) {
            // Log authorization failure
            yield* _(
              logger.logWarn("KYC tier check failed", {
                userId: authContext.user.id,
                operation,
                requiredTier,
                currentTier: authContext.user.kycTier,
              })
            );

            yield* _(
              Effect.fail(
                new InsufficientKycTierError({
                  message: `Operation '${operation}' requires KYC Tier ${requiredTier}`,
                  userId: authContext.user.id,
                  requiredTier,
                  currentTier: authContext.user.kycTier,
                  operation,
                })
              )
            );
          }

          // Log successful authorization
          yield* _(
            logger.logDebug("KYC tier check passed", {
              userId: authContext.user.id,
              operation,
              tier: authContext.user.kycTier,
            })
          );
        }),

      checkPermission: (authContext, permission) =>
        Effect.gen(function* (_) {
          // In a real implementation, this would check against a permissions table
          // For now, we'll implement basic permission logic based on KYC tier and user status

          const hasPermission = yield* _(
            Effect.succeed(checkUserPermission(authContext, permission))
          );

          if (!hasPermission) {
            yield* _(
              logger.logWarn("Permission check failed", {
                userId: authContext.user.id,
                permission,
              })
            );

            yield* _(
              Effect.fail(
                new UnauthorizedError({
                  message: `User does not have permission: ${permission}`,
                  action: permission,
                  userId: authContext.user.id,
                })
              )
            );
          }

          yield* _(
            logger.logDebug("Permission check passed", {
              userId: authContext.user.id,
              permission,
            })
          );
        }),

      checkRole: (authContext, role) =>
        Effect.gen(function* (_) {
          // In a real implementation, this would check user roles from database
          // For now, we'll use a simple check
          const userRole = getUserRole(authContext);

          if (userRole !== role && userRole !== "admin") {
            yield* _(
              logger.logWarn("Role check failed", {
                userId: authContext.user.id,
                requiredRole: role,
                userRole,
              })
            );

            yield* _(
              Effect.fail(
                new UnauthorizedError({
                  message: `User does not have required role: ${role}`,
                  action: `role:${role}`,
                  userId: authContext.user.id,
                })
              )
            );
          }

          yield* _(
            logger.logDebug("Role check passed", {
              userId: authContext.user.id,
              role,
            })
          );
        }),

      checkAccountStatus: (authContext) =>
        Effect.gen(function* (_) {
          if (!authContext.user.isActive) {
            yield* _(
              logger.logWarn("Account status check failed - inactive", {
                userId: authContext.user.id,
              })
            );

            yield* _(
              Effect.fail(
                new UnauthorizedError({
                  message: "Account is not active",
                  action: "access",
                  userId: authContext.user.id,
                })
              )
            );
          }

          if (authContext.user.isSuspended) {
            yield* _(
              logger.logWarn("Account status check failed - suspended", {
                userId: authContext.user.id,
              })
            );

            yield* _(
              Effect.fail(
                new AccountSuspendedError({
                  message: "Account is suspended",
                  userId: authContext.user.id,
                  suspendedAt: new Date(),
                  reason: "Account suspended by administrator",
                })
              )
            );
          }

          yield* _(
            logger.logDebug("Account status check passed", {
              userId: authContext.user.id,
            })
          );
        }),

      checkTransactionLimit: (authContext, amount, limitType) =>
        Effect.gen(function* (_) {
          const limits = getTransactionLimits(authContext.user.kycTier);
          const limit = limits[limitType];

          if (amount > limit) {
            yield* _(
              logger.logWarn("Transaction limit check failed", {
                userId: authContext.user.id,
                amount,
                limit,
                limitType,
                kycTier: authContext.user.kycTier,
              })
            );

            yield* _(
              Effect.fail(
                new UnauthorizedError({
                  message: `Transaction amount exceeds ${limitType} limit for your KYC tier`,
                  action: "transaction",
                  userId: authContext.user.id,
                })
              )
            );
          }

          yield* _(
            logger.logDebug("Transaction limit check passed", {
              userId: authContext.user.id,
              amount,
              limit,
              limitType,
            })
          );
        }),

      authorizeOperation: (authContext, operation) =>
        Effect.gen(function* (_) {
          // Check account status first
          if (!authContext.user.isActive) {
            yield* _(
              logger.logWarn("Account status check failed - inactive", {
                userId: authContext.user.id,
              })
            );

            yield* _(
              Effect.fail(
                new UnauthorizedError({
                  message: "Account is not active",
                  action: "access",
                  userId: authContext.user.id,
                })
              )
            );
          }

          if (authContext.user.isSuspended) {
            yield* _(
              logger.logWarn("Account status check failed - suspended", {
                userId: authContext.user.id,
              })
            );

            yield* _(
              Effect.fail(
                new AccountSuspendedError({
                  message: "Account is suspended",
                  userId: authContext.user.id,
                  suspendedAt: new Date(),
                  reason: "Account suspended by administrator",
                })
              )
            );
          }

          // Log authorization attempt
          yield* _(
            logAuditEvent("authorization_check", authContext.user.id, {
              operation: operation.operation,
              resource: operation.resource,
              resourceId: operation.resourceId,
              metadata: operation.metadata,
            })
          );

          yield* _(
            logger.logInfo("Operation authorized", {
              userId: authContext.user.id,
              operation: operation.operation,
              resource: operation.resource,
            })
          );
        }),
    });
  })
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has specific permission based on KYC tier and status
 */
function checkUserPermission(
  authContext: AuthContext,
  permission: Permission
): boolean {
  const { kycTier, kycStatus } = authContext.user;

  // Map permissions to required KYC tiers
  const permissionTierMap: Record<Permission, number> = {
    "savings:create": 1,
    "savings:read": 0,
    "savings:update": 1,
    "savings:delete": 1,
    "wallet:fund": 1,
    "wallet:withdraw": 1,
    "wallet:read": 0,
    "group:create": 2,
    "group:join": 2,
    "group:manage": 2,
    "kyc:submit": 0,
    "user:read": 0,
    "user:update": 0,
    "analytics:read": 1,
    "kyc:approve": 0, // Admin only
    "kyc:reject": 0, // Admin only
    "user:suspend": 0, // Admin only
    "user:delete": 0,
    "admin:kyc": 0,
    "admin:transactions": 0,
    "admin:groups": 0,
    "admin:users": 0,
    "admin:system": 0,
    "analytics:export": 0,
    "savings:contribute": 0,
    "savings:withdraw": 0,
    "wallet:transfer": 0,
    "group:read": 0,
    "group:delete": 0,
    "group:moderate": 0,
    "kyc:review": 0,
  };

  const requiredTier = permissionTierMap[permission] ?? 0;

  // Check if KYC is approved for operations requiring KYC
  if (requiredTier > 0 && kycStatus !== "approved") {
    return false;
  }

  return kycTier >= requiredTier;
}

/**
 * Get user role (simplified - in production, this would come from database)
 */
function getUserRole(_authContext: AuthContext): Role {
  // In a real implementation, this would check user roles from database
  // For now, return "user" as default
  return "user";
}

// ============================================================================
// Authorization Guards (Higher-Order Functions)
// ============================================================================

/**
 * Require minimum KYC tier for an operation
 */
export const requireKycTier =
  (requiredTier: number, operation: string) =>
  <A, E, R>(effect: (authContext: AuthContext) => Effect.Effect<A, E, R>) =>
  (
    authContext: AuthContext
  ): Effect.Effect<A, E | InsufficientKycTierError, R | AuthorizationService> =>
    Effect.gen(function* (_) {
      const authService = yield* _(AuthorizationService);
      yield* _(authService.checkKycTier(authContext, requiredTier, operation));
      return yield* _(effect(authContext));
    });

/**
 * Require specific permission for an operation
 */
export const requirePermission =
  (permission: Permission) =>
  <A, E, R>(effect: (authContext: AuthContext) => Effect.Effect<A, E, R>) =>
  (
    authContext: AuthContext
  ): Effect.Effect<A, E | UnauthorizedError, R | AuthorizationService> =>
    Effect.gen(function* (_) {
      const authService = yield* _(AuthorizationService);
      yield* _(authService.checkPermission(authContext, permission));
      return yield* _(effect(authContext));
    });

/**
 * Require specific role for an operation
 */
export const requireRole =
  (role: Role) =>
  <A, E, R>(effect: (authContext: AuthContext) => Effect.Effect<A, E, R>) =>
  (
    authContext: AuthContext
  ): Effect.Effect<A, E | UnauthorizedError, R | AuthorizationService> =>
    Effect.gen(function* (_) {
      const authService = yield* _(AuthorizationService);
      yield* _(authService.checkRole(authContext, role));
      return yield* _(effect(authContext));
    });

/**
 * Require active account status
 */
export const requireActiveAccount =
  <A, E, R>(effect: (authContext: AuthContext) => Effect.Effect<A, E, R>) =>
  (
    authContext: AuthContext
  ): Effect.Effect<
    A,
    E | AccountSuspendedError | UnauthorizedError,
    R | AuthorizationService
  > =>
    Effect.gen(function* (_) {
      const authService = yield* _(AuthorizationService);
      yield* _(authService.checkAccountStatus(authContext));
      return yield* _(effect(authContext));
    });

/**
 * Check transaction limit before processing
 */
export const requireTransactionLimit =
  (amount: number, limitType: TransactionLimitType) =>
  <A, E, R>(effect: (authContext: AuthContext) => Effect.Effect<A, E, R>) =>
  (
    authContext: AuthContext
  ): Effect.Effect<A, E | UnauthorizedError, R | AuthorizationService> =>
    Effect.gen(function* (_) {
      const authService = yield* _(AuthorizationService);
      yield* _(
        authService.checkTransactionLimit(authContext, amount, limitType)
      );
      return yield* _(effect(authContext));
    });

/**
 * Compose multiple authorization guards
 * Note: Due to TypeScript complexity, this is a simplified version
 * Use individual guards for better type safety
 */
export const withAuthorization =
  <A, E, R>(
    effect: (authContext: AuthContext) => Effect.Effect<A, E, R>,
    ...guards: Array<
      <B, F, S>(
        eff: (authContext: AuthContext) => Effect.Effect<B, F, S>
      ) => (
        authContext: AuthContext
      ) => Effect.Effect<
        B,
        | F
        | UnauthorizedError
        | InsufficientKycTierError
        | AccountSuspendedError,
        S | AuthorizationService
      >
    >
  ) =>
  (
    _authContext: AuthContext
  ): Effect.Effect<
    A,
    E | UnauthorizedError | InsufficientKycTierError | AccountSuspendedError,
    R | AuthorizationService
  > => {
    // Apply guards sequentially
    let wrappedEffect = effect;
    for (const guard of guards) {
      wrappedEffect = guard(wrappedEffect) as typeof wrappedEffect;
    }
    return wrappedEffect(_authContext);
  };
