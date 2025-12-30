import { Data } from "effect";

export const Limit = {
  DAILY: "daily",
  MONTHLY: "monthly",
  SINGLE: "single"
} as const;

export type LimitType = typeof Limit[keyof typeof Limit];

export const WithdrawalErrorType = {
  PLAN_OWNERSHIP: "PLAN_OWNERSHIP",
  PLAN_STATUS: "PLAN_STATUS", 
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  MINIMUM_BALANCE: "MINIMUM_BALANCE",
  KYC_LIMITS: "KYC_LIMITS"
} as const;

export type WithdrawalErrorType = typeof WithdrawalErrorType[keyof typeof WithdrawalErrorType];

// Simple, focused error types
export class ContributionValidationError extends Data.TaggedError(
  "ContributionValidationError"
)<{
  readonly reason: string;
  readonly planId?: string;
  readonly userId: string;
}> {}

export class WithdrawalValidationError extends Data.TaggedError(
  "WithdrawalValidationError"
)<{
  readonly type: WithdrawalErrorType;
  readonly userId: string;
  readonly planId?: string;
  readonly message: string;
  readonly context?: {
    readonly requestedAmount?: number;
    readonly availableBalance?: number;
    readonly penaltyAmount?: number;
    readonly currentLimit?: number;
    readonly limitType?: "daily" | "weekly" | "monthly";
    readonly kycTier?: number;
  };
}> {}

export class TransactionLimitValidationError extends Data.TaggedError(
  "TransactionLimitValidationError"
)<{
  readonly limitType: LimitType;
  readonly amount: number;
  readonly limit: number;
  readonly kycTier: number;
}> {}
