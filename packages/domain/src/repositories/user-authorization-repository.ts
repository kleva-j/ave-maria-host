import type { UserId } from "@host/shared";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for managing user authorization data
 * (user roles and user permissions)
 */
export interface UserAuthorizationRepository {
  /**
   * Get all role names assigned to a user
   */
  getUserRoles(userId: UserId): Effect.Effect<string[], Error>;

  /**
   * Get all permission names directly assigned to a user
   */
  getUserPermissions(userId: UserId): Effect.Effect<string[], Error>;

  /**
   * Assign a role to a user
   */
  assignRole(
    userId: UserId,
    roleId: string,
    assignedBy: UserId
  ): Effect.Effect<void, Error>;

  /**
   * Remove a role from a user
   */
  removeRole(userId: UserId, roleId: string): Effect.Effect<void, Error>;

  /**
   * Grant a permission directly to a user
   */
  grantPermission(
    userId: UserId,
    permissionId: string,
    grantedBy: UserId
  ): Effect.Effect<void, Error>;

  /**
   * Revoke a permission from a user
   */
  revokePermission(
    userId: UserId,
    permissionId: string
  ): Effect.Effect<void, Error>;
}

/**
 * Context type for UserAuthorizationRepository
 */
export const UserAuthorizationRepository =
  Context.GenericTag<UserAuthorizationRepository>(
    "@domain/UserAuthorizationRepository"
  );
