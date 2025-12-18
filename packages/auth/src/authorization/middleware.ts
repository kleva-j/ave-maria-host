import type { UserNotFoundError } from "../auth/errors";
import type { AuthContext } from "../auth/types";

import type {
  AuthorizationService,
  Permission,
  Resource,
  Role,
} from "./service";

import { UnauthorizedError } from "../auth/errors";
import { Effect, Context } from "effect";

/**
 * Authorization middleware context
 */
export interface AuthorizationMiddlewareContext {
  readonly authorizationService: AuthorizationService;
}

export const AuthorizationMiddlewareContext =
  Context.GenericTag<AuthorizationMiddlewareContext>(
    "@host/auth/AuthorizationMiddlewareContext"
  );

/**
 * Authorization guard options
 */
export interface AuthorizationGuardOptions {
  readonly permissions?: Permission[];
  readonly roles?: Role[];
  readonly kycTier?: number;
  readonly requireOwnership?: boolean;
  readonly resource?: Resource;
  readonly resourceIdParam?: string;
}

/**
 * Require specific permission(s)
 */
export const requirePermission =
  (
    permission: Permission | Permission[],
    resource?: Resource,
    resourceIdParam?: string
  ) =>
  <A, E>(
    effect: Effect.Effect<A, E, AuthContext>
  ): Effect.Effect<
    A,
    E | UnauthorizedError | UserNotFoundError,
    AuthContext | AuthorizationMiddlewareContext
  > =>
    Effect.gen(function* (_) {
      const authContext = yield* _(Effect.context<AuthContext>());
      const { authorizationService } = yield* _(AuthorizationMiddlewareContext);

      const permissions = Array.isArray(permission) ? permission : [permission];

      // Check each required permission
      for (const perm of permissions) {
        const hasPermission = yield* _(
          authorizationService.hasPermission(
            authContext.user.id,
            perm,
            resource,
            resourceIdParam ? authContext.session.id : undefined // Mock resource ID
          )
        );

        if (!hasPermission) {
          yield* _(
            Effect.fail(
              new UnauthorizedError({
                message: `Missing required permission: ${perm}`,
                action: perm,
                userId: authContext.user.id,
              })
            )
          );
        }
      }

      // Execute the original effect
      return yield* _(effect);
    });

/**
 * Require specific role(s)
 */
export const requireRole =
  (role: Role | Role[]) =>
  <A, E>(
    effect: Effect.Effect<A, E, AuthContext>
  ): Effect.Effect<
    A,
    E | UnauthorizedError | UserNotFoundError,
    AuthContext | AuthorizationMiddlewareContext
  > =>
    Effect.gen(function* (_) {
      const authContext = yield* _(Effect.context<AuthContext>());
      const { authorizationService } = yield* _(AuthorizationMiddlewareContext);

      const roles = Array.isArray(role) ? role : [role];

      // Check if user has any of the required roles
      let hasRequiredRole = false;
      for (const requiredRole of roles) {
        const hasRole = yield* _(
          authorizationService.hasRole(authContext.user.id, requiredRole)
        );
        if (hasRole) {
          hasRequiredRole = true;
          break;
        }
      }

      if (!hasRequiredRole) {
        yield* _(
          Effect.fail(
            new UnauthorizedError({
              message: `Missing required role: ${roles.join(" or ")}`,
              action: "role_check",
              userId: authContext.user.id,
            })
          )
        );
      }

      // Execute the original effect
      return yield* _(effect);
    });

/**
 * Require minimum KYC tier
 */
export const requireKycTier =
  (minTier: number, operation: string) =>
  <A, E>(
    effect: Effect.Effect<A, E, AuthContext>
  ): Effect.Effect<
    A,
    E | UnauthorizedError | UserNotFoundError,
    AuthContext | AuthorizationMiddlewareContext
  > =>
    Effect.gen(function* (_) {
      const authContext = yield* _(Effect.context<AuthContext>());
      const { authorizationService } = yield* _(AuthorizationMiddlewareContext);

      yield* _(
        authorizationService.validateKycTier(
          authContext.user.id,
          minTier,
          operation
        )
      );

      // Execute the original effect
      return yield* _(effect);
    });

/**
 * Require resource ownership
 */
export const requireOwnership =
  (resource: Resource, resourceIdParam: string) =>
  <A, E>(
    effect: Effect.Effect<A, E, AuthContext>
  ): Effect.Effect<
    A,
    E | UnauthorizedError | UserNotFoundError,
    AuthContext | AuthorizationMiddlewareContext
  > =>
    Effect.gen(function* (_) {
      const authContext = yield* _(Effect.context<AuthContext>());
      const { authorizationService } = yield* _(AuthorizationMiddlewareContext);

      // In a real implementation, resourceId would be extracted from request params
      const resourceId = authContext.session.id; // Mock resource ID

      const isOwner = yield* _(
        authorizationService.isResourceOwner(
          authContext.user.id,
          resource,
          resourceId
        )
      );

      if (!isOwner) {
        // Check if user has admin privileges
        const isAdmin = yield* _(
          authorizationService.hasRole(authContext.user.id, "admin")
        );

        if (!isAdmin) {
          yield* _(
            Effect.fail(
              new UnauthorizedError({
                message: `Not authorized to access ${resource}`,
                action: "resource_access",
                userId: authContext.user.id,
              })
            )
          );
        }
      }

      // Execute the original effect
      return yield* _(effect);
    });

