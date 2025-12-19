import type { Repository, RepositoryError } from ".";
import type { UserId } from "../value-objects";
import type { User } from "../entities/user";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for User entity
 */
export interface UserRepository
  extends Repository<User, UserId, RepositoryError> {
  /**
   * Find a user by their ID
   */
  readonly findById: (
    id: UserId
  ) => Effect.Effect<User | null, RepositoryError>;

  readonly update: (user: User) => Effect.Effect<User | null, RepositoryError>;

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

/**
 * @description
 * Context type for UserRepository.
 *
 * This type represents an implementation of the UserRepository interface,
 *
 * @see UserRepository
 */
export const UserRepository = Context.GenericTag<UserRepository>(
  "@domain/UserRepository"
);
