// Wallet Validation Schemas using Effect Schema
// Input/output schemas for all wallet-related API operations

import { Schema } from "@effect/schema";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for getting wallet balance
 * No input parameters required - uses authenticated user context
 */
export const GetBalanceSchema = Schema.Struct({});

export type GetBalanceInput = Schema.Schema.Type<typeof GetBalanceSchema>;

/**
 * Schema for funding wallet from external source
 * Validates payment method and amount
 */
export const FundWalletSchema = Schema.Struct({
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Funding amount must be positive" }),
    Schema.lessThanOrEqualTo(10000000, {
      message: () => "Funding amount cannot exceed 10,000,000",
    })
  ),
  paymentMethod: Schema.Literal("bank_transfer", "debit_card", "ussd").pipe(
    Schema.annotations({
      description: "Payment method for funding the wallet",
    })
  ),
  paymentReference: Schema.optional(
    Schema.String.pipe(
      Schema.minLength(1, { message: () => "Payment reference is required" })
    )
  ),
});

export type FundWalletInput = Schema.Schema.Type<typeof FundWalletSchema>;

/**
 * Schema for withdrawing funds from wallet to bank account
 * Validates withdrawal amount and destination
 */
export const WithdrawSchema = Schema.Struct({
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Withdrawal amount must be positive" }),
    Schema.greaterThanOrEqualTo(100, {
      message: () => "Minimum withdrawal amount is 100",
    })
  ),
  bankAccountId: Schema.UUID.annotations({
    message: () => "Invalid bank account ID format",
  }),
  reason: Schema.optional(
    Schema.String.pipe(
      Schema.maxLength(200, {
        message: () => "Reason must not exceed 200 characters",
      })
    )
  ),
});

export type WithdrawInput = Schema.Schema.Type<typeof WithdrawSchema>;

/**
 * Schema for linking a bank account to wallet
 */
export const LinkBankAccountSchema = Schema.Struct({
  accountNumber: Schema.String.pipe(
    Schema.pattern(/^\d{10}$/, {
      message: () => "Account number must be exactly 10 digits",
    })
  ),
  bankCode: Schema.String.pipe(
    Schema.pattern(/^\d{3}$/, {
      message: () => "Bank code must be exactly 3 digits",
    })
  ),
  accountName: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Account name is required" }),
    Schema.maxLength(100, {
      message: () => "Account name must not exceed 100 characters",
    }),
    Schema.trimmed()
  ),
});

export type LinkBankAccountInput = Schema.Schema.Type<
  typeof LinkBankAccountSchema
>;

/**
 * Schema for getting transaction history with filters
 */
export const GetTransactionHistorySchema = Schema.Struct({
  startDate: Schema.optional(Schema.DateTimeUtc),
  endDate: Schema.optional(Schema.DateTimeUtc),
  type: Schema.optional(
    Schema.Literal(
      "contribution",
      "withdrawal",
      "funding",
      "interest",
      "penalty"
    )
  ),
  status: Schema.optional(Schema.Literal("pending", "completed", "failed")),
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
});

export type GetTransactionHistoryInput = Schema.Schema.Type<
  typeof GetTransactionHistorySchema
>;

/**
 * Schema for verifying a payment transaction
 */
export const VerifyPaymentSchema = Schema.Struct({
  reference: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Payment reference is required" })
  ),
});

export type VerifyPaymentInput = Schema.Schema.Type<typeof VerifyPaymentSchema>;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for wallet balance response
 */
export const GetBalanceOutputSchema = Schema.Struct({
  balance: Schema.Number,
  currency: Schema.String.pipe(
    Schema.pattern(/^[A-Z]{3}$/, {
      message: () => "Currency must be a 3-letter code",
    })
  ),
  lastUpdated: Schema.DateTimeUtc,
  availableBalance: Schema.Number,
  pendingBalance: Schema.Number,
});

export type GetBalanceOutput = Schema.Schema.Type<
  typeof GetBalanceOutputSchema
>;

/**
 * Schema for fund wallet response
 */
export const FundWalletOutputSchema = Schema.Struct({
  transactionId: Schema.UUID,
  status: Schema.Literal("success", "pending", "failed"),
  newBalance: Schema.Number,
  paymentUrl: Schema.optional(Schema.String),
  reference: Schema.String,
  message: Schema.optional(Schema.String),
});

export type FundWalletOutput = Schema.Schema.Type<
  typeof FundWalletOutputSchema
>;

/**
 * Schema for withdrawal response
 */
export const WithdrawOutputSchema = Schema.Struct({
  transactionId: Schema.UUID,
  status: Schema.Literal("success", "pending", "failed"),
  estimatedArrival: Schema.DateTimeUtc,
  newBalance: Schema.Number,
  message: Schema.optional(Schema.String),
});

export type WithdrawOutput = Schema.Schema.Type<typeof WithdrawOutputSchema>;

/**
 * Schema for transaction details
 */
export const TransactionSchema = Schema.Struct({
  id: Schema.UUID,
  userId: Schema.UUID,
  planId: Schema.NullOr(Schema.UUID),
  amount: Schema.Number,
  type: Schema.Literal(
    "contribution",
    "withdrawal",
    "funding",
    "interest",
    "penalty"
  ),
  status: Schema.Literal("pending", "completed", "failed"),
  reference: Schema.String,
  description: Schema.NullOr(Schema.String),
  createdAt: Schema.DateTimeUtc,
  completedAt: Schema.NullOr(Schema.DateTimeUtc),
});

export type Transaction = Schema.Schema.Type<typeof TransactionSchema>;

/**
 * Schema for transaction history response
 */
export const GetTransactionHistoryOutputSchema = Schema.Struct({
  transactions: Schema.Array(TransactionSchema),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  hasMore: Schema.Boolean,
});

export type GetTransactionHistoryOutput = Schema.Schema.Type<
  typeof GetTransactionHistoryOutputSchema
>;

/**
 * Schema for bank account details
 */
export const BankAccountSchema = Schema.Struct({
  id: Schema.UUID,
  userId: Schema.UUID,
  accountNumber: Schema.String,
  accountName: Schema.String,
  bankCode: Schema.String,
  bankName: Schema.String,
  isDefault: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
});

export type BankAccount = Schema.Schema.Type<typeof BankAccountSchema>;

/**
 * Schema for link bank account response
 */
export const LinkBankAccountOutputSchema = Schema.Struct({
  account: BankAccountSchema,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
});

export type LinkBankAccountOutput = Schema.Schema.Type<
  typeof LinkBankAccountOutputSchema
>;

/**
 * Schema for payment verification response
 */
export const VerifyPaymentOutputSchema = Schema.Struct({
  verified: Schema.Boolean,
  status: Schema.Literal("success", "pending", "failed"),
  amount: Schema.Number,
  reference: Schema.String,
  paidAt: Schema.NullOr(Schema.DateTimeUtc),
  message: Schema.optional(Schema.String),
});

export type VerifyPaymentOutput = Schema.Schema.Type<
  typeof VerifyPaymentOutputSchema
>;
