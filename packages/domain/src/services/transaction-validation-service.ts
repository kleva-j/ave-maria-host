import type { KycTier, PaymentSource, TransactionType } from "@host/shared";
import type { SavingsPlan } from "../entities/savings-plan";
import type { ValidationResult } from "./validation-types";
import type { UserId, PlanId } from "../value-objects";

import { KycTierEnum, PaymentSourceEnum } from "@host/shared";
import { Money } from "../value-objects";
import { Effect } from "effect";
import {
  TransactionLimitValidationError,
  ContributionValidationError,
} from "../errors/validation-errors";

export const KYC_TIER_LIMIT = {
  [KycTierEnum.UNVERIFIED]: {
    daily: 5_000,
    monthly: 50_000,
    singleTransaction: 2_000,
  },
  [KycTierEnum.BASIC]: {
    daily: 50_000,
    monthly: 500_000,
    singleTransaction: 20_000,
  },
  [KycTierEnum.FULL]: {
    daily: 500_000,
    monthly: 5_000_000,
    singleTransaction: 200_000,
  },
} as const;

export const KYC_TIER = {
  [KycTierEnum.UNVERIFIED]: {
    dailyLimit: Money.fromNumber(KYC_TIER_LIMIT[KycTierEnum.UNVERIFIED].daily),
    monthlyLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.UNVERIFIED].monthly
    ),
    singleTransactionLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.UNVERIFIED].singleTransaction
    ),
  },
  [KycTierEnum.BASIC]: {
    dailyLimit: Money.fromNumber(KYC_TIER_LIMIT[KycTierEnum.BASIC].daily),
    monthlyLimit: Money.fromNumber(KYC_TIER_LIMIT[KycTierEnum.BASIC].monthly),
    singleTransactionLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.BASIC].singleTransaction
    ),
  },
  [KycTierEnum.FULL]: {
    dailyLimit: Money.fromNumber(KYC_TIER_LIMIT[KycTierEnum.FULL].daily),
    monthlyLimit: Money.fromNumber(KYC_TIER_LIMIT[KycTierEnum.FULL].monthly),
    singleTransactionLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.FULL].singleTransaction
    ),
  },
} as const;

type Tiers = keyof typeof KYC_TIER;

/**
 * Validate a contribution transaction
 */
export function validateContribution(
  userId: UserId,
  _planId: PlanId,
  amount: Money,
  source: PaymentSource,
  plan: SavingsPlan,
  walletBalance?: Money
): ValidationResult {
  const errors: string[] = [];

  // Check if plan belongs to user
  if (!plan.userId.equals(userId)) {
    errors.push("Plan does not belong to the user");
  }

  // Check if plan can accept contributions
  if (!plan.canMakeContribution(amount)) {
    errors.push("Plan cannot accept this contribution amount or is not active");
  }

  // Check wallet balance if using wallet as source
  if (source === PaymentSourceEnum.WALLET && walletBalance) {
    if (walletBalance.isLessThan(amount)) {
      errors.push("Insufficient wallet balance");
    }
  }

  // Check minimum contribution amount (e.g., 10 NGN)
  const minimumAmount = Money.fromNumber(10, amount.currency);
  if (amount.isLessThan(minimumAmount)) {
    errors.push(`Minimum contribution amount is ${minimumAmount.format()}`);
  }

  // Check maximum daily contribution limit (e.g., 50,000 NGN)
  const maximumAmount = Money.fromNumber(50000, amount.currency);
  if (amount.isGreaterThan(maximumAmount)) {
    errors.push(`Maximum contribution amount is ${maximumAmount.format()}`);
  }

  return { isValid: errors.length === 0, warnings: errors };
}

/**
 * Validate a withdrawal transaction
 */
