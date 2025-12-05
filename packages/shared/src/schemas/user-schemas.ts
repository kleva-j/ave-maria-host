// User and Authentication Validation Schemas using Effect Schema
// Input/output schemas for user management and KYC operations

import { Schema } from "effect";

import {
  BiometricTypeSchema,
  KycIdNumberSchema,
  PhoneNumberSchema,
  CountryCodeSchema,
  PostalCodeSchema,
  KycIdTypeSchema,
  KycStatusSchema,
  FirstNameSchema,
  PasswordSchema,
  LastNameSchema,
  DateTimeSchema,
  KycTierSchema,
  AddressSchema,
  UserIdSchema,
  StateSchema,
  EmailSchema,
  CitySchema,
  BvnSchema,
  UrlSchema,
} from "./common-schemas";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for user registration
 */
export class RegisterUserSchema extends Schema.Class<RegisterUserSchema>(
  "RegisterUserSchema"
)({
  phoneNumber: PhoneNumberSchema,
  email: Schema.optional(EmailSchema), // Optional email for registration
  password: PasswordSchema,
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
}) {}

export type RegisterUserInput = typeof RegisterUserSchema.Type;

/**
 * Schema for Tier 1 KYC submission (basic verification)
 */
export class SubmitTier1KycSchema extends Schema.Class<SubmitTier1KycSchema>(
  "SubmitTier1KycSchema"
)({
  dateOfBirth: DateTimeSchema,
  address: AddressSchema,
  city: CitySchema,
  state: StateSchema,
  postalCode: Schema.optional(PostalCodeSchema),
  country: CountryCodeSchema,
}) {}

export type SubmitTier1KycInput = typeof SubmitTier1KycSchema.Type;

/**
 * Schema for Tier 2 KYC submission (full verification with ID)
 */
export class SubmitTier2KycSchema extends Schema.Class<SubmitTier2KycSchema>(
  "SubmitTier2KycSchema"
)({
  idType: KycIdTypeSchema,
  idNumber: KycIdNumberSchema,
  idExpiryDate: Schema.optional(DateTimeSchema),
  bvn: Schema.optional(BvnSchema),
  idDocumentUrl: UrlSchema,
  selfieUrl: UrlSchema,
}) {}

export type SubmitTier2KycInput = typeof SubmitTier2KycSchema.Type;

/**
 * Schema for updating user profile
 */
export class UpdateProfileSchema extends Schema.Class<UpdateProfileSchema>(
  "UpdateProfileSchema"
)({
  firstName: Schema.optional(FirstNameSchema),
  lastName: Schema.optional(LastNameSchema),
  email: Schema.optional(EmailSchema),
  phoneNumber: Schema.optional(PhoneNumberSchema),
}) {}

export type UpdateProfileInput = typeof UpdateProfileSchema.Type;

/**
 * Schema for changing password
 */
export class ChangePasswordSchema extends Schema.Class<ChangePasswordSchema>(
  "ChangePasswordSchema"
)({
  currentPassword: PasswordSchema,
  newPassword: PasswordSchema,
}) {}

export type ChangePasswordInput = typeof ChangePasswordSchema.Type;

/**
 * Schema for enabling biometric authentication
 */
export class EnableBiometricSchema extends Schema.Class<EnableBiometricSchema>(
  "EnableBiometricSchema"
)({
  biometricType: BiometricTypeSchema,
  publicKey: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Public key is required" })
  ),
  deviceId: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Device ID is required" })
  ),
}) {}

export type EnableBiometricInput = typeof EnableBiometricSchema.Type;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for user profile data
 */
export class UserProfileSchema extends Schema.Class<UserProfileSchema>(
  "UserProfileSchema"
)({
  id: UserIdSchema,
  phoneNumber: PhoneNumberSchema,
  email: Schema.NullOr(EmailSchema),
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
  dateOfBirth: Schema.NullOr(DateTimeSchema),
  kycTier: KycTierSchema,
  kycStatus: KycStatusSchema,
  isActive: Schema.Boolean,
  hasBiometric: Schema.Boolean,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
}) {}

export type UserProfile = typeof UserProfileSchema.Type;

/**
 * Schema for KYC submission response
 */
export class KycSubmissionOutputSchema extends Schema.Class<KycSubmissionOutputSchema>(
  "KycSubmissionOutputSchema"
)({
  status: Schema.Literal("success", "error"),
  kycTier: KycTierSchema,
  message: Schema.String,
  reviewStatus: KycStatusSchema,
}) {}

export type KycSubmissionOutput = typeof KycSubmissionOutputSchema.Type;

/**
 * Schema for user registration response
 */
export class RegisterUserOutputSchema extends Schema.Class<RegisterUserOutputSchema>(
  "RegisterUserOutputSchema"
)({
  userId: UserIdSchema,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
  requiresOtpVerification: Schema.Boolean,
}) {}

export type RegisterUserOutput = typeof RegisterUserOutputSchema.Type;

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

export type UpdateProfileOutput = typeof UpdateProfileOutputSchema.Type;

/**
 * Schema for KYC limits based on tier
 */
export class KycLimitsSchema extends Schema.Class<KycLimitsSchema>(
  "KycLimitsSchema"
)({
  tier: KycTierSchema,
  dailyTransactionLimit: Schema.Number.pipe(Schema.int()),
  monthlyTransactionLimit: Schema.Number.pipe(Schema.int()),
  maxSavingsPlans: Schema.Number.pipe(Schema.int()),
  canJoinGroups: Schema.Boolean,
  canCreateGroups: Schema.Boolean,
  withdrawalLimit: Schema.Number.pipe(Schema.int()),
}) {}

export type KycLimits = typeof KycLimitsSchema.Type;

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

export type UserStatistics = typeof UserStatisticsSchema.Type;
