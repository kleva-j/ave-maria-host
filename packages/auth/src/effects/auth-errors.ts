import { Data } from "effect";

/**
 * Base authentication error class for all auth-related errors
 */
export class AuthError extends Data.TaggedError("AuthError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when an invalid token is provided
 */
export class InvalidTokenError extends Data.TaggedError("InvalidTokenError")<{
  readonly message: string;
  readonly token?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when a session has expired
 */
export class SessionExpiredError extends Data.TaggedError("SessionExpiredError")<{
  readonly message: string;
  readonly sessionId: string;
  readonly expiredAt: Date;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when a user is not found
 */
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly message: string;
  readonly userId?: string;
  readonly email?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when authentication credentials are invalid
 */
export class InvalidCredentialsError extends Data.TaggedError("InvalidCredentialsError")<{
  readonly message: string;
  readonly email?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when a user is not authorized to perform an action
 */
export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string;
  readonly action: string;
  readonly userId?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when session creation fails
 */
export class SessionCreationError extends Data.TaggedError("SessionCreationError")<{
  readonly message: string;
  readonly userId: string;
  readonly reason?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when session validation fails
 */
export class SessionValidationError extends Data.TaggedError("SessionValidationError")<{
  readonly message: string;
  readonly sessionId?: string;
  readonly token?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when KYC verification fails
 */
export class KycVerificationError extends Data.TaggedError("KycVerificationError")<{
  readonly message: string;
  readonly userId: string;
  readonly tier: number;
  readonly reason?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when user doesn't meet required KYC tier
 */
export class InsufficientKycTierError extends Data.TaggedError("InsufficientKycTierError")<{
  readonly message: string;
  readonly userId: string;
  readonly requiredTier: number;
  readonly currentTier: number;
  readonly operation: string;
}> {}

/**
 * Error thrown when phone verification fails
 */
export class PhoneVerificationError extends Data.TaggedError("PhoneVerificationError")<{
  readonly message: string;
  readonly phoneNumber: string;
  readonly reason?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when OTP is invalid
 */
export class InvalidOtpError extends Data.TaggedError("InvalidOtpError")<{
  readonly message: string;
  readonly phoneNumber: string;
  readonly attemptsRemaining: number;
}> {}

/**
 * Error thrown when biometric authentication fails
 */
export class BiometricAuthError extends Data.TaggedError("BiometricAuthError")<{
  readonly message: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly reason?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when refresh token is invalid
 */
export class InvalidRefreshTokenError extends Data.TaggedError("InvalidRefreshTokenError")<{
  readonly message: string;
  readonly token?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when account is suspended
 */
export class AccountSuspendedError extends Data.TaggedError("AccountSuspendedError")<{
  readonly message: string;
  readonly userId: string;
  readonly suspendedAt: Date;
  readonly reason?: string;
}> {}
