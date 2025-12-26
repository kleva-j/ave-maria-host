/**
 * @fileoverview Wallet RPC Endpoints
 */

import type { FinancialError } from "@host/shared";
import type { Layer } from "effect";

import { Effect, Schema, DateTime } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

// Import use cases
import {
  GetTransactionHistoryUseCase,
  GetWalletBalanceUseCase,
  WithdrawFundsUseCase,
  FundWalletUseCase,
} from "@host/application";

import {
  GetTransactionHistoryOutputSchema,
  GetTransactionHistorySchema,
  GetBalanceOutputSchema,
  FundWalletOutputSchema,
  TransactionStatusEnum,
  WithdrawOutputSchema,
  PaymentSourceSchema,
  TransactionSchema,
  PaymentMethodEnum,
  FundWalletSchema,
  GetBalanceSchema,
  DEFAULT_CURRENCY,
  WithdrawSchema,
} from "@host/shared";

// Import auth middleware for user context
import { AuthMiddleware, CurrentUser } from "./auth-rpc";

// ============================================================================
// Payload Classes
// ============================================================================

export class GetBalancePayload extends GetBalanceSchema {}
export class FundWalletPayload extends FundWalletSchema {}
export class WithdrawPayload extends WithdrawSchema {}
export class GetTransactionHistoryPayload extends GetTransactionHistorySchema {}

// ============================================================================
// Response Classes
// ============================================================================

export class GetBalanceResponse extends GetBalanceOutputSchema {}
export class FundWalletResponse extends FundWalletOutputSchema {}
export class WithdrawResponse extends WithdrawOutputSchema {}
export class Transaction extends TransactionSchema {}
export class GetTransactionHistoryResponse extends GetTransactionHistoryOutputSchema {}

// ============================================================================
// Error Types
// ============================================================================

