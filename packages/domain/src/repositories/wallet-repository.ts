import type { Repository, RepositoryError } from "..";
import type { UserId, Money } from "../value-objects";
import type { WalletId } from "@host/shared";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Wallet entity for repository operations
 */
export interface Wallet {
  readonly id: string;
  readonly userId: UserId;
  readonly balance: Money;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Repository interface for Wallet operations
 */
export interface WalletRepository
  extends Repository<Wallet, WalletId, RepositoryError> {
  /**
   * Create a new wallet for a user
   */
  readonly createForUser: (
    userId: UserId,
    initialBalance?: Money
  ) => Effect.Effect<Wallet, RepositoryError>;

  /**
   * Find wallet by user ID
   */
  readonly findByUserId: (
    userId: UserId
  ) => Effect.Effect<Wallet | null, RepositoryError>;

  /**
   * Get wallet balance for a user
   */
  readonly getBalance: (
    userId: UserId
  ) => Effect.Effect<Money, RepositoryError>;

  /**
   * Update wallet balance (credit operation)
   */
  readonly credit: (
    userId: UserId,
    amount: Money
  ) => Effect.Effect<Money, RepositoryError>;

  /**
   * Update wallet balance (debit operation)
   */
  readonly debit: (
    userId: UserId,
    amount: Money
  ) => Effect.Effect<Money, RepositoryError>;

  /**
   * Update wallet balance atomically
   */
  readonly updateBalance: (
    userId: UserId,
    newBalance: Money
  ) => Effect.Effect<void, RepositoryError>;

  /**
   * Check if wallet has sufficient balance
   */
  readonly hasSufficientBalance: (
    userId: UserId,
    amount: Money
  ) => Effect.Effect<boolean, RepositoryError>;

  /**
   * Freeze/unfreeze wallet
   */
  readonly setActive: (
    userId: UserId,
    isActive: boolean
  ) => Effect.Effect<void, RepositoryError>;

  /**
   * Get wallet transaction summary
   */
  readonly getTransactionSummary: (
    userId: UserId,
    startDate: Date,
    endDate: Date
  ) => Effect.Effect<WalletTransactionSummary, RepositoryError>;
}

/**
 * @description
 * Context type for WalletRepository.
 *
 * This type represents an implementation of the WalletRepository interface,
 *
 * @see WalletRepository
 */
export const WalletRepository = Context.GenericTag<WalletRepository>(
  "@domain/WalletRepository"
);

/**
 * Wallet transaction summary
 */
export interface WalletTransactionSummary {
  readonly totalCredits: Money;
  readonly totalDebits: Money;
  readonly transactionCount: number;
  readonly netChange: Money;
}