/**
 * Comprehensive authorization guard
 */
export const withAuthorization =
  (options: AuthorizationGuardOptions) =>
  <A, E>(
    effect: Effect.Effect<A, E, AuthContext>
  ): Effect.Effect<
    A,
    E | UnauthorizedError | UserNotFoundError,
    AuthContext | AuthorizationMiddlewareContext
  > =>
    Effect.gen(function* (_) {
      let guardedEffect = effect;

      // Apply permission checks
      if (options.permissions) {
        guardedEffect = requirePermission(
          options.permissions,
          options.resource,
          options.resourceIdParam
        )(guardedEffect);
      }

      // Apply role checks
      if (options.roles) {
        guardedEffect = requireRole(options.roles)(guardedEffect);
      }

      // Apply KYC tier checks
      if (options.kycTier !== undefined) {
        guardedEffect = requireKycTier(
          options.kycTier,
          "operation"
        )(guardedEffect);
      }

      // Apply ownership checks
      if (
        options.requireOwnership &&
        options.resource &&
        options.resourceIdParam
      ) {
        guardedEffect = requireOwnership(
          options.resource,
          options.resourceIdParam
        )(guardedEffect);
      }

      return yield* _(guardedEffect);
    });

/**
 * Check if user can perform an action
 */
export const canPerformAction = (
  action: string,
  resource: Resource,
  resourceId?: string
) =>
  Effect.gen(function* (_) {
    const authContext = yield* _(Effect.context<AuthContext>());
    const { authorizationService } = yield* _(AuthorizationMiddlewareContext);

    return yield* _(
      authorizationService.canPerformAction(
        authContext.user.id,
        action,
        resource,
        resourceId
      )
    );
  });

/**
 * Get user's authorization context
 */
export const getAuthorizationContext = () =>
  Effect.gen(function* (_) {
    const authContext = yield* _(Effect.context<AuthContext>());
    const { authorizationService } = yield* _(AuthorizationMiddlewareContext);

    return yield* _(
      authorizationService.getAuthorizationContext(authContext.user.id)
    );
  });

/**
 * Common authorization guards for different operations
 */
export const AuthorizationGuards = {
  /**
   * Admin-only operations
   */
  adminOnly: () =>
    withAuthorization({
      roles: ["admin", "super_admin"],
    }),

  /**
   * KYC reviewer operations
   */
  kycReviewer: () =>
    withAuthorization({
      roles: ["kyc_reviewer", "admin"],
      permissions: ["kyc:review"],
    }),

  /**
   * User profile operations
   */
  userProfile: (requireOwnership = true) =>
    withAuthorization({
      permissions: ["user:read"],
      requireOwnership,
      resource: "user",
      resourceIdParam: "userId",
    }),

  /**
   * Savings operations
   */
  savingsOperations: (
    action: "create" | "read" | "update" | "delete" | "contribute" | "withdraw"
  ) => {
    const permissionMap = {
      create: ["savings:create"],
      read: ["savings:read"],
      update: ["savings:update"],
      delete: ["savings:delete"],
      contribute: ["savings:contribute"],
      withdraw: ["savings:withdraw"],
    };

    const kycTierMap = {
      create: 1,
      read: 0,
      update: 1,
      delete: 1,
      contribute: 1,
      withdraw: 2,
    };

    return withAuthorization({
      permissions: permissionMap[action],
      kycTier: kycTierMap[action],
      resource: "savings_plan",
      requireOwnership: ["update", "delete", "withdraw"].includes(action),
    });
  },

  /**
   * Group operations
   */
  groupOperations: (
    action: "create" | "join" | "manage" | "moderate" | "delete"
  ) => {
    const permissionMap = {
      create: ["group:create"],
      join: ["group:join"],
      manage: ["group:manage"],
      moderate: ["group:moderate"],
      delete: ["group:delete"],
    };

    const kycTierMap = {
      create: 2,
      join: 1,
      manage: 1,
      moderate: 1,
      delete: 2,
    };

    return withAuthorization({
      permissions: permissionMap[action],
      kycTier: kycTierMap[action],
      resource: "group",
      requireOwnership: ["manage", "delete"].includes(action),
    });
  },

  /**
   * Wallet operations
   */
  walletOperations: (action: "read" | "fund" | "withdraw" | "transfer") => {
    const permissionMap = {
      read: ["wallet:read"],
      fund: ["wallet:fund"],
      withdraw: ["wallet:withdraw"],
      transfer: ["wallet:transfer"],
    };

    const kycTierMap = {
      read: 0,
      fund: 1,
      withdraw: 1,
      transfer: 2,
    };

    return withAuthorization({
      permissions: permissionMap[action],
      kycTier: kycTierMap[action],
      resource: "wallet",
      requireOwnership: true,
    });
  },
};
