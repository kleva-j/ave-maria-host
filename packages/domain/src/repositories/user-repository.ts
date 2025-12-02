import type { Effect } from "effect";

import type { UserId } from "../value-objects";
import type { User } from "../entities/user";
import type { RepositoryError } from ".";

/**
 * Repository interface for User entity
 */
export interface UserRepository {
  /**
   * Save a new user
   */
  readonly save: (user: User) => Effect.Effect<void, RepositoryError>;

  /**
   * Find a user by their ID
   */
  readonly findById: (
    id: UserId
  ) => Effect.Effect<User | null, RepositoryError>;

  /**
   * Find a user by their email address
   */
  readonly findByEmail: (
    email: string
  ) => Effect.Effect<User | null, RepositoryError>;

  /**
   * Find a user by their phone number
   */
  readonly findByPhoneNumber: (
    phoneNumber: string
  ) => Effect.Effect<User | null, RepositoryError>;

  /**
   * Update an existing user
   */
  readonly update: (user: User) => Effect.Effect<void, RepositoryError>;

  /**
   * Delete a user (soft delete by setting isActive to false)
   */
  readonly delete: (id: UserId) => Effect.Effect<void, RepositoryError>;

  /**
   * Find all active users
   */
  readonly findAllActive: () => Effect.Effect<User[], RepositoryError>;

  /**
   * Find users by KYC tier
   */
  readonly findByKycTier: (
    tier: number
  ) => Effect.Effect<User[], RepositoryError>;

  /**
   * Find users by KYC status
   */
  readonly findByKycStatus: (
    status: string
  ) => Effect.Effect<User[], RepositoryError>;

  /**
   * Check if email exists
   */
  readonly emailExists: (
    email: string
  ) => Effect.Effect<boolean, RepositoryError>;

  /**
   * Check if phone number exists
   */
  readonly phoneNumberExists: (
    phoneNumber: string
  ) => Effect.Effect<boolean, RepositoryError>;
}
