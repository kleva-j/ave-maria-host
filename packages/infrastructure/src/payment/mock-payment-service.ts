import type { TransactionType } from "@host/shared";
import type {
  GatewayBankAccount,
  PaymentMethod,
  UserId,
  Bank,
} from "@host/domain";

import { PaymentService } from "@host/domain";
import { Effect, Layer } from "effect";
import { Money } from "@host/domain";
import {
  TransactionTypeEnum,
  PaymentStatusSchema,
  PaymentStatusEnum,
} from "@host/shared";

// Mock implementation of PaymentService
export const MockPaymentServiceLive = Layer.succeed(
  PaymentService,
  PaymentService.of({
    processPayment: (
      _userId: UserId,
      amount: Money,
      _paymentMethodId: string,
      reference: string
    ) =>
      Effect.succeed({
        transactionId: crypto.randomUUID(),
        reference,
        status: PaymentStatusSchema.make(PaymentStatusEnum.SUCCESS),
        amount,
        fees: Money.fromNumber(0, amount.currency),
        message: "Payment processed successfully (Mock)",
      }),

    processWithdrawal: (
      _userId: UserId,
      amount: Money,
      _bankAccount: GatewayBankAccount,
      reference: string
    ) =>
      Effect.succeed({
        transactionId: crypto.randomUUID(),
        reference,
        status: PaymentStatusSchema.make(PaymentStatusEnum.SUCCESS),
        amount,
        fees: Money.fromNumber(10, amount.currency),
        message: "Withdrawal processed successfully (Mock)",
      }),

    verifyTransaction: (reference: string) =>
      Effect.succeed({
        transactionId: crypto.randomUUID(),
        reference,
        status: PaymentStatusSchema.make(PaymentStatusEnum.SUCCESS),
        amount: Money.fromNumber(100),
        fees: Money.fromNumber(0),
        message: "Transaction verified (Mock)",
      }),

    getPaymentMethods: (_userId: UserId) =>
      Effect.succeed([
        {
          id: "pm_mock_1",
          type: "bank_account",
          provider: "mock_provider",
          maskedDetails: "**** 1234",
          isDefault: true,
          isActive: true,
        },
      ] as PaymentMethod[]),

    addPaymentMethod: (_userId: UserId, _details: Record<string, unknown>) =>
      Effect.succeed({
        id: `pm_mock_${Date.now()}`,
        type: "debit_card",
        provider: "mock_provider",
        maskedDetails: "**** 5678",
        isDefault: false,
        isActive: true,
      } as PaymentMethod),

    removePaymentMethod: (_userId: UserId, _paymentMethodId: string) =>
      Effect.void,

    getSupportedBanks: () =>
      Effect.succeed([
        {
          code: "001",
          name: "Mock Bank A",
          slug: "mock-bank-a",
          country: "NG",
          currency: "NGN",
        },
        {
          code: "002",
          name: "Mock Bank B",
          slug: "mock-bank-b",
          country: "NG",
          currency: "NGN",
        },
      ] as Bank[]),

    resolveBankAccount: (accountNumber: string, bankCode: string) =>
      Effect.succeed({
        accountNumber,
        bankCode,
        bankName: bankCode === "001" ? "Mock Bank A" : "Mock Bank B",
        accountName: "John Doe (Mock)",
      }),

    calculateFees: (amount: Money, type: TransactionType) =>
      Effect.succeed(
        Money.fromNumber(
          type === TransactionTypeEnum.WITHDRAWAL ? 10 : 0,
          amount.currency
        )
      ),

    handleWebhook: (_payload: Record<string, unknown>, _signature: string) =>
      Effect.die("Webhook not implemented in mock"),
  })
);
