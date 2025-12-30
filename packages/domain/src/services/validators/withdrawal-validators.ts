import type { SavingsPlan } from "../../entities/savings-plan";
import type { UserId } from "../../value-objects";

import { Money } from "../../value-objects";
import { Effect } from "effect";
import {
  WithdrawalValidationError,
  WithdrawalErrorType,
} from "../../errors/validation-errors";

/**
 * Individual validator functions for withdrawal operations
 * Each validator returns Effect<void, WithdrawalValidationError> for composition
 */

/**
 * Validate if plan belongs to the user
 */
export const validateWithdrawalOwnership = (
  plan: SavingsPlan,
  userId: UserId
) =>
  plan.userId.equals(userId)
    ? Effect.void
    : Effect.fail(
        new WithdrawalValidationError({
          type: WithdrawalErrorType.PLAN_OWNERSHIP,
          userId: userId.value,
          planId: plan.id.value,
          message: "Plan does not belong to the user",
        })
      );

/**
 * Validate if withdrawal is allowed from the plan
 */
export const validateWithdrawalEligibility = (
  plan: SavingsPlan,
  userId: UserId
) =>
  plan.canWithdraw() || plan.canEarlyWithdraw()
    ? Effect.void
    : Effect.fail(
        new WithdrawalValidationError({
          type: WithdrawalErrorType.PLAN_STATUS,
          userId: userId.value,
          planId: plan.id.value,
          message: "Withdrawal not allowed for this plan",
        })
      );

/**
 * Validate if withdrawal amount is available in the plan
 */
export const validateWithdrawalBalance = (
  plan: SavingsPlan,
  userId: UserId,
  amount: Money
) =>
  amount.isLessThanOrEqual(plan.currentAmount)
    ? Effect.void
    : Effect.fail(
        new WithdrawalValidationError({
          type: WithdrawalErrorType.INSUFFICIENT_BALANCE,
          userId: userId.value,
          planId: plan.id.value,
          message: "Withdrawal amount exceeds available balance",
          context: {
            requestedAmount: amount.value,
            availableBalance: plan.currentAmount.value,
          },
        })
      );

/**
 * Validate if withdrawal respects minimum balance requirements
 */
export const validateMinimumBalance = (
  plan: SavingsPlan,
  userId: UserId,
  amount: Money
) => {
  const remainingBalance = plan.currentAmount.subtract(amount);
  return remainingBalance.isGreaterThanOrEqual(plan.minimumBalance)
    ? Effect.void
    : Effect.fail(
        new WithdrawalValidationError({
          type: WithdrawalErrorType.MINIMUM_BALANCE,
          userId: userId.value,
          planId: plan.id.value,
          message: "Withdrawal would violate minimum balance requirements",
          context: {
            requestedAmount: amount.value,
            availableBalance: plan.currentAmount.value,
          },
        })
      );
};

/**
 * Validate withdrawal amount against minimum and maximum limits
 */
export const validateWithdrawalAmountLimits = (
  userId: UserId,
  amount: Money,
  minimumAmount: Money = Money.fromNumber(100),
  maximumAmount: Money = Money.fromNumber(1000000)
) =>
  amount.isGreaterThanOrEqual(minimumAmount) &&
  amount.isLessThanOrEqual(maximumAmount)
    ? Effect.void
    : Effect.fail(
        new WithdrawalValidationError({
          type: WithdrawalErrorType.INSUFFICIENT_BALANCE,
          userId: userId.value,
          message: amount.isLessThan(minimumAmount)
            ? `Minimum withdrawal amount is ${minimumAmount.format()}`
            : `Maximum withdrawal amount is ${maximumAmount.format()}`,
          context: {
            requestedAmount: amount.value,
            currentLimit: amount.isLessThan(minimumAmount)
              ? minimumAmount.value
              : maximumAmount.value,
          },
        })
      );
