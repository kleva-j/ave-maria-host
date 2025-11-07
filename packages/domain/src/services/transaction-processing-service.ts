import type { Money, UserId } from "../value-objects";

import { PlanStatusEnum, SavingsPlan } from "../entities/savings-plan";
import {
  type TransactionType,
  TransactionTypeEnum,
  Transaction,
} from "../entities/transaction";

/**
 * Processing result interface
 */
export interface ProcessingResult {
  success: boolean;
  transaction: Transaction;
  updatedPlan?: SavingsPlan | undefined;
  message: string;
  actualAmount?: Money;
}

/**
 * Process a contribution transaction and update the savings plan
 */
export function processContribution(
  transaction: Transaction,
  plan: SavingsPlan
): ProcessingResult {
  if (
    !transaction.isCredit() ||
    transaction.type !== TransactionTypeEnum.CONTRIBUTION
  ) {
    throw new Error("Invalid transaction type for contribution processing");
  }

  if (!transaction.isPending()) {
    throw new Error("Can only process pending transactions");
  }

  try {
    // Update the savings plan with the contribution
    const updatedPlan = plan.makeContribution(transaction.amount);

    // Complete the transaction
    const completedTransaction = transaction.complete();

    return {
      success: true,
      transaction: completedTransaction,
      updatedPlan,
      message: "Contribution processed successfully",
    };
  } catch (error) {
    // Fail the transaction
    const failedTransaction = transaction.fail(
      error instanceof Error ? error.message : "Unknown error"
    );

    return {
      success: false,
      transaction: failedTransaction,
      updatedPlan: plan,
      message: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

/**
 * Process a withdrawal transaction
 */
export function processWithdrawal(
  transaction: Transaction,
  plan?: SavingsPlan
): ProcessingResult {
  if (
    !transaction.isDebit() ||
    transaction.type !== TransactionTypeEnum.WITHDRAWAL
  ) {
    throw new Error("Invalid transaction type for withdrawal processing");
  }

  if (!transaction.isPending()) {
    throw new Error("Can only process pending transactions");
  }

  try {
    let updatedPlan = plan;
    let actualWithdrawalAmount = transaction.amount;

    if (plan) {
      // Check if early withdrawal penalty applies
      if (plan.canEarlyWithdraw() && !plan.canWithdraw()) {
        const penalty = plan.calculateEarlyWithdrawalPenalty();
        actualWithdrawalAmount = transaction.amount.subtract(penalty);

        // Note: A separate penalty transaction would need to be created and saved
      }

      // Update plan balance (subtract the full amount including penalty)
      const newCurrentAmount = plan.currentAmount.subtract(transaction.amount);
      updatedPlan = new SavingsPlan(
        plan.id,
        plan.userId,
        plan.planName,
        plan.dailyAmount,
        plan.cycleDuration,
        plan.targetAmount,
        newCurrentAmount,
        plan.autoSaveEnabled,
        plan.autoSaveTime,
        plan.status,
        plan.startDate,
        plan.endDate,
        plan.interestRate,
        plan.contributionStreak,
        plan.totalContributions,
        plan.createdAt,
        new Date()
      );
    }

    // Complete the transaction
    const completedTransaction = transaction.complete();

    return {
      success: true,
      transaction: completedTransaction,
      updatedPlan: updatedPlan || undefined,
      message: "Withdrawal processed successfully",
      actualAmount: actualWithdrawalAmount,
    };
  } catch (error) {
    // Fail the transaction
    const failedTransaction = transaction.fail(
      error instanceof Error ? error.message : "Unknown error"
    );

    return {
      success: false,
      transaction: failedTransaction,
      updatedPlan: plan,
      message: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

/**
 * Process an auto-save transaction
 */
export function processAutoSave(
  transaction: Transaction,
  plan: SavingsPlan,
  walletBalance: Money
): ProcessingResult {
  if (transaction.type !== TransactionTypeEnum.AUTO_SAVE) {
    throw new Error("Invalid transaction type for auto-save processing");
  }

  if (!transaction.isPending()) {
    throw new Error("Can only process pending transactions");
  }

  try {
    // Check if it's time for auto-save
    if (!plan.isAutoSaveTime()) {
      const failedTransaction = transaction.fail("Not auto-save time");
      return {
        success: false,
        transaction: failedTransaction,
        updatedPlan: plan,
        message: "Auto-save not scheduled for this time",
      };
    }

    // Check wallet balance
    if (walletBalance.isLessThan(transaction.amount)) {
      const failedTransaction = transaction.fail("Insufficient wallet balance");
      return {
        success: false,
        transaction: failedTransaction,
        updatedPlan: plan,
        message: "Insufficient wallet balance for auto-save",
      };
    }

    // Process as regular contribution
    return processContribution(transaction, plan);
  } catch (error) {
    const failedTransaction = transaction.fail(
      error instanceof Error ? error.message : "Unknown error"
    );

    return {
      success: false,
      transaction: failedTransaction,
      updatedPlan: plan,
      message:
        error instanceof Error ? error.message : "Auto-save processing failed",
    };
  }
}

/**
 * Calculate interest for a completed savings plan
 */
export function calculateAndProcessInterest(
  plan: SavingsPlan,
  userId: UserId
): Transaction | null {
  if (plan.status !== PlanStatusEnum.COMPLETED || plan.interestRate === 0) {
    return null;
  }

  const interestEarned = plan.calculateInterestEarned();

  if (interestEarned.isZero()) {
    return null;
  }

  // Create interest transaction
  const interestTransaction = Transaction.create(
    userId,
    interestEarned,
    TransactionTypeEnum.INTEREST,
    `interest-${plan.id.value}-${Date.now()}`,
    plan.id,
    undefined,
    `Interest earned on completed savings plan: ${plan.planName}`,
    {
      planId: plan.id.value,
      interestRate: plan.interestRate,
      planCompletedAt: new Date().toISOString(),
    }
  );

  return interestTransaction.complete();
}

/**
 * Process transaction reversal (for failed payments, etc.)
 */
export function processReversal(
  originalTransaction: Transaction,
  reason: string
): Transaction {
  if (!originalTransaction.isCompleted()) {
    throw new Error("Can only reverse completed transactions");
  }

  // Create reversal transaction with opposite amount
  const reversalAmount = originalTransaction.amount;
  const reversalType: TransactionType = originalTransaction.isCredit()
    ? TransactionTypeEnum.WITHDRAWAL
    : TransactionTypeEnum.CONTRIBUTION;

  const reversalTransaction = Transaction.create(
    originalTransaction.userId,
    reversalAmount,
    reversalType,
    `reversal-${originalTransaction.reference}`,
    originalTransaction.planId || undefined,
    originalTransaction.source || undefined,
    `Reversal: ${reason}`,
    {
      originalTransactionId: originalTransaction.id.value,
      reversalReason: reason,
      isReversal: true,
    }
  );

  return reversalTransaction.complete();
}
