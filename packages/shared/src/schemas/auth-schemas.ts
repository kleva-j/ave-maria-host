import { Schema } from "effect";

import {
  BiometricDeviceIdSchema,
  ChallengeIdSchema,
  SessionIdSchema,
  DeviceIdSchema,
  UserIdSchema,
} from "./id-schemas";

import {
  KycGovernmentIdTypeSchema,
  BiometricTypeSchema,
  KycStatusSchema,
  KycTierSchema,
} from "./enum-schemas";

import {
  KycGovernmentIdNumberSchema,
  PhoneNumberSchema,
  UrlStringSchema,
  FirstNameSchema,
  IpAddressSchema,
  UserAgentSchema,
  LastNameSchema,
  PasswordSchema,
  AddressSchema,
  EmailSchema,
  TokenSchema,
  DateSchema,
  OtpSchema,
} from "./common-schemas";

/**
 * User schema for Effect programs
 */

export const UserSchema = Schema.Struct({
  id: UserIdSchema,
  name: FirstNameSchema,
  email: EmailSchema,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(UrlStringSchema),
  phoneNumber: Schema.NullOr(PhoneNumberSchema),
  phoneVerified: Schema.Boolean,
  dateOfBirth: Schema.NullOr(DateSchema),
  kycTier: KycTierSchema,
  kycStatus: KycStatusSchema,
  kycData: Schema.NullOr(Schema.Unknown),
  kycVerifiedAt: Schema.NullOr(DateSchema),
  biometricEnabled: Schema.Boolean,
  biometricPublicKey: Schema.NullOr(Schema.String),
  isActive: Schema.Boolean,
  isSuspended: Schema.Boolean,
  suspendedAt: Schema.NullOr(DateSchema),
  suspensionReason: Schema.NullOr(Schema.String),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

export type User = typeof UserSchema.Type;

/**
 * Session schema for Effect programs
 */
export const SessionSchema = Schema.Struct({
  id: SessionIdSchema,
  token: TokenSchema,
  userId: UserIdSchema,
  expiresAt: DateSchema,
  refreshToken: Schema.NullOr(TokenSchema),
  refreshTokenExpiresAt: Schema.NullOr(DateSchema),
  deviceId: Schema.NullOr(DeviceIdSchema),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  ipAddress: IpAddressSchema,
  userAgent: UserAgentSchema,
});

export type Session = typeof SessionSchema.Type;

/**
 * Authentication context containing user and session information
 */
export const AuthContextSchema = Schema.Struct({
  user: UserSchema,
  session: SessionSchema,
});

export type AuthContext = typeof AuthContextSchema.Type;

/**
 * Login credentials schema
 */

export const LoginCredentialsSchema = Schema.Struct({
  email: EmailSchema,
  password: PasswordSchema,
});

export type LoginCredentials = typeof LoginCredentialsSchema.Type;

/**
 * Registration data schema
 */
export const RegisterDataSchema = Schema.Struct({
  name: FirstNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export type RegisterData = typeof RegisterDataSchema.Type;

/**
 * Session creation options
 */
export const SessionOptionsSchema = Schema.Struct({
  ipAddress: Schema.optional(IpAddressSchema),
  userAgent: Schema.optional(UserAgentSchema),
  deviceId: Schema.optional(DeviceIdSchema),
  expiresIn: Schema.optional(Schema.Number), // Duration in seconds
});

export type SessionOptions = typeof SessionOptionsSchema.Type;

/**
 * KYC Tier 1 verification data (Basic)
 */
export const KycTier1DataSchema = Schema.Struct({
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
  dateOfBirth: DateSchema,
  address: AddressSchema,
});

export type KycTier1Data = typeof KycTier1DataSchema.Type;

/**
 * KYC Tier 2 verification data (Full)
 */
export const KycTier2DataSchema = Schema.Struct({
  governmentIdType: KycGovernmentIdTypeSchema,
  governmentIdNumber: KycGovernmentIdNumberSchema,
  governmentIdImage: UrlStringSchema, // Base64 or URL
  selfieImage: UrlStringSchema, // Base64 or URL
});

export type KycTier2Data = typeof KycTier2DataSchema.Type;

/**
 * Phone verification request
 */
export const PhoneVerificationRequestSchema = Schema.Struct({
  phoneNumber: PhoneNumberSchema,
});

export type PhoneVerificationRequest =
  typeof PhoneVerificationRequestSchema.Type;

/**
 * Phone verification confirmation
 */
export const PhoneVerificationConfirmSchema = Schema.Struct({
  phoneNumber: PhoneNumberSchema,
  otp: OtpSchema,
});

export type PhoneVerificationConfirm =
  typeof PhoneVerificationConfirmSchema.Type;

/**
 * Biometric registration data
 */
export const BiometricRegistrationSchema = Schema.Struct({
  userId: UserIdSchema,
  deviceId: DeviceIdSchema,
  deviceName: Schema.String,
  biometricType: BiometricTypeSchema,
  publicKey: Schema.String, // Public key for biometric verification
  enrollmentData: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

export type BiometricRegistration = typeof BiometricRegistrationSchema.Type;

/**
 * Biometric authentication request
 */
export const BiometricAuthRequestSchema = Schema.Struct({
  userId: UserIdSchema,
  deviceId: DeviceIdSchema,
  signature: Schema.String, // Signed challenge
  challenge: Schema.String, // Original challenge
});

export type BiometricAuthRequest = typeof BiometricAuthRequestSchema.Type;

export const BiometricAuthResultSchema = Schema.Struct({
  success: Schema.Boolean,
  confidence: Schema.Number,
  deviceId: DeviceIdSchema,
  authenticatedAt: DateSchema,
  challengeId: ChallengeIdSchema,
});

export type BiometricAuthResult = typeof BiometricAuthResultSchema.Type;

/**
 * Biometric Device Schema
 */
export const BiometricDeviceSchema = Schema.Struct({
  id: BiometricDeviceIdSchema,
  userId: UserIdSchema,
  deviceId: DeviceIdSchema,
  deviceName: Schema.String,
  biometricType: BiometricTypeSchema,
  publicKey: Schema.String,
  isActive: Schema.Boolean,
  lastUsedAt: Schema.optional(DateSchema),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

export type BiometricDevice = typeof BiometricDeviceSchema.Type;

/**
 * Biometric Challenge
 */
export const BiometricChallengeSchema = Schema.Struct({
  challengeId: ChallengeIdSchema,
  challenge: Schema.String,
  expiresAt: DateSchema,
  deviceId: DeviceIdSchema,
  userId: UserIdSchema,
});

export type BiometricChallenge = typeof BiometricChallengeSchema.Type;

/**
 * Refresh token request
 */
export const RefreshTokenRequestSchema = Schema.Struct({
  refreshToken: Schema.String,
});

export type RefreshTokenRequest = typeof RefreshTokenRequestSchema.Type;
