import type { UserNotFoundError } from "@host/shared";
import type {
  AuthorizationAuditLog,
  AuthorizationContext,
  Permission,
  Resource,
  Role,
} from "./service";

import { AuditService } from "@host/infrastructure";
import { Effect, Layer } from "effect";
import { user, db } from "@host/db";
import { eq } from "drizzle-orm";

import {
  DEFAULT_ROLE_PERMISSIONS,
  KYC_TIER_PERMISSIONS,
  AuthorizationService,
} from "./service";

import {
  UnauthorizedError as Unauthorized,
  UserNotFoundError as UserNotFound,
} from "../auth/errors";

/**
 * User roles and permissions storage (in production, use database tables)
 */
const userRoles = new Map<string, Role[]>();
const userPermissions = new Map<string, Permission[]>();
const auditLogs: AuthorizationAuditLog[] = [];

/**
 * Live implementation of AuthorizationService
 */
export const AuthorizationServiceLive = Layer.succeed(
  AuthorizationService,
  AuthorizationService.of({
    hasPermission: (authContext, permission, resource, resourceId) =>
      Effect.gen(function* (_) {
        const _authContext = yield* _(
          getAuthorizationContext(authContext.user.id)
        );

        // Check if user has the permission directly
        if (_authContext.permissions.includes(permission)) {
          yield* _(
            AuditService.logEvent({
              category: "authorization",
              severity: "low",
              action: "permission_check",
              userId: authContext.user.id,
              resource: resource || "system",
              resourceId,
              status: "success",
              details: { permission, allowed: true },
            })
          );
          return true;
        }

        // Check if user has permission through roles
        const rolePermissions = _authContext.roles.flatMap(
          (role) => DEFAULT_ROLE_PERMISSIONS[role] || []
        );

        if (rolePermissions.includes(permission)) {
          yield* _(
            AuditService.logEvent({
              category: "authorization",
              severity: "low",
              action: "permission_check",
              userId: authContext.user.id,
              resource: resource || "system",
              resourceId,
              status: "success",
              details: { permission, allowed: true, source: "role" },
            })
          );
          return true;
        }

        // Check KYC tier permissions
        const kycPermissions = Object.entries(KYC_TIER_PERMISSIONS)
          .filter(([tier]) => Number.parseInt(tier) <= _authContext.kycTier)
          .flatMap(([, permissions]) => permissions);

        if (kycPermissions.includes(permission)) {
          yield* _(
            AuditService.logEvent({
              category: "authorization",
              severity: "low",
              action: "permission_check",
              userId: authContext.user.id,
              resource: resource || "system",
              resourceId,
              status: "success",
              details: { permission, allowed: true, source: "kyc_tier" },
            })
          );
          return true;
        }

        // Permission denied
        yield* _(
          AuditService.logEvent({
            category: "authorization",
            severity: "medium",
            action: "permission_check",
            userId: authContext.user.id,
            resource: resource || "system",
            resourceId,
            status: "failure",
            details: {
              permission,
              allowed: false,
              reason: "insufficient_permissions",
            },
          })
        );

        return false;
      }),

    hasRole: (authContext, role) =>
      Effect.gen(function* (_) {
        const roles = userRoles.get(authContext.user.id) || [];
        return roles.includes(role);
      }),

    canPerformAction: (authContext, action, resource, resourceId) =>
      Effect.gen(function* (_) {
        const authzContext = yield* _(
          getAuthorizationContext(authContext.user.id)
        );

        // Check if user is active and not suspended
        if (!authzContext.isActive || authzContext.isSuspended) {
          return {
            allowed: false,
            reason: "Account is inactive or suspended",
          };
        }

        // Map actions to permissions
        const actionPermissionMap: Record<string, Permission> = {
          // User actions
          read_profile: "user:read",
          update_profile: "user:update",
          delete_account: "user:delete",

          // Savings actions
          create_savings_plan: "savings:create",
          view_savings: "savings:read",
          update_savings: "savings:update",
          delete_savings: "savings:delete",
          make_contribution: "savings:contribute",
          withdraw_savings: "savings:withdraw",

          // Group actions
          create_group: "group:create",
          join_group: "group:join",
          manage_group: "group:manage",
          moderate_group: "group:moderate",

          // Wallet actions
          view_wallet: "wallet:read",
          fund_wallet: "wallet:fund",
          withdraw_from_wallet: "wallet:withdraw",
          transfer_funds: "wallet:transfer",

          // KYC actions
          submit_kyc: "kyc:submit",
          review_kyc: "kyc:review",
          approve_kyc: "kyc:approve",

          // Admin actions
          admin_users: "admin:users",
          admin_system: "admin:system",
        };

        const requiredPermission = actionPermissionMap[action];
        if (!requiredPermission) {
          return {
            allowed: false,
            reason: `Unknown action: ${action}`,
          };
        }

        // Check if user has the required permission
        const hasPermission = yield* _(
          AuthorizationService.hasPermission(
            authContext,
            requiredPermission,
            resource,
            resourceId
          )
        );

        if (!hasPermission) {
          return {
            allowed: false,
            reason: "Insufficient permissions",
            requiredPermission,
          };
        }

        // Check resource ownership for certain actions
        if (
          resourceId &&
          ["update_savings", "delete_savings", "update_profile"].includes(
            action
          )
        ) {
          const isOwner = yield* _(
            AuthorizationService.isResourceOwner(
              authContext,
              resource,
              resourceId
            )
          );
          if (!isOwner && !authzContext.roles.includes("admin")) {
            return {
              allowed: false,
              reason: "Not resource owner",
            };
          }
        }

        return {
          allowed: true,
          reason: "Permission granted",
        };
      }),

    getAuthorizationContext: (authContext) =>
      Effect.gen(function* (_) {
        return yield* _(getAuthorizationContext(authContext.user.id));
      }),

    assignRole: (authContext, role, assignedBy) =>
      Effect.gen(function* (_) {
        // Check if assigner has permission
        const canAssign = yield* _(
          AuthorizationService.hasPermission(authContext, "admin:users")
        );

        if (!canAssign) {
          yield* _(
            Effect.fail(
              new Unauthorized({
                message: "Insufficient permissions to assign roles",
                action: "assign_role",
                userId: assignedBy,
              })
            )
          );
        }

        const currentRoles = userRoles.get(authContext.user.id) || [];
        if (!currentRoles.includes(role)) {
          userRoles.set(authContext.user.id, [...currentRoles, role]);
        }

        yield* _(
          AuditService.logEvent({
            category: "user_management",
            severity: "high",
            action: "assign_role",
            userId: assignedBy,
            resource: "user",
            resourceId: authContext.user.id,
            status: "success",
            details: { assignedRole: role, targetUserId: authContext.user.id },
          })
        );
      }),

    removeRole: (authContext, role, removedBy) =>
      Effect.gen(function* (_) {
        // Check if remover has permission
        const canRemove = yield* _(
          AuthorizationService.hasPermission(authContext, "admin:users")
        );

        if (!canRemove) {
          yield* _(
            Effect.fail(
              new Unauthorized({
                message: "Insufficient permissions to remove roles",
                action: "remove_role",
                userId: removedBy,
              })
            )
          );
        }

        const currentRoles = userRoles.get(authContext.user.id) || [];
        const updatedRoles = currentRoles.filter((r) => r !== role);
        userRoles.set(authContext.user.id, updatedRoles);

        yield* _(
          AuditService.logEvent({
            category: "user_management",
            severity: "high",
            action: "remove_role",
            userId: removedBy,
            resource: "user",
            resourceId: authContext.user.id,
            status: "success",
            details: { removedRole: role, targetUserId: authContext.user.id },
          })
        );
      }),

    grantPermission: (authContext, permission, grantedBy) =>
      Effect.gen(function* (_) {
        // Check if granter has permission
        const canGrant = yield* _(
          AuthorizationService.hasPermission(authContext, "admin:users")
        );

        if (!canGrant) {
          yield* _(
            Effect.fail(
              new Unauthorized({
                message: "Insufficient permissions to grant permissions",
                action: "grant_permission",
                userId: grantedBy,
              })
            )
          );
        }

        const currentPermissions =
          userPermissions.get(authContext.user.id) || [];
        if (!currentPermissions.includes(permission)) {
          userPermissions.set(authContext.user.id, [
            ...currentPermissions,
            permission,
          ]);
        }

        yield* _(
          AuditService.logEvent({
            category: "user_management",
            severity: "high",
            action: "grant_permission",
            userId: grantedBy,
            resource: "user",
            resourceId: authContext.user.id,
            status: "success",
            details: {
              grantedPermission: permission,
              targetUserId: authContext.user.id,
            },
          })
        );
      }),

    revokePermission: (authContext, permission, revokedBy) =>
      Effect.gen(function* (_) {
        // Check if revoker has permission
        const canRevoke = yield* _(
          AuthorizationService.hasPermission(authContext, "admin:users")
        );

        if (!canRevoke) {
          yield* _(
            Effect.fail(
              new Unauthorized({
                message: "Insufficient permissions to revoke permissions",
                action: "revoke_permission",
                userId: revokedBy,
              })
            )
          );
        }

        const currentPermissions =
          userPermissions.get(authContext.user.id) || [];
        const updatedPermissions = currentPermissions.filter(
          (p) => p !== permission
        );
        userPermissions.set(authContext.user.id, updatedPermissions);

        yield* _(
          AuditService.logEvent({
            category: "user_management",
            severity: "high",
            action: "revoke_permission",
            userId: revokedBy,
            resource: "user",
            resourceId: authContext.user.id,
            status: "success",
            details: {
              revokedPermission: permission,
              targetUserId: authContext.user.id,
            },
          })
        );
      }),

    isResourceOwner: (authContext, resource, resourceId) =>
      Effect.gen(function* (_) {
        // In a real implementation, this would check database tables
        // For now, we'll implement basic ownership logic

        switch (resource) {
          case "user":
            return authContext.user.id === resourceId;
          case "savings_plan":
          case "wallet":
          case "transaction":
            // Would query the respective tables to check ownership
            return true; //  implementation
          default:
            return false;
        }
      }),

    logAuthorizationEvent: (event) =>
      Effect.sync(() => {
        const auditLog: AuthorizationAuditLog = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          ...event,
        };

        auditLogs.push(auditLog);

        // Use the  audit service for now
        AuditService.logEvent({
          category: "authorization",
          severity: event.allowed ? "low" : "medium",
          action: event.action,
          userId: event.userId,
          resource: event.resource,
          resourceId: event.resourceId,
          status: event.allowed ? "success" : "failure",
          details: { permission: event.permission, reason: event.reason },
        });
      }),

    getAuditLogs: (authContext, resource, limit = 100, offset = 0) =>
      Effect.sync(() => {
        let filteredLogs = auditLogs;

        if (authContext) {
          filteredLogs = filteredLogs.filter(
            (log) => log.userId === authContext.user.id
          );
        }

        if (resource) {
          filteredLogs = filteredLogs.filter(
            (log) => log.resource === resource
          );
        }

        return filteredLogs
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(offset, offset + limit);
      }),

    validateKycTier: (authContext, requiredTier, operation) =>
      Effect.gen(function* (_) {
        const authzContext = yield* _(
          getAuthorizationContext(authContext.user.id)
        );

        if (authzContext.kycTier < requiredTier) {
          yield* _(
            AuditService.logEvent({
              category: "kyc",
              severity: "medium",
              action: "kyc_tier_check",
              userId: authContext.user.id,
              resource: "system",
              status: "failure",
              details: {
                operation,
                requiredTier,
                currentTier: authzContext.kycTier,
                reason: `Operation '${operation}' requires KYC Tier ${requiredTier}, user has Tier ${authzContext.kycTier}`,
              },
            })
          );

          yield* _(
            Effect.fail(
              new Unauthorized({
                message: `Operation '${operation}' requires KYC Tier ${requiredTier}`,
                action: operation,
                userId: authContext.user.id,
              })
            )
          );
        }

        return true;
      }),
  })
);

