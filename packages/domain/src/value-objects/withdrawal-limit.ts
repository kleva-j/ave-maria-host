import type { WithdrawalLimitPeriod } from "@host/shared";

import { WITHDRAWAL_LIMIT_PERIODS } from "@host/shared";
import { Money } from "./money";

/**
 * Value object representing withdrawal limits
 * Supports both count-based and amount-based limits
 */
export class WithdrawalLimit {
  private constructor(
    public readonly period: WithdrawalLimitPeriod,
    public readonly maxCount: number,
    public readonly maxAmount: Money
  ) {
    if (maxCount < 0) {
      throw new Error("Withdrawal limit count cannot be negative");
    }
    if (maxAmount.value < 0) {
      throw new Error("Withdrawal limit amount cannot be negative");
    }
  }

  /**
   * Create a daily withdrawal limit
   */
  static daily(maxCount: number, maxAmount: Money): WithdrawalLimit {
    return new WithdrawalLimit(
      WITHDRAWAL_LIMIT_PERIODS.DAILY,
      maxCount,
      maxAmount
    );
  }

  /**
   * Create a weekly withdrawal limit
   */
  static weekly(maxCount: number, maxAmount: Money): WithdrawalLimit {
    return new WithdrawalLimit(
      WITHDRAWAL_LIMIT_PERIODS.WEEKLY,
      maxCount,
      maxAmount
    );
  }

  /**
   * Create a monthly withdrawal limit
   */
  static monthly(maxCount: number, maxAmount: Money): WithdrawalLimit {
    return new WithdrawalLimit(
      WITHDRAWAL_LIMIT_PERIODS.MONTHLY,
      maxCount,
      maxAmount
    );
  }

  /**
   * Check if a withdrawal would exceed this limit
   */
  wouldExceed(
    currentCount: number,
    currentAmount: Money,
    proposedAmount: Money
  ): boolean {
    if (currentCount + 1 > this.maxCount) {
      return true;
    }

    if (currentAmount.add(proposedAmount).isGreaterThan(this.maxAmount)) {
      return true;
    }

    return false;
  }

  /**
   * Get remaining count for this limit
   */
  remainingCount(currentCount: number): number {
    return Math.max(0, this.maxCount - currentCount);
  }

  /**
   * Get remaining amount for this limit
   */
  remainingAmount(currentAmount: Money): Money {
    const remaining = this.maxAmount.subtract(currentAmount);
    return remaining.value < 0
      ? Money.zero(this.maxAmount.currency)
      : remaining;
  }

  /**
   * Get the start date for this limit period
   */
  static getPeriodStart(
    period: WithdrawalLimitPeriod,
    now: Date = new Date()
  ): Date {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case WITHDRAWAL_LIMIT_PERIODS.DAILY:
        return start;
      case WITHDRAWAL_LIMIT_PERIODS.WEEKLY: {
        // Start of week (Monday)
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        return start;
      }
      case WITHDRAWAL_LIMIT_PERIODS.MONTHLY:
        start.setDate(1);
        return start;
      default:
        throw new Error("Invalid withdrawal limit period");
    }
  }
}
