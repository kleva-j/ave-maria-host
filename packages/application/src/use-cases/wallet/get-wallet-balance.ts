import type { TransactionRepository, WalletRepository } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import { Schema } from "@effect/schema";
import { UserId } from "@host/domain";

import {
  type FinancialError,
  UserNotFoundError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for getting wallet balance
 */
export const GetWalletBalanceInput = Schema.Struct({
  userId: Schema.UUID,
  includeTransactionSummary: Schema.optional(Schema.Boolean),
  summaryStartDate: Schema.optional(Schema.Date),
  summaryEndDate: Schema.optional(Schema.Date),
});

export type GetWalletBalanceInput = typeof GetWalletBalanceInput.Type;

/**
 * Output from getting wallet balance
 */
export interface GetWalletBalanceOutput {
  readonly balance: number;
  readonly currency: string;
  readonly isActive: boolean;
  readonly lastUpdated: Date;
  readonly transactionSummary?: {
    readonly totalCredits: number;
    readonly totalDebits: number;
    readonly transactionCount: number;
    readonly netChange: number;
  };
}

/**
 * Use case for retrieving wallet balance and transaction summary
 * Provides current balance and optional transaction statistics
 */
export interface GetWalletBalanceUseCase {
  readonly execute: (
    input: GetWalletBalanceInput
  ) => Effect.Effect<GetWalletBalanceOutput, FinancialError>;
}

export const GetWalletBalanceUseCase =
  Context.GenericTag<GetWalletBalanceUseCase>("@app/GetWalletBalanceUseCase");

/**
 * Live implementation of GetWalletBalanceUseCase
 */
export const GetWalletBalanceUseCaseLive = Layer.effect(
  GetWalletBalanceUseCase,
  Effect.gen(function* () {
    const walletRepo = yield* Effect.serviceOption(
      Context.GenericTag<WalletRepository>("@domain/WalletRepository")
    );
    const transactionRepo = yield* Effect.serviceOption(
      Context.GenericTag<TransactionRepository>("@domain/TransactionRepository")
    );

    if (walletRepo._tag === "None" || transactionRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Required repositories not available",
        })
      );
    }

    const walletRepository = walletRepo.value;

    return {
      execute: (input: GetWalletBalanceInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            GetWalletBalanceInput
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

          // Retrieve wallet
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
              new UserNotFoundError({
                userId: validatedInput.userId,
              })
            );
          }

          // Build base output
          let output: GetWalletBalanceOutput = {
            balance: wallet.balance.value,
            currency: wallet.balance.currency,
            isActive: wallet.isActive,
            lastUpdated: wallet.updatedAt,
          };

          // Include transaction summary if requested
          if (validatedInput.includeTransactionSummary) {
            const startDate =
              validatedInput.summaryStartDate ||
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
            const endDate = validatedInput.summaryEndDate || new Date();

            const summary = yield* walletRepository
              .getTransactionSummary(userId, startDate, endDate)
              .pipe(
                Effect.mapError(
                  (error) =>
                    new DatabaseError({
                      operation: "getTransactionSummary",
                      table: "wallets",
                      message:
                        error.message || "Failed to fetch transaction summary",
                    })
                )
              );

            output = {
              ...output,
              transactionSummary: {
                totalCredits: summary.totalCredits.value,
                totalDebits: summary.totalDebits.value,
                transactionCount: summary.transactionCount,
                netChange: summary.netChange.value,
              },
            };
          }

          return output;
        }),
    };
  })
);
