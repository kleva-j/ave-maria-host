import type { WalletValidationError } from "../../errors/validation-errors";
import type { WalletValidationResult } from "../validation-types";
import type { PaymentSource } from "@host/shared";
import type { UserId } from "../../value-objects";

import { PaymentSourceEnum } from "@host/shared";
import { Money } from "../../value-objects";
import { Context, Effect } from "effect";

import {
  validateWalletBalance,
  validatePaymentSource,
  validateAmountLimits,
} from "./wallet-validators";

/**
 * Comprehensive wallet validation using composable validators
 * This service provides centralized validation for all wallet operations
 */

/**
 * Validate wallet funding transaction
 */
export function validateWalletFundingEffect(
  userId: UserId,
  amount: Money,
  source: PaymentSource
): Effect.Effect<WalletValidationResult, WalletValidationError> {
  return Effect.gen(function* () {
    // Compose all wallet funding validators
    yield* validatePaymentSource(userId, source);
    yield* validateAmountLimits(userId, amount, "funding");
    yield* validateWalletBalance(userId, amount, undefined); // For funding, check balance isn't needed

    // Return comprehensive validation result
    return {
      isValid: true,
      warnings:
        source === PaymentSourceEnum.DEBIT_CARD
          ? ["Using debit card for wallet funding may incur transaction fees"]
          : [],
      walletEligibility: {
        hasSufficientBalance: true, // N/A for funding
        availableBalance: undefined, // N/A for funding
        withdrawableAmount: amount, // Amount to be funded
      },
      fundingEligibility: {
        respectsLimits: true,
        dailyLimit: amount, // Simplified for now
        weeklyLimit: amount,
        monthlyLimit: amount,
      },
      transactionEligibility: {
        isValidAmount: true,
        respectsPaymentSource: true,
        minimumAmount: Money.fromNumber(100),
        maximumAmount: Money.fromNumber(1000000),
      },
    } as WalletValidationResult;
  });
}

/**
 * Validate wallet withdrawal transaction
 */
export function validateWalletWithdrawalEffect(
  userId: UserId,
  amount: Money,
  currentBalance: Money
): Effect.Effect<WalletValidationResult, WalletValidationError> {
  return Effect.gen(function* () {
    // Compose all wallet withdrawal validators
    yield* validateAmountLimits(userId, amount, "withdrawal");
    yield* validateWalletBalance(userId, amount, currentBalance);

    // Return comprehensive validation result
    return {
      isValid: true,
      warnings: amount.equals(currentBalance)
        ? ["This will empty your wallet balance"]
        : [],
      walletEligibility: {
        hasSufficientBalance: amount.isLessThanOrEqual(currentBalance),
        availableBalance: currentBalance,
        withdrawableAmount: currentBalance.subtract(amount),
      },
      fundingEligibility: {
        respectsLimits: true,
        dailyLimit: amount, // Simplified for now
        weeklyLimit: amount,
        monthlyLimit: amount,
      },
      transactionEligibility: {
        isValidAmount: true,
        respectsPaymentSource: true, // N/A for wallet withdrawals
        minimumAmount: Money.fromNumber(100),
        maximumAmount: Money.fromNumber(1000000),
      },
    } as WalletValidationResult;
  });
}

/**
 * Main wallet validation service interface
 * Provides comprehensive validation for all wallet operations
 */
export interface WalletValidationService {
  readonly validateWalletFunding: (
    userId: UserId,
    amount: Money,
    source: PaymentSource
  ) => Effect.Effect<WalletValidationResult, WalletValidationError>;

  readonly validateWalletWithdrawal: (
    userId: UserId,
    amount: Money,
    currentBalance: Money
  ) => Effect.Effect<WalletValidationResult, WalletValidationError>;
}

/**
 * Context tag for dependency injection
 */
export const WalletValidationService =
  Context.GenericTag<WalletValidationService>(
    "@domain/WalletValidationService"
  );
