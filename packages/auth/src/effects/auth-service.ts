import type {
  EmailVerificationRateLimitError,
  EmailAlreadyVerifiedError,
  InvalidRefreshTokenError,
  InsufficientKycTierError,
  InvalidCredentialsError,
  EmailVerificationError,
  PhoneVerificationError,
  SessionValidationError,
  AccountSuspendedError,
  SessionCreationError,
  KycVerificationError,
  SessionExpiredError,
  BiometricAuthError,
  InvalidTokenError,
  UserNotFoundError,
  UnauthorizedError,
  InvalidOtpError,
  AuthError,
} from "./auth-errors";

import type {
  BiometricRegistration,
  BiometricAuthRequest,
  LoginCredentials,
  SessionOptions,
  RegisterData,
  KycTier1Data,
  KycTier2Data,
  AuthContext,
  Session,
  User,
} from "./auth-types";

import { Context, type Effect } from "effect";

/**
 * Authentication service interface providing Effect-based authentication operations
 */
export interface AuthService {
  /**
   * Validate a session token and return the authentication context
   */
  readonly validateToken: (
    token: string
  ) => Effect.Effect<
    AuthContext,
    InvalidTokenError | SessionExpiredError | UserNotFoundError
  >;

  /**
   * Validate a session by ID and return the authentication context
   */
  readonly validateSession: (
    sessionId: string
  ) => Effect.Effect<
    AuthContext,
    SessionValidationError | SessionExpiredError | UserNotFoundError
  >;

  /**
   * Create a new session for a user
   */
  readonly createSession: (
    userId: string,
    options?: SessionOptions
  ) => Effect.Effect<Session, SessionCreationError | UserNotFoundError>;

  /**
   * Revoke a session by ID
   */
  readonly revokeSession: (sessionId: string) => Effect.Effect<void, AuthError>;

  /**
   * Revoke all sessions for a user
   */
  readonly revokeAllUserSessions: (
    userId: string
  ) => Effect.Effect<void, AuthError>;

  /**
   * Authenticate user with email and password
   */
  readonly login: (
    credentials: LoginCredentials
  ) => Effect.Effect<AuthContext, InvalidCredentialsError | UserNotFoundError>;

  /**
   * Register a new user
   */
  readonly register: (data: RegisterData) => Effect.Effect<User, AuthError>;

  /**
   * Get user by ID
   */
  readonly getUserById: (
    userId: string
  ) => Effect.Effect<User, UserNotFoundError>;

  /**
   * Get user by email
   */
  readonly getUserByEmail: (
    email: string
  ) => Effect.Effect<User, UserNotFoundError>;

  /**
   * Update user information
   */
  readonly updateUser: (
    userId: string,
    updates: Partial<Pick<User, "name" | "email" | "image">>
  ) => Effect.Effect<User, UserNotFoundError | AuthError>;

  /**
   * Check if user has permission to perform an action
   */
  readonly checkPermission: (
    userId: string,
    action: string,
    resource?: string
  ) => Effect.Effect<boolean, UnauthorizedError | UserNotFoundError>;

  /**
   * Refresh a session (extend expiration)
   */
  readonly refreshSession: (
    sessionId: string
  ) => Effect.Effect<Session, SessionValidationError | SessionExpiredError>;

  /**
   * Get all active sessions for a user
   */
  readonly getUserSessions: (
    userId: string
  ) => Effect.Effect<Session[], UserNotFoundError>;

  /**
   * Refresh an access token using a refresh token
   */
  readonly refreshToken: (
    refreshToken: string
  ) => Effect.Effect<
    { session: Session; user: User },
    InvalidRefreshTokenError | SessionExpiredError | UserNotFoundError
  >;

  /**
   * Request phone verification OTP
   */
  readonly requestPhoneVerification: (
    phoneNumber: string
  ) => Effect.Effect<{ expiresAt: Date }, PhoneVerificationError>;

  /**
   * Verify phone number with OTP
   */
  readonly verifyPhone: (
    phoneNumber: string,
    otp: string
  ) => Effect.Effect<void, InvalidOtpError | PhoneVerificationError>;

  /**
   * Request email verification
   */
  readonly requestEmailVerification: (
    email: string
  ) => Effect.Effect<
    { expiresAt: Date },
    EmailVerificationError | EmailAlreadyVerifiedError
  >;

  /**
   * Verify email with token
   */
  readonly verifyEmail: (
    token: string
  ) => Effect.Effect<void, InvalidTokenError | EmailVerificationError>;

  /**
   * Resend email verification
   */
  readonly resendVerificationEmail: (
    email: string
  ) => Effect.Effect<
    void,
    EmailVerificationError | EmailVerificationRateLimitError
  >;

  /**
   * Submit KYC Tier 1 verification
   */
  readonly submitKycTier1: (
    userId: string,
    data: KycTier1Data
  ) => Effect.Effect<void, KycVerificationError | UserNotFoundError>;

  /**
   * Submit KYC Tier 2 verification
   */
  readonly submitKycTier2: (
    userId: string,
    tier1Data: KycTier1Data,
    tier2Data: KycTier2Data
  ) => Effect.Effect<void, KycVerificationError | UserNotFoundError>;

  /**
   * Check if user meets required KYC tier
   */
  readonly checkKycTier: (
    userId: string,
    requiredTier: number
  ) => Effect.Effect<boolean, InsufficientKycTierError | UserNotFoundError>;

  /**
   * Register biometric authentication for a device
   */
  readonly registerBiometric: (
    userId: string,
    registration: BiometricRegistration
  ) => Effect.Effect<void, BiometricAuthError | UserNotFoundError>;

  /**
   * Authenticate using biometric
   */
  readonly authenticateBiometric: (
    request: BiometricAuthRequest
  ) => Effect.Effect<
    AuthContext,
    BiometricAuthError | UserNotFoundError | AccountSuspendedError
  >;

  /**
   * Disable biometric authentication for a device
   */
  readonly disableBiometric: (
    userId: string,
    deviceId: string
  ) => Effect.Effect<void, BiometricAuthError | UserNotFoundError>;
}

/**
 * Context tag for the AuthService
 */
export const AuthService = Context.GenericTag<AuthService>(
  "@host/auth/AuthService"
);

/**
 * Type alias for AuthService dependency
 */
export type AuthServiceDeps = typeof AuthService.Service;
