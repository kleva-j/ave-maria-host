import { Equal, Schema } from "effect";

/**
 * Schema for TransactionId validation
 */
export const TransactionIdSchema = Schema.UUID.pipe(
  Schema.brand("TransactionId")
);
export type TransactionIdType = typeof TransactionIdSchema.Type;

/**
 * TransactionId value object representing a unique identifier for transactions
 */
export class TransactionId extends Schema.Class<TransactionId>("TransactionId")(
  { value: TransactionIdSchema }
) {
  /**
   * Generate a new TransactionId with a random UUID
   */
  static generate(): TransactionId {
    const uuid = crypto.randomUUID();
    return TransactionId.fromString(uuid);
  }

  /**
   * Create a TransactionId from a string value
   */
  static fromString(value: string): TransactionId {
    const result = Schema.decodeUnknownSync(TransactionIdSchema)(value);
    return TransactionId.make({ value: result });
  }

  /**
   * Check if this TransactionId equals another TransactionId
   */
  equals(other: TransactionId): boolean {
    return Equal.equals(this.value, other.value);
  }

  /**
   * Get the string representation of this TransactionId
   */
  toString(): string {
    return this.value;
  }
}
