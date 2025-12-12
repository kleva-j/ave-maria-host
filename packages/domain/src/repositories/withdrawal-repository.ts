import type { PlanId, UserId, Money } from "../value-objects";
import type { DatabaseError } from "@host/shared";
import type { Effect } from "effect";

/**
 * Withdrawal history entry for tracking limits
 */
export interface WithdrawalHistoryEntry {
  readonly transactionId: string;
  readonly planId: string;
  readonly userId: string;
  readonly amount: number;
  readonly currency: string;
  readonly withdrawnAt: Date;
}

/**
 * Repository interface for withdrawal-related queries
 */
export interface WithdrawalRepository {
  /**
   * Get withdrawal count for a user within a specific time period
   */
  readonly getWithdrawalCountSince: (
    userId: UserId,
    since: Date
  ) => Effect.Effect<number, DatabaseError>;

  /**
   * Get total withdrawal amount for a user within a specific time period
   */
  readonly getWithdrawalAmountSince: (
    userId: UserId,
    since: Date,
    currency: string
  ) => Effect.Effect<Money, DatabaseError>;

  /**
   * Get withdrawal count for a specific plan within a time period
   */
  readonly getPlanWithdrawalCountSince: (
    planId: PlanId,
    since: Date
  ) => Effect.Effect<number, DatabaseError>;

  /**
   * Get total withdrawal amount for a specific plan within a time period
   */
  readonly getPlanWithdrawalAmountSince: (
    planId: PlanId,
    since: Date,
    currency: string
  ) => Effect.Effect<Money, DatabaseError>;

  /**
   * Get withdrawal history for a user
   */
  readonly getWithdrawalHistory: (
    userId: UserId,
    limit?: number,
    offset?: number
  ) => Effect.Effect<readonly WithdrawalHistoryEntry[], DatabaseError>;

  /**
   * Check if there are any pending withdrawals for a plan
   */
  readonly hasPendingWithdrawals: (
    planId: PlanId
  ) => Effect.Effect<boolean, DatabaseError>;
}
