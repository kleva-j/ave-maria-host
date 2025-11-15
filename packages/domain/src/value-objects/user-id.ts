import { Equal, Schema } from "effect";

/**
 * Schema for UserId validation
 */
export const UserIdSchema = Schema.UUID.pipe(Schema.brand("UserId"));
export type UserIdType = typeof UserIdSchema.Type;

/**
 * UserId value object representing a unique identifier for users
 */
export class UserId extends Schema.Class<UserId>("UserId")({
  value: UserIdSchema,
}) {
  /**
   * Generate a new UserId with a random UUID
   */
  static generate(): UserId {
    const uuid = crypto.randomUUID();
    return UserId.fromString(UserIdSchema.make(uuid));
  }

  /**
   * Create a UserId from a string value
   */
  static fromString(value: string): UserId {
    const result = Schema.decodeUnknownSync(UserIdSchema)(value);
    return UserId.make({ value: result });
  }

  /**
   * Check if this UserId equals another UserId
   */
  equals(other: UserId): boolean {
    return Equal.equals(this.value, other.value);
  }

  /**
   * Get the string representation of this UserId
   */
  toString(): string {
    return this.value;
  }
}
