import type { TransactionRepository, WalletRepository } from "@host/domain";

import { Transaction, UserId, Money } from "@host/domain";
import { Effect, Context, Layer } from "effect";
import { Schema } from "@effect/schema";

import {
  type PaymentGatewayError,
  type FinancialError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for funding a wallet
 */
export const FundWalletInput = Schema.Struct({
  userId: Schema.UUID,
  amount: Schema.Number.pipe(Schema.positive()),
  currency: Schema.Literal("NGN", "USD", "EUR"),
  paymentMethod: Schema.Literal("bank_transfer", "debit_card"),
  paymentReference: Schema.optional(Schema.String),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
});

export type FundWalletInput = typeof FundWalletInput.Type;

/**
 * Output from funding a wallet
 */
export interface FundWalletOutput {
  readonly transaction: Transaction;
  readonly newBalance: number;
  readonly paymentReference: string;
}

/**
 * Port interface for payment gateway integration
 */
export interface PaymentGatewayPort {
  readonly processPayment: (
    userId: string,
    amount: number,
    currency: string,
    method: string,
    reference?: string
  ) => Effect.Effect<
    { reference: string; status: string },
    PaymentGatewayError
  >;
}

export const PaymentGatewayPort = Context.GenericTag<PaymentGatewayPort>(
  "@app/PaymentGatewayPort"
);

/**
 * Use case for funding a wallet through payment gateway
 * Integrates with external payment providers (Paystack, Flutterwave)
 */
export interface FundWalletUseCase {
  readonly execute: (
    input: FundWalletInput
  ) => Effect.Effect<FundWalletOutput, FinancialError>;
}

export const FundWalletUseCase = Context.GenericTag<FundWalletUseCase>(
  "@app/FundWalletUseCase"
);

/**
 * Live implementation of FundWalletUseCase
 */
export const FundWalletUseCaseLive = Layer.effect(
  FundWalletUseCase,
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
    const walletRepository = walletRepo.value;
    const paymentGatewayService = paymentGateway.value;

    return {
      execute: (input: FundWalletInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(FundWalletInput)(
            input
          ).pipe(
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
          const amount = Money.fromNumber(
            validatedInput.amount,
            validatedInput.currency
          );

          // Process payment through gateway
          const paymentResult = yield* paymentGatewayService.processPayment(
            validatedInput.userId,
            validatedInput.amount,
            validatedInput.currency,
            validatedInput.paymentMethod,
            validatedInput.paymentReference
          );

          // Create transaction record
          const transaction = Transaction.createWalletFunding(
            userId,
            amount,
            validatedInput.paymentMethod as "bank_transfer" | "debit_card",
            paymentResult.reference
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

          // Credit wallet
          const newBalance = yield* walletRepository
            .credit(userId, amount)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "credit",
                    table: "wallets",
                    message: error.message || "Failed to credit wallet",
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
            newBalance: newBalance.value,
            paymentReference: paymentResult.reference,
          };
        }),
    };
  })
);
