import type { SavingsRepository, WalletRepository } from "@host/domain";

import type {
  CycleDuration,
  AutoSaveTime,
  InterestRate,
  PlanName,
} from "@host/domain";

import { SavingsPlan, UserId, Money } from "@host/domain";
import { Effect, Context, Layer } from "effect";
import { Schema } from "@effect/schema";

import {
  type FinancialError,
  InsufficientFundsError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for creating a savings plan
 */
export const CreateSavingsPlanInput = Schema.Struct({
  userId: Schema.UUID,
  planName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  dailyAmount: Schema.Number.pipe(Schema.positive()),
  currency: Schema.Literal("NGN", "USD", "EUR"),
  cycleDuration: Schema.Number.pipe(Schema.int(), Schema.between(7, 365)),
  targetAmount: Schema.optional(Schema.Number.pipe(Schema.positive())),
  autoSaveEnabled: Schema.optional(Schema.Boolean),
  autoSaveTime: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
  ),
  interestRate: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
});

export type CreateSavingsPlanInput = typeof CreateSavingsPlanInput.Type;

/**
 * Output from creating a savings plan
 */
export interface CreateSavingsPlanOutput {
  readonly plan: SavingsPlan;
}

/**
 * Use case for creating a new savings plan
 * Validates user has sufficient funds and creates the plan
 */
export interface CreateSavingsPlanUseCase {
  readonly execute: (
    input: CreateSavingsPlanInput
  ) => Effect.Effect<CreateSavingsPlanOutput, FinancialError>;
}

export const CreateSavingsPlanUseCase =
  Context.GenericTag<CreateSavingsPlanUseCase>("@app/CreateSavingsPlanUseCase");

/**
 * Live implementation of CreateSavingsPlanUseCase
 */
export const CreateSavingsPlanUseCaseLive = Layer.effect(
  CreateSavingsPlanUseCase,
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
      execute: (input: CreateSavingsPlanInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            CreateSavingsPlanInput
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
          const dailyAmount = Money.fromNumber(
            validatedInput.dailyAmount,
            validatedInput.currency
          );

          // Check if user has sufficient funds for first contribution
          const wallet = yield* walletRepository.findByUserId(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findByUserId",
                  table: "wallets",
                  message: error.message || "Failed to fetch wallet",
                })
            )
          );

          if (!wallet) {
            return yield* Effect.fail(
              new ValidationError({
                field: "userId",
                message: "Wallet not found for user",
                value: validatedInput.userId,
              })
            );
          }

          if (wallet.balance.value < validatedInput.dailyAmount) {
            return yield* Effect.fail(
              new InsufficientFundsError({
                available: wallet.balance.value,
                required: validatedInput.dailyAmount,
                currency: validatedInput.currency,
              })
            );
          }

          // Create the savings plan entity
          const targetAmount = validatedInput.targetAmount
            ? Money.fromNumber(
                validatedInput.targetAmount,
                validatedInput.currency
              )
            : undefined;

          const plan = SavingsPlan.create(
            userId,
            validatedInput.planName as PlanName,
            dailyAmount,
            validatedInput.cycleDuration as CycleDuration,
            targetAmount,
            validatedInput.autoSaveEnabled ?? false,
            (validatedInput.autoSaveTime as AutoSaveTime) ?? "09:00",
            (validatedInput.interestRate as InterestRate) ?? 0.0
          );

          // Persist the plan
          yield* savingsRepository.save(plan).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "save",
                  table: "savings_plans",
                  message: error.message || "Failed to save savings plan",
                })
            )
          );

          return { plan };
        }),
    };
  })
);
