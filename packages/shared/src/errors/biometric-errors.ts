import { Data } from "effect";

/**
 * Biometric Error Type Constants
 */
export const BiometricErrorType = {
  INSUFFICIENT_CONFIDENCE: "INSUFFICIENT_CONFIDENCE",
  DEVICE_OPERATION_ERROR: "DEVICE_OPERATION_ERROR",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  CHALLENGE_EXPIRED: "CHALLENGE_EXPIRED",
  ENROLLMENT_FAILED: "ENROLLMENT_FAILED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  DEVICE_DISABLED: "DEVICE_DISABLED",
  OPERATION_ERROR: "OPERATION_ERROR",
} as const;

export type BiometricErrorType =
  (typeof BiometricErrorType)[keyof typeof BiometricErrorType];

/**
 * Base Biometric Validation Error
 * Used for validation failures with specific error types
 */
export class BiometricValidationError extends Data.TaggedError(
  "BiometricValidationError"
)<{
  readonly type: BiometricErrorType;
  readonly message: string;
  readonly field?: string | undefined;
  readonly context?: {
    readonly deviceId?: string | undefined;
    readonly challengeId?: string | undefined;
    readonly operation?: string | undefined;
    readonly code?: string | undefined;
  };
}> {}

/**
 * General Biometric Operation Error
 * Used for system-level or operational failures
 */
export class BiometricOperationError extends Data.TaggedError(
  "BiometricOperationError"
)<{
  readonly message: string;
  readonly code?: string | undefined;
  readonly cause?: unknown;
}> {}

/**
 * Union type for all biometric-related errors
 */
export type BiometricError = BiometricValidationError | BiometricOperationError;

/**
 * Helper functions to create specific biometric validation errors
 */
export const createBiometricValidationError = {
  deviceNotFound: (
    deviceId: string,
    operation: string
  ): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.DEVICE_NOT_FOUND,
      message: `Biometric device not found: ${deviceId}`,
      context: { deviceId, operation },
    }),

  deviceDisabled: (deviceId: string): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.DEVICE_DISABLED,
      message: `Biometric device is disabled: ${deviceId}`,
      context: { deviceId },
    }),

  deviceOperationError: (
    operation: string,
    message: string,
    deviceId?: string
  ): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.DEVICE_OPERATION_ERROR,
      message,
      context: { operation, deviceId },
    }),

  invalidSignature: (challengeId: string): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.INVALID_SIGNATURE,
      message: `Invalid biometric signature for challenge: ${challengeId}`,
      context: { challengeId },
    }),

  challengeExpired: (challengeId: string): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.CHALLENGE_EXPIRED,
      message: `Biometric challenge has expired: ${challengeId}`,
      context: { challengeId },
    }),

  insufficientConfidence: (challengeId: string): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.INSUFFICIENT_CONFIDENCE,
      message: `Biometric verification confidence is insufficient: ${challengeId}`,
      context: { challengeId },
    }),

  enrollmentFailed: (
    message: string,
    deviceId?: string
  ): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.ENROLLMENT_FAILED,
      message,
      context: { deviceId },
    }),

  validationError: (
    message: string,
    field?: string
  ): BiometricValidationError =>
    new BiometricValidationError({
      type: BiometricErrorType.VALIDATION_ERROR,
      message,
      field,
    }),
};
