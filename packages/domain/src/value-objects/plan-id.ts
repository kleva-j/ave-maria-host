import { PlanIdSchema, type PlanIdType } from "@host/shared";
import { Equal, Schema } from "effect";

/**
 * PlanId value object representing a unique identifier for savings plans
 */
export class PlanId extends Schema.Class<PlanIdType>("PlanId")({
  value: PlanIdSchema,
}) {
  /**
   * Generate a new PlanId with a random UUID
   */
  static generate(): PlanId {
    const uuid = crypto.randomUUID();
    return PlanId.fromString(PlanIdSchema.make(uuid));
  }

  /**
   * Create a PlanId from a string value
   */
  static fromString(value: string): PlanId {
    const result = Schema.decodeUnknownSync(PlanIdSchema)(value);
    return PlanId.make({ value: result });
  }

  /**
   * Check if this PlanId equals another PlanId
   */
  equals(other: PlanId): boolean {
    return Equal.equals(this.value, other.value);
  }

  /**
   * Get the string representation of this PlanId
   */
  toString(): string {
    return this.value;
  }
}