/**
 * Helper function to get authorization context for a user
 */
const getAuthorizationContext = (
  userId: string
): Effect.Effect<AuthorizationContext, UserNotFoundError> =>
  Effect.gen(function* (_) {
    // Get user from database
    const userRecord = yield* _(
      Effect.tryPromise({
        try: () => db.select().from(user).where(eq(user.id, userId)).limit(1),
        catch: (error) =>
          new UserNotFound({
            message: "Failed to fetch user",
            userId,
            cause: error,
          }),
      })
    );

    if (userRecord.length === 0) {
      yield* _(
        Effect.fail(
          new UserNotFound({
            message: "User not found",
            userId,
          })
        )
      );
    }

    const currentUser = userRecord[0];
    const roles = userRoles.get(userId) || ["user"];
    const permissions = userPermissions.get(userId) || [];

    // Add default role permissions
    const rolePermissions = roles.flatMap(
      (role) => DEFAULT_ROLE_PERMISSIONS[role] || []
    );

    // Add KYC tier permissions
    const kycPermissions = Object.entries(KYC_TIER_PERMISSIONS)
      .filter(([tier]) => parseInt(tier) <= currentUser.kycTier)
      .flatMap(([, perms]) => perms);

    const allPermissions = [
      ...new Set([...permissions, ...rolePermissions, ...kycPermissions]),
    ];

    return {
      authContext: {
        user: currentUser as any, // Type assertion for compatibility
        session: {} as any, //  session
      },
      roles,
      kycTier: currentUser.kycTier,
      permissions: allPermissions,
      isActive: currentUser.isActive,
      isSuspended: currentUser.isSuspended,
    };
  });
