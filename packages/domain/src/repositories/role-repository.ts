import type { PermissionId, RoleId } from "@host/shared";
import type { Permission } from "../entities/permission";
import type { Repository, RepositoryError } from ".";
import type { Role } from "../entities/role";
import type { Effect } from "effect";

/**
 * Repository interface for managing Role entities
 */
export interface RoleRepository
  extends Repository<Role, RoleId, RepositoryError> {
  /**
   * Find a role by its name
   */
  findByName(name: string): Effect.Effect<Role | null, Error>;

  /**
   * Add a permission to a role
   */
  addPermission(
    roleId: RoleId,
    permissionId: PermissionId
  ): Effect.Effect<void, Error>;

  /**
   * Remove a permission from a role
   */
  removePermission(
    roleId: RoleId,
    permissionId: PermissionId
  ): Effect.Effect<void, Error>;

  /**
   * Get all permissions assigned to a role
   */
  getPermissions(roleId: RoleId): Effect.Effect<Permission[], Error>;
}
