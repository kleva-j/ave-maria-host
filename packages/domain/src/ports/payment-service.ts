import type { UserId, Money } from "../value-objects";

import { type Effect, Data } from "effect";

/**
 * Payment method information
 */
export const PaymentMethodType = {
  BANK_ACCOUNT: "bank_account",
  DEBIT_CARD: "debit_card",
  MOBILE_MONEY: "mobile_money",
} as const;

const TransactionType = {
  PAYMENT: "payment",
  WITHDRAWAL: "withdrawal",
} as const;

export type PaymentMethodType =
  (typeof PaymentMethodType)[keyof typeof PaymentMethodType];

type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export interface PaymentMethod {
  readonly id: string;
  readonly type: PaymentMethodType;
  readonly provider: string;
  readonly maskedDetails: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

/**
 * Payment transaction result
 */
export const PaymentStatus = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface PaymentResult {
  readonly transactionId: string;
  readonly reference: string;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly fees: Money;
  readonly message: string;
  readonly providerResponse?: Record<string, unknown>;
}

/**
 * Bank account information
 */
export interface BankAccount {
  readonly accountNumber: string;
  readonly bankCode: string;
  readonly bankName: string;
  readonly accountName: string;
}

/**
 * Bank information
 */
export interface Bank {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly country: string;
  readonly currency: string;
}

/**
 * Port interface for payment gateway operations
 */
export interface PaymentService {
  /**
   * Process a payment from user's linked payment method to wallet
   */
  readonly processPayment: (
    userId: UserId,
    amount: Money,
    paymentMethodId: string,
    reference: string
  ) => Effect.Effect<PaymentResult, PaymentError>;

  /**
   * Process a withdrawal from wallet to user's bank account
   */
  readonly processWithdrawal: (
    userId: UserId,
    amount: Money,
    bankAccount: BankAccount,
    reference: string
  ) => Effect.Effect<PaymentResult, PaymentError>;

  /**
   * Verify a payment transaction status
   */
  readonly verifyTransaction: (
    reference: string
  ) => Effect.Effect<PaymentResult, PaymentError>;

  /**
   * Get user's linked payment methods
   */
  readonly getPaymentMethods: (
    userId: UserId
  ) => Effect.Effect<PaymentMethod[], PaymentError>;

  /**
   * Add a new payment method for user
   */
  readonly addPaymentMethod: (
    userId: UserId,
    paymentDetails: Record<string, unknown>
  ) => Effect.Effect<PaymentMethod, PaymentError>;

  /**
   * Remove a payment method
   */
  readonly removePaymentMethod: (
    userId: UserId,
    paymentMethodId: string
  ) => Effect.Effect<void, PaymentError>;

  /**
   * Get supported banks for withdrawals
   */
  readonly getSupportedBanks: () => Effect.Effect<Bank[], PaymentError>;

  /**
   * Resolve bank account details
   */
  readonly resolveBankAccount: (
    accountNumber: string,
    bankCode: string
  ) => Effect.Effect<BankAccount, PaymentError>;

  /**
   * Calculate transaction fees
   */
  readonly calculateFees: (
    amount: Money,
    transactionType: TransactionType
  ) => Effect.Effect<Money, PaymentError>;

  /**
   * Handle webhook notifications from payment provider
   */
  readonly handleWebhook: (
    payload: Record<string, unknown>,
    signature: string
  ) => Effect.Effect<PaymentResult, PaymentError>;
}

/**
 * Payment service error
 */
export class PaymentError extends Data.TaggedError("PaymentError")<{
  readonly code: string;
  readonly message: string;
  readonly provider?: string;
  readonly cause?: unknown;
  readonly timestamp?: Date;
}> {
  constructor(args: PaymentError) {
    super({ ...args, timestamp: new Date() });
  }
}
