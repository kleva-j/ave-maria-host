import type { Money, UserId } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import { UserRepository } from "@host/domain";
import {
  ComplianceViolationError,
  UserNotFoundError,
  WITHDRAWAL_LIMITS,
  DatabaseError,
  KycTierEnum,
} from "@host/shared";

/**
 * ComplianceService handles KYC limits and regulatory checks
 */
export interface ComplianceService {
  /**
   * Check if a withdrawal respects KYC tier limits
   */
  readonly checkCompliance: (
    userId: UserId,
    amount: Money
  ) => Effect.Effect<
    void,
    ComplianceViolationError | UserNotFoundError | DatabaseError
  >;

  /**
   * Check if a withdrawal should trigger a tax warning
   */
  readonly getTaxWarning: (
    amount: Money
  ) => Effect.Effect<string | null, never>;
}

export const ComplianceService = Context.GenericTag<ComplianceService>(
  "@app/ComplianceService"
);

export const ComplianceServiceLive = Layer.effect(
  ComplianceService,
  Effect.gen(function* () {
    const userRepo = yield* UserRepository;

    return ComplianceService.of({
      checkCompliance: (userId: UserId, amount: Money) =>
        Effect.gen(function* () {
          const user = yield* userRepo.findById(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findUser",
                  table: "users",
                  message: error.message,
                })
            )
          );

          if (!user) {
            return yield* Effect.fail(
              new UserNotFoundError({ userId: userId.value })
            );
          }

          // Map user tier to limit
          let limit = 0;
          let tierName = "Unknown";

          if (user.kycTier === KycTierEnum.UNVERIFIED) {
            limit = 0; // Or some very small amount if allowed
            tierName = "Unverified";
          } else if (user.kycTier === KycTierEnum.BASIC) {
            limit = WITHDRAWAL_LIMITS.KYC_TIER_LIMITS.BASIC;
            tierName = "Tier 1 (Basic)";
          } else if (user.kycTier === KycTierEnum.FULL) {
            limit = WITHDRAWAL_LIMITS.KYC_TIER_LIMITS.FULL;
            tierName = "Tier 2 (Full)";
          }

          if (amount.value > limit) {
            return yield* Effect.fail(
              new ComplianceViolationError({
                userId: userId.value,
                requestedAmount: amount.value,
                limitAmount: limit,
                kycTier: tierName,
                reason: `Withdrawal amount exceeds ${tierName} limit of ${limit}`,
                currency: amount.currency,
              })
            );
          }
        }),

      getTaxWarning: (amount: Money) =>
        Effect.sync(() => {
          if (amount.value >= WITHDRAWAL_LIMITS.TAX_THRESHOLD_AMOUNT) {
            return `Notice: This withdrawal of ${amount.value} ${amount.currency} exceeds the tax notification threshold. Please ensure you are aware of potential tax obligations.`;
          }
          return null;
        }),
    });
  })
);
