import { Schema } from "effect";

// Define PhoneVerificationId brand
export const PhoneVerificationId = Schema.UUID.pipe(
  Schema.brand("PhoneVerificationId")
);
export type PhoneVerificationId = typeof PhoneVerificationId.Type;

/**
 * PhoneVerification entity representing a phone number verification OTP
 */
export class PhoneVerification extends Schema.Class<PhoneVerification>(
  "PhoneVerification"
)({
  id: PhoneVerificationId.annotations({
    description: "Unique identifier for the phone verification",
  }),
  phoneNumber: Schema.String.annotations({
    description: "Phone number being verified",
  }),
  otp: Schema.String.annotations({
    description: "One-Time Password",
  }),
  expiresAt: Schema.Date.annotations({
    description: "When the OTP expires",
  }),
  verified: Schema.NullOr(Schema.Boolean).annotations({
    description: "Whether the OTP has been verified",
  }),
  attempts: Schema.NullOr(Schema.Number).annotations({
    description: "Number of verification attempts",
  }),
  createdAt: Schema.Date.annotations({
    description: "When the record was created",
  }),
}) {
  /**
   * Create a new PhoneVerification instance
   */
  static create(params: {
    id: PhoneVerificationId;
    phoneNumber: string;
    otp: string;
    expiresAt: Date;
    verified?: boolean | null;
    attempts?: number | null;
    createdAt?: Date;
  }): PhoneVerification {
    return new PhoneVerification({
      id: params.id,
      phoneNumber: params.phoneNumber,
      otp: params.otp,
      expiresAt: params.expiresAt,
      verified: params.verified ?? false,
      attempts: params.attempts ?? 0,
      createdAt: params.createdAt ?? new Date(),
    });
  }
}
