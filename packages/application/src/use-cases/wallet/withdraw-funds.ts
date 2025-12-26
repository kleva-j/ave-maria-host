import type { TransactionRepository, WalletRepository } from "@host/domain";
import type { FinancialError } from "@host/shared";

import { UserId, Money, TransactionId, Transaction } from "@host/domain";
import { Effect, Context, Layer } from "effect";
import { Schema } from "effect";

import { PaymentGatewayPort } from "./fund-wallet";

import {
  InsufficientFundsError,
  CurrencyCodeSchema,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for withdrawing funds from wallet
 */
export const WithdrawFundsInput = Schema.Struct({
  userId: Schema.UUID,
  amount: Schema.Number.pipe(Schema.positive()),
  currency: CurrencyCodeSchema,
  bankAccountId: Schema.UUID,
  reason: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
});

export type WithdrawFundsInput = typeof WithdrawFundsInput.Type;

/**
 * Output from withdrawing funds
 */
export interface WithdrawFundsOutput {
  readonly transaction: Transaction;
  readonly newBalance: number;
  readonly estimatedArrival: Date;
  readonly withdrawalReference: string;
}

/**
 * Use case for withdrawing funds from wallet to bank account
 * Validates balance and processes withdrawal through payment gateway
 */
export interface WithdrawFundsUseCase {
  readonly execute: (
    input: WithdrawFundsInput
  ) => Effect.Effect<WithdrawFundsOutput, FinancialError>;
}

/**
 * Withdraw fund use case context interface
 */
export const WithdrawFundsUseCase = Context.GenericTag<WithdrawFundsUseCase>(
  "@app/WithdrawFundsUseCase"
);

/**
 * Live implementation of WithdrawFundsUseCase
 */
export const WithdrawFundsUseCaseLive = Layer.effect(
  WithdrawFundsUseCase,
  Effect.gen(function* () {
    const transactionRepo = yield* Effect.serviceOption(
      Context.GenericTag<TransactionRepository>("@domain/TransactionRepository")
    );
    const walletRepo = yield* Effect.serviceOption(
      Context.GenericTag<WalletRepository>("@domain/WalletRepository")
    );
    const paymentGateway = yield* Effect.serviceOption(PaymentGatewayPort);

    if (
      transactionRepo._tag === "None" ||
      walletRepo._tag === "None" ||
      paymentGateway._tag === "None"
    ) {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Required services not available",
        })
      );
    }

    const transactionRepository = transactionRepo.value;
    const paymentGatewayService = paymentGateway.value;
    const walletRepository = walletRepo.value;

    return {
      execute: (input: WithdrawFundsInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            WithdrawFundsInput
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
          const amount = Money.fromNumber(validatedInput.amount);

          // Check wallet balance
          const currentBalance = yield* walletRepository
            .getBalance(userId)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "getBalance",
                    table: "wallets",
                    message: error.message || "Failed to get wallet balance",
                  })
              )
            );

          if (currentBalance.value < validatedInput.amount) {
            return yield* Effect.fail(
              new InsufficientFundsError({
                available: currentBalance.value,
                required: validatedInput.amount,
                currency: validatedInput.currency,
              })
            );
          }

          // Generate withdrawal reference
          const withdrawalReference = `WITHDRAW-${TransactionId.generate().value.substring(0, 8)}`;

          // Create transaction record
          const transaction = Transaction.createWithdrawal(
            userId,
            amount,
            withdrawalReference,
            undefined,
            validatedInput.reason
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
          const newBalance = yield* walletRepository.debit(userId, amount).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "debit",
                  table: "wallets",
                  message: error.message || "Failed to debit wallet",
                })
            )
          );

          // Process withdrawal through payment gateway
          // This would typically initiate a bank transfer
          const paymentResult = yield* paymentGatewayService
            .processPayment(
              validatedInput.userId,
              validatedInput.amount,
              validatedInput.currency,
              "bank_transfer",
              withdrawalReference
            )
            .pipe(
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  // Rollback wallet debit if payment fails
                  yield* walletRepository.credit(userId, amount).pipe(
                    Effect.mapError(
                      (error) =>
                        new DatabaseError({
                          operation: "credit",
                          table: "wallets",
                          message:
                            error.message || "Failed to rollback wallet credit",
                        })
                    )
                  );

                  // Mark transaction as failed
                  const failedTransaction = transaction.fail(
                    `Payment gateway error: ${error.message}`
                  );
                  yield* transactionRepository.update(failedTransaction).pipe(
                    Effect.mapError(
                      (error) =>
                        new DatabaseError({
                          operation: "update",
                          table: "transactions",
                          message:
                            error.message || "Failed to update transaction",
                        })
                    )
                  );

                  return yield* Effect.fail(error);
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

          // Calculate estimated arrival (typically 1-3 business days)
          const estimatedArrival = new Date();
          estimatedArrival.setDate(estimatedArrival.getDate() + 2);

          return {
            transaction: completedTransaction,
            newBalance: newBalance.value,
            estimatedArrival,
            withdrawalReference: paymentResult.reference,
          };
        }),
    };
  })
);
