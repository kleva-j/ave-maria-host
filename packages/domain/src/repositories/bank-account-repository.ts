import type { BankAccount } from "../entities/bank-account";
import type { UserNotFoundError } from "@host/shared";
import type { RepositoryError, Repository } from ".";
import type { UserId } from "../value-objects";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for managing BankAccount entities
 */
export interface BankAccountRepository
  extends Repository<BankAccount, string, RepositoryError> {
  /**
   * Find a bank account by ID
   */
  findById(id: string): Effect.Effect<BankAccount | null, RepositoryError>;

  /**
   * Find all bank accounts by user ID
   */
  findByUserId(userId: UserId): Effect.Effect<BankAccount[], RepositoryError>;

  /**
   * Find primary bank account by user ID
   */
  findPrimaryByUserId(
    userId: UserId
  ): Effect.Effect<BankAccount | null, RepositoryError>;

  /**
   * Save a bank account
   */
  save(bankAccount: BankAccount): Effect.Effect<BankAccount, RepositoryError>;

  /**
   * Delete a bank account by ID
   */
  delete(id: string): Effect.Effect<void, RepositoryError>;

  /**
   * Set a bank account as primary for a user
   */
  setPrimary(
    id: string,
    userId: UserId
  ): Effect.Effect<void, RepositoryError | UserNotFoundError>;
}

/**
 * @description
 * Bank account repository context tag
 * 
 * This context provides access to the bank account repository implementation
 * for managing bank account entities in the domain layer.
 * 
 * @see BankAccountRepository
 */
export const BankAccountRepository = Context.GenericTag<BankAccountRepository>(
  "@domain/BankAccountRepository"
);
