import {
  type PaymentSource,
  type TransactionType,
  type TransactionStatus,
  type TransactionReference,
  type TransactionDescription,
  TransactionReferenceSchema,
  TransactionStatusSchema,
  TransactionStatusEnum,
  TransactionTypeSchema,
  TransactionTypeEnum,
  PaymentSourceSchema,
  PaymentSourceEnum,
} from "@host/shared";

import {
  type UserId,
  type PlanId,
  type Money,
  TransactionId,
} from "../value-objects";

import { Schema } from "effect";

/**
 * Transaction entity representing financial transactions in the system
 */
export class Transaction {
  constructor(
    public readonly id: TransactionId,
    public readonly userId: UserId,
    public readonly planId: PlanId | null,
    public readonly amount: Money,
    public readonly type: TransactionType,
    public readonly status: TransactionStatus,
    public readonly source: PaymentSource | null,
    public readonly reference: TransactionReference,
    public readonly description: TransactionDescription | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly completedAt: Date | null,
    public readonly failedAt: Date | null,
    public readonly failureReason: string | null
  ) {
    // Basic validation
    if (!Schema.decodeUnknownSync(TransactionReferenceSchema)(reference)) {
      throw new Error("Invalid transaction reference");
    }
  }
  /**
   * Create a new Transaction
   */
  static create(
    userId: UserId,
    amount: Money,
    type: TransactionType,
    reference: TransactionReference,
    planId?: PlanId,
    source?: PaymentSource,
    description?: TransactionDescription,
    metadata?: Record<string, unknown>
  ): Transaction {
    return new Transaction(
      TransactionId.generate(),
      userId,
      planId || null,
      amount,
      type,
      TransactionStatusSchema.make(TransactionStatusEnum.PENDING),
      source || null,
      reference,
      description || null,
      metadata || null,
      new Date(),
      null,
      null,
      null
    );
  }

