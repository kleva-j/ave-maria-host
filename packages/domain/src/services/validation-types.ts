import type { UserId, PlanId, Money } from "../value-objects";
import type { SavingsPlan } from "../entities/savings-plan";
import type { PaymentSource, KycTier } from "@host/shared";

/**
 * Request types for validation operations
 */

export interface ContributionValidationRequest {
  readonly userId: UserId;
  readonly planId: PlanId;
  readonly amount: Money;
  readonly source: PaymentSource;
  readonly plan: SavingsPlan;
  readonly walletBalance?: Money;
  readonly userKycTier: KycTier;
  readonly dailyTransactionTotal: Money;
  readonly monthlyTransactionTotal: Money;
}

export interface WithdrawalValidationRequest {
  readonly userId: UserId;
  readonly amount: Money;
  readonly plan?: SavingsPlan;
  readonly userKycTier: KycTier;
  readonly dailyWithdrawalTotal: Money;
  readonly weeklyWithdrawalTotal: Money;
  readonly monthlyWithdrawalTotal: Money;
}

export interface WalletFundingValidationRequest {
  readonly userId: UserId;
  readonly amount: Money;
  readonly source: PaymentSource;
}

export interface TransactionLimitValidationRequest {
  readonly userId: UserId;
  readonly amount: Money;
  readonly userKycTier: KycTier;
  readonly dailyTransactionTotal: Money;
  readonly monthlyTransactionTotal: Money;
}

/**
 * Response types for validation operations
 */

export interface ValidationResult {
  readonly isValid: boolean;
  readonly warnings: string[];
}

export interface ContributionValidationResult extends ValidationResult {
  readonly planEligibility: {
    readonly canContribute: boolean;
    readonly respectsTargetAmount: boolean;
  };
  readonly walletEligibility: {
    readonly hasSufficientBalance: boolean;
    readonly availableBalance?: Money;
  };
  readonly kycEligibility: {
    readonly respectsLimits: boolean;
    readonly tierLimits: {
      readonly daily: Money;
      readonly monthly: Money;
      readonly singleTransaction: Money;
    };
  };
}

export interface WithdrawalValidationResult extends ValidationResult {
  readonly planEligibility: {
    readonly canWithdraw: boolean;
    readonly canEarlyWithdraw: boolean;
    readonly penaltyAmount?: number | undefined;
  };
  readonly balanceEligibility: {
    readonly hasSufficientBalance: boolean;
    readonly respectsMinimumBalance: boolean;
    readonly withdrawableAmount: Money;
  };
  readonly limitEligibility: {
    readonly respectsDailyLimit: boolean;
    readonly respectsWeeklyLimit: boolean;
    readonly respectsMonthlyLimit: boolean;
  };
}

export interface WalletValidationResult extends ValidationResult {
  readonly walletEligibility: {
    readonly hasSufficientBalance: boolean;
    readonly availableBalance: Money | undefined;
    readonly withdrawableAmount: Money;
  };
  readonly fundingEligibility: {
    readonly respectsLimits: boolean;
    readonly dailyLimit: Money;
    readonly weeklyLimit: Money;
    readonly monthlyLimit: Money;
  };
  readonly transactionEligibility: {
    readonly isValidAmount: boolean;
    readonly respectsPaymentSource: boolean;
    readonly minimumAmount: Money;
    readonly maximumAmount: Money;
  };
}
