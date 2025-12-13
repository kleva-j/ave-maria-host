import type { WalletRepository, Money, UserId } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import {
  InsufficientFundsError,
  WalletNotFoundError,
  DatabaseError,
} from "@host/shared";

/**
 * Service for wallet operations
 */
export interface WalletService {
  /**
   * Credit a user's wallet
   */
  readonly credit: (
    userId: UserId,
    amount: Money
  ) => Effect.Effect<Money, WalletNotFoundError | DatabaseError>;

  /**
   * Debit a user's wallet
   */
  readonly debit: (
    userId: UserId,
    amount: Money
  ) => Effect.Effect<
    Money,
    WalletNotFoundError | DatabaseError | InsufficientFundsError
  >;

  /**
   * Get a user's wallet balance
   */
  readonly getBalance: (
    userId: UserId
  ) => Effect.Effect<Money, WalletNotFoundError | DatabaseError>;
}

export const WalletService =
  Context.GenericTag<WalletService>("@app/WalletService");

export const WalletServiceLive = Layer.effect(
  WalletService,
  Effect.gen(function* () {
    const walletRepo = yield* Effect.serviceOption(
      Context.GenericTag<WalletRepository>("@domain/WalletRepository")
    );

    if (walletRepo._tag === "None") {
      return yield* Effect.die(
        new Error("WalletRepository not found in dependencies")
      );
    }
    const repository = walletRepo.value;

    return {
      credit: (userId: UserId, amount: Money) =>
        Effect.gen(function* () {
          // Check if wallet exists
          const wallet = yield* repository.findByUserId(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: error.operation,
                  table: error.entity,
                  message: error.message || "Failed to find wallet",
                })
            )
          );

          if (!wallet) {
            return yield* Effect.fail(
              new WalletNotFoundError({
                userId: userId.value,
                operation: "credit",
              })
            );
          }

          return yield* repository.credit(userId, amount).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: error.operation,
                  table: error.entity,
                  message: error.message || "Failed to credit wallet",
                })
            )
          );
        }),

      debit: (userId: UserId, amount: Money) =>
        Effect.gen(function* () {
          // Check if wallet exists
          const wallet = yield* repository.findByUserId(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: error.operation,
                  table: error.entity,
                  message: error.message || "Failed to find wallet",
                })
            )
          );

          if (!wallet) {
            return yield* Effect.fail(
              new WalletNotFoundError({
                userId: userId.value,
                operation: "debit",
              })
            );
          }

          // Check balance
          const hasBalance = yield* repository
            .hasSufficientBalance(userId, amount)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: error.operation,
                    table: error.entity,
                    message: error.message || "Failed to check balance",
                  })
              )
            );

          if (!hasBalance) {
            return yield* Effect.fail(
              new InsufficientFundsError({
                available: wallet.balance.value,
                required: amount.value,
                currency: amount.currency,
              })
            );
          }

          return yield* repository.debit(userId, amount).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: error.operation,
                  table: error.entity,
                  message: error.message || "Failed to debit wallet",
                })
            )
          );
        }),

      getBalance: (userId: UserId) =>
        Effect.gen(function* () {
          const wallet = yield* repository.findByUserId(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: error.operation,
                  table: error.entity,
                  message: error.message || "Failed to find wallet",
                })
            )
          );

          if (!wallet) {
            return yield* Effect.fail(
              new WalletNotFoundError({
                userId: userId.value,
                operation: "getBalance",
              })
            );
          }

          return wallet.balance;
        }),
    };
  })
);
