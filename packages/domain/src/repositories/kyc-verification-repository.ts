import type { Repository, RepositoryError } from ".";
import type { UserId } from "../value-objects";
import type { Effect } from "effect";
import type {
  KycVerificationId,
  KycVerification,
} from "../entities/kyc-verification";

/**
 * Repository interface for managing KycVerification entities
 */
export interface KycVerificationRepository
  extends Repository<KycVerification, KycVerificationId, RepositoryError> {
  /**
   * Find all KycVerifications by a user ID
   * @param userId
   */
  findByUserId(
    userId: UserId
  ): Effect.Effect<KycVerification[], RepositoryError>;

  /**
   * Find a KycVerification by its user ID and tier
   * @param userId
   * @param tier
   */
  findByUserIdAndTier(
    userId: UserId,
    tier: number
  ): Effect.Effect<KycVerification | null, RepositoryError>;
}