export function validateWithdrawal(
  userId: UserId,
  amount: Money,
  plan?: SavingsPlan
): ValidationResult {
  const errors: string[] = [];

  // If withdrawing from a specific plan
  if (plan) {
    // Check if plan belongs to user
    if (!plan.userId.equals(userId)) {
      errors.push("Plan does not belong to the user");
    }

    // Check if withdrawal is allowed
    if (!plan.canWithdraw() && !plan.canEarlyWithdraw()) {
      errors.push("Withdrawal not allowed for this plan");
    }

    // Check if amount exceeds available balance
    if (amount.isGreaterThan(plan.currentAmount)) {
      errors.push("Withdrawal amount exceeds available balance");
    }

    // Warn about early withdrawal penalty
    if (plan.canEarlyWithdraw() && !plan.canWithdraw()) {
      const penalty = plan.calculateEarlyWithdrawalPenalty();
      errors.push(
        `Early withdrawal penalty of ${penalty.format()} will be applied`
      );
    }
  }

  // Check minimum withdrawal amount
  const minimumAmount = Money.fromNumber(100, amount.currency);
  if (amount.isLessThan(minimumAmount)) {
    errors.push(`Minimum withdrawal amount is ${minimumAmount.format()}`);
  }

  return { isValid: errors.length === 0, warnings: errors };
}

/**
 * Validate a wallet funding transaction
 */
export function validateWalletFunding(
  _userId: UserId,
  amount: Money,
  source: PaymentSource
): ValidationResult {
  const errors: string[] = [];

  // Check minimum funding amount
  const minimumAmount = Money.fromNumber(100, amount.currency);
  if (amount.isLessThan(minimumAmount)) {
    errors.push(`Minimum funding amount is ${minimumAmount.format()}`);
  }

  // Check maximum funding amount per transaction
  const maximumAmount = Money.fromNumber(1000000, amount.currency); // 1M NGN
  if (amount.isGreaterThan(maximumAmount)) {
    errors.push(
      `Maximum funding amount per transaction is ${maximumAmount.format()}`
    );
  }

  // Validate payment source
  if (!["bank_transfer", "debit_card"].includes(source)) {
    errors.push("Invalid payment source for wallet funding");
  }

  return { isValid: errors.length === 0, warnings: errors };
}

/**
 * Validate transaction limits for a user (daily/monthly limits)
 */
export function validateTransactionLimits(
  _userId: UserId,
  amount: Money,
  _type: TransactionType,
  userKycTier: Tiers,
  dailyTransactionTotal: Money,
  monthlyTransactionTotal: Money
): ValidationResult {
  const errors: string[] = [];

  // Define limits based on KYC tier
  const limits = getTransactionLimits(userKycTier);

  // Check daily limits
  const newDailyTotal = dailyTransactionTotal.add(amount);
  if (newDailyTotal.isGreaterThan(limits.dailyLimit)) {
    errors.push(
      `Daily transaction limit of ${limits.dailyLimit.format()} exceeded`
    );
  }

  // Check monthly limits
  const newMonthlyTotal = monthlyTransactionTotal.add(amount);
  if (newMonthlyTotal.isGreaterThan(limits.monthlyLimit)) {
    errors.push(
      `Monthly transaction limit of ${limits.monthlyLimit.format()} exceeded`
    );
  }

  // Check single transaction limits
  if (amount.isGreaterThan(limits.singleTransactionLimit)) {
    errors.push(
      `Single transaction limit of ${limits.singleTransactionLimit.format()} exceeded`
    );
  }

  return { isValid: errors.length === 0, warnings: errors };
}

/**
 * Get transaction limits based on KYC tier
 */
function getTransactionLimits(kycTier: Tiers) {
  return KYC_TIER[kycTier];
}

/**
 * Validates a contribution request using an Effect-based pipeline.
 *
 * This function sequences several validation checks:
 * 1. Plan Ownership: Ensures the target plan belongs to the requesting user.
 * 2. Plan Capacity: Checks if the plan can accept the specified contribution amount (e.g., active status, goal limits).
 * 3. Wallet Balance: Verifies sufficient funds if the source is the user's wallet.
 * 4. Range Validation: Enforces minimum and maximum allowable contribution amounts.
 *
 * @param userId - The ID of the user performing the contribution.
 * @param planId - The ID of the targeted savings plan.
 * @param amount - The contribution amount (validated against currency and limits).
 * @param source - The payment source (e.g., wallet, bank_transfer).
 * @param plan - The domain entity for the savings plan.
 * @param walletBalance - Optional current wallet balance (required if source is WALLET).
 * @returns An Effect that succeeds with `void` if all checks pass, or fails with a `ContributionValidationError`.
 */
