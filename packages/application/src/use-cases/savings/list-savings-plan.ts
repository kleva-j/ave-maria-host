import type { SavingsRepository, SavingsPlan } from "@host/domain";
import type { FinancialError } from "@host/shared";

import { ValidationError, DatabaseError, PlanStatusSchema } from "@host/shared";
import { Effect, Context, Layer, Schema } from "effect";
import { UserId } from "@host/domain";

/**
 * Input for getting a savings plan
 */
export const ListSavingsPlanInput = Schema.Struct({
  userId: UserId,
  status: Schema.optional(PlanStatusSchema),
  limit: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
});

export type ListSavingsPlanInput = typeof ListSavingsPlanInput.Type;

/**
 * Output from getting a savings plan
 */
export interface ListSavingsPlanOutput {
  readonly plans: SavingsPlan[];
  readonly total: number;
  readonly hasMore: boolean;
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

          // Retrieve all plans (Repo doesn't support pagination yet, so in-memory)
          let plans = yield* savingsRepository.findByUserId(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findByUserId",
                  table: "savings_plans",
                  message: error.message || "Failed to fetch all savings plans",
                })
            )
          );

          // Filter by status if provided
          if (validatedInput.status) {
            plans = plans.filter((p) => p.status === validatedInput.status);
          }

          const total = plans.length;
          const limit = validatedInput.limit ?? 20;
          const offset = validatedInput.offset ?? 0;

          // Align with typical SQL pagination
          const paginatedPlans = plans.slice(offset, offset + limit);
          const hasMore = offset + limit < total;

          return {
            plans: paginatedPlans,
            total,
            hasMore,
          };
        }),
    };
  })
);
