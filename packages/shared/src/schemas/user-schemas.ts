// User and Authentication Validation Schemas using Effect Schema
// Input/output schemas for user management and KYC operations

import { Schema } from "effect";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for user registration
 */
export class RegisterUserSchema extends Schema.Class<RegisterUserSchema>(
  "RegisterUserSchema"
)({
  phoneNumber: Schema.String.pipe(
    Schema.pattern(/^\+?[1-9]\d{1,14}$/, {
      message: () => "Invalid phone number format",
    })
  ),
  email: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
        message: () => "Invalid email format",
      })
    )
  ),
  password: Schema.String.pipe(
    Schema.minLength(8, {
      message: () => "Password must be at least 8 characters",
    }),
    Schema.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: () => "Password must contain uppercase, lowercase, and number",
    })
  ),
  firstName: Schema.String.pipe(
    Schema.minLength(1, { message: () => "First name is required" }),
    Schema.maxLength(100, {
      message: () => "First name must not exceed 100 characters",
    }),
    Schema.trimmed()
  ),
  lastName: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Last name is required" }),
    Schema.maxLength(100, {
      message: () => "Last name must not exceed 100 characters",
    }),
    Schema.trimmed()
  ),
}) {}

export type RegisterUserInput = Schema.Schema.Type<typeof RegisterUserSchema>;

/**
 * Schema for Tier 1 KYC submission (basic verification)
 */
export class SubmitTier1KycSchema extends Schema.Class<SubmitTier1KycSchema>(
  "SubmitTier1KycSchema"
)({
  dateOfBirth: Schema.DateTimeUtc,
  address: Schema.String.pipe(
    Schema.minLength(10, {
      message: () => "Address must be at least 10 characters",
    }),
    Schema.maxLength(200, {
      message: () => "Address must not exceed 200 characters",
    })
  ),
  city: Schema.String.pipe(
    Schema.minLength(1, { message: () => "City is required" }),
    Schema.maxLength(100)
  ),
  state: Schema.String.pipe(
    Schema.minLength(1, { message: () => "State is required" }),
    Schema.maxLength(100)
  ),
  postalCode: Schema.optional(Schema.String.pipe(Schema.maxLength(20))),
  country: Schema.String.pipe(
    Schema.pattern(/^[A-Z]{2}$/, {
      message: () => "Country must be a 2-letter ISO code",
    })
  ),
}) {}

export type SubmitTier1KycInput = Schema.Schema.Type<
  typeof SubmitTier1KycSchema
>;

/**
 * Schema for Tier 2 KYC submission (full verification with ID)
 */
export class SubmitTier2KycSchema extends Schema.Class<SubmitTier2KycSchema>(
  "SubmitTier2KycSchema"
)({
  idType: Schema.Literal(
    "national_id",
    "drivers_license",
    "passport",
    "voters_card"
  ).pipe(
    Schema.annotations({
      description: "Type of government-issued ID",
    })
  ),
  idNumber: Schema.String.pipe(
    Schema.minLength(5, { message: () => "ID number is required" }),
    Schema.maxLength(50, {
      message: () => "ID number must not exceed 50 characters",
    })
  ),
  idExpiryDate: Schema.optional(Schema.DateTimeUtc),
  bvn: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^\d{11}$/, {
        message: () => "BVN must be exactly 11 digits",
      })
    )
  ),
  idDocumentUrl: Schema.String.pipe(
    Schema.pattern(/^https?:\/\/.+/, {
      message: () => "Invalid document URL",
    })
  ),
  selfieUrl: Schema.String.pipe(
    Schema.pattern(/^https?:\/\/.+/, {
      message: () => "Invalid selfie URL",
    })
  ),
}) {}

export type SubmitTier2KycInput = Schema.Schema.Type<
  typeof SubmitTier2KycSchema
>;

/**
 * Schema for updating user profile
 */
export class UpdateProfileSchema extends Schema.Class<UpdateProfileSchema>(
  "UpdateProfileSchema"
)({
  firstName: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
  ),
  lastName: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
  ),
  email: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
        message: () => "Invalid email format",
      })
    )
  ),
  phoneNumber: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^\+?[1-9]\d{1,14}$/, {
        message: () => "Invalid phone number format",
      })
    )
  ),
}) {}

export type UpdateProfileInput = Schema.Schema.Type<typeof UpdateProfileSchema>;

/**
 * Schema for changing password
 */