export function validateContributionEffect(
  userId: UserId,
  planId: PlanId,
  amount: Money,
  source: PaymentSource,
  plan: SavingsPlan,
  walletBalance?: Money
): Effect.Effect<void, ContributionValidationError> {
  const commonData = { userId: userId.value, planId: planId.value };

  return Effect.void.pipe(
    // 1. Ownership Check
    Effect.andThen(() =>
      plan.userId.equals(userId)
        ? Effect.void
        : Effect.fail(
            new ContributionValidationError({
              ...commonData,
              reason: "Plan does not belong to the user",
            })
          )
    ),
    // 2. Capacity & Status Check
    Effect.andThen(() =>
      plan.canMakeContribution(amount)
        ? Effect.void
        : Effect.fail(
            new ContributionValidationError({
              ...commonData,
              reason:
                "Plan cannot accept this contribution amount or is not active",
            })
          )
    ),
    // 3. Wallet Balance Check (conditional on source)
    Effect.andThen(() =>
      source === PaymentSourceEnum.WALLET &&
      walletBalance &&
      walletBalance.isLessThan(amount)
        ? Effect.fail(
            new ContributionValidationError({
              ...commonData,
              reason: "Insufficient wallet balance",
            })
          )
        : Effect.void
    ),
    // 4. Minimum Amount Check
    Effect.andThen(() => {
      const minimumAmount = Money.fromNumber(10, amount.currency);
      return amount.isLessThan(minimumAmount)
        ? Effect.fail(
            new ContributionValidationError({
              ...commonData,
              reason: `Minimum contribution amount is ${minimumAmount.format()}`,
            })
          )
        : Effect.void;
    }),
    // 5. Maximum Amount Check
    Effect.andThen(() => {
      const maximumAmount = Money.fromNumber(50000, amount.currency);
      return amount.isGreaterThan(maximumAmount)
        ? Effect.fail(
            new ContributionValidationError({
              ...commonData,
              reason: `Maximum contribution amount is ${maximumAmount.format()}`,
            })
          )
        : Effect.void;
    })
  );
}

/**
 * Validates transaction limits (daily, monthly, single-transaction) based on the user's KYC tier.
 *
 * This function sequences three checks:
 * 1. Daily Limit: Ensures the total daily volume won't exceed the tier's daily cap.
 * 2. Monthly Limit: Ensures the total monthly volume won't exceed the tier's monthly cap.
 * 3. Single-Transaction Limit: Ensures the current transaction amount is within the tier's per-transaction cap.
 *
 * @param _userId - The ID of the user (currently unused but included for consistency).
 * @param amount - The amount of the current transaction.
 * @param _type - The type of transaction (currently unused).
 * @param userKycTier - The user's current validation tier (influences limits).
 * @param dailyTransactionTotal - Current sum of transactions today.
 * @param monthlyTransactionTotal - Current sum of transactions this month.
 * @returns An Effect that succeeds with `void` if all checks pass, or fails with a `TransactionLimitValidationError`.
 */
export function validateTransactionLimitsEffect(
  _userId: UserId,
  amount: Money,
  _type: TransactionType,
  userKycTier: KycTier,
  dailyTransactionTotal: Money,
  monthlyTransactionTotal: Money
): Effect.Effect<void, TransactionLimitValidationError> {
  const limits = getTransactionLimits(userKycTier);
  const commonData = { amount: amount.value, kycTier: userKycTier as number };

  return Effect.void.pipe(
    // 1. Daily Volume Check
    Effect.andThen(() =>
      dailyTransactionTotal.add(amount).isGreaterThan(limits.dailyLimit)
        ? Effect.fail(
            new TransactionLimitValidationError({
              ...commonData,
              limitType: "daily",
              limit: limits.dailyLimit.value,
            })
          )
        : Effect.void
    ),
    // 2. Monthly Volume Check
    Effect.andThen(() =>
      monthlyTransactionTotal.add(amount).isGreaterThan(limits.monthlyLimit)
        ? Effect.fail(
            new TransactionLimitValidationError({
              ...commonData,
              limitType: "monthly",
              limit: limits.monthlyLimit.value,
            })
          )
        : Effect.void
    ),
    // 3. Single Transaction Cap Check
    Effect.andThen(() =>
      amount.isGreaterThan(limits.singleTransactionLimit)
        ? Effect.fail(
            new TransactionLimitValidationError({
              ...commonData,
              limitType: "single",
              limit: limits.singleTransactionLimit.value,
            })
          )
        : Effect.void
    )
  );
}
