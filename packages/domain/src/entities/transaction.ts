import {
  type UserId,
  type PlanId,
  type Money,
  TransactionId,
} from "../value-objects";

import { Schema } from "@effect/schema";

/**
 * Transaction type enumeration
 */
export const TransactionTypeEnum = {
  CONTRIBUTION: "contribution",
  WITHDRAWAL: "withdrawal",
  INTEREST: "interest",
  PENALTY: "penalty",
  WALLET_FUNDING: "wallet_funding",
  WALLET_WITHDRAWAL: "wallet_withdrawal",
  AUTO_SAVE: "auto_save",
} as const;

export const TransactionType = Schema.Literal(
  TransactionTypeEnum.CONTRIBUTION,
  TransactionTypeEnum.WITHDRAWAL,
  TransactionTypeEnum.INTEREST,
  TransactionTypeEnum.PENALTY,
  TransactionTypeEnum.WALLET_FUNDING,
  TransactionTypeEnum.WALLET_WITHDRAWAL,
  TransactionTypeEnum.AUTO_SAVE
);

/**
 * Transaction status enumeration
 */
export const TransactionStatusEnum = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const TransactionStatus = Schema.Literal(
  TransactionStatusEnum.PENDING,
  TransactionStatusEnum.COMPLETED,
  TransactionStatusEnum.FAILED,
  TransactionStatusEnum.CANCELLED
);

/**
 * Payment source enumeration
 */
export const PaymentSourceEnum = {
  WALLET: "wallet",
  BANK_TRANSFER: "bank_transfer",
  DEBIT_CARD: "debit_card",
} as const;

export const PaymentSource = Schema.Literal(
  PaymentSourceEnum.WALLET,
  PaymentSourceEnum.BANK_TRANSFER,
  PaymentSourceEnum.DEBIT_CARD
);

/**
 * Reference schema
 */
export const ReferenceSchema = Schema.Trimmed.pipe(
  Schema.minLength(1, {
    message: () => "Reference must be at least 1 character long",
  }),
  Schema.maxLength(100, {
    message: () => "Reference must be at most 100 characters long",
  })
).annotations({ description: "Transaction reference" });

/**
 * Description schema
 */
export const DescriptionSchema = Schema.Trimmed.pipe(
  Schema.minLength(1, {
    message: () => "Description must be at least 1 character long",
  }),
  Schema.maxLength(100, {
    message: () => "Description must be at most 100 characters long",
  })
).annotations({ description: "Transaction description" });

export type Reference = typeof ReferenceSchema.Type;
export type PaymentSource = typeof PaymentSource.Type;
export type Description = typeof DescriptionSchema.Type;
export type TransactionType = typeof TransactionType.Type;
export type TransactionStatus = typeof TransactionStatus.Type;

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
    public readonly reference: Reference,
    public readonly description: Description | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly completedAt: Date | null,
    public readonly failedAt: Date | null,
    public readonly failureReason: string | null
  ) {
    // Basic validation
    if (!Schema.decodeUnknownSync(ReferenceSchema)(reference)) {
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
    reference: Reference,
    planId?: PlanId,
    source?: PaymentSource,
    description?: Description,
    metadata?: Record<string, unknown>
  ): Transaction {
    return new Transaction(
      TransactionId.generate(),
      userId,
      planId || null,
      amount,
      type,
      TransactionStatusEnum.PENDING,
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
    reference: Reference
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeEnum.CONTRIBUTION,
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
    reference: Reference,
    planId?: PlanId,
    description?: Description
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeEnum.WITHDRAWAL,
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
    reference: Reference
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeEnum.WALLET_FUNDING,
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
    reference: Reference
  ): Transaction {
    return Transaction.create(
      userId,
      amount,
      TransactionTypeEnum.AUTO_SAVE,
      reference,
      planId,
      PaymentSourceEnum.WALLET,
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
      TransactionStatusEnum.COMPLETED,
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
      TransactionStatusEnum.FAILED,
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
      TransactionStatusEnum.CANCELLED,
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
