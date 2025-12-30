import type { WithdrawalValidationError } from "../../errors/validation-errors";
import type { WithdrawalValidationResult } from "../validation-types";
import type { UserId, PlanId, Money } from "../../value-objects";
import type { SavingsPlan } from "../../entities/savings-plan";
import type { KycTier } from "@host/shared";

import { Effect } from "effect";
import {
  validateWithdrawalAmountLimits,
  validateWithdrawalEligibility,
  validateWithdrawalOwnership,
  validateWithdrawalBalance,
  validateMinimumBalance,
} from "./withdrawal-validators";

/**
 * Comprehensive withdrawal validation using composable validators
 * This function replaces all scattered validation logic with a single, centralized call
 */
export function validateWithdrawalEffect(
  userId: UserId,
  planId: PlanId,
  amount: Money,
  plan: SavingsPlan,
  userKycTier?: KycTier
): Effect.Effect<WithdrawalValidationResult, WithdrawalValidationError> {
  return Effect.gen(function* () {
    // Compose all validators
    yield* validateWithdrawalOwnership(plan, userId);
    yield* validateWithdrawalEligibility(plan, userId);
    yield* validateWithdrawalBalance(plan, userId, amount);
    yield* validateMinimumBalance(plan, userId, amount);
    yield* validateWithdrawalAmountLimits(userId, amount);

    // Return comprehensive validation result
    const canEarlyWithdraw = plan.canEarlyWithdraw();
    const penaltyAmount =
      canEarlyWithdraw && !plan.canWithdraw()
        ? plan.calculateEarlyWithdrawalPenalty()
        : undefined;

    return {
      isValid: true,
      warnings:
        canEarlyWithdraw && !plan.canWithdraw()
          ? [
              `Early withdrawal penalty of ${penaltyAmount?.format() || "0"} will be applied`,
            ]
          : [],
      planEligibility: {
        canWithdraw: plan.canWithdraw(),
        canEarlyWithdraw,
        penaltyAmount: penaltyAmount?.value,
      },
      balanceEligibility: {
        hasSufficientBalance: amount.isLessThanOrEqual(plan.currentAmount),
        respectsMinimumBalance: plan.canWithdrawAmount(amount),
        withdrawableAmount: plan.getWithdrawableAmount(),
      },
      limitEligibility: {
        respectsDailyLimit: true, // TODO: Implement with actual withdrawal tracking
        respectsWeeklyLimit: true, // TODO: Implement with actual withdrawal tracking
        respectsMonthlyLimit: true, // TODO: Implement with actual withdrawal tracking
      },
    };
  });
}
