import { Data } from "effect";

export const Limit = {
  DAILY: "daily",
  MONTHLY: "monthly",
  SINGLE: "single"
} as const;

export type LimitType = typeof Limit[keyof typeof Limit];

// Simple, focused error types
export class ContributionValidationError extends Data.TaggedError(
  "ContributionValidationError"
)<{
  readonly reason: string;
  readonly planId?: string;
  readonly userId: string;
}> {}

export class TransactionLimitValidationError extends Data.TaggedError(
  "TransactionLimitValidationError"
)<{
  readonly limitType: LimitType;
  readonly amount: number;
  readonly limit: number;
  readonly kycTier: number;
}> {}
