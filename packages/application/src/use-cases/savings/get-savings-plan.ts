import type { SavingsRepository, SavingsPlan } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import { PlanId, UserId } from "@host/domain";
import { Schema } from "@effect/schema";
import {
  type FinancialError,
  AuthorizationError,
  PlanNotFoundError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for getting a savings plan
 */
export const GetSavingsPlanInput = Schema.Struct({
  planId: Schema.UUID,
  userId: Schema.UUID,
});

export type GetSavingsPlanInput = typeof GetSavingsPlanInput.Type;

/**
 * Output from getting a savings plan
 */
export interface GetSavingsPlanOutput {
  readonly plan: SavingsPlan;
}

/**
 * Use case for retrieving a savings plan by ID
 * Validates user ownership of the plan
 */
export interface GetSavingsPlanUseCase {
  readonly execute: (
    input: GetSavingsPlanInput
  ) => Effect.Effect<GetSavingsPlanOutput, FinancialError>;
}

export const GetSavingsPlanUseCase = Context.GenericTag<GetSavingsPlanUseCase>(
  "@app/GetSavingsPlanUseCase"
);

/**
 * Live implementation of GetSavingsPlanUseCase
 */
export const GetSavingsPlanUseCaseLive = Layer.effect(
  GetSavingsPlanUseCase,
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
      execute: (input: GetSavingsPlanInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            GetSavingsPlanInput
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

          // Create value objects
          const planId = PlanId.fromString(validatedInput.planId);
          const userId = UserId.fromString(validatedInput.userId);

          // Retrieve the plan
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
                action: "read",
              })
            );
          }

          return { plan };
        }),
    };
  })
);
