import type {
  AuthorizationAuditLog,
  AuthorizationContext,
  Permission,
  Resource,
  Role,
} from "./service";

import { UserAuthorizationRepository, UserRepository } from "@host/domain";
import { getTransactionLimits } from "../auth/utils";
import { AuditService } from "@host/infrastructure";
import { Effect, Layer } from "effect";

import {
  DEFAULT_ROLE_PERMISSIONS,
  KYC_TIER_PERMISSIONS,
  AuthorizationService,
} from "./service";

import {
  UnauthorizedError as Unauthorized,
  UserNotFoundError,
  InsufficientKycTierError,
  AccountSuspendedError,
} from "../auth/errors";

import {
  AuditLogStatusSchema,
  AuditSeveritySchema,
  AuditCategorySchema,
  AUDIT_LOG_STATUS,
  AUDIT_SEVERITY,
  AUDIT_CATEGORY,
  UserIdSchema,
} from "@host/shared";

// In-memory audit logs for now (in production, use database)
const auditLogs: AuthorizationAuditLog[] = [];

/**
 * Helper function to get authorization context for a user
 */
const getAuthorizationContext = (
  userId: string,
  userRepository: UserRepository,
  authzRepo: UserAuthorizationRepository
): Effect.Effect<AuthorizationContext, UserNotFoundError> =>
  Effect.gen(function* (_) {
    // Convert string to UserId type
    const userIdTyped = UserIdSchema.make(userId);

    // Get user from database using the correct method
    const userRecord = yield* _(
      userRepository.findById(userIdTyped).pipe(Effect.orDie)
    );

    if (!userRecord) {
      return yield* _(
        Effect.fail(
          new UserNotFoundError({ message: "User not found", userId })
        )
      );
    }

    // Query user roles from database using repository
    const roleNames = yield* _(
      authzRepo.getUserRoles(userIdTyped).pipe(Effect.orDie)
    );

    // Default to "user" role if no roles assigned
    const userRolesList: Role[] =
      roleNames.length > 0 ? (roleNames as Role[]) : ["user"];

    // Query direct user permissions from database using repository
    const directPermissionNames = yield* _(
      authzRepo.getUserPermissions(userIdTyped).pipe(Effect.orDie)
    );

    // Cast permission names to Permission type
    const directPermissions = directPermissionNames as Permission[];

    // Add default role permissions
    const rolePermissions = userRolesList.flatMap(
      (role) => DEFAULT_ROLE_PERMISSIONS[role] || []
    );

    // Add KYC tier permissions
    const kycPermissions = Object.entries(KYC_TIER_PERMISSIONS)
      .filter(([tier]) => Number.parseInt(tier) <= userRecord.kycTier)
      .flatMap(([, perms]) => perms);

    const allPermissions = [
      ...new Set([...directPermissions, ...rolePermissions, ...kycPermissions]),
    ];

    return {
      authContext: {
        user: userRecord,
        session: {} as any, // TODO: Implement proper session
      },
      roles: userRolesList,
      kycTier: userRecord.kycTier,
      permissions: allPermissions,
      isActive: userRecord.isActive,
      isSuspended: userRecord.isSuspended || false,
    };
  });

// Helper functions for internal use to avoid circular references
const checkPermissionInternal = (
  auditService: AuditService,
  authContext: AuthorizationContext,
  permission: Permission,
  resource?: string,
  resourceId?: string
): Effect.Effect<boolean, never, never> =>
  Effect.gen(function* (_) {
    // Check if user has permission directly
    if (authContext.permissions.includes(permission)) {
      yield* _(
        auditService.logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
          severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
          action: "permission_check",
          userId: UserIdSchema.make(authContext.authContext.user.id),
          resource: resource || "system",
          resourceId: resourceId || null,
          status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
          details: { permission, allowed: true },
        })
      );
      return true;
    }

    // Check if user has permission through roles
    const rolePermissions = authContext.roles.flatMap(
      (role) => DEFAULT_ROLE_PERMISSIONS[role] || []
    );

    if (rolePermissions.includes(permission)) {
      yield* _(
        auditService.logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
          severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
          action: "permission_check",
          userId: UserIdSchema.make(authContext.authContext.user.id),
          resource: resource || "system",
          resourceId: resourceId || null,
          status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
          details: { permission, allowed: true, source: "role" },
        })
      );
      return true;
    }

    // Check KYC tier permissions
    const kycPermissions = Object.entries(KYC_TIER_PERMISSIONS)
      .filter(([tier]) => Number.parseInt(tier) <= authContext.kycTier)
      .flatMap(([, permissions]) => permissions);

    if (kycPermissions.includes(permission)) {
      yield* _(
        auditService.logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
          severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
          action: "permission_check",
          userId: UserIdSchema.make(authContext.authContext.user.id),
          resource: resource || "system",
          resourceId: resourceId || null,
          status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
          details: { permission, allowed: true, source: "kyc_tier" },
        })
      );
      return true;
    }

    // Permission denied
    yield* _(
      auditService.logEvent({
        category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
        severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
        action: "permission_check",
        userId: UserIdSchema.make(authContext.authContext.user.id),
        resource: resource || "system",
        resourceId: resourceId || null,
        status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
        details: {
          permission,
          allowed: false,
          reason: "insufficient_permissions",
        },
      })
    );

    return false;
  });

