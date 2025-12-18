import type {
  BrandedSessionId,
  BrandedKycTier,
  BrandedUserId,
} from "@host/shared";

import type {
  SessionValidationError,
  SessionExpiredError,
  UserNotFoundError,
  InvalidTokenError,
} from "./errors";

import type { AuthContext } from "./types";

import { createHash, createVerify, randomBytes } from "node:crypto";
import { Effect } from "effect";

import { AuthService } from "./service";
import {
  InsufficientKycTierError,
  AccountSuspendedError,
  UnauthorizedError,
} from "./errors";

/**
 * Utility function to require authentication for an Effect program
 * Extracts token from authorization header and validates it
 */
export const requireAuth = (
  authHeader?: string
): Effect.Effect<
  AuthContext,
  | InvalidTokenError
  | SessionExpiredError
  | UnauthorizedError
  | UserNotFoundError,
  AuthService
> => {
  if (!authHeader) {
    return Effect.fail(
      new UnauthorizedError({
        message: "Authorization header is required",
        action: "authenticate",
      })
    );
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return Effect.fail(
      new UnauthorizedError({
        message: "Bearer token is required",
        action: "authenticate",
      })
    );
  }

  return Effect.flatMap(AuthService, (service) => service.validateToken(token));
};

/**
 * Utility function to require authentication with session ID
 */
export const requireAuthWithSession = (
  sessionId?: string
): Effect.Effect<
  AuthContext,
  | SessionValidationError
  | SessionExpiredError
  | UnauthorizedError
  | UserNotFoundError,
  AuthService
> => {
  if (!sessionId) {
    return Effect.fail(
      new UnauthorizedError({
        message: "Session ID is required",
        action: "authenticate",
      })
    );
  }

  return Effect.flatMap(AuthService, (service) =>
    service.validateSession(sessionId)
  );
};

/**
 * Utility function to check if user has permission for an action
 */
export const requirePermission = (
  userId: string,
  action: string,
  resource?: string
): Effect.Effect<void, UnauthorizedError | UserNotFoundError, AuthService> =>
  Effect.flatMap(AuthService, (service) =>
    Effect.flatMap(
      service.checkPermission(userId, action, resource),
      (hasPermission) =>
        hasPermission
          ? Effect.void
          : Effect.fail(
              new UnauthorizedError({
                message: `User does not have permission to ${action}`,
                action,
                userId,
              })
            )
    )
  );

/**
 * Utility function to extract user ID from auth context
 */
export const extractUserId = (authContext: AuthContext): BrandedUserId =>
  authContext.user.id;

/**
 * Utility function to extract session ID from auth context
 */
export const extractSessionId = (authContext: AuthContext): BrandedSessionId =>
  authContext.session.id;

/**
 * Utility function to check if session is about to expire (within specified minutes)
 */
export const isSessionNearExpiry = (
  authContext: AuthContext,
  minutesThreshold = 30
): boolean => {
  const expiryTime = authContext.session.expiresAt.getTime();
  const thresholdTime = Date.now() + minutesThreshold * 60 * 1000;
  return expiryTime <= thresholdTime;
};

/**
 * Higher-order function to wrap an Effect program with authentication
 */
export const withAuth =
  <A, E, R>(program: (authContext: AuthContext) => Effect.Effect<A, E, R>) =>
  (
    authHeader?: string
  ): Effect.Effect<
    A,
    | E
    | InvalidTokenError
    | SessionExpiredError
    | UnauthorizedError
    | UserNotFoundError,
    R | AuthService
  > =>
    Effect.flatMap(requireAuth(authHeader), program);

/**
 * Higher-order function to wrap an Effect program with authentication and permission check
 */
export const withAuthAndPermission =
  <A, E, R>(action: string, resource?: string) =>
  (program: (authContext: AuthContext) => Effect.Effect<A, E, R>) =>
  (
    authHeader?: string
  ): Effect.Effect<
    A,
    | E
    | InvalidTokenError
    | SessionExpiredError
    | UnauthorizedError
    | UserNotFoundError,
    R | AuthService
  > =>
    Effect.flatMap(
      Effect.tap(requireAuth(authHeader), (authContext) =>
        requirePermission(authContext.user.id, action, resource)
      ),
      program
    );

