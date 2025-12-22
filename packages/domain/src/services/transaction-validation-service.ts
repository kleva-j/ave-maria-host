import type { PaymentSource, TransactionType } from "@host/shared";
import type { SavingsPlan } from "../entities/savings-plan";
import type { UserId, PlanId } from "../value-objects";

import { DEFAULT_CURRENCY, KycTierEnum, PaymentSourceEnum } from "@host/shared";
import { Money } from "../value-objects";
/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

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
    dailyLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.UNVERIFIED].daily,
      DEFAULT_CURRENCY
    ),
    monthlyLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.UNVERIFIED].monthly,
      DEFAULT_CURRENCY
    ),
    singleTransactionLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.UNVERIFIED].singleTransaction,
      DEFAULT_CURRENCY
    ),
  },
  [KycTierEnum.BASIC]: {
    dailyLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.BASIC].daily,
      DEFAULT_CURRENCY
    ),
    monthlyLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.BASIC].monthly,
      DEFAULT_CURRENCY
    ),
    singleTransactionLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.BASIC].singleTransaction,
      DEFAULT_CURRENCY
    ),
  },
  [KycTierEnum.FULL]: {
    dailyLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.FULL].daily,
      DEFAULT_CURRENCY
    ),
    monthlyLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.FULL].monthly,
      DEFAULT_CURRENCY
    ),
    singleTransactionLimit: Money.fromNumber(
      KYC_TIER_LIMIT[KycTierEnum.FULL].singleTransaction,
      DEFAULT_CURRENCY
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

  return { isValid: errors.length === 0, errors };
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

  return { isValid: errors.length === 0, errors };
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

  return { isValid: errors.length === 0, errors };
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

  return { isValid: errors.length === 0, errors };
}

/**
 * Get transaction limits based on KYC tier
 */
function getTransactionLimits(kycTier: Tiers) {
  return KYC_TIER[kycTier];
}