export class WalletNotFoundError extends Schema.TaggedError<WalletNotFoundError>()(
  "WalletNotFoundError",
  {
    userId: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

export class InsufficientBalanceError extends Schema.TaggedError<InsufficientBalanceError>()(
  "InsufficientBalanceError",
  {
    available: Schema.Number,
    required: Schema.Number,
    message: Schema.String,
    currency: Schema.optional(Schema.String),
  }
) {}

export class PaymentError extends Schema.TaggedError<PaymentError>()(
  "PaymentError",
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

export const WalletError = Schema.Union(
  WalletNotFoundError,
  InsufficientBalanceError,
  PaymentError
);

// ============================================================================
// RPC Group Definition
// ============================================================================

export class WalletRpcs extends RpcGroup.make(
  Rpc.make("GetBalance", {
    payload: GetBalancePayload,
    success: GetBalanceResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  Rpc.make("FundWallet", {
    payload: FundWalletPayload,
    success: FundWalletResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  Rpc.make("Withdraw", {
    payload: WithdrawPayload,
    success: WithdrawResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  Rpc.make("GetTransactionHistory", {
    payload: GetTransactionHistoryPayload,
    success: GetTransactionHistoryResponse,
    error: WalletError,
  }).middleware(AuthMiddleware)
) {}

/**
 * Type helpers for extracting types from the RPC group
 */
export type WalletRpcGroup = typeof WalletRpcs;

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * @description
 *
 * Live implementation of the Wallet RPC handlers
 * This provides the actual business logic for the all Wallet operations
 */
export const WalletHandlersLive: Layer.Layer<
  | Rpc.Handler<"GetTransactionHistory">
  | Rpc.Handler<"GetBalance">
  | Rpc.Handler<"FundWallet">
  | Rpc.Handler<"Withdraw">,
  never,
  | GetWalletBalanceUseCase
  | WithdrawFundsUseCase
  | FundWalletUseCase
  | GetTransactionHistoryUseCase
  | AuthMiddleware
> = WalletRpcs.toLayer({
  GetBalance: (_payload) =>
    Effect.gen(function* () {
      const getBalanceUseCase = yield* GetWalletBalanceUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* getBalanceUseCase
        .execute({
          userId: currentUser.id,
          includeTransactionSummary: false,
        })
        .pipe(
          Effect.mapError(
            (
              error
            ):
              | WalletNotFoundError
              | InsufficientBalanceError
              | PaymentError => {
              if (error._tag === "UserNotFoundError") {
                return new WalletNotFoundError({
                  userId: currentUser.id,
                  message: "Wallet not found for user",
                  cause: error,
                });
              }
              if (error._tag === "WalletOperationError") {
                return new WalletNotFoundError({
                  userId: currentUser.id,
                  message: error.reason || "Wallet operation failed",
                  cause: error,
                });
              }
              return new PaymentError({
                operation: "GetBalance",
                message: error.message || "Failed to get balance",
                cause: error,
              });
            }
          )
        );

      return new GetBalanceResponse({
        balance: result.balance,
        currency: result.currency,
        lastUpdated: DateTime.unsafeMake(result.lastUpdated),
        availableBalance: result.balance,
        pendingBalance: 0,
      });
    }),

  FundWallet: (payload) =>
    Effect.gen(function* () {
      const fundWalletUseCase = yield* FundWalletUseCase;
      const currentUser = yield* CurrentUser;

      const paymentMethod =
        payload.paymentMethod === PaymentMethodEnum.USSD
          ? PaymentMethodEnum.BANK_TRANSFER
          : payload.paymentMethod;

      const result = yield* fundWalletUseCase
        .execute({
          userId: currentUser.id,
          amount: payload.amount,
          currency: DEFAULT_CURRENCY,
          paymentSource: PaymentSourceSchema.make(paymentMethod),
          paymentReference: payload.paymentReference,
        })
        .pipe(
          Effect.mapError((error) => {
            return new PaymentError({
              operation: "FundWallet",
              message: error.message || "Failed to fund wallet",
              cause: error,
            });
          })
        );

      return new FundWalletResponse({
        transactionId: result.transaction.id.value,
        status:
          result.transaction.status === TransactionStatusEnum.COMPLETED
            ? "success"
            : result.transaction.status === TransactionStatusEnum.FAILED
              ? TransactionStatusEnum.FAILED
              : TransactionStatusEnum.PENDING,
        newBalance: result.newBalance,
        reference: result.paymentReference,
        message: "Wallet funded successfully",
      });
    }),

  Withdraw: (payload) =>
    Effect.gen(function* () {
      const withdrawFundsUseCase = yield* WithdrawFundsUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* withdrawFundsUseCase
        .execute({
          userId: currentUser.id,
          amount: payload.amount,
          currency: DEFAULT_CURRENCY,
          bankAccountId: payload.bankAccountId,
          reason: payload.reason,
        })
        .pipe(
          Effect.mapError((error: FinancialError) => {
            return new PaymentError({
              operation: "Withdraw",
              message: error.message || "Failed to process withdrawal",
              cause: error,
            });
          })
        );

      return new WithdrawResponse({
        transactionId: result.transaction.id.value,
        status:
          result.transaction.status === TransactionStatusEnum.COMPLETED
            ? "success"
            : result.transaction.status === TransactionStatusEnum.FAILED
              ? TransactionStatusEnum.FAILED
              : TransactionStatusEnum.PENDING,
        estimatedArrival: DateTime.unsafeMake(result.estimatedArrival),
        newBalance: result.newBalance,
        message: "Withdrawal initiated successfully.",
      });
    }),

  GetTransactionHistory: (payload) =>
    Effect.gen(function* () {
      const useCase = yield* GetTransactionHistoryUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* useCase.execute(payload, currentUser.id).pipe(
        Effect.mapError(
          (error) =>
            new PaymentError({
              operation: "GetTransactionHistory",
              message: error.message || "Failed",
              cause: error,
            })
        )
      );

      return new GetTransactionHistoryResponse({
        transactions: result.transactions.map((t) => new Transaction(t)),
        total: result.total,
        hasMore: result.hasMore,
      });
    }),
});