const checkRoleInternal = (
  authContext: AuthorizationContext,
  role: Role
): boolean => {
  return authContext.roles.includes(role);
};

const isResourceOwnerInternal = (
  authContext: AuthorizationContext,
  resource: Resource,
  resourceId: string
): boolean => {
  // In a real implementation, this would check database tables
  // For now, we'll implement basic ownership logic
  switch (resource) {
    case "user":
      return authContext.authContext.user.id === resourceId;
    case "savings_plan":
    case "wallet":
    case "transaction":
      // Would query the respective tables to check ownership
      return true; // TODO: Implement proper ownership check
    default:
      return false;
  }
};

/**
 * Live implementation of AuthorizationService
 */
export const AuthorizationServiceLive = Layer.effect(
  AuthorizationService,
  Effect.gen(function* (_) {
    const auditService = yield* _(AuditService);
    const userRepo = yield* _(UserRepository);
    const authzRepo = yield* _(UserAuthorizationRepository);

    return AuthorizationService.of({
      hasPermission: (authContext, permission, resource, resourceId) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );
          return yield* _(
            checkPermissionInternal(
              auditService,
              _authContext,
              permission,
              resource,
              resourceId
            )
          );
        }),

      hasRole: (authContext, role) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );
          return checkRoleInternal(_authContext, role);
        }),

      canPerformAction: (authContext, action, resource, resourceId) =>
        Effect.gen(function* (_) {
          const authzContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
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
            checkPermissionInternal(
              auditService,
              authzContext,
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
            const isOwner = isResourceOwnerInternal(
              authzContext,
              resource,
              resourceId
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
          return yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );
        }),

      assignRole: (authContext, role, assignedBy) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );

          // Check if assigner has permission
          const canAssign = yield* _(
            checkPermissionInternal(auditService, _authContext, "admin:users")
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

          // TODO: Implement role assignment using userRoles table
          // For now, just log the event
          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(
                AUDIT_CATEGORY.USER_MANAGEMENT
              ),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
              action: "assign_role",
              userId: UserIdSchema.make(assignedBy),
              resource: "user",
              resourceId: authContext.user.id,
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: {
                assignedRole: role,
                targetUserId: authContext.user.id,
              },
            })
          );
        }),

      removeRole: (authContext, role, removedBy) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );

          // Check if remover has permission
          const canRemove = yield* _(
            checkPermissionInternal(auditService, _authContext, "admin:users")
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

          // TODO: Implement role removal using userRoles table
          // For now, just log the event
          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(
                AUDIT_CATEGORY.USER_MANAGEMENT
              ),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
              action: "remove_role",
              userId: UserIdSchema.make(removedBy),
              resource: "user",
              resourceId: authContext.user.id,
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: { removedRole: role, targetUserId: authContext.user.id },
            })
          );
        }),

      grantPermission: (authContext, permission, grantedBy) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );

          // Check if granter has permission
          const canGrant = yield* _(
            checkPermissionInternal(auditService, _authContext, "admin:users")
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

          // TODO: Implement permission grant using userPermissions table
          // For now, just log the event
          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(
                AUDIT_CATEGORY.USER_MANAGEMENT
              ),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
              action: "grant_permission",
              userId: UserIdSchema.make(grantedBy),
              resource: "user",
              resourceId: authContext.user.id,
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: {
                grantedPermission: permission,
                targetUserId: authContext.user.id,
              },
            })
          );
        }),

      revokePermission: (authContext, permission, revokedBy) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );

          // Check if revoker has permission
          const canRevoke = yield* _(
            checkPermissionInternal(auditService, _authContext, "admin:users")
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

          // TODO: Implement permission revocation using userPermissions table
          // For now, just log the event
          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(
                AUDIT_CATEGORY.USER_MANAGEMENT
              ),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
              action: "revoke_permission",
              userId: UserIdSchema.make(revokedBy),
              resource: "user",
              resourceId: authContext.user.id,
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: {
                revokedPermission: permission,
                targetUserId: authContext.user.id,
              },
            })
          );
        }),

      isResourceOwner: (authContext, resource, resourceId) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );
          return isResourceOwnerInternal(_authContext, resource, resourceId);
        }),

      logAuthorizationEvent: (event) =>
        Effect.gen(function* (_) {
          const auditLog: AuthorizationAuditLog = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...event,
          };

          auditLogs.push(auditLog);

          // Use the audit service for logging
          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
              severity: AuditSeveritySchema.make(
                event.allowed ? AUDIT_SEVERITY.LOW : AUDIT_SEVERITY.MEDIUM
              ),
              action: event.action,
              userId: UserIdSchema.make(event.userId),
              resource: event.resource,
              resourceId: event.resourceId,
              status: AuditLogStatusSchema.make(
                event.allowed
                  ? AUDIT_LOG_STATUS.SUCCESS
                  : AUDIT_LOG_STATUS.FAILURE
              ),
              details: { permission: event.permission, reason: event.reason },
            })
          );
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
            getAuthorizationContext(authContext.user.id, userRepo, authzRepo)
          );

          if (authzContext.kycTier < requiredTier) {
            yield* _(
              auditService.logEvent({
                category: AuditCategorySchema.make(AUDIT_CATEGORY.KYC),
                severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
                action: "kyc_tier_check",
                userId: UserIdSchema.make(authContext.user.id),
                resource: "system",
                status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
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

      // New methods from API duplicate consolidation
      checkKycTier: (authContext, requiredTier, operation) =>
        Effect.gen(function* (_) {
          if (authContext.user.kycTier < requiredTier) {
            yield* _(
              auditService.logEvent({
                category: AuditCategorySchema.make(
                  AUDIT_CATEGORY.AUTHORIZATION
                ),
                severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
                action: "kyc_tier_check",
                userId: UserIdSchema.make(authContext.user.id),
                resource: "system",
                status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
                details: {
                  operation,
                  requiredTier,
                  currentTier: authContext.user.kycTier,
                  reason: `Operation '${operation}' requires KYC Tier ${requiredTier}, user has Tier ${authContext.user.kycTier}`,
                },
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

          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
              action: "kyc_tier_check",
              userId: UserIdSchema.make(authContext.user.id),
              resource: "system",
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: {
                operation,
                requiredTier,
                currentTier: authContext.user.kycTier,
              },
            })
          );
        }),

      checkPermission: (authContext, permission) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(
              authContext.user.id,
              userRepo,
              authzRepo
            ).pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new Unauthorized({
                    message: `Authorization context retrieval failed: ${error.message}`,
                    action: permission,
                    userId: authContext.user.id,
                  })
                )
              )
            )
          );

          const hasPermission = yield* _(
            checkPermissionInternal(auditService, _authContext, permission)
          );

          if (!hasPermission) {
            yield* _(
              auditService.logEvent({
                category: AuditCategorySchema.make(
                  AUDIT_CATEGORY.AUTHORIZATION
                ),
                severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
                action: "permission_check",
                userId: UserIdSchema.make(authContext.user.id),
                resource: "system",
                status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
                details: {
                  permission,
                  reason: "User does not have required permission",
                },
              })
            );

            yield* _(
              Effect.fail(
                new Unauthorized({
                  message: `User does not have permission: ${permission}`,
                  action: permission,
                  userId: authContext.user.id,
                })
              )
            );
          }

          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
              action: "permission_check",
              userId: UserIdSchema.make(authContext.user.id),
              resource: "system",
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: { permission },
            })
          );
        }),

      checkRole: (authContext, role) =>
        Effect.gen(function* (_) {
          const _authContext = yield* _(
            getAuthorizationContext(
              authContext.user.id,
              userRepo,
              authzRepo
            ).pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new Unauthorized({
                    message: `Authorization context retrieval failed: ${error.message}`,
                    action: `role:${role}`,
                    userId: authContext.user.id,
                  })
                )
              )
            )
          );

          const hasRole = checkRoleInternal(_authContext, role);

          if (!hasRole) {
            yield* _(
              auditService.logEvent({
                category: AuditCategorySchema.make(
                  AUDIT_CATEGORY.AUTHORIZATION
                ),
                severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
                action: "role_check",
                userId: UserIdSchema.make(authContext.user.id),
                resource: "system",
                status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
                details: {
                  requiredRole: role,
                  reason: "User does not have required role",
                },
              })
            );

            yield* _(
              Effect.fail(
                new Unauthorized({
                  message: `User does not have required role: ${role}`,
                  action: `role:${role}`,
                  userId: authContext.user.id,
                })
              )
            );
          }

          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
              action: "role_check",
              userId: UserIdSchema.make(authContext.user.id),
              resource: "system",
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: { role },
            })
          );
        }),

      checkAccountStatus: (authContext) =>
        Effect.gen(function* (_) {
          if (!authContext.user.isActive) {
            yield* _(
              auditService.logEvent({
                category: AuditCategorySchema.make(
                  AUDIT_CATEGORY.AUTHORIZATION
                ),
                severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
                action: "account_status_check",
                userId: UserIdSchema.make(authContext.user.id),
                resource: "system",
                status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
                details: {
                  reason: "Account is not active",
                },
              })
            );

            yield* _(
              Effect.fail(
                new Unauthorized({
                  message: "Account is not active",
                  action: "access",
                  userId: authContext.user.id,
                })
              )
            );
          }

          if (authContext.user.isSuspended) {
            yield* _(
              auditService.logEvent({
                category: AuditCategorySchema.make(
                  AUDIT_CATEGORY.AUTHORIZATION
                ),
                severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
                action: "account_status_check",
                userId: UserIdSchema.make(authContext.user.id),
                resource: "system",
                status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
                details: {
                  reason: "Account is suspended",
                },
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
            auditService.logEvent({
              category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
              action: "account_status_check",
              userId: UserIdSchema.make(authContext.user.id),
              resource: "system",
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: {
                isActive: authContext.user.isActive,
                isSuspended: authContext.user.isSuspended,
              },
            })
          );
        }),

      checkTransactionLimit: (authContext, amount, limitType) =>
        Effect.gen(function* (_) {
          const limits = getTransactionLimits(authContext.user.kycTier);
          const limit = limits[limitType as keyof typeof limits];

          if (amount > limit) {
            yield* _(
              auditService.logEvent({
                category: AuditCategorySchema.make(
                  AUDIT_CATEGORY.AUTHORIZATION
                ),
                severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
                action: "transaction_limit_check",
                userId: UserIdSchema.make(authContext.user.id),
                resource: "system",
                status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
                details: {
                  amount,
                  limit,
                  limitType,
                  kycTier: authContext.user.kycTier,
                  reason: `Transaction amount exceeds ${limitType} limit for your KYC tier`,
                },
              })
            );

            yield* _(
              Effect.fail(
                new Unauthorized({
                  message: `Transaction amount exceeds ${limitType} limit for your KYC tier`,
                  action: "transaction",
                  userId: authContext.user.id,
                })
              )
            );
          }

          yield* _(
            auditService.logEvent({
              category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
              action: "transaction_limit_check",
              userId: UserIdSchema.make(authContext.user.id),
              resource: "system",
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: {
                amount,
                limit,
                limitType,
                kycTier: authContext.user.kycTier,
              },
            })
          );
        }),

      authorizeOperation: (authContext, operation) =>
        Effect.gen(function* (_) {
          // Check account status first
          if (!authContext.user.isActive) {
            yield* _(
              Effect.fail(
                new Unauthorized({
                  message: "Account is not active",
                  action: "access",
                  userId: authContext.user.id,
                })
              )
            );
          }

          if (authContext.user.isSuspended) {
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
            auditService.logEvent({
              category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.LOW),
              action: "operation_authorization",
              userId: UserIdSchema.make(authContext.user.id),
              resource: operation.resource || "system",
              resourceId: operation.resourceId || null,
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: {
                operation: operation.operation,
                resource: operation.resource,
                resourceId: operation.resourceId,
                metadata: operation.metadata,
              },
            })
          );
        }),
    });
  })
);
