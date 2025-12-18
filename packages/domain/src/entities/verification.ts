import { DateSchema } from "@host/shared";
import { Schema } from "effect";

// Define VerificationId brand
export const VerificationId = Schema.UUID.pipe(Schema.brand("VerificationId"));
export type VerificationId = typeof VerificationId.Type;

/**
 * Verification entity representing a verification token/code
 */
export class Verification extends Schema.Class<Verification>("Verification")({
  id: VerificationId.annotations({
    description: "Unique identifier for the verification",
  }),
  identifier: Schema.String.annotations({
    description: "Identifier (e.g., email, phone)",
  }),
  value: Schema.String.annotations({
    description: "Verification code or token value",
  }),
  expiresAt: DateSchema.annotations({
    description: "When the verification code expires",
  }),
  createdAt: Schema.NullOr(DateSchema).annotations({
    description: "When the verification was created",
  }),
  updatedAt: Schema.NullOr(DateSchema).annotations({
    description: "When the verification was last updated",
  }),
}) {
  /**
   * Create a new Verification instance
   */
  static create(params: {
    id: VerificationId;
    identifier: string;
    value: string;
    expiresAt: Date;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  }): Verification {
    return new Verification({
      id: params.id,
      identifier: params.identifier,
      value: params.value,
      expiresAt: params.expiresAt,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }
}
