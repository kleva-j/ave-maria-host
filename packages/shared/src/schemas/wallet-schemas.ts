// Wallet Validation Schemas using Effect Schema
// Input/output schemas for all wallet-related API operations

import { BooleanSchema, DateSchema, DateTimeSchema } from "./common-schemas";
import { Schema } from "effect";

import {
  AccountNumberSchema,
  AccountNameSchema,
  BankAccountSchema,
  BankCodeSchema,
} from "./bank-account-schema";

import {
  TransactionStatusSchema,
  TransactionTypeSchema,
  PaymentMethodSchema,
  CurrencyCodeSchema,
} from "./enum-schemas";

import {
  BankAccountIdSchema,
  TransactionIdSchema,
  UserIdSchema,
  PlanIdSchema,
} from "./id-schemas";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for getting wallet balance
 * No input parameters required - uses authenticated user context
 */
export class GetBalanceSchema extends Schema.Class<GetBalanceSchema>(
  "GetBalanceSchema"
)({}) {}

export type GetBalanceInput = typeof GetBalanceSchema.Type;

/**
 * Schema for funding wallet from external source
 * Validates payment method and amount
 */
export class FundWalletSchema extends Schema.Class<FundWalletSchema>(
  "FundWalletSchema"
)({
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Funding amount must be positive" }),
    Schema.lessThanOrEqualTo(10000000, {
      message: () => "Funding amount cannot exceed 10,000,000",
    })
  ),
  paymentMethod: PaymentMethodSchema.pipe(
    Schema.annotations({
      description: "Payment method for funding the wallet",
    })
  ),
  paymentReference: Schema.optional(
    Schema.String.pipe(
      Schema.minLength(4, {
        message: () => "Payment reference must be at least 4 characters long",
      })
    )
  ),
}) {}

export type FundWalletInput = typeof FundWalletSchema.Type;

/**
 * Schema for withdrawing funds from wallet to bank account
 * Validates withdrawal amount and destination
 */
export class WithdrawSchema extends Schema.Class<WithdrawSchema>(
  "WithdrawSchema"
)({
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Withdrawal amount must be positive" }),
    Schema.greaterThanOrEqualTo(100, {
      message: () => "Minimum withdrawal amount is 100",
    })
  ),
  bankAccountId: BankAccountIdSchema,
  reason: Schema.optional(
    Schema.String.pipe(
      Schema.maxLength(200, {
        message: () => "Reason must not exceed 200 characters",
      })
    )
  ),
}) {}

export type WithdrawInput = typeof WithdrawSchema.Type;

/**
 * Schema for linking a bank account to wallet
 */
export class LinkBankAccountSchema extends Schema.Class<LinkBankAccountSchema>(
  "LinkBankAccountSchema"
)({
  accountNumber: AccountNumberSchema,
  bankCode: BankCodeSchema,
  accountName: AccountNameSchema,
  isPrimary: Schema.optional(BooleanSchema),
  userId: UserIdSchema,
}) {}

export type LinkBankAccountInput = typeof LinkBankAccountSchema.Type;

/**
 * Schema for getting transaction history with filters
 */
export class GetTransactionHistorySchema extends Schema.Class<GetTransactionHistorySchema>(
  "GetTransactionHistorySchema"
)({
  startDate: Schema.optional(DateSchema),
  endDate: Schema.optional(DateSchema),
  type: Schema.optional(TransactionTypeSchema),
  status: Schema.optional(TransactionStatusSchema),
  limit: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.between(1, 100, {
        message: () => "Limit must be between 1 and 100",
      })
    )
  ),
  offset: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.nonNegative({ message: () => "Offset must be non-negative" })
    )
  ),
}) {}

export type GetTransactionHistoryInput =
  typeof GetTransactionHistorySchema.Type;

/**
 * Schema for verifying a payment transaction
 */
export class VerifyPaymentSchema extends Schema.Class<VerifyPaymentSchema>(
  "VerifyPaymentSchema"
)({
  reference: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Payment reference is required" })
  ),
}) {}

export type VerifyPaymentInput = typeof VerifyPaymentSchema.Type;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for wallet balance response
 */
export class GetBalanceOutputSchema extends Schema.Class<GetBalanceOutputSchema>(
  "GetBalanceOutputSchema"
)({
  balance: Schema.Number,
  currency: CurrencyCodeSchema,
  lastUpdated: Schema.DateTimeUtc,
  availableBalance: Schema.Number,
  pendingBalance: Schema.Number,
}) {}

export type GetBalanceOutput = typeof GetBalanceOutputSchema.Type;

/**
 * Schema for fund wallet response
 */
export class FundWalletOutputSchema extends Schema.Class<FundWalletOutputSchema>(
  "FundWalletOutputSchema"
)({
  transactionId: TransactionIdSchema,
  status: TransactionStatusSchema,
  newBalance: Schema.Number,
  paymentUrl: Schema.optional(Schema.String),
  reference: Schema.String,
  message: Schema.optional(Schema.String),
}) {}

export type FundWalletOutput = typeof FundWalletOutputSchema.Type;

/**
 * Schema for withdrawal response
 */
export class WithdrawOutputSchema extends Schema.Class<WithdrawOutputSchema>(
  "WithdrawOutputSchema"
)({
  transactionId: TransactionIdSchema,
  status: TransactionStatusSchema,
  estimatedArrival: Schema.DateTimeUtc,
  newBalance: Schema.Number,
  message: Schema.optional(Schema.String),
}) {}

export type WithdrawOutput = typeof WithdrawOutputSchema.Type;

/**
 * Schema for transaction details
 */
export class TransactionSchema extends Schema.Class<TransactionSchema>(
  "TransactionSchema"
)({
  id: TransactionIdSchema,
  userId: UserIdSchema,
  planId: Schema.NullOr(PlanIdSchema),
  amount: Schema.Number,
  type: TransactionTypeSchema,
  status: TransactionStatusSchema,
  reference: Schema.String,
  description: Schema.NullOr(Schema.String),
  createdAt: DateSchema,
  completedAt: Schema.NullOr(DateSchema),
}) {}

export type Transaction = typeof TransactionSchema.Type;

/**
 * Schema for transaction history response
 */
export class GetTransactionHistoryOutputSchema extends Schema.Class<GetTransactionHistoryOutputSchema>(
  "GetTransactionHistoryOutputSchema"
)({
  transactions: Schema.Array(TransactionSchema),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  hasMore: BooleanSchema,
}) {}

export type GetTransactionHistoryOutput =
  typeof GetTransactionHistoryOutputSchema.Type;

/**
 * Schema for link bank account response
 */
export class LinkBankAccountOutputSchema extends Schema.Class<LinkBankAccountOutputSchema>(
  "LinkBankAccountOutputSchema"
)({
  account: BankAccountSchema,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
}) {}

export type LinkBankAccountOutput = typeof LinkBankAccountOutputSchema.Type;

/**
 * Schema for payment verification response
 */
export class VerifyPaymentOutputSchema extends Schema.Class<VerifyPaymentOutputSchema>(
  "VerifyPaymentOutputSchema"
)({
  verified: BooleanSchema,
  status: Schema.Literal("success", "pending", "failed"),
  amount: Schema.Number,
  reference: Schema.String,
  paidAt: Schema.NullOr(DateTimeSchema),
  message: Schema.optional(Schema.String),
}) {}

export type VerifyPaymentOutput = typeof VerifyPaymentOutputSchema.Type;
