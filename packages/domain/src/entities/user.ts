import type { KycStatus, BrandedKycTier } from "@host/shared";
import type { UserId } from "../value-objects";

import { Schema } from "effect";

import {
  PhoneNumberSchema,
  KycStatusSchema,
  UrlStringSchema,
  FirstNameSchema,
  KycStatusEnum,
  KycTierSchema,
  UserIdSchema,
  EmailSchema,
  KycTierEnum,
} from "@host/shared";

/**
 * User entity representing a user in the system
 */
export class User extends Schema.Class<User>("User")({
  id: Schema.propertySignature(UserIdSchema).annotations({
    description: "Unique identifier for the user",
  }),
  name: FirstNameSchema.annotations({
    description: "User's full name",
  }),
  email: EmailSchema.annotations({
    description: "User's email address",
  }),
  emailVerified: Schema.Boolean.annotations({
    description: "Whether the email has been verified",
  }),
  image: Schema.NullOr(UrlStringSchema).annotations({
    description: "URL to user's profile image",
  }),
  phoneNumber: Schema.NullOr(PhoneNumberSchema).annotations({
    description: "User's phone number",
  }),
  phoneVerified: Schema.Boolean.annotations({
    description: "Whether the phone number has been verified",
  }),
  dateOfBirth: Schema.NullOr(Schema.Date).annotations({
    description: "User's date of birth",
  }),
  kycTier: KycTierSchema.annotations({
    description: "KYC tier level: 0 = Unverified, 1 = Basic, 2 = Full",
  }),
  kycStatus: KycStatusSchema.annotations({
    description: "KYC verification status",
  }),
  kycData: Schema.NullOr(Schema.Unknown).annotations({
    description: "KYC verification data",
  }),
  kycVerifiedAt: Schema.NullOr(Schema.Date).annotations({
    description: "When KYC was verified",
  }),
  biometricEnabled: Schema.Boolean.annotations({
    description: "Whether biometric authentication is enabled",
  }),
  biometricPublicKey: Schema.NullOr(Schema.String).annotations({
    description: "Public key for biometric verification",
  }),
  isActive: Schema.Boolean.annotations({
    description: "Whether the account is active",
  }),
  isSuspended: Schema.Boolean.annotations({
    description: "Whether the account is suspended",
  }),
  suspendedAt: Schema.NullOr(Schema.Date).annotations({
    description: "When the account was suspended",
  }),
  suspensionReason: Schema.NullOr(Schema.String).annotations({
    description: "Reason for account suspension",
  }),
  createdAt: Schema.Date.annotations({
    description: "When the user was created",
  }),
  updatedAt: Schema.Date.annotations({
    description: "When the user was last updated",
  }),
}) {
  /**
   * Create a new User instance
   */
  static create(params: {
    id: UserId;
    name: string;
    email: string;
    emailVerified?: boolean;
    image?: string | null;
    phoneNumber?: string | null;
    phoneVerified?: boolean;
    dateOfBirth?: Date | null;
    kycTier?: BrandedKycTier;
    kycStatus?: KycStatus;
    kycData?: unknown | null;
    kycVerifiedAt?: Date | null;
    biometricEnabled?: boolean;
    biometricPublicKey?: string | null;
    isActive?: boolean;
    isSuspended?: boolean;
    suspendedAt?: Date | null;
    suspensionReason?: string | null;
  }): User {
    const now = new Date();
    return new User({
      id: params.id.value,
      name: params.name,
      email: params.email,
      emailVerified: params.emailVerified ?? false,
      image: params.image ?? null,
      phoneNumber: params.phoneNumber ?? null,
      phoneVerified: params.phoneVerified ?? false,
      dateOfBirth: params.dateOfBirth ?? null,
      kycTier: params.kycTier ?? KycTierSchema.make(KycTierEnum.UNVERIFIED),
      kycStatus:
        params.kycStatus ?? KycStatusSchema.make(KycStatusEnum.PENDING),
      kycData: params.kycData ?? null,
      kycVerifiedAt: params.kycVerifiedAt ?? null,
      biometricEnabled: params.biometricEnabled ?? false,
      biometricPublicKey: params.biometricPublicKey ?? null,
      isActive: params.isActive ?? true,
      isSuspended: params.isSuspended ?? false,
      suspendedAt: params.suspendedAt ?? null,
      suspensionReason: params.suspensionReason ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Check if user has completed KYC at a specific tier
   */
  hasKycTier(tier: number): boolean {
    return this.kycTier >= tier && this.kycStatus === KycStatusEnum.APPROVED;
  }

  /**
   * Check if user's email is verified
   */
  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  /**
   * Check if user's phone is verified
   */
  isPhoneVerified(): boolean {
    return this.phoneVerified;
  }

  /**
   * Check if user account is active and not suspended
   */
  isAccountActive(): boolean {
    return this.isActive && !this.isSuspended;
  }
}
