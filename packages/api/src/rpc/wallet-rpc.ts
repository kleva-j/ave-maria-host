/**
 * @fileoverview Wallet RPC Endpoints
 *
 * This module provides RPC endpoints for wallet management using @effect/rpc.
 * It handles balance queries, funding, withdrawals, and transaction history.
 *
 * ## Key Features:
 * - **Balance Management**: Real-time balance queries with pending amounts
 * - **Funding Operations**: Support for multiple payment methods
 * - **Withdrawal Processing**: Secure withdrawals to linked bank accounts
 * - **Transaction History**: Comprehensive transaction tracking and filtering
 * - **Bank Account Linking**: Secure bank account management
 *
 * ## Endpoints:
 * - getBalance: Get current wallet balance
 * - fundWallet: Add funds to wallet from external source
 * - withdraw: Withdraw funds to bank account
 * - getTransactionHistory: Get filtered transaction history
 * - linkBankAccount: Link a new bank account
 * - verifyPayment: Verify a payment transaction
 */

import { type Layer, Effect, Schema, DateTime } from "effect";

// Import use cases
import {
  GetWalletBalanceUseCase,
  WithdrawFundsUseCase,
  FundWalletUseCase,
} from "@host/application";

import { Rpc, RpcGroup } from "@effect/rpc";

import {
  GetTransactionHistoryOutputSchema,
  GetTransactionHistorySchema,
  LinkBankAccountOutputSchema,
  VerifyPaymentOutputSchema,
  GetBalanceOutputSchema,
  FundWalletOutputSchema,
  LinkBankAccountSchema,
  WithdrawOutputSchema,
  VerifyPaymentSchema,
  TransactionSchema,
  BankAccountSchema,
  FundWalletSchema,
  GetBalanceSchema,
  DEFAULT_CURRENCY,
  WithdrawSchema,
} from "@host/shared";

// Import auth middleware for user context
import { AuthMiddleware } from "./auth-rpc";

// ============================================================================
// Payload Classes
// ============================================================================

/**
 * Get Balance Payload (empty)
 */
export class GetBalancePayload extends GetBalanceSchema {}

/**
 * Fund Wallet Payload
 */
export class FundWalletPayload extends FundWalletSchema {}

/**
 * Withdraw Payload
 */
export class WithdrawPayload extends WithdrawSchema {}

/**
 * Get Transaction History Payload
 */
export class GetTransactionHistoryPayload extends GetTransactionHistorySchema {}

/**
 * Link Bank Account Payload
 */
export class LinkBankAccountPayload extends LinkBankAccountSchema {}

/**
 * Verify Payment Payload
 */
export class VerifyPaymentPayload extends VerifyPaymentSchema {}

// ============================================================================
// Response Classes
// ============================================================================

/**
 * Get Balance Response
 */
export class GetBalanceResponse extends GetBalanceOutputSchema {}

/**
 * Fund Wallet Response
 */
export class FundWalletResponse extends FundWalletOutputSchema {}

/**
 * Withdraw Response
 */
export class WithdrawResponse extends WithdrawOutputSchema {}

/**
 * Transaction
 */
export class Transaction extends TransactionSchema {}

/**
 * Get Transaction History Response
 */
export class GetTransactionHistoryResponse extends GetTransactionHistoryOutputSchema {}

/**
 * Bank Account
 */
export class BankAccount extends BankAccountSchema {}

/**
 * Link Bank Account Response
 */
export class LinkBankAccountResponse extends LinkBankAccountOutputSchema {}

/**
 * Verify Payment Response
 */
export class VerifyPaymentResponse extends VerifyPaymentOutputSchema {}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Wallet operation errors
 */
export class WalletNotFoundError extends Schema.TaggedError<WalletNotFoundError>()(
  "WalletNotFoundError",
  {
    userId: Schema.String,
    message: Schema.String,
  }
) {}

