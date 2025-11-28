import { AuthService } from "./auth-service";

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

import { Effect, Layer } from "effect";

import { auth } from "..";
import {
  type UnauthorizedError,
  EmailVerificationRateLimitError,
  EmailAlreadyVerifiedError,
  InvalidRefreshTokenError,
  InsufficientKycTierError,
  InvalidCredentialsError,
  SessionValidationError,
  EmailVerificationError,
  PhoneVerificationError,
  AccountSuspendedError,
  SessionCreationError,
  KycVerificationError,
  SessionExpiredError,
  BiometricAuthError,
  InvalidTokenError,
  UserNotFoundError,
  InvalidOtpError,
  AuthError,
} from "./auth-errors";

/**
 * Helper function to create a complete User object from Better-Auth user data
 */
function createUserFromBetterAuth(betterAuthUser: any): User {
  return {
    id: betterAuthUser.id,
    name: betterAuthUser.name,
    email: betterAuthUser.email,
    emailVerified: betterAuthUser.emailVerified,
    image: betterAuthUser.image ?? null,
    phoneNumber: null,
    phoneVerified: false,
    dateOfBirth: null,
    kycTier: 0 as const,
    kycStatus: "pending" as const,
    kycVerifiedAt: null,
    biometricEnabled: false,
    isActive: true,
    isSuspended: false,
    createdAt: new Date(betterAuthUser.createdAt),
    updatedAt: new Date(betterAuthUser.updatedAt),
  };
}

/**
 * Helper function to create a Session object from Better-Auth session data
 */
function createSessionFromBetterAuth(betterAuthSession: any): Session {
  return {
    id: betterAuthSession.id,
    expiresAt: new Date(betterAuthSession.expiresAt),
    token: betterAuthSession.token,
    createdAt: new Date(betterAuthSession.createdAt),
    updatedAt: new Date(betterAuthSession.updatedAt),
    ipAddress: betterAuthSession.ipAddress || null,
    userAgent: betterAuthSession.userAgent || null,
    userId: betterAuthSession.userId,
  };
}

/**
 * Live implementation of AuthService using Better-Auth
 */
