import type { SavingsRepository, SavingsPlan } from "@host/domain";
import type { AutoSaveTime } from "@host/shared";

import { Effect, Context, Layer, Schema } from "effect";
import { PlanId, UserId } from "@host/domain";

import {
  type FinancialError,
  UpdatePlansActionSchema,
  InvalidPlanStateError,
  AutoSaveTimeSchema,
  AuthorizationError,
  PlanNotFoundError,
  ValidationError,
  PlanActionEnum,
  DatabaseError,
} from "@host/shared";

/**
 * Input for updating a savings plan
 */
export const UpdateSavingsPlanInput = Schema.Struct({
  planId: Schema.UUID,
  userId: Schema.UUID,
  action: UpdatePlansActionSchema,
  autoSaveEnabled: Schema.optional(Schema.Boolean),
  autoSaveTime: Schema.optional(AutoSaveTimeSchema),
});

export type UpdateSavingsPlanInput = typeof UpdateSavingsPlanInput.Type;

/**
 * Output from updating a savings plan
 */
export interface UpdateSavingsPlanOutput {
  readonly plan: SavingsPlan;
}

/**
 * Use case for updating a savings plan
 * Supports pausing, resuming, canceling, and updating auto-save settings
 */
export interface UpdateSavingsPlanUseCase {
  readonly execute: (
    input: UpdateSavingsPlanInput
  ) => Effect.Effect<UpdateSavingsPlanOutput, FinancialError>;
}

export const UpdateSavingsPlanUseCase =
  Context.GenericTag<UpdateSavingsPlanUseCase>("@app/UpdateSavingsPlanUseCase");

/**
 * Live implementation of UpdateSavingsPlanUseCase
 */
export const UpdateSavingsPlanUseCaseLive = Layer.effect(
  UpdateSavingsPlanUseCase,
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
      execute: (input: UpdateSavingsPlanInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            UpdateSavingsPlanInput
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
              new PlanNotFoundError({ planId: validatedInput.planId })
            );
          }

          // Verify user owns the plan
          if (plan.userId.value !== userId.value) {
            return yield* Effect.fail(
              new AuthorizationError({
                userId: validatedInput.userId,
                resource: "savings_plan",
                action: "update",
              })
            );
          }

          // Apply the requested action
          let updatedPlan: SavingsPlan;

          try {
            switch (validatedInput.action) {
              case PlanActionEnum.PAUSE:
                updatedPlan = plan.pause();
                break;
              case PlanActionEnum.RESUME:
                updatedPlan = plan.resume();
                break;
              case PlanActionEnum.CANCEL:
                updatedPlan = plan.cancel();
                break;
              case PlanActionEnum.UPDATE_AUTOSAVE:
                if (validatedInput.autoSaveEnabled === undefined) {
                  return yield* Effect.fail(
                    new ValidationError({
                      field: "autoSaveEnabled",
                      message:
                        "autoSaveEnabled is required for update_autosave action",
                    })
                  );
                }
                updatedPlan = plan.updateAutoSave(
                  validatedInput.autoSaveEnabled,
                  validatedInput.autoSaveTime as AutoSaveTime | undefined
                );
                break;
              default:
                return yield* Effect.fail(
                  new ValidationError({
                    field: "action",
                    message: `Unknown action: ${validatedInput.action}`,
                  })
                );
            }
          } catch (error) {
            return yield* Effect.fail(
              new InvalidPlanStateError({
                planId: validatedInput.planId,
                currentState: plan.status,
                attemptedState: validatedInput.action,
                reason:
                  error instanceof Error ? error.message : "Unknown error",
              })
            );
          }

          // Persist the updated plan
          yield* savingsRepository.update(updatedPlan).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "update",
                  table: "savings_plans",
                  message: error.message || "Failed to update plan",
                })
            )
          );

          return { plan: updatedPlan };
        }),
    };
  })
);