  /**
   * Create a contribution transaction
   */
  static createContribution(
    userId: UserId,
    planId: PlanId,
    amount: Money,
    source: PaymentSource,
    reference: TransactionReference
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeSchema.make(TransactionTypeEnum.CONTRIBUTION),
      reference,
      planId,
      source,
      "Contribution to savings plan",
      { planId: planId.value, source }
    );
  }

  /**
   * Create a withdrawal transaction
   */
  static createWithdrawal(
    userId: UserId,
    amount: Money,
    reference: TransactionReference,
    planId?: PlanId,
    description?: TransactionDescription
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeSchema.make(TransactionTypeEnum.WITHDRAWAL),
      reference,
      planId,
      undefined,
      description || "Withdrawal from savings",
      { planId: planId?.value }
    );
  }

  /**
   * Create a wallet funding transaction
   */
  static createWalletFunding(
    userId: UserId,
    amount: Money,
    source: PaymentSource,
    reference: TransactionReference
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeSchema.make(TransactionTypeEnum.WALLET_FUNDING),
      reference,
      undefined,
      source,
      TransactionTypeEnum.WALLET_FUNDING,
      { source }
    );
  }

  /**
   * Create an auto-save transaction
   */
  static createAutoSave(
    userId: UserId,
    planId: PlanId,
    amount: Money,
    reference: TransactionReference
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeSchema.make(TransactionTypeEnum.AUTO_SAVE),
      reference,
      planId,
      PaymentSourceSchema.make(PaymentSourceEnum.WALLET),
      "Automated savings contribution",
      { planId: planId.value, automated: true }
    );
  }

  /**
   * Check if the transaction is completed
   */
  isCompleted(): boolean {
    return this.status === TransactionStatusEnum.COMPLETED;
  }

  /**
   * Check if the transaction has failed
   */
  isFailed(): boolean {
    return this.status === TransactionStatusEnum.FAILED;
  }

  /**
   * Check if the transaction is pending
   */
  isPending(): boolean {
    return this.status === TransactionStatusEnum.PENDING;
  }

  /**
   * Check if the transaction is cancelled
   */
  isCancelled(): boolean {
    return this.status === TransactionStatusEnum.CANCELLED;
  }

  /**
   * Check if the transaction can be cancelled
   */
  canBeCancelled(): boolean {
    return this.status === TransactionStatusEnum.PENDING;
  }

  /**
   * Complete the transaction
   */
  complete(): Transaction {
    if (this.status !== TransactionStatusEnum.PENDING) {
      throw new Error("Can only complete pending transactions");
    }

    return new Transaction(
      this.id,
      this.userId,
      this.planId,
      this.amount,
      this.type,
      TransactionStatusSchema.make(TransactionStatusEnum.COMPLETED),
      this.source,
      this.reference,
      this.description,
      this.metadata,
      this.createdAt,
      new Date(),
      this.failedAt,
      this.failureReason
    );
  }

  /**
   * Fail the transaction with a reason
   */
  fail(reason: string): Transaction {
    if (this.status !== TransactionStatusEnum.PENDING) {
      throw new Error("Can only fail pending transactions");
    }

    return new Transaction(
      this.id,
      this.userId,
      this.planId,
      this.amount,
      this.type,
      TransactionStatusSchema.make(TransactionStatusEnum.FAILED),
      this.source,
      this.reference,
      this.description,
      this.metadata,
      this.createdAt,
      this.completedAt,
      new Date(),
      reason
    );
  }

  /**
   * Cancel the transaction
   */
  cancel(): Transaction {
    if (!this.canBeCancelled()) {
      throw new Error("Cannot cancel non-pending transactions");
    }

    return new Transaction(
      this.id,
      this.userId,
      this.planId,
      this.amount,
      this.type,
      TransactionStatusSchema.make(TransactionStatusEnum.CANCELLED),
      this.source,
      this.reference,
      this.description,
      this.metadata,
      this.createdAt,
      this.completedAt,
      new Date(),
      "Transaction cancelled by user"
    );
  }

  /**
   * Get the processing time in milliseconds (if completed)
   */
  getProcessingTime(): number | null {
    if (!this.completedAt) {
      return null;
    }
    return this.completedAt.getTime() - this.createdAt.getTime();
  }

  /**
   * Check if the transaction is related to a savings plan
   */
  isRelatedToSavingsPlan(): boolean {
    return this.planId !== null;
  }

  /**
   * Check if the transaction is a debit (money going out)
   */
  isDebit(): boolean {
    return (
      [
        TransactionTypeEnum.WITHDRAWAL,
        TransactionTypeEnum.PENALTY,
        TransactionTypeEnum.WALLET_WITHDRAWAL,
      ] as readonly string[]
    ).includes(this.type);
  }

  /**
   * Check if the transaction is a credit (money coming in)
   */
  isCredit(): boolean {
    return (
      [
        TransactionTypeEnum.CONTRIBUTION,
        TransactionTypeEnum.INTEREST,
        TransactionTypeEnum.WALLET_FUNDING,
        TransactionTypeEnum.AUTO_SAVE,
      ] as readonly string[]
    ).includes(this.type);
  }

  /**
   * Get a human-readable description of the transaction
   */
  getDisplayDescription(): string {
    if (this.description) {
      return this.description;
    }

    switch (this.type) {
      case TransactionTypeEnum.CONTRIBUTION:
        return "Savings contribution";
      case TransactionTypeEnum.WITHDRAWAL:
        return "Savings withdrawal";
      case TransactionTypeEnum.INTEREST:
        return "Interest earned";
      case TransactionTypeEnum.PENALTY:
        return "Early withdrawal penalty";
      case TransactionTypeEnum.WALLET_FUNDING:
        return "Wallet funding";
      case TransactionTypeEnum.WALLET_WITHDRAWAL:
        return "Wallet withdrawal";
      case TransactionTypeEnum.AUTO_SAVE:
        return "Automatic savings";
      default:
        return "Transaction";
    }
  }
}
