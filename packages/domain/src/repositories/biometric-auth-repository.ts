import type { RepositoryError, Repository } from ".";
import type { UserId } from "../value-objects";
import type { Effect } from "effect";
import type {
  BiometricAuthId,
  BiometricAuth,
} from "../entities/biometric-auth";

/**
 * Repository interface for managing BiometricAuth entities
 */
export interface BiometricAuthRepository
  extends Repository<BiometricAuth, BiometricAuthId, RepositoryError> {
  /**
   * Finds all biometric authentication records for a specific user
   * @param userId - The ID of the user
   * @returns Effect containing an array of BiometricAuth records or an Error if the operation fails
   */
  findByUserId(userId: UserId): Effect.Effect<BiometricAuth[], Error>;

  /**
   * Finds a biometric authentication record by device ID
   * @param deviceId - The unique device identifier
   * @returns Effect containing the found BiometricAuth or null if not found, or an Error if the operation fails
   */
  findByDeviceId(deviceId: string): Effect.Effect<BiometricAuth | null, Error>;
}