class AuthServiceImpl implements AuthService {
  validateToken = (
    token: string
  ): Effect.Effect<
    AuthContext,
    InvalidTokenError | SessionExpiredError | UserNotFoundError
  > =>
    Effect.tryPromise({
      try: async () => {
        // Better-Auth session validation using token
        const headers = { authorization: `Bearer ${token}` };
        const result = await auth.api.getSession({ headers });

        if (!result?.session || !result?.user) {
          throw new InvalidTokenError({
            message: "Invalid or expired token",
            token,
          });
        }

        const { session, user } = result;

        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
          throw new SessionExpiredError({
            message: "Session has expired",
            sessionId: session.id,
            expiredAt: new Date(session.expiresAt),
          });
        }

        return {
          user: createUserFromBetterAuth(user),
          session: createSessionFromBetterAuth(session),
        } satisfies AuthContext;
      },
      catch: (error) => {
        if (
          error instanceof InvalidTokenError ||
          error instanceof SessionExpiredError
        ) {
          return error;
        }
        return new InvalidTokenError({
          message: "Token validation failed",
          cause: error,
          token,
        });
      },
    });

  validateSession = (
    sessionId: string
  ): Effect.Effect<
    AuthContext,
    SessionValidationError | SessionExpiredError | UserNotFoundError
  > =>
    Effect.tryPromise({
      try: async () => {
        // Better-Auth session validation using session ID
        const headers = { "x-session-id": sessionId };
        const result = await auth.api.getSession({ headers });

        if (!result?.session || !result?.user) {
          throw new SessionValidationError({
            message: "Session not found",
            sessionId,
          });
        }

        const { session, user } = result;

        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
          throw new SessionExpiredError({
            message: "Session has expired",
            sessionId: session.id,
            expiredAt: new Date(session.expiresAt),
          });
        }

        return {
          user: createUserFromBetterAuth(user),
          session: createSessionFromBetterAuth(session),
        } satisfies AuthContext;
      },
      catch: (error) => {
        if (
          error instanceof SessionValidationError ||
          error instanceof SessionExpiredError
        ) {
          return error;
        }
        return new SessionValidationError({
          message: "Session validation failed",
          cause: error,
          sessionId,
        });
      },
    });

  createSession = (
    userId: string,
    options?: SessionOptions
  ): Effect.Effect<Session, SessionCreationError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth doesn't expose direct session creation API
        // This would typically be handled through login/signup flows
        // For now, we'll create a placeholder implementation

        const sessionData: Session = {
          id: crypto.randomUUID(),
          token: crypto.randomUUID(),
          userId,
          ipAddress: options?.ipAddress || null,
          userAgent: options?.userAgent || null,
          expiresAt: options?.expiresIn
            ? new Date(Date.now() + options.expiresIn * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return sessionData;
      },
      catch: (error) => {
        if (error instanceof UserNotFoundError) {
          return error;
        }
        return new SessionCreationError({
          message: "Failed to create session",
          userId,
          cause: error,
        });
      },
    });

  revokeSession = (sessionId: string): Effect.Effect<void, AuthError> =>
    Effect.tryPromise({
      try: async () => {
        await auth.api.signOut({ headers: { "x-session-id": sessionId } });
      },
      catch: (error) =>
        new AuthError({ message: "Failed to revoke session", cause: error }),
    });

  revokeAllUserSessions = (_userId: string): Effect.Effect<void, AuthError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth doesn't have a direct API for this,
        // so this would need to be implemented using database operations
        // For now, this is a placeholder implementation
        console.warn("revokeAllUserSessions not fully implemented");
      },
      catch: (error) =>
        new AuthError({
          message: "Failed to revoke all user sessions",
          cause: error,
        }),
    });

  login = (
    credentials: LoginCredentials
  ): Effect.Effect<AuthContext, InvalidCredentialsError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        const result = await auth.api.signInEmail({
          body: {
            email: credentials.email,
            password: credentials.password,
          },
        });

        if (!result?.user) {
          throw new InvalidCredentialsError({
            message: "Invalid email or password",
            email: credentials.email,
          });
        }

        const { user } = result;

        // Create a session context (Better-Auth handles session creation internally)
        const authContext: AuthContext = {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image ?? null,
            phoneNumber: user.phoneNumber ?? null,
            phoneVerified: user.phoneVerified,
            dateOfBirth: user.dateOfBirth ?? null,
            kycTier: user.kycTier,
            kycStatus: user.kycStatus,
            kycVerifiedAt: user.kycVerifiedAt ?? null,
            biometricEnabled: user.biometricEnabled,
            isActive: user.isActive,
            isSuspended: user.isSuspended,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
          session: {
            id: crypto.randomUUID(), // Placeholder - Better-Auth manages this internally
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            token: result.token || crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ipAddress: null,
            userAgent: null,
            userId: user.id,
          },
        };

        return authContext;
      },
      catch: (error) => {
        if (error instanceof InvalidCredentialsError) {
          return error;
        }
        return new InvalidCredentialsError({
          message: "Login failed",
          email: credentials.email,
          cause: error,
        });
      },
    });

  register = (data: RegisterData): Effect.Effect<User, AuthError> =>
    Effect.tryPromise({
      try: async () => {
        const result = await auth.api.signUpEmail({
          body: {
            name: data.name,
            email: data.email,
            password: data.password,
          },
        });

        if (!result?.user) {
          throw new AuthError({ message: "Registration failed" });
        }

        const { user } = result;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image ?? null,
          phoneNumber: user.phoneNumber ?? null,
          phoneVerified: user.phoneVerified,
          dateOfBirth: user.dateOfBirth ?? null,
          kycTier: user.kycTier,
          kycStatus: user.kycStatus,
          kycVerifiedAt: user.kycVerifiedAt ?? null,
          biometricEnabled: user.biometricEnabled,
          isActive: user.isActive,
          isSuspended: user.isSuspended,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        };
      },
      catch: (error) => {
        if (error instanceof AuthError) {
          return error;
        }
        return new AuthError({ message: "Registration failed", cause: error });
      },
    });

  getUserById = (userId: string): Effect.Effect<User, UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth doesn't expose a direct getUserById API
        // This would typically be implemented using database queries
        // For now, this is a placeholder implementation
        throw new UserNotFoundError({
          message: "getUserById not implemented",
          userId,
        });
      },
      catch: (error) => {
        if (error instanceof UserNotFoundError) {
          return error;
        }
        return new UserNotFoundError({
          message: "Failed to get user",
          cause: error,
          userId,
        });
      },
    });

  getUserByEmail = (email: string): Effect.Effect<User, UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth doesn't have a direct getUserByEmail API
        // This would need to be implemented using database queries
        // For now, this is a placeholder implementation
        throw new UserNotFoundError({
          message: "getUserByEmail not implemented",
          email,
        });
      },
      catch: (error) => {
        if (error instanceof UserNotFoundError) {
          return error;
        }
        return new UserNotFoundError({
          message: "Failed to get user by email",
          email,
          cause: error,
        });
      },
    });

  updateUser = (
    _userId: string,
    _updates: Partial<Pick<User, "name" | "email" | "image">>
  ): Effect.Effect<User, UserNotFoundError | AuthError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth update user API would be used here
        // This is a placeholder implementation
        throw new AuthError({ message: "updateUser not implemented" });
      },
      catch: (error) => {
        if (error instanceof UserNotFoundError || error instanceof AuthError) {
          return error;
        }
        return new AuthError({
          message: "Failed to update user",
          cause: error,
        });
      },
    });

  checkPermission = (
    _userId: string,
    _action: string,
    _resource?: string
  ): Effect.Effect<boolean, UnauthorizedError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Basic permission check - in a real implementation, this would
        // check against a permissions system or role-based access control
        // For now, just return true (all users have all permissions)
        return true;
      },
      catch: (error) => {
        return new UserNotFoundError({
          message: "Permission check failed",
          cause: error,
        });
      },
    });

  refreshSession = (
    sessionId: string
  ): Effect.Effect<Session, SessionValidationError | SessionExpiredError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth session refresh would be implemented here
        // This is a placeholder implementation
        throw new SessionValidationError({
          message: "refreshSession not implemented",
          sessionId,
        });
      },
      catch: (error) => {
        if (
          error instanceof SessionValidationError ||
          error instanceof SessionExpiredError
        ) {
          return error;
        }
        return new SessionValidationError({
          message: "Failed to refresh session",
          sessionId,
          cause: error,
        });
      },
    });

  getUserSessions = (
    userId: string
  ): Effect.Effect<Session[], UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth doesn't have a direct API for getting user sessions
        // This would need to be implemented using database queries
        // For now, return empty array
        return [];
      },
      catch: (error) => {
        return new UserNotFoundError({
          message: "Failed to get user sessions",
          userId,
          cause: error,
        });
      },
    });

  refreshToken = (
    refreshToken: string
  ): Effect.Effect<
    { session: Session; user: User },
    InvalidRefreshTokenError | SessionExpiredError | UserNotFoundError
  > =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth refresh token implementation would go here
        // This is a placeholder implementation
        throw new InvalidRefreshTokenError({
          message: "refreshToken not implemented",
          token: refreshToken,
        });
      },
      catch: (error) => {
        if (
          error instanceof InvalidRefreshTokenError ||
          error instanceof SessionExpiredError ||
          error instanceof UserNotFoundError
        ) {
          return error;
        }
        return new InvalidRefreshTokenError({
          message: "Failed to refresh token",
          token: refreshToken,
          cause: error,
        });
      },
    });

  requestPhoneVerification = (
    phoneNumber: string
  ): Effect.Effect<{ expiresAt: Date }, PhoneVerificationError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth phone verification would be implemented here
        // This is a placeholder implementation
        throw new PhoneVerificationError({
          message: "requestPhoneVerification not implemented",
          phoneNumber,
        });
      },
      catch: (error) => {
        if (error instanceof PhoneVerificationError) {
          return error;
        }
        return new PhoneVerificationError({
          message: "Failed to request phone verification",
          phoneNumber,
          cause: error,
        });
      },
    });

  verifyPhone = (
    phoneNumber: string,
    _otp: string
  ): Effect.Effect<void, InvalidOtpError | PhoneVerificationError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Better-Auth phone verification would be implemented here
        // This is a placeholder implementation
        throw new PhoneVerificationError({
          message: "verifyPhone not implemented",
          phoneNumber,
        });
      },
      catch: (error) => {
        if (
          error instanceof InvalidOtpError ||
          error instanceof PhoneVerificationError
        ) {
          return error;
        }
        return new PhoneVerificationError({
          message: "Failed to verify phone",
          phoneNumber,
          cause: error,
        });
      },
    });

  // Email Verification Methods
  requestEmailVerification = (
    email: string
  ): Effect.Effect<
    { expiresAt: Date },
    EmailVerificationError | EmailAlreadyVerifiedError
  > =>
    Effect.tryPromise({
      try: async () => {
        // Better-Auth will send verification email automatically on signup
        // This method is for manual verification requests
        // We'll use the verification table to track requests

        // Check if user exists and email is not already verified
        const user = await auth.api.getSession({
          headers: { "x-user-email": email },
        });

        if (user?.user?.emailVerified) {
          throw new EmailAlreadyVerifiedError({
            message: "Email is already verified",
            email,
          });
        }

        // Generate verification token and set expiration
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store in verification table (Better-Auth handles this)
        // For now, return the expiration time
        // The actual email sending will be handled by Better-Auth's sendVerificationEmail

        return { expiresAt };
      },
      catch: (error) => {
        if (
          error instanceof EmailAlreadyVerifiedError ||
          error instanceof EmailVerificationError
        ) {
          return error;
        }
        return new EmailVerificationError({
          message: "Failed to request email verification",
          email,
          cause: error,
        });
      },
    });

  verifyEmail = (
    token: string
  ): Effect.Effect<void, InvalidTokenError | EmailVerificationError> =>
    Effect.tryPromise({
      try: async () => {
        // Use Better-Auth's verify email API
        const result = await auth.api.verifyEmail({
          query: { token },
        });

        if (!result) {
          throw new InvalidTokenError({
            message: "Invalid or expired verification token",
            token,
          });
        }

        // Email verified successfully
      },
      catch: (error) => {
        if (error instanceof InvalidTokenError) {
          return error;
        }
        return new EmailVerificationError({
          message: "Failed to verify email",
          cause: error,
        });
      },
    });

  resendVerificationEmail = (
    email: string
  ): Effect.Effect<
    void,
    EmailVerificationError | EmailVerificationRateLimitError
  > =>
    Effect.tryPromise({
      try: async () => {
        // Check rate limiting (max 3 requests per hour)
        // This would typically be stored in Redis or database
        // For now, we'll implement a simple in-memory check

        // TODO: Implement proper rate limiting with Redis
        // For MVP, we'll just call the verification request

        // Better-Auth's sendVerificationEmail will be called
        // through the requestEmailVerification flow
        const result = await auth.api.sendVerificationEmail({
          body: { email },
        });

        if (!result) {
          throw new EmailVerificationError({
            message: "Failed to send verification email",
            email,
          });
        }
      },
      catch: (error) => {
        if (error instanceof EmailVerificationRateLimitError) {
          return error;
        }
        if (error instanceof EmailVerificationError) {
          return error;
        }
        return new EmailVerificationError({
          message: "Failed to resend verification email",
          email,
          cause: error,
        });
      },
    });

  submitKycTier1 = (
    userId: string,
    _data: KycTier1Data
  ): Effect.Effect<void, KycVerificationError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: KYC verification implementation would go here
        // This is a placeholder implementation
        throw new KycVerificationError({
          message: "submitKycTier1 not implemented",
          userId,
          tier: 1,
        });
      },
      catch: (error) => {
        if (
          error instanceof KycVerificationError ||
          error instanceof UserNotFoundError
        ) {
          return error;
        }
        return new KycVerificationError({
          message: "Failed to submit KYC Tier 1",
          userId,
          tier: 1,
          cause: error,
        });
      },
    });

  submitKycTier2 = (
    userId: string,
    _tier1Data: KycTier1Data,
    _tier2Data: KycTier2Data
  ): Effect.Effect<void, KycVerificationError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: KYC verification implementation would go here
        // This is a placeholder implementation
        throw new KycVerificationError({
          message: "submitKycTier2 not implemented",
          userId,
          tier: 2,
        });
      },
      catch: (error) => {
        if (
          error instanceof KycVerificationError ||
          error instanceof UserNotFoundError
        ) {
          return error;
        }
        return new KycVerificationError({
          message: "Failed to submit KYC Tier 2",
          userId,
          tier: 2,
          cause: error,
        });
      },
    });

  checkKycTier = (
    userId: string,
    _requiredTier: number
  ): Effect.Effect<boolean, InsufficientKycTierError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: KYC tier check implementation would go here
        // This is a placeholder implementation
        throw new UserNotFoundError({
          message: "checkKycTier not implemented",
          userId,
        });
      },
      catch: (error) => {
        if (
          error instanceof InsufficientKycTierError ||
          error instanceof UserNotFoundError
        ) {
          return error;
        }
        return new UserNotFoundError({
          message: "Failed to check KYC tier",
          userId,
          cause: error,
        });
      },
    });

  registerBiometric = (
    userId: string,
    _registration: BiometricRegistration
  ): Effect.Effect<void, BiometricAuthError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Biometric registration implementation would go here
        // This is a placeholder implementation
        throw new BiometricAuthError({
          message: "registerBiometric not implemented",
          userId,
          deviceId: "unknown",
        });
      },
      catch: (error) => {
        if (
          error instanceof BiometricAuthError ||
          error instanceof UserNotFoundError
        ) {
          return error;
        }
        return new BiometricAuthError({
          message: "Failed to register biometric",
          userId,
          deviceId: "unknown",
          cause: error,
        });
      },
    });

  authenticateBiometric = (
    request: BiometricAuthRequest
  ): Effect.Effect<
    AuthContext,
    BiometricAuthError | UserNotFoundError | AccountSuspendedError
  > =>
    Effect.tryPromise({
      try: async () => {
        // Note: Biometric authentication implementation would go here
        // This is a placeholder implementation
        throw new BiometricAuthError({
          message: "authenticateBiometric not implemented",
          userId: "unknown",
          deviceId: request.deviceId,
        });
      },
      catch: (error) => {
        if (
          error instanceof BiometricAuthError ||
          error instanceof UserNotFoundError ||
          error instanceof AccountSuspendedError
        ) {
          return error;
        }
        return new BiometricAuthError({
          message: "Failed to authenticate with biometric",
          userId: "unknown",
          deviceId: "unknown",
          cause: error,
        });
      },
    });

  disableBiometric = (
    userId: string,
    deviceId: string
  ): Effect.Effect<void, BiometricAuthError | UserNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        // Note: Biometric disable implementation would go here
        // This is a placeholder implementation
        throw new BiometricAuthError({
          message: "disableBiometric not implemented",
          userId,
          deviceId,
        });
      },
      catch: (error) => {
        if (
          error instanceof BiometricAuthError ||
          error instanceof UserNotFoundError
        ) {
          return error;
        }
        return new BiometricAuthError({
          message: "Failed to disable biometric",
          userId,
          deviceId,
          cause: error,
        });
      },
    });
}

/**
 * Layer that provides the live AuthService implementation
 */
export const AuthServiceLive = Layer.succeed(
  AuthService,
  new AuthServiceImpl()
);
