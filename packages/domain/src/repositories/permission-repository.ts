import type { Permission } from "../entities/permission";
import type { Repository, RepositoryError } from ".";
import type { PermissionIdType } from "@host/shared";
import type { Effect } from "effect";

/**
 * Repository interface for managing Permission entities
 */
export interface PermissionRepository
  extends Repository<Permission, PermissionIdType, RepositoryError> {
  /**
   * Find a permission by its name
   */
  findByName(name: string): Effect.Effect<Permission | null, RepositoryError>;
}
