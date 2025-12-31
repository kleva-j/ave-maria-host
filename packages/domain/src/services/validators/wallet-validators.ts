import type { PaymentSource } from "@host/shared";
import type { UserId } from "../../value-objects";

import { PaymentSourceEnum, PaymentSourceSchema } from "@host/shared";
import { Money } from "../../value-objects";
import { Effect } from "effect";
import {
  WalletValidationError,
  WalletErrorType,
} from "../../errors/validation-errors";

/**
 * Individual validator functions for wallet operations
 * Each validator returns Effect<void, WalletValidationError> for composition
 */

/**
 * Validate if payment source is allowed for the user
 */
export const validatePaymentSource = (
  userId: UserId,
  source: PaymentSource
): Effect.Effect<void, WalletValidationError> => {
  // Simple check for now - can be expanded with user-specific allowed sources
  const allowedSources: PaymentSource[] = [
    PaymentSourceSchema.make(PaymentSourceEnum.BANK_TRANSFER),
    PaymentSourceSchema.make(PaymentSourceEnum.DEBIT_CARD),
    PaymentSourceSchema.make(PaymentSourceEnum.WALLET),
    PaymentSourceSchema.make(PaymentSourceEnum.CASH),
  ];

  return allowedSources.includes(source)
    ? Effect.void
    : Effect.fail(
        new WalletValidationError({
          type: WalletErrorType.INVALID_PAYMENT_SOURCE,
          userId: userId.value,
          message: `Payment source ${source} is not supported`,
          context: { paymentSource: source },
        })
      );
};

/**
 * Validate if amount respects funding or withdrawal limits
 */
export const validateAmountLimits = (
  userId: UserId,
  amount: Money,
  type: "funding" | "withdrawal"
): Effect.Effect<void, WalletValidationError> => {
  const minAmount = Money.fromNumber(100);
  const maxAmount = Money.fromNumber(1000000);

  if (amount.isLessThan(minAmount)) {
    return Effect.fail(
      new WalletValidationError({
        type: WalletErrorType.INVALID_AMOUNT,
        userId: userId.value,
        message: `Minimum ${type} amount is ${minAmount.format()}`,
        context: {
          requestedAmount: amount.value,
          currentLimit: minAmount.value,
        },
      })
    );
  }

  if (amount.isGreaterThan(maxAmount)) {
    return Effect.fail(
      new WalletValidationError({
        type: WalletErrorType.INVALID_AMOUNT,
        userId: userId.value,
        message: `Maximum ${type} amount is ${maxAmount.format()}`,
        context: {
          requestedAmount: amount.value,
          currentLimit: maxAmount.value,
        },
      })
    );
  }

  return Effect.void;
};

/**
 * Validate if wallet has sufficient balance for withdrawal
 */
export const validateWalletBalance = (
  userId: UserId,
  amount: Money,
  currentBalance?: Money
): Effect.Effect<void, WalletValidationError> => {
  if (!currentBalance) {
    return Effect.void; // Skip if balance not provided (e.g. for funding)
  }

  return currentBalance.isGreaterThanOrEqual(amount)
    ? Effect.void
    : Effect.fail(
        new WalletValidationError({
          type: WalletErrorType.INSUFFICIENT_BALANCE,
          userId: userId.value,
          message: "Insufficient wallet balance",
          context: {
            requestedAmount: amount.value,
            availableBalance: currentBalance.value,
          },
        })
      );
};