/**
 * Generate a 6-digit OTP
 */
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a secure refresh token
 */
export const generateRefreshToken = (): string => {
  return randomBytes(32).toString("hex");
};

/**
 * Hash a refresh token for storage
 */
export const hashRefreshToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

/**
 * Verify a biometric signature
 */
export const verifyBiometricSignature = (
  publicKey: string,
  signature: string,
  challenge: string
): Effect.Effect<boolean, Error> => {
  return Effect.try({
    try: () => {
      const verify = createVerify("SHA256");
      verify.update(challenge);
      verify.end();
      return verify.verify(publicKey, signature, "base64");
    },
    catch: (error) => new Error(`Biometric verification failed: ${error}`),
  });
};

/**
 * Generate a challenge for biometric authentication
 */
export const generateBiometricChallenge = (): string => {
  return randomBytes(32).toString("base64");
};

/**
 * Calculate OTP expiration time (5 minutes from now)
 */
export const getOtpExpiration = (): Date => {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 5);
  return expiration;
};

/**
 * Calculate refresh token expiration (30 days from now)
 */
export const getRefreshTokenExpiration = (): Date => {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 30);
  return expiration;
};

/**
 * Validate phone number format (E.164)
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

/**
 * Normalize phone number to E.164 format
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters except leading +
  let normalized = phoneNumber.replace(/[^\d+]/g, "");

  // Add + if not present
  if (!normalized.startsWith("+")) {
    // Assume Nigerian number if no country code
    if (normalized.startsWith("0")) {
      normalized = `+234${normalized.substring(1)}`;
    } else if (normalized.length === 10) {
      normalized = `+234${normalized}`;
    } else {
      normalized = `+${normalized}`;
    }
  }

  return normalized;
};

/**
 * Check if KYC tier is sufficient for operation
 */
export const checkKycTierRequirement = (
  currentTier: number,
  requiredTier: number
): boolean => {
  return currentTier >= requiredTier;
};

/**
 * Get transaction limits based on KYC tier
 */
export const getTransactionLimits = (
  kycTier: BrandedKycTier
): { daily: number; monthly: number; per_transaction: number } => {
  switch (kycTier) {
    case 0: // Unverified
      return { daily: 0, monthly: 0, per_transaction: 0 };
    case 1: // Tier 1 - Basic
      return { daily: 50000, monthly: 500000, per_transaction: 10000 }; // NGN
    case 2: // Tier 2 - Full
      return { daily: 500000, monthly: 5000000, per_transaction: 100000 }; // NGN
    default:
      return { daily: 0, monthly: 0, per_transaction: 0 };
  }
};

/**
 * Utility to require minimum KYC tier for an operation
 */
export const requireKycTier =
  (requiredTier: number, operation: string) =>
  (
    authContext: AuthContext
  ): Effect.Effect<AuthContext, InsufficientKycTierError, never> => {
    if (authContext.user.kycTier < requiredTier) {
      return Effect.fail(
        new InsufficientKycTierError({
          message: `Operation '${operation}' requires KYC Tier ${requiredTier}`,
          userId: authContext.user.id,
          requiredTier,
          currentTier: authContext.user.kycTier,
          operation,
        })
      );
    }
    return Effect.succeed(authContext);
  };

/**
 * Utility to check if account is active and not suspended
 */
export const requireActiveAccount = (
  authContext: AuthContext
): Effect.Effect<
  AuthContext,
  AccountSuspendedError | UnauthorizedError,
  never
> => {
  if (!authContext.user.isActive) {
    return Effect.fail(
      new UnauthorizedError({
        message: "Account is not active",
        action: "access",
        userId: authContext.user.id,
      })
    );
  }

  if (authContext.user.isSuspended) {
    return Effect.fail(
      new AccountSuspendedError({
        message: "Account is suspended",
        userId: authContext.user.id,
        suspendedAt: new Date(), // Should come from user data
        reason: "Account suspended by administrator",
      })
    );
  }

  return Effect.succeed(authContext);
};
