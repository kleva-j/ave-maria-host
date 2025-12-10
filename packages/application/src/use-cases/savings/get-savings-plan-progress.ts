import type { SavingsRepository } from "@host/domain";
import type { FinancialError } from "@host/shared";

import { Effect, Context, Schema, Layer } from "effect";
import { PlanId } from "@host/domain";

import {
  GetPlanProgressOutputSchema,
  GetPlanProgressSchema,
  ValidationError,
  DatabaseError,
  UserIdSchema,
} from "@host/shared";

/**
 * Input for getting plan progress
 */
export const GetSavingsPlanProgressInput = GetPlanProgressSchema.pipe(
  Schema.extend(Schema.Struct({ userId: UserIdSchema }))
);

export type GetSavingsPlanProgressInput =
  typeof GetSavingsPlanProgressInput.Type;

/**
 * Output for plan progress
 * Reusing the output schema from shared but as an interface for the use case
 */

export class GetSavingsPlanProgressOutput extends GetPlanProgressOutputSchema {}

/**
 * Use case for getting savings plan progress
 */
export interface GetSavingsPlanProgressUseCase {
  readonly execute: (
    input: GetSavingsPlanProgressInput
  ) => Effect.Effect<
    GetSavingsPlanProgressOutput,
    FinancialError | ValidationError
  >;
}

export const GetSavingsPlanProgressUseCase =
  Context.GenericTag<GetSavingsPlanProgressUseCase>(
    "@app/GetSavingsPlanProgressUseCase"
  );

/**
 * Live implementation of GetSavingsPlanProgressUseCase
 */
export const GetSavingsPlanProgressUseCaseLive = Layer.effect(
  GetSavingsPlanProgressUseCase,
  Effect.gen(function* () {
    const savingsRepo = yield* Effect.serviceOption(
      Context.GenericTag<SavingsRepository>("@domain/SavingsRepository")
    );

    if (savingsRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "SavingsRepository not available",
        })
      );
    }

    const savingsRepository = savingsRepo.value;

    return {
      execute: (input: GetSavingsPlanProgressInput) =>
        Effect.gen(function* () {
          // 1. Fetch Plan
          const plan = yield* savingsRepository
            .findById(PlanId.fromString(input.planId))
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "findById",
                    table: "savings_plans",
                    message: error.message || "Failed to find plan",
                  })
              )
            );

          if (!plan) {
            return yield* Effect.fail(
              new ValidationError({
                field: "planId",
                message: "Savings plan not found",
                value: input.planId,
              })
            );
          }

          // 2. Verify Ownership
          if (plan.userId.value !== input.userId) {
            return yield* Effect.fail(
              new ValidationError({
                field: "userId",
                message: "User is not authorized to view this plan",
              })
            );
          }

          // 3. Calculate Progress
          const progress = plan.calculateProgress();

          // 4. Return Output
          return new GetSavingsPlanProgressOutput({
            currentAmount: plan.currentAmount.value,
            targetAmount: progress.targetAmount.value,
            daysRemaining: progress.daysRemaining,
            contributionStreak: progress.contributionStreak,
            progressPercentage: progress.progressPercentage,
            totalContributions: plan.totalContributions,
            lastContributionDate: null, // Domain doesn't track this yet, keeping null as per existing RPC TODO
          });
        }),
    };
  })
);
