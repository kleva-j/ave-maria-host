import type { Verification, VerificationId } from "../entities/verification";
import type { Repository, RepositoryError } from ".";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for managing Verification entities
 */
export interface VerificationRepository
  extends Repository<Verification, VerificationId, RepositoryError> {
  /**
   * Find a Verification by identifier
   * @param identifier
   */
  findByIdentifier(
    identifier: string
  ): Effect.Effect<Verification | null, RepositoryError>;

  /**
   * Delete a Verification by identifier
   * @param identifier
   */
  deleteByIdentifier(identifier: string): Effect.Effect<void, RepositoryError>;
}

/**
 * @description
 * Context type for VerificationRepository.
 *
 * This type represents an implementation of VerificationRepository interface,
 *
 * @see VerificationRepository
 */
export const VerificationRepository =
  Context.GenericTag<VerificationRepository>("@domain/VerificationRepository");
