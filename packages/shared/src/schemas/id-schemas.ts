import { UuidSchema } from "./common-schemas";
import { Schema } from "effect";

/**
 * Schema for UserId validation
 */
export const UserIdSchema = UuidSchema.pipe(Schema.brand("UserId"));

/**
 * Schema for SessionId validation
 */
export const SessionIdSchema = UuidSchema.pipe(Schema.brand("SessionId"));

/**
 * Schema for AccountId validation
 */
export const AccountIdSchema = UuidSchema.pipe(Schema.brand("AccountId"));

/**
 * Schema for RoleId validation
 */
export const RoleIdSchema = UuidSchema.pipe(Schema.brand("RoleId"));

/**
 * Schema for PermissionId validation
 */
export const PermissionIdSchema = UuidSchema.pipe(Schema.brand("PermissionId"));

/**
 * Define BiometricAuthId brand schema
 */
export const BiometricAuthIdSchema = UuidSchema.pipe(
  Schema.brand("BiometricAuthId")
);

/**
 * Device id Schema
 */
export const DeviceIdSchema = UuidSchema.pipe(Schema.brand("DeviceId"));

/**
 * Challenge id Schema
 */
export const ChallengeIdSchema = UuidSchema.pipe(
  Schema.brand("BiometricChallengeId")
);

/**
 * Biometric Device id Schema
 */
export const BiometricDeviceIdSchema = UuidSchema.pipe(
  Schema.brand("BiometricDeviceId")
);

/**
 * PlanId value object representing a unique identifier for savings plans
 */
export const PlanIdSchema = UuidSchema.pipe(Schema.brand("PlanId"));

/**
 * KycVerificationId value object representing a unique identifier for KYC verifications
 */
export const KycVerificationIdSchema = UuidSchema.pipe(
  Schema.brand("KycVerificationId")
);

// Types
export type UserId = typeof UserIdSchema.Type;
export type RoleId = typeof RoleIdSchema.Type;
export type PlanId = typeof PlanIdSchema.Type;
export type DeviceId = typeof DeviceIdSchema.Type;
export type AccountId = typeof AccountIdSchema.Type;
export type SessionId = typeof SessionIdSchema.Type;
export type ChallengeId = typeof ChallengeIdSchema.Type;
export type PermissionId = typeof PermissionIdSchema.Type;
export type BiometricAuthId = typeof BiometricAuthIdSchema.Type;
export type KycVerificationId = typeof KycVerificationIdSchema.Type;
export type BiometricDeviceId = typeof BiometricDeviceIdSchema.Type;
