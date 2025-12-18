import { Schema } from "effect";
import { UserIdSchema } from "@host/shared";

// Define KycVerificationId brand
export const KycVerificationId = Schema.UUID.pipe(
  Schema.brand("KycVerificationId")
);
export type KycVerificationId = typeof KycVerificationId.Type;

/**
 * KycVerification entity representing a KYC verification record
 */
export class KycVerification extends Schema.Class<KycVerification>(
  "KycVerification"
)({
  id: KycVerificationId.annotations({
    description: "Unique identifier for the KYC verification",
  }),
  userId: UserIdSchema.annotations({
    description: "ID of the user being verified",
  }),
  tier: Schema.Number.annotations({
    description: "KYC tier (1 or 2)",
  }),
  status: Schema.String.annotations({
    description: "Verification status (pending, approved, rejected, etc.)",
  }),
  firstName: Schema.NullOr(Schema.String).annotations({
    description: "First name (Tier 1)",
  }),
  lastName: Schema.NullOr(Schema.String).annotations({
    description: "Last name (Tier 1)",
  }),
  dateOfBirth: Schema.NullOr(Schema.Date).annotations({
    description: "Date of birth (Tier 1)",
  }),
  address: Schema.NullOr(Schema.String).annotations({
    description: "Address (Tier 1)",
  }),
  governmentIdType: Schema.NullOr(Schema.String).annotations({
    description: "Type of government ID (Tier 2)",
  }),
  governmentIdNumber: Schema.NullOr(Schema.String).annotations({
    description: "Government ID number (Tier 2)",
  }),
  governmentIdImage: Schema.NullOr(Schema.String).annotations({
    description: "URL to government ID image (Tier 2)",
  }),
  selfieImage: Schema.NullOr(Schema.String).annotations({
    description: "URL to selfie image (Tier 2)",
  }),
  verificationData: Schema.NullOr(Schema.Unknown).annotations({
    // Using Unknown for JSONB
    description: "Additional verification metadata",
  }),
  verifiedBy: Schema.NullOr(Schema.String).annotations({
    // Assuming UUID string for admin user ID
    description: "ID of the admin who verified this",
  }),
  verifiedAt: Schema.NullOr(Schema.Date).annotations({
    description: "When the verification was processed",
  }),
  rejectionReason: Schema.NullOr(Schema.String).annotations({
    description: "Reason for rejection if rejected",
  }),
  createdAt: Schema.Date.annotations({
    description: "When the record was created",
  }),
  updatedAt: Schema.Date.annotations({
    description: "When the record was last updated",
  }),
}) {
  /**
   * Create a new KycVerification instance
   */
  static create(params: {
    id: KycVerificationId;
    userId: typeof UserIdSchema.Type;
    tier: number;
    status: string;
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: Date | null;
    address?: string | null;
    governmentIdType?: string | null;
    governmentIdNumber?: string | null;
    governmentIdImage?: string | null;
    selfieImage?: string | null;
    verificationData?: unknown | null;
    verifiedBy?: string | null;
    verifiedAt?: Date | null;
    rejectionReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): KycVerification {
    return new KycVerification({
      id: params.id,
      userId: params.userId,
      tier: params.tier,
      status: params.status,
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
      dateOfBirth: params.dateOfBirth ?? null,
      address: params.address ?? null,
      governmentIdType: params.governmentIdType ?? null,
      governmentIdNumber: params.governmentIdNumber ?? null,
      governmentIdImage: params.governmentIdImage ?? null,
      selfieImage: params.selfieImage ?? null,
      verificationData: params.verificationData ?? null,
      verifiedBy: params.verifiedBy ?? null,
      verifiedAt: params.verifiedAt ?? null,
      rejectionReason: params.rejectionReason ?? null,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }
}
