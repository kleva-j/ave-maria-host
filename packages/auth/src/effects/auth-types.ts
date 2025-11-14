import { Schema } from "@effect/schema";

/**
 * User schema for Effect programs
 */
const name = Schema.String.pipe(Schema.minLength(1));
const password = Schema.String.pipe(Schema.minLength(8));
const email = Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
const phoneNumber = Schema.String.pipe(Schema.pattern(/^\+?[1-9]\d{1,14}$/)); // E.164 format
const ipAddress = Schema.NullOr(Schema.String);
const userAgent = Schema.NullOr(Schema.String);

// KYC tier enum: 0 = Unverified, 1 = Basic (Tier 1), 2 = Full (Tier 2)
export const KycTierSchema = Schema.Literal(0, 1, 2);
export type KycTier = typeof KycTierSchema.Type;

// KYC status enum
export const KycStatusSchema = Schema.Literal(
  "pending",
  "approved",
  "rejected",
  "under_review"
);
export type KycStatus = typeof KycStatusSchema.Type;

export const UserSchema = Schema.Struct({
  id: Schema.String,
  name,
  email,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(Schema.String),
  phoneNumber: Schema.NullOr(Schema.String),
  phoneVerified: Schema.Boolean,
  dateOfBirth: Schema.NullOr(Schema.Date),
  kycTier: KycTierSchema,
  kycStatus: KycStatusSchema,
  kycVerifiedAt: Schema.NullOr(Schema.Date),
  biometricEnabled: Schema.Boolean,
  isActive: Schema.Boolean,
  isSuspended: Schema.Boolean,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export type User = typeof UserSchema.Type;

/**
 * Session schema for Effect programs
 */
export const SessionSchema = Schema.Struct({
  id: Schema.String,
  token: Schema.String,
  userId: Schema.String,
  expiresAt: Schema.Date,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  ipAddress,
  userAgent,
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
  email,
  password,
});

export type LoginCredentials = typeof LoginCredentialsSchema.Type;

/**
 * Registration data schema
 */
export const RegisterDataSchema = Schema.Struct({
  name,
  email,
  password,
});

export type RegisterData = typeof RegisterDataSchema.Type;

/**
 * Session creation options
 */
export const SessionOptionsSchema = Schema.Struct({
  ipAddress: Schema.optional(ipAddress),
  userAgent: Schema.optional(userAgent),
  deviceId: Schema.optional(Schema.String),
  expiresIn: Schema.optional(Schema.Number), // Duration in seconds
});

export type SessionOptions = typeof SessionOptionsSchema.Type;

/**
 * KYC Tier 1 verification data (Basic)
 */
export const KycTier1DataSchema = Schema.Struct({
  firstName: Schema.String.pipe(Schema.minLength(1)),
  lastName: Schema.String.pipe(Schema.minLength(1)),
  dateOfBirth: Schema.Date,
  address: Schema.String.pipe(Schema.minLength(10)),
});

export type KycTier1Data = typeof KycTier1DataSchema.Type;

/**
 * KYC Tier 2 verification data (Full)
 */
export const KycTier2DataSchema = Schema.Struct({
  governmentIdType: Schema.Literal(
    "NIN",
    "BVN",
    "Passport",
    "DriversLicense",
    "VotersCard"
  ),
  governmentIdNumber: Schema.String.pipe(Schema.minLength(5)),
  governmentIdImage: Schema.String, // Base64 or URL
  selfieImage: Schema.String, // Base64 or URL
});

export type KycTier2Data = typeof KycTier2DataSchema.Type;

/**
 * Phone verification request
 */
export const PhoneVerificationRequestSchema = Schema.Struct({
  phoneNumber,
});

export type PhoneVerificationRequest =
  typeof PhoneVerificationRequestSchema.Type;

/**
 * Phone verification confirmation
 */
export const PhoneVerificationConfirmSchema = Schema.Struct({
  phoneNumber,
  otp: Schema.String.pipe(Schema.pattern(/^\d{6}$/)),
});

export type PhoneVerificationConfirm =
  typeof PhoneVerificationConfirmSchema.Type;

/**
 * Biometric registration data
 */
export const BiometricRegistrationSchema = Schema.Struct({
  deviceId: Schema.String,
  deviceName: Schema.String,
  publicKey: Schema.String, // Public key for biometric verification
});

export type BiometricRegistration = typeof BiometricRegistrationSchema.Type;

/**
 * Biometric authentication request
 */
export const BiometricAuthRequestSchema = Schema.Struct({
  userId: Schema.String,
  deviceId: Schema.String,
  signature: Schema.String, // Signed challenge
  challenge: Schema.String, // Original challenge
});

export type BiometricAuthRequest = typeof BiometricAuthRequestSchema.Type;

/**
 * Refresh token request
 */
export const RefreshTokenRequestSchema = Schema.Struct({
  refreshToken: Schema.String,
});

export type RefreshTokenRequest = typeof RefreshTokenRequestSchema.Type;