export class ChangePasswordSchema extends Schema.Class<ChangePasswordSchema>(
  "ChangePasswordSchema"
)({
  currentPassword: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Current password is required" })
  ),
  newPassword: Schema.String.pipe(
    Schema.minLength(8, {
      message: () => "Password must be at least 8 characters",
    }),
    Schema.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: () => "Password must contain uppercase, lowercase, and number",
    })
  ),
}) {}

export type ChangePasswordInput = Schema.Schema.Type<
  typeof ChangePasswordSchema
>;

/**
 * Schema for enabling biometric authentication
 */
export class EnableBiometricSchema extends Schema.Class<EnableBiometricSchema>(
  "EnableBiometricSchema"
)({
  biometricType: Schema.Literal("fingerprint", "face_id", "iris").pipe(
    Schema.annotations({
      description: "Type of biometric authentication",
    })
  ),
  publicKey: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Public key is required" })
  ),
  deviceId: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Device ID is required" })
  ),
}) {}

export type EnableBiometricInput = Schema.Schema.Type<
  typeof EnableBiometricSchema
>;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for user profile data
 */
export class UserProfileSchema extends Schema.Class<UserProfileSchema>(
  "UserProfileSchema"
)({
  id: Schema.UUID,
  phoneNumber: Schema.String,
  email: Schema.NullOr(Schema.String),
  firstName: Schema.String,
  lastName: Schema.String,
  dateOfBirth: Schema.NullOr(Schema.DateTimeUtc),
  kycTier: Schema.Number.pipe(Schema.int(), Schema.between(0, 2)),
  kycStatus: Schema.Literal("pending", "approved", "rejected", "under_review"),
  isActive: Schema.Boolean,
  hasBiometric: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

export type UserProfile = Schema.Schema.Type<typeof UserProfileSchema>;

/**
 * Schema for KYC submission response
 */
export class KycSubmissionOutputSchema extends Schema.Class<KycSubmissionOutputSchema>(
  "KycSubmissionOutputSchema"
)({
  status: Schema.Literal("success", "error"),
  kycTier: Schema.Number.pipe(Schema.int()),
  message: Schema.String,
  reviewStatus: Schema.Literal(
    "pending",
    "approved",
    "rejected",
    "under_review"
  ),
}) {}

export type KycSubmissionOutput = Schema.Schema.Type<
  typeof KycSubmissionOutputSchema
>;

/**
 * Schema for user registration response
 */
export class RegisterUserOutputSchema extends Schema.Class<RegisterUserOutputSchema>(
  "RegisterUserOutputSchema"
)({
  userId: Schema.UUID,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
  requiresOtpVerification: Schema.Boolean,
}) {}

export type RegisterUserOutput = Schema.Schema.Type<
  typeof RegisterUserOutputSchema
>;

/**
 * Schema for profile update response
 */
export class UpdateProfileOutputSchema extends Schema.Class<UpdateProfileOutputSchema>(
  "UpdateProfileOutputSchema"
)({
  status: Schema.Literal("success", "error"),
  message: Schema.String,
  profile: UserProfileSchema,
}) {}

export type UpdateProfileOutput = Schema.Schema.Type<
  typeof UpdateProfileOutputSchema
>;

/**
 * Schema for KYC limits based on tier
 */
export class KycLimitsSchema extends Schema.Class<KycLimitsSchema>(
  "KycLimitsSchema"
)({
  tier: Schema.Number.pipe(Schema.int(), Schema.between(0, 2)),
  dailyTransactionLimit: Schema.Number,
  monthlyTransactionLimit: Schema.Number,
  maxSavingsPlans: Schema.Number.pipe(Schema.int()),
  canJoinGroups: Schema.Boolean,
  canCreateGroups: Schema.Boolean,
  withdrawalLimit: Schema.Number,
}) {}

export type KycLimits = Schema.Schema.Type<typeof KycLimitsSchema>;

/**
 * Schema for user statistics
 */
export class UserStatisticsSchema extends Schema.Class<UserStatisticsSchema>(
  "UserStatisticsSchema"
)({
  totalSaved: Schema.Number,
  activePlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  completedPlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  totalContributions: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  currentStreak: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  longestStreak: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  groupMemberships: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  totalInterestEarned: Schema.Number,
}) {}

export type UserStatistics = Schema.Schema.Type<typeof UserStatisticsSchema>;