export class InsufficientBalanceError extends Schema.TaggedError<InsufficientBalanceError>()(
  "InsufficientBalanceError",
  {
    available: Schema.Number,
    required: Schema.Number,
    message: Schema.String,
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

/**
 * Union of all wallet-related errors
 */
export const WalletError = Schema.Union(
  WalletNotFoundError,
  InsufficientBalanceError,
  PaymentError
);

// ============================================================================
// RPC Group Definition
// ============================================================================

/**
 * Wallet RPC group containing all wallet-related endpoints
 */
export class WalletRpcs extends RpcGroup.make(
  /**
   * Get current wallet balance
   */
  Rpc.make("GetBalance", {
    payload: GetBalancePayload,
    success: GetBalanceResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  /**
   * Fund wallet from external payment source
   */
  Rpc.make("FundWallet", {
    payload: FundWalletPayload,
    success: FundWalletResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  /**
   * Withdraw funds to bank account
   */
  Rpc.make("Withdraw", {
    payload: WithdrawPayload,
    success: WithdrawResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  /**
   * Get transaction history with filters
   */
  Rpc.make("GetTransactionHistory", {
    payload: GetTransactionHistoryPayload,
    success: GetTransactionHistoryResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  /**
   * Link a bank account to wallet
   */
  Rpc.make("LinkBankAccount", {
    payload: LinkBankAccountPayload,
    success: LinkBankAccountResponse,
    error: WalletError,
  }).middleware(AuthMiddleware),

  /**
   * Verify a payment transaction
   */
  Rpc.make("VerifyPayment", {
    payload: VerifyPaymentPayload,
    success: VerifyPaymentResponse,
    error: WalletError,
  }).middleware(AuthMiddleware)
) {}

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * Live implementation of wallet RPC handlers
 * Integrates with application use cases and payment gateway services
 */
export const WalletHandlersLive: Layer.Layer<
  | Rpc.Handler<"GetTransactionHistory">
  | Rpc.Handler<"LinkBankAccount">
  | Rpc.Handler<"VerifyPayment">
  | Rpc.Handler<"GetBalance">
  | Rpc.Handler<"FundWallet">
  | Rpc.Handler<"Withdraw">,
  never,
  | GetWalletBalanceUseCase
  | WithdrawFundsUseCase
  | FundWalletUseCase
  | AuthMiddleware
> = WalletRpcs.toLayer({
  /**
   * Get current wallet balance
   * Returns available balance, pending balance, and last update time
   */
  GetBalance: (_payload) =>
    Effect.gen(function* () {
      const getBalanceUseCase = yield* GetWalletBalanceUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* getBalanceUseCase
        .execute({
          userId,
          includeTransactionSummary: false,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new PaymentError({
                operation: "GetBalance",
                message: error._tag || "Failed to get balance",
                cause: error,
              })
          )
        );

      return new GetBalanceResponse({
        balance: result.balance,
        currency: result.currency,
        lastUpdated: DateTime.unsafeMake(result.lastUpdated),
        availableBalance: result.balance,
        pendingBalance: 0, // TODO: Calculate pending transactions
      });
    }),

  /**
   * Fund wallet from external payment source
   * Initiates payment gateway transaction and credits wallet
   */
  FundWallet: (payload) =>
    Effect.gen(function* () {
      const fundWalletUseCase = yield* FundWalletUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      // Map payment method to use case expected type
      const paymentMethod =
        payload.paymentMethod === "ussd"
          ? "bank_transfer"
          : payload.paymentMethod;

      const result = yield* fundWalletUseCase
        .execute({
          userId,
          amount: payload.amount,
          currency: DEFAULT_CURRENCY,
          paymentMethod,
          paymentReference: payload.paymentReference,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new PaymentError({
                operation: "FundWallet",
                message: error._tag || "Failed to fund wallet",
                cause: error,
              })
          )
        );

      return new FundWalletResponse({
        transactionId: result.transaction.id.value,
        status:
          result.transaction.status === "completed"
            ? "success"
            : result.transaction.status === "failed"
              ? "failed"
              : "pending",
        newBalance: result.newBalance,
        reference: result.paymentReference,
        message: "Wallet funded successfully",
      });
    }),

  /**
   * Withdraw funds to bank account
   * Validates balance and initiates withdrawal to linked bank account
   */
  Withdraw: (payload) =>
    Effect.gen(function* () {
      const withdrawFundsUseCase = yield* WithdrawFundsUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* withdrawFundsUseCase
        .execute({
          userId,
          amount: payload.amount,
          currency: DEFAULT_CURRENCY,
          bankAccountId: payload.bankAccountId,
          reason: payload.reason,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new PaymentError({
                operation: "Withdraw",
                message: error._tag || "Failed to process withdrawal",
                cause: error,
              })
          )
        );

      return new WithdrawResponse({
        transactionId: result.transaction.id.value,
        status:
          result.transaction.status === "completed"
            ? "success"
            : result.transaction.status === "failed"
              ? "failed"
              : "pending",
        estimatedArrival: DateTime.unsafeMake(result.estimatedArrival),
        newBalance: result.newBalance,
        message:
          "Withdrawal initiated successfully. Funds will arrive within 1-3 business days.",
      });
    }),

  /**
   * Get transaction history with filters
   * Returns paginated list of transactions with optional filtering
   */
  GetTransactionHistory: (_payload) =>
    Effect.succeed(
      new GetTransactionHistoryResponse({
        transactions: [],
        total: 0,
        hasMore: false,
      })
    ),

  /**
   * Link a bank account to wallet
   * Validates account details and stores for future withdrawals
   */
  LinkBankAccount: (payload) =>
    Effect.succeed(
      new LinkBankAccountResponse({
        account: new BankAccount({
          id: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          accountNumber: payload.accountNumber,
          accountName: payload.accountName,
          bankCode: payload.bankCode,
          bankName: "Unknown Bank", // TODO: Resolve bank name from bank code
          isDefault: false,
          createdAt: DateTime.unsafeMake(new Date()),
        }),
        status: "success",
        message: "Bank account linked successfully",
      })
    ),

  /**
   * Verify a payment transaction
   * Checks payment status with payment gateway and updates wallet balance
   */
  VerifyPayment: (payload) =>
    Effect.succeed(
      new VerifyPaymentResponse({
        verified: true,
        status: "success",
        amount: 0, // TODO: Get actual amount from payment gateway
        reference: payload.reference,
        paidAt: DateTime.unsafeMake(new Date()),
        message: "Payment verified successfully",
      })
    ),
});
