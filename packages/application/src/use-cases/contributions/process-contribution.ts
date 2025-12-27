import type { FinancialError } from "@host/shared";
import type {
  ContributionValidationError,
  TransactionRepository,
  SavingsRepository,
  WalletRepository,
} from "@host/domain";

import { Effect, Context, Layer, Schema } from "effect";
import {
  validateContributionEffect,
  TransactionId,
  Transaction,
  PlanId,
  UserId,
  Money,
} from "@host/domain";

import {
  TransactionReferenceSchema,
  InvalidContributionError,
  InsufficientFundsError,
  PaymentSourceSchema,
  AuthorizationError,
  PaymentSourceEnum,
  PlanNotFoundError,
  DEFAULT_CURRENCY,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for processing a contribution
 */
export const ProcessContributionInput = Schema.Struct({
  userId: UserId,
  planId: PlanId,
  amount: Schema.Number.pipe(Schema.positive()),
  source: PaymentSourceSchema,
  reference: Schema.optional(TransactionReferenceSchema),
});

export type ProcessContributionInput = typeof ProcessContributionInput.Type;

/**
 * Output from processing a contribution
 */
export interface ProcessContributionOutput {
  readonly transaction: Transaction;
  readonly newPlanBalance: number;
  readonly newWalletBalance: number;
}

/**
 * Use case for processing a contribution to a savings plan
 * Validates the contribution, debits wallet, and updates plan
 */
export interface ProcessContributionUseCase {
  readonly execute: (
    input: ProcessContributionInput
  ) => Effect.Effect<ProcessContributionOutput, FinancialError>;
}

export const ProcessContributionUseCase =
  Context.GenericTag<ProcessContributionUseCase>(
    "@app/ProcessContributionUseCase"
  );

/**
 * Live implementation of ProcessContributionUseCase
 */
export const ProcessContributionUseCaseLive = Layer.effect(
  ProcessContributionUseCase,
  Effect.gen(function* () {
    const savingsRepo = yield* Effect.serviceOption(
      Context.GenericTag<SavingsRepository>("@domain/SavingsRepository")
    );
    const transactionRepo = yield* Effect.serviceOption(
      Context.GenericTag<TransactionRepository>("@domain/TransactionRepository")
    );
    const walletRepo = yield* Effect.serviceOption(
      Context.GenericTag<WalletRepository>("@domain/WalletRepository")
    );

    if (
      savingsRepo._tag === "None" ||
      transactionRepo._tag === "None" ||
      walletRepo._tag === "None"
    ) {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Required repositories not available",
        })
      );
    }

    const savingsRepository = savingsRepo.value;
    const transactionRepository = transactionRepo.value;
    const walletRepository = walletRepo.value;

    return {
      execute: (input: ProcessContributionInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            ProcessContributionInput
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
          const amount = Money.fromNumber(validatedInput.amount);

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

          // Use domain validation service to eliminate code duplication
          const walletBalance =
            validatedInput.source === PaymentSourceEnum.WALLET
              ? yield* walletRepository.getBalance(userId).pipe(
                  Effect.mapError(
                    (error) =>
                      new DatabaseError({
                        operation: "getBalance",
                        table: "wallets",
                        message:
                          error.message || "Failed to get wallet balance",
                      })
                  )
                )
              : undefined;

          yield* validateContributionEffect(
            userId,
            planId,
            amount,
            validatedInput.source,
            plan,
            walletBalance
          ).pipe(
            Effect.mapError((domainError: ContributionValidationError) => {
              // Map domain validation errors to application errors for API compatibility
              if (
                domainError.reason.includes("Plan does not belong to the user")
              ) {
                return new AuthorizationError({
                  userId: validatedInput.userId,
                  resource: "savings_plan",
                  action: "contribute",
                });
              }
              if (domainError.reason.includes("Insufficient wallet balance")) {
                return new InsufficientFundsError({
                  available: walletBalance?.value || 0,
                  required: validatedInput.amount,
                  currency: DEFAULT_CURRENCY,
                });
              }
              // Default to InvalidContributionError for other validation failures
              return new InvalidContributionError({
                planId: validatedInput.planId,
                reason: domainError.reason,
                expectedAmount: plan.dailyAmount.value,
                providedAmount: validatedInput.amount,
              });
            })
          );

          // Generate transaction reference
          const reference =
            validatedInput.reference ||
            `CONTRIB-${TransactionId.generate().value.substring(0, 8)}`;

          // Create transaction record
          const transaction = Transaction.createContribution(
            userId,
            planId,
            amount,
            validatedInput.source,
            reference
          );

          // Save transaction
          yield* transactionRepository.save(transaction).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "save",
                  table: "transactions",
                  message: error.message || "Failed to save transaction",
                })
            )
          );

          // Debit wallet if source is wallet
          const newWalletBalance =
            validatedInput.source === PaymentSourceEnum.WALLET
              ? yield* walletRepository.debit(userId, amount).pipe(
                  Effect.mapError(
                    (error) =>
                      new DatabaseError({
                        operation: "debit",
                        table: "wallets",
                        message: error.message || "Failed to debit wallet",
                      })
                  )
                )
              : Money.fromNumber(0);

          // Update plan with contribution
          const updatedPlan = plan.makeContribution(amount);
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

          // Complete the transaction
          const completedTransaction = transaction.complete();
          yield* transactionRepository.update(completedTransaction).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "update",
                  table: "transactions",
                  message: error.message || "Failed to complete transaction",
                })
            )
          );

          return {
            transaction: completedTransaction,
            newPlanBalance: updatedPlan.currentAmount.value,
            newWalletBalance: newWalletBalance.value,
          };
        }),
    };
  })
);
