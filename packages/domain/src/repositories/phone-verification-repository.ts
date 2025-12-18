import type { Repository, RepositoryError } from ".";
import type { Effect } from "effect";
import type {
  PhoneVerificationId,
  PhoneVerification,
} from "../entities/phone-verification";

/**
 * Repository interface for managing PhoneVerification entities
 */
export interface PhoneVerificationRepository
  extends Repository<PhoneVerification, PhoneVerificationId, RepositoryError> {
  /**
   * Finds a phone verification record by phone number
   * @param phoneNumber - The phone number to search for
   * @returns Effect containing the most recent PhoneVerification for the number, null if not found, or an Error
   */
  findByPhoneNumber(
    phoneNumber: string
  ): Effect.Effect<PhoneVerification | null, RepositoryError>;
}
