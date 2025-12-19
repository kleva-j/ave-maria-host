import type { KycVerification } from "../entities/kyc-verification";
import type { KycVerificationId } from "@host/shared";
import type { Repository, RepositoryError } from ".";
import type { UserId } from "../value-objects";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for managing KycVerification entities
 */
export interface KycVerificationRepository
  extends Repository<KycVerification, KycVerificationId, RepositoryError> {
  /**
   * Find all KycVerifications by a user ID
   * @param userId The user ID to search for
   */
  findByUserId(
    userId: UserId
  ): Effect.Effect<KycVerification[], RepositoryError>;

  /**
   * Find a KycVerification by its user ID and tier
   * @param userId The user ID to search for
   * @param tier The KYC tier to search for
   */
  findByUserIdAndTier(
    userId: UserId,
    tier: number
  ): Effect.Effect<KycVerification | null, RepositoryError>;
}

/**
 * @description
 * Context type for KycVerificationRepository.
 *
 * This type represents an implementation of the KycVerificationRepository interface,
 *
 * @see KycVerificationRepository
 */
export const KycVerificationRepository =
  Context.GenericTag<KycVerificationRepository>(
    "@domain/KycVerificationRepository"
  );
