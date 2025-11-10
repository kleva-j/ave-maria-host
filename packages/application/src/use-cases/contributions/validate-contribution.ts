import type { SavingsRepository, WalletRepository } from "@host/domain";

import { PlanId, UserId, Money } from "@host/domain";
import { Effect, Context, Layer } from "effect";
import { Schema } from "@effect/schema";
import {
  type FinancialError,
  AuthorizationError,
  PlanNotFoundError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for validating a contribution
 */
export const ValidateContributionInput = Schema.Struct({
  userId: Schema.UUID,
  planId: Schema.UUID,
  amount: Schema.Number.pipe(Schema.positive()),
  source: Schema.Literal("wallet", "bank_transfer", "debit_card"),
});

export type ValidateContributionInput = typeof ValidateContributionInput.Type;

/**
 * Output from validating a contribution
 */
export interface ValidateContributionOutput {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly expectedAmount: number;
  readonly availableBalance?: number;
}

/**
 * Use case for validating a contribution before processing
 * Performs pre-flight checks without modifying any data
 */
export interface ValidateContributionUseCase {
  readonly execute: (
    input: ValidateContributionInput
  ) => Effect.Effect<ValidateContributionOutput, FinancialError>;
}

export const ValidateContributionUseCase =
  Context.GenericTag<ValidateContributionUseCase>(
    "@app/ValidateContributionUseCase"
  );

/**
 * Live implementation of ValidateContributionUseCase
 */
export const ValidateContributionUseCaseLive = Layer.effect(
  ValidateContributionUseCase,
  Effect.gen(function* () {
    const savingsRepo = yield* Effect.serviceOption(
      Context.GenericTag<SavingsRepository>("@domain/SavingsRepository")
    );
    const walletRepo = yield* Effect.serviceOption(
      Context.GenericTag<WalletRepository>("@domain/WalletRepository")
    );

    if (savingsRepo._tag === "None" || walletRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Required repositories not available",
        })
      );
    }

    const savingsRepository = savingsRepo.value;
    const walletRepository = walletRepo.value;

    return {
      execute: (input: ValidateContributionInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            ValidateContributionInput
          )(input).pipe(
            Effect.mapError(
              (error) =>
                new ValidationError({
                  field: "input",
                  message: `Invalid input: ${error}`,
                  value: input,
                })
            )
          );

          const errors: string[] = [];
          const warnings: string[] = [];

          // Create value objects
          const userId = UserId.fromString(validatedInput.userId);
          const planId = PlanId.fromString(validatedInput.planId);
          const amount = Money.fromNumber(validatedInput.amount, "NGN");

          // Retrieve the savings plan
          const plan = yield* savingsRepository.findById(planId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findById",
                  table: "savings_plans",
                  message: error.message || "Failed to fetch savings plan",
                })
            )
          );

          if (!plan) {
            return yield* Effect.fail(
              new PlanNotFoundError({
                planId: validatedInput.planId,
              })
            );
          }

          // Verify user owns the plan
          if (plan.userId.value !== userId.value) {
            return yield* Effect.fail(
              new AuthorizationError({
                userId: validatedInput.userId,
                resource: "savings_plan",
                action: "contribute",
              })
            );
          }

          // Check plan status
          if (plan.status !== "active") {
            errors.push(`Plan is not active. Current status: ${plan.status}`);
          }

          // Check contribution amount
          if (!amount.equals(plan.dailyAmount)) {
            errors.push(
              `Contribution amount must be exactly ${plan.dailyAmount.value} ${plan.dailyAmount.currency}`
            );
          }

          // Check if plan would exceed target
          if (plan.targetAmount) {
            const newTotal = plan.currentAmount.add(amount);
            if (newTotal.isGreaterThan(plan.targetAmount)) {
              errors.push(
                `Contribution would exceed target amount of ${plan.targetAmount.value}`
              );
            }
          }

          // Check wallet balance if source is wallet
          let availableBalance: number | undefined;
          if (validatedInput.source === "wallet") {
            const balance = yield* walletRepository.getBalance(userId).pipe(
              Effect.mapError((error) =>
                new DatabaseError({
                  operation: "getBalance",
                  table: "wallets",
                  message: error.message || "Failed to get wallet balance",
                })
              )
            );
            availableBalance = balance.value;

            if (balance.value < validatedInput.amount) {
              errors.push(
                `Insufficient wallet balance. Available: ${balance.value}, Required: ${validatedInput.amount}`
              );
            }

            // Warning if balance is low after contribution
            const remainingBalance = balance.value - validatedInput.amount;
            if (remainingBalance < plan.dailyAmount.value) {
              warnings.push(
                `After this contribution, your wallet balance will be ${remainingBalance}, which is less than your daily contribution amount`
              );
            }
          }

          // Check if plan is near completion
          if (plan.targetAmount) {
            const progress = plan.calculateProgress();
            if (progress.progressPercentage >= 90) {
              warnings.push(
                `Plan is ${progress.progressPercentage.toFixed(1)}% complete and will be completed soon`
              );
            }
          }

          // Check contribution streak
          if (plan.contributionStreak > 0) {
            warnings.push(
              `You have a ${plan.contributionStreak}-day contribution streak. Keep it up!`
            );
          }

          const baseOutput = {
            isValid: errors.length === 0,
            errors,
            warnings,
            expectedAmount: plan.dailyAmount.value,
          };

          return availableBalance !== undefined
            ? { ...baseOutput, availableBalance }
            : baseOutput;
        }),
    };
  })
);
