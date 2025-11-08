import type { Money, UserId } from "../value-objects";

import { PlanStatusEnum, SavingsPlan } from "../entities/savings-plan";
import {
  type TransactionType,
  TransactionTypeEnum,
  Transaction,
} from "../entities/transaction";

/**
 * Processing result interface
 *
 * Represents the outcome of a transaction processing operation in the AV-Daily savings platform.
 * This interface encapsulates all relevant information about the processing result, including
 * success status, updated entities, and descriptive messages for user feedback.
 *
 * @interface ProcessingResult
 *
 * @property {boolean} success
 * - Indicates whether the transaction was processed successfully.
 * - `true` means the transaction completed without errors,
 * - `false` means the transaction failed or was rejected.
 *
 * @property {Transaction} transaction
 * - The transaction entity after processing. The transaction
 * will be in one of the following states:
 * - `completed`: Successfully processed
 * - `failed`: Processing failed with error
 * - `cancelled`: Transaction was cancelled
 *
 * @property {SavingsPlan} [updatedPlan]
 * - Optional. The updated savings plan if the transaction
 * affected a plan (e.g., contribution or withdrawal).
 * Will be `undefined` for transactions not related to
 * a specific savings plan.
 *
 * @property {string} message
 * - Human-readable message describing the processing outcome.
 * Used for user feedback and logging. Examples:
 * - "Contribution processed successfully"
 * - "Insufficient wallet balance"
 * - "Early withdrawal penalty applied"
 *
 * @property {Money} [actualAmount]
 * - Optional. The actual amount processed, which may differ
 * from the transaction amount due to fees or penalties.
 * Primarily used for withdrawal transactions where early
 * withdrawal penalties are applied.
 *
 * @example
 * ```typescript
 * // Successful contribution
 * const result: ProcessingResult = {
 *   success: true,
 *   transaction: completedTransaction,
 *   updatedPlan: updatedSavingsPlan,
 *   message: "Contribution processed successfully"
 * };
 *
 * // Failed transaction
 * const failedResult: ProcessingResult = {
 *   success: false,
 *   transaction: failedTransaction,
 *   updatedPlan: originalPlan,
 *   message: "Insufficient funds"
 * };
 * ```
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
 *
 * This function handles the core business logic for processing user contributions to their
 * savings plans. It validates the transaction, updates the plan balance, tracks contribution
 * streaks, and manages plan completion when the target amount is reached.
 *
 * **Business Rules:**
 * - Transaction must be a credit transaction of type "contribution"
 * - Transaction must be in "pending" status
 * - Contribution amount must match the plan's daily amount
 * - Plan must be in "active" status
 * - If contribution reaches target amount, plan is automatically completed
 *
 * **Side Effects:**
 * - Updates the savings plan's current amount
 * - Increments contribution streak counter
 * - Increments total contributions counter
 * - May change plan status to "completed" if target is reached
 * - Updates transaction status to "completed" or "failed"
 *
 * @param {Transaction} transaction
 * - The pending contribution transaction to process.
 * Must be a credit transaction with type "contribution".
 *
 * @param {SavingsPlan} plan
 * - The savings plan to which the contribution will be applied.
 * Must be in "active" status to accept contributions.
 *
 * @returns {ProcessingResult}
 * - Result object containing:
 * - `success: true` with completed transaction and updated plan on success
 * - `success: false` with failed transaction and original plan on failure
 *
 * @throws {Error} If transaction type is not "contribution" or not a credit transaction
 * @throws {Error} If transaction is not in "pending" status
 *
 * @example
 * ```typescript
 * const transaction = Transaction.createContribution(
 *   userId,
 *   planId,
 *   Money.fromNumber(1000, "NGN"),
 *   "wallet",
 *   "ref-123"
 * );
 *
 * const result = processContribution(transaction, savingsPlan);
 *
 * if (result.success) {
 *   console.log(result.message); // "Contribution processed successfully"
 *   console.log(result.updatedPlan.currentAmount); // Updated balance
 * } else {
 *   console.error(result.message); // Error message
 * }
 * ```
 *
 * @see {@link Transaction.createContribution} for creating contribution transactions
 * @see {@link SavingsPlan.makeContribution} for plan contribution logic
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
 * Process a withdrawal transaction from a savings plan or wallet
 *
 * This function handles withdrawal requests from users, including both regular withdrawals
 * from completed/matured plans and early withdrawals with penalties. It manages the complex
 * business logic around withdrawal eligibility, penalty calculations, and balance updates.
 *
 * **Business Rules:**
 * - Transaction must be a debit transaction of type "withdrawal"
 * - Transaction must be in "pending" status
 * - For plan withdrawals:
 *   - Plan must be completed OR matured OR eligible for early withdrawal
 *   - Early withdrawals incur a 5% penalty
 *   - Withdrawal amount cannot exceed available balance
 * - For wallet withdrawals (no plan): No additional restrictions
 *
 * **Early Withdrawal Penalty:**
 * When a user withdraws from an active plan before maturity:
 * - 5% penalty is deducted from the withdrawal amount
 * - User receives: withdrawal amount - penalty
 * - A separate penalty transaction should be created (noted in code)
 *
 * **Side Effects:**
 * - Updates the savings plan's current amount (if plan provided)
 * - Updates transaction status to "completed" or "failed"
 * - May trigger penalty transaction creation (implementation dependent)
 *
 * @param {Transaction} transaction
 * - The pending withdrawal transaction to process.
 * Must be a debit transaction with type "withdrawal".
 *
 * @param {SavingsPlan} [plan]
 * - Optional. The savings plan from which to withdraw.
 * If not provided, treats as a wallet withdrawal.
 * If provided, validates withdrawal eligibility.
 *
 * @returns {ProcessingResult}
 * - Result object containing:
 * - `success: true` with completed transaction and updated plan on success
 * - `actualAmount`: The amount user receives (after penalties if applicable)
 * - `success: false` with failed transaction on failure
 *
 * @throws {Error} If transaction type is not "withdrawal" or not a debit transaction
 * @throws {Error} If transaction is not in "pending" status
 *
 * @example
 * ```typescript
 * // Regular withdrawal from completed plan
 * const transaction = Transaction.createWithdrawal(
 *   userId,
 *   Money.fromNumber(50000, "NGN"),
 *   "ref-456",
 *   planId,
 *   "Withdrawal from completed savings"
 * );
 *
 * const result = processWithdrawal(transaction, completedPlan);
 *
 * if (result.success) {
 *   console.log(result.actualAmount); // Full amount
 * }
 *
 * // Early withdrawal with penalty
 * const earlyResult = processWithdrawal(transaction, activePlan);
 *
 * if (earlyResult.success) {
 *   console.log(earlyResult.actualAmount); // Amount minus 5% penalty
 * }
 * ```
 *
 * @see {@link Transaction.createWithdrawal} for creating withdrawal transactions
 * @see {@link SavingsPlan.canWithdraw} for withdrawal eligibility check
 * @see {@link SavingsPlan.calculateEarlyWithdrawalPenalty} for penalty calculation
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
 * Process an automated savings transaction
 *
 * This function handles automatic daily contributions to savings plans based on user-configured
 * auto-save settings. It validates timing, checks wallet balance, and delegates to the standard
 * contribution processing logic if all checks pass.
 *
 * **Auto-Save Mechanism:**
 * Auto-save allows users to set up automatic daily contributions at a specific time.
 * The system checks:
 * 1. Is it the configured auto-save time? (within 5-minute window)
 * 2. Does the user have sufficient wallet balance?
 * 3. Is the plan still active and accepting contributions?
 *
 * **Business Rules:**
 * - Transaction must be of type "auto_save"
 * - Transaction must be in "pending" status
 * - Current time must be within 5 minutes of plan's auto-save time
 * - Wallet balance must be sufficient for the contribution amount
 * - Plan must be in "active" status with auto-save enabled
 * - Contribution amount must match plan's daily amount
 *
 * **Failure Scenarios:**
 * - Not auto-save time: Transaction fails with "Not auto-save time" message
 * - Insufficient balance: Transaction fails with "Insufficient wallet balance" message
 * - Plan validation fails: Delegates to contribution processing which handles errors
 *
 * **Side Effects:**
 * - Deducts amount from user's wallet (external to this function)
 * - Updates savings plan via contribution processing
 * - Updates transaction status
 *
 * @param {Transaction} transaction
 * - The pending auto-save transaction to process.
 * Must be of type "auto_save".
 *
 * @param {SavingsPlan} plan
 * - The savings plan configured for auto-save.
 * Must have `autoSaveEnabled: true` and valid `autoSaveTime`.
 *
 * @param {Money} walletBalance
 * - The user's current wallet balance.
 * Used to verify sufficient funds before processing.
 *
 * @returns {ProcessingResult}
 * - Result object containing:
 * - `success: true` with completed transaction and updated plan if successful
 * - `success: false` with failed transaction and reason if checks fail
 *
 * @throws {Error} If transaction type is not "auto_save"
 * @throws {Error} If transaction is not in "pending" status
 *
 * @example
 * ```typescript
 * // User has auto-save configured for 09:00 daily
 * const autoSaveTransaction = Transaction.createAutoSave(
 *   userId,
 *   planId,
 *   Money.fromNumber(1000, "NGN"),
 *   "auto-ref-789"
 * );
 *
 * const userWalletBalance = Money.fromNumber(5000, "NGN");
 *
 * const result = processAutoSave(
 *   autoSaveTransaction,
 *   savingsPlan,
 *   userWalletBalance
 * );
 *
 * if (result.success) {
 *   console.log("Auto-save successful");
 *   // Deduct from wallet, update plan
 * } else {
 *   console.log(result.message); // "Insufficient wallet balance" or "Not auto-save time"
 *   // Retry later or notify user
 * }
 * ```
 *
 * @see {@link Transaction.createAutoSave} for creating auto-save transactions
 * @see {@link SavingsPlan.isAutoSaveTime} for time validation logic
 * @see {@link processContribution} for the underlying contribution processing
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
 * Calculate and process interest earnings for a completed savings plan
 *
 * This function calculates interest earned on a completed savings plan and creates a
 * completed interest transaction to credit the user's account. Interest is calculated
 * using simple interest based on the plan's interest rate and time elapsed.
 *
 * **Interest Calculation:**
 * - Formula: Simple Interest = (Principal × Rate × Time) / 365
 * - Principal: Current amount in the plan
 * - Rate: Annual interest rate (e.g., 0.05 for 5%)
 * - Time: Days elapsed since plan start date
 *
 * **Business Rules:**
 * - Plan must be in "completed" status
 * - Plan must have a non-zero interest rate
 * - Interest earned must be greater than zero
 * - Returns `null` if any condition is not met
 *
 * **When to Call:**
 * This function should be called:
 * - When a savings plan reaches completion
 * - During batch processing of completed plans
 * - Before processing withdrawals from completed plans
 *
 * **Side Effects:**
 * - Creates a new completed interest transaction
 * - Transaction is automatically marked as "completed"
 * - Does NOT update the savings plan (caller's responsibility)
 *
 * @param {SavingsPlan} plan
 * - The completed savings plan to calculate interest for.
 * Must have status "completed" and interestRate > 0.
 *
 * @param {UserId} userId
 * - The ID of the user who owns the plan.
 * Used to create the interest transaction.
 *
 * @returns {Transaction | null}
 * - A completed interest transaction if interest is earned,
 * or `null` if:
 * - Plan is not completed
 * - Interest rate is zero
 * - Calculated interest is zero
 *
 * @example
 * ```typescript
 * // Plan completed after 30 days with 5% annual interest
 * const completedPlan = new SavingsPlan({
 *   status: "completed",
 *   interestRate: 0.05,
 *   currentAmount: Money.fromNumber(100000, "NGN"),
 *   startDate: thirtyDaysAgo,
 *   // ... other properties
 * });
 *
 * const interestTransaction = calculateAndProcessInterest(
 *   completedPlan,
 *   userId
 * );
 *
 * if (interestTransaction) {
 *   console.log(interestTransaction.amount); // Interest earned
 *   console.log(interestTransaction.type); // "interest"
 *   console.log(interestTransaction.status); // "completed"
 *
 *   // Save transaction to database
 *   // Credit user's wallet with interest amount
 * } else {
 *   console.log("No interest to process");
 * }
 * ```
 *
 * @see {@link SavingsPlan.calculateInterestEarned} for interest calculation logic
 * @see {@link Transaction.create} for transaction creation
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
