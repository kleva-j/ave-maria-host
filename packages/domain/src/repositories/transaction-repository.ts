import type { TransactionId, UserId, PlanId, Money } from "../value-objects";
import type { TransactionType, TransactionStatus } from "@host/shared";
import type { Transaction } from "../entities/transaction";
import type { RepositoryError } from ".";
import type { Effect } from "effect";

/**
 * Repository interface for Transaction entity
 */
export interface TransactionRepository {
  /**
   * Save a new transaction
   */
  readonly save: (
    transaction: Transaction
  ) => Effect.Effect<void, RepositoryError>;

  /**
   * Find a transaction by its ID
   */
  readonly findById: (
    id: TransactionId
  ) => Effect.Effect<Transaction | null, RepositoryError>;

  /**
   * Find transactions by user ID with pagination
   */
  readonly findByUserId: (
    userId: UserId,
    limit?: number,
    offset?: number
  ) => Effect.Effect<Transaction[], RepositoryError>;

  /**
   * Find transactions by plan ID
   */
  readonly findByPlanId: (
    planId: PlanId
  ) => Effect.Effect<Transaction[], RepositoryError>;

  /**
   * Find transactions by reference
   */
  readonly findByReference: (
    reference: string
  ) => Effect.Effect<Transaction | null, RepositoryError>;

  /**
   * Update an existing transaction
   */
  readonly update: (
    transaction: Transaction
  ) => Effect.Effect<void, RepositoryError>;

  /**
   * Find transactions by status
   */
  readonly findByStatus: (
    status: TransactionStatus
  ) => Effect.Effect<Transaction[], RepositoryError>;

  /**
   * Find transactions by type and user
   */
  readonly findByTypeAndUser: (
    type: TransactionType,
    userId: UserId,
    limit?: number
  ) => Effect.Effect<Transaction[], RepositoryError>;

  /**
   * Get transaction history for a user within a date range
   */
  readonly getTransactionHistory: (
    userId: UserId,
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ) => Effect.Effect<Transaction[], RepositoryError>;

  /**
   * Get daily transaction total for a user
   */
  readonly getDailyTransactionTotal: (
    userId: UserId,
    date: Date,
    types?: TransactionType[]
  ) => Effect.Effect<Money, RepositoryError>;

  /**
   * Get monthly transaction total for a user
   */
  readonly getMonthlyTransactionTotal: (
    userId: UserId,
    year: number,
    month: number,
    types?: TransactionType[]
  ) => Effect.Effect<Money, RepositoryError>;

  /**
   * Find pending transactions older than specified minutes
   */
  readonly findStaleTransactions: (
    olderThanMinutes: number
  ) => Effect.Effect<Transaction[], RepositoryError>;

  /**
   * Get transaction count by status for a user
   */
  readonly getTransactionCountByStatus: (
    userId: UserId,
    status: TransactionStatus
  ) => Effect.Effect<number, RepositoryError>;

  /**
   * Find transactions that need to be processed (pending auto-saves, etc.)
   */
  readonly findTransactionsForProcessing: () => Effect.Effect<
    Transaction[],
    RepositoryError
  >;
}
