/**
 * @fileoverview Withdrawal Limits Configuration
 *
 * Defines the withdrawal limits for savings plans to prevent abuse
 * and ensure platform stability. These limits apply per user across
 * all their savings plans.
 *
 * @module config/withdrawal-config
 */

/**
 * Withdrawal limit configuration for the savings platform
 *
 * These limits are enforced to:
 * - Prevent rapid fund movement that could indicate fraudulent activity
 * - Ensure platform liquidity and operational stability
 * - Comply with financial regulations
 * - Protect users from potential account compromise
 */
export const WITHDRAWAL_LIMITS = {
  /**
   * Maximum number of withdrawal transactions per day
   */
  DAILY_COUNT: 5,

  /**
   * Maximum total withdrawal amount per day in NGN
   */
  DAILY_AMOUNT: 100_000,

  /**
   * Maximum number of withdrawal transactions per week
   */
  WEEKLY_COUNT: 15,

  /**
   * Maximum total withdrawal amount per week in NGN
   */
  WEEKLY_AMOUNT: 500_000,

  /**
   * Maximum number of withdrawal transactions per month
   */
  MONTHLY_COUNT: 30,

  /**
   * Maximum total withdrawal amount per month in NGN
   */
  MONTHLY_AMOUNT: 2_000_000,

  /**
   * Number of days recent deposits must be held before withdrawal
   * This prevents rapid cycling of funds
   */
  HOLD_PERIOD_DAYS: 3,

  /**
   * Default minimum balance required in NGN
   * Individual plans can have higher minimum balances
   */
  DEFAULT_MINIMUM_BALANCE: 1_000,
} as const;

/**
 * Type representing the withdrawal limits configuration
 */
export type WithdrawalLimitsConfig = typeof WITHDRAWAL_LIMITS;

/**
 * Withdrawal limit periods
 */
export const WITHDRAWAL_LIMIT_PERIODS = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;

export type WithdrawalLimitPeriod =
  (typeof WITHDRAWAL_LIMIT_PERIODS)[keyof typeof WITHDRAWAL_LIMIT_PERIODS];

/**
 * Helper to get limit for a specific period
 */
export function getWithdrawalCountLimit(period: WithdrawalLimitPeriod): number {
  switch (period) {
    case WITHDRAWAL_LIMIT_PERIODS.DAILY:
      return WITHDRAWAL_LIMITS.DAILY_COUNT;
    case WITHDRAWAL_LIMIT_PERIODS.WEEKLY:
      return WITHDRAWAL_LIMITS.WEEKLY_COUNT;
    case WITHDRAWAL_LIMIT_PERIODS.MONTHLY:
      return WITHDRAWAL_LIMITS.MONTHLY_COUNT;
    default:
      throw new Error(`Invalid withdrawal period: ${period}`);
  }
}

/**
 * Helper to get amount limit for a specific period
 */
export function getWithdrawalAmountLimit(
  period: WithdrawalLimitPeriod
): number {
  switch (period) {
    case WITHDRAWAL_LIMIT_PERIODS.DAILY:
      return WITHDRAWAL_LIMITS.DAILY_AMOUNT;
    case WITHDRAWAL_LIMIT_PERIODS.WEEKLY:
      return WITHDRAWAL_LIMITS.WEEKLY_AMOUNT;
    case WITHDRAWAL_LIMIT_PERIODS.MONTHLY:
      return WITHDRAWAL_LIMITS.MONTHLY_AMOUNT;
    default:
      throw new Error(`Invalid withdrawal period: ${period}`);
  }
}
