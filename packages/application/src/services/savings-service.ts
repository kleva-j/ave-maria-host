import type { WithdrawalRepository, UserId } from "@host/domain";

import { WithdrawalLimit, Money } from "@host/domain";
import { Effect, Context, Layer } from "effect";
import {
  WithdrawalLimitExceededError,
  TransactionOperationError,
  WITHDRAWAL_LIMIT_PERIODS,
  WITHDRAWAL_LIMITS,
  DEFAULT_CURRENCY,
  DatabaseError,
} from "@host/shared";

/**
 * Service for savings plan operations
 */
export interface SavingsService {
  /**
   * Check if a withdrawal would exceed limits
   */
  readonly checkWithdrawalLimits: (
    userId: UserId,
    amount: Money
  ) => Effect.Effect<
    void,
    WithdrawalLimitExceededError | DatabaseError | TransactionOperationError
  >;
}

export const SavingsService = Context.GenericTag<SavingsService>(
  "@app/SavingsService"
);

export const SavingsServiceLive = Layer.effect(
  SavingsService,
  Effect.gen(function* () {
    const withdrawalRepo = yield* Effect.serviceOption(
      Context.GenericTag<WithdrawalRepository>("@domain/WithdrawalRepository")
    );

    if (withdrawalRepo._tag === "None") {
      return yield* Effect.die(
        new Error("WithdrawalRepository not found in dependencies")
      );
    }
    const withdrawalRepository = withdrawalRepo.value;

    // Configure withdrawal limits from centralized config
    const dailyLimit = WithdrawalLimit.daily(
      WITHDRAWAL_LIMITS.DAILY_COUNT,
      Money.fromNumber(WITHDRAWAL_LIMITS.DAILY_AMOUNT, DEFAULT_CURRENCY)
    );
    const weeklyLimit = WithdrawalLimit.weekly(
      WITHDRAWAL_LIMITS.WEEKLY_COUNT,
      Money.fromNumber(WITHDRAWAL_LIMITS.WEEKLY_AMOUNT, DEFAULT_CURRENCY)
    );
    const monthlyLimit = WithdrawalLimit.monthly(
      WITHDRAWAL_LIMITS.MONTHLY_COUNT,
      Money.fromNumber(WITHDRAWAL_LIMITS.MONTHLY_AMOUNT, DEFAULT_CURRENCY)
    );

    return {
      checkWithdrawalLimits: (userId: UserId, amount: Money) =>
        Effect.gen(function* () {
          const now = new Date();

          // Daily limit check
          const dailyStart = WithdrawalLimit.getPeriodStart(
            WITHDRAWAL_LIMIT_PERIODS.DAILY,
            now
          );
          const dailyCount = yield* withdrawalRepository
            .getWithdrawalCountSince(userId, dailyStart)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: error.operation,
                    table: error.entity,
                    message:
                      error.message || "Failed to get daily withdrawal count",
                  })
              )
            );
          const dailyAmount = yield* withdrawalRepository
            .getWithdrawalAmountSince(
              userId,
              dailyStart,
              amount.currency // Assuming same currency for now
            )
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: error.operation,
                    table: error.entity,
                    message:
                      error.message || "Failed to get daily withdrawal amount",
                  })
              )
            );

          if (dailyLimit.wouldExceed(dailyCount, dailyAmount, amount)) {
            return yield* Effect.fail(
              new WithdrawalLimitExceededError({
                period: WITHDRAWAL_LIMIT_PERIODS.DAILY,
                limit: dailyLimit.maxCount,
                current: dailyCount,
                limitType:
                  dailyCount >= dailyLimit.maxCount ? "count" : "amount",
              })
            );
          }

          // Weekly limit check
          const weeklyStart = WithdrawalLimit.getPeriodStart(
            WITHDRAWAL_LIMIT_PERIODS.WEEKLY,
            now
          );
          const weeklyCount = yield* withdrawalRepository
            .getWithdrawalCountSince(userId, weeklyStart)
            .pipe(
              Effect.mapError(
                (error) =>
                  new TransactionOperationError({
                    operation: error.operation,
                    reason: "Failed to get weekly withdrawal count",
                  })
              )
            );
          const weeklyAmount = yield* withdrawalRepository
            .getWithdrawalAmountSince(userId, weeklyStart, amount.currency)
            .pipe(
              Effect.mapError(
                (error) =>
                  new TransactionOperationError({
                    operation: error.operation,
                    reason: "Failed to get weekly withdrawal amount",
                  })
              )
            );

          if (weeklyLimit.wouldExceed(weeklyCount, weeklyAmount, amount)) {
            return yield* Effect.fail(
              new WithdrawalLimitExceededError({
                period: WITHDRAWAL_LIMIT_PERIODS.WEEKLY,
                limit: weeklyLimit.maxCount,
                current: weeklyCount,
                limitType:
                  weeklyCount >= weeklyLimit.maxCount ? "count" : "amount",
              })
            );
          }

          // Monthly limit check
          const monthlyStart = WithdrawalLimit.getPeriodStart(
            WITHDRAWAL_LIMIT_PERIODS.MONTHLY,
            now
          );
          const monthlyCount = yield* withdrawalRepository
            .getWithdrawalCountSince(userId, monthlyStart)
            .pipe(
              Effect.mapError(
                (error) =>
                  new TransactionOperationError({
                    operation: error.operation,
                    reason: "Failed to get monthly withdrawal count",
                  })
              )
            );
          const monthlyAmount = yield* withdrawalRepository
            .getWithdrawalAmountSince(userId, monthlyStart, amount.currency)
            .pipe(
              Effect.mapError(
                (error) =>
                  new TransactionOperationError({
                    operation: error.operation,
                    reason: "Failed to get monthly withdrawal amount",
                  })
              )
            );

          if (monthlyLimit.wouldExceed(monthlyCount, monthlyAmount, amount)) {
            return yield* Effect.fail(
              new WithdrawalLimitExceededError({
                period: WITHDRAWAL_LIMIT_PERIODS.MONTHLY,
                limit: monthlyLimit.maxCount,
                current: monthlyCount,
                limitType:
                  monthlyCount >= monthlyLimit.maxCount ? "count" : "amount",
              })
            );
          }
        }),
    };
  })
);
