import type { Permission } from "../entities/permission";
import type { Repository, RepositoryError } from ".";
import type { PermissionId } from "@host/shared";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for managing Permission entities
 */
export interface PermissionRepository
  extends Repository<Permission, PermissionId, RepositoryError> {
  /**
   * Find a permission by its name
   */
  findByName(name: string): Effect.Effect<Permission | null, RepositoryError>;
}

/**
 * @description
 * Context type for PermissionRepository.
 *
 * This type represents an implementation of the PermissionRepository interface,
 *
 * @see PermissionRepository
 */
export const PermissionRepository = Context.GenericTag<PermissionRepository>(
  "@domain/PermissionRepository"
);
