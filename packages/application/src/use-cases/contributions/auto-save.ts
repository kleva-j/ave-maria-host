import type { FinancialError } from "@host/shared";
import type {
  TransactionRepository,
  SavingsRepository,
  WalletRepository,
} from "@host/domain";

import { ValidationError, DatabaseError } from "@host/shared";
import { TransactionId, Transaction } from "@host/domain";
import { Effect, Context, Layer } from "effect";

/**
 * Output from auto-save processing
 */
export interface AutoSaveOutput {
  readonly processedCount: number;
  readonly successfulTransactions: Transaction[];
  readonly failedTransactions: Array<{
    planId: string;
    reason: string;
  }>;
}

/**
 * Use case for processing scheduled auto-save contributions
 * Runs periodically to process all plans with auto-save enabled
 */
export interface AutoSaveUseCase {
  readonly execute: () => Effect.Effect<AutoSaveOutput, FinancialError>;
}

export const AutoSaveUseCase = Context.GenericTag<AutoSaveUseCase>(
  "@app/AutoSaveUseCase"
);

/**
 * Live implementation of AutoSaveUseCase
 */
export const AutoSaveUseCaseLive = Layer.effect(
  AutoSaveUseCase,
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
      execute: () =>
        Effect.gen(function* () {
          // Find all plans that are due for auto-save
          const plansForAutoSave = yield* savingsRepository
            .findPlansForAutoSave()
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "findPlansForAutoSave",
                    table: "savings_plans",
                    message:
                      error.message || "Failed to fetch plans for auto-save",
                  })
              )
            );

          const successfulTransactions: Transaction[] = [];
          const failedTransactions: Array<{ planId: string; reason: string }> =
            [];

          // Process each plan
          for (const plan of plansForAutoSave) {
            try {
              // Check if it's time for auto-save
              if (!plan.isAutoSaveTime()) {
                continue;
              }

              const amount = plan.dailyAmount;

              // Check wallet balance
              const hasSufficientBalance = yield* walletRepository
                .hasSufficientBalance(plan.userId, amount)
                .pipe(
                  Effect.mapError(
                    (error) =>
                      new DatabaseError({
                        operation: "hasSufficientBalance",
                        table: "wallets",
                        message:
                          error.message || "Failed to check wallet balance",
                      })
                  )
                );

              if (!hasSufficientBalance) {
                failedTransactions.push({
                  planId: plan.id.value,
                  reason: "Insufficient wallet balance",
                });
                continue;
              }

              // Generate transaction reference
              const reference = `AUTOSAVE-${TransactionId.generate().value.substring(0, 8)}`;

              // Create auto-save transaction
              const transaction = Transaction.createAutoSave(
                plan.userId,
                plan.id,
                amount,
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

              // Debit wallet
              yield* walletRepository.debit(plan.userId, amount).pipe(
                Effect.mapError(
                  (error) =>
                    new DatabaseError({
                      operation: "debit",
                      table: "wallets",
                      message: error.message || "Failed to debit wallet",
                    })
                )
              );

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
                      message:
                        error.message || "Failed to complete transaction",
                    })
                )
              );

              successfulTransactions.push(completedTransaction);
            } catch (error) {
              failedTransactions.push({
                planId: plan.id.value,
                reason:
                  error instanceof Error ? error.message : "Unknown error",
              });
            }
          }

          return {
            processedCount: plansForAutoSave.length,
            successfulTransactions,
            failedTransactions,
          };
        }),
    };
  })
);
