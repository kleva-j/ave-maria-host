import type { PhoneVerification } from "../entities/phone-verification";
import type { PhoneVerificationId } from "@host/shared";
import type { Repository, RepositoryError } from ".";
import type { Effect } from "effect";

import { Context } from "effect";

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

/**
 * @description
 * Context type for PhoneVerificationRepository.
 *
 * This type represents an implementation of the PhoneVerificationRepository interface,
 *
 * @see PhoneVerificationRepository
 */
export const PhoneVerificationRepository =
  Context.GenericTag<PhoneVerificationRepository>(
    "@domain/PhoneVerificationRepository"
  );
