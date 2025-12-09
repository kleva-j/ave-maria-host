import type { SavingsRepository, SavingsPlan } from "@host/domain";
import type { FinancialError } from "@host/shared";

import { ValidationError, DatabaseError } from "@host/shared";
import { Effect, Context, Layer, Schema } from "effect";
import { UserId } from "@host/domain";

/**
 * Input for getting a savings plan
 */
export const ListSavingsPlanInput = Schema.Struct({ userId: UserId });

export type ListSavingsPlanInput = typeof ListSavingsPlanInput.Type;

/**
 * Output from getting a savings plan
 */
export interface ListSavingsPlanOutput {
  readonly plans: SavingsPlan[];
}

/**
 * Use case for retrieving a savings plan by ID
 * Validates user ownership of the plan
 */
export interface ListSavingsPlanUseCase {
  readonly execute: (
    input: ListSavingsPlanInput
  ) => Effect.Effect<ListSavingsPlanOutput, FinancialError>;
}

export const ListSavingsPlanUseCase =
  Context.GenericTag<ListSavingsPlanUseCase>("@app/ListSavingsPlanUseCase");

/**
 * Live implementation of ListSavingsPlanUseCase
 */
export const ListSavingsPlanUseCaseLive = Layer.effect(
  ListSavingsPlanUseCase,
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
      execute: (input: ListSavingsPlanInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            ListSavingsPlanInput
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
          const userId = UserId.fromString(validatedInput.userId);

          // Retrieve the plan
          const plans = yield* savingsRepository.findByUserId(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findById",
                  table: "savings_plans",
                  message: error.message || "Failed to fetch all savings plans",
                })
            )
          );

          return { plans };
        }),
    };
  })
);
