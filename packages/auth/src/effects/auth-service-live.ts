import type { KycStatus, BrandedKycTier } from "@host/shared";
import type { UserRepository } from "@host/domain";
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

import { EmailService } from "@host/infrastructure";
import { Effect, Layer, Context } from "effect";
import { UserId } from "@host/domain";

import { AuthService } from "./auth-service";
import { auth } from "..";

import {
  SessionIdSchema,
  KycTierSchema,
  KycStatusEnum,
  UserIdSchema,
  KycTierEnum,
  TokenSchema,
} from "@host/shared";

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
 * Converts Better-Auth user data to internal User type
 *
 * This helper ensures all required fields are present and properly typed,
 * including branded types (UserIdSchema, KycTierSchema) and default values
 * for fields not provided by Better-Auth.
 *
 * @param betterAuthUser - Raw user data from Better-Auth API response
 * @returns Fully typed User with all required fields and branded types
 *
 * @example
 * ```typescript
 * const betterAuthResponse = await auth.api.signInEmail({ ... });
 * const user = createUserFromBetterAuth(betterAuthResponse.user);
 * // user.id is BrandedUserId
 * // user.kycTier is BrandedKycTier (defaults to UNVERIFIED)
 * ```
 *
 * @remarks
 * Default values applied:
 * - KYC tier: UNVERIFIED (0)
 * - KYC status: PENDING
 * - Phone fields: null/false
 * - Biometric fields: false/null
 * - Account status: active, not suspended
 * - All nullable fields: null
 *
 * Branded types created:
 * - `id`: UserIdSchema.make()
 * - `kycTier`: KycTierSchema.make()
 *
 * @see {@link UserSchema} for the complete User type definition
 * @see {@link https://better-auth.com/docs/api Better-Auth API Documentation}
 */
function createUserFromBetterAuth(betterAuthUser: any): User {
  return {
    id: UserIdSchema.make(betterAuthUser.id),
    name: betterAuthUser.name,
    email: betterAuthUser.email,
    emailVerified: betterAuthUser.emailVerified,
    image: betterAuthUser.image ?? null,
    phoneNumber: null,
    phoneVerified: false,
    dateOfBirth: null,
    kycTier: KycTierSchema.make(KycTierEnum.UNVERIFIED),
    kycStatus: KycStatusEnum.PENDING,
    kycData: null,
    kycVerifiedAt: null,
    biometricEnabled: false,
    biometricPublicKey: null,
    isActive: true,
    isSuspended: false,
    suspendedAt: null,
    suspensionReason: null,
    createdAt: new Date(betterAuthUser.createdAt),
    updatedAt: new Date(betterAuthUser.updatedAt),
  };
}

/**
 * Converts Better-Auth session data to internal Session type
 *
 * Handles optional fields and provides sensible defaults for missing data.
 * All IDs and tokens are converted to branded types for type safety.
 *
 * @param betterAuthSession - Raw session data from Better-Auth API
 * @returns Fully typed Session with branded IDs and tokens
 *
 * @example
 * ```typescript
 * const betterAuthSession = await auth.api.getSession({ ... });
 * const session = createSessionFromBetterAuth(betterAuthSession.session);
 * // session.id is BrandedSessionId
 * // session.token is BrandedToken
 * // session.userId is BrandedUserId
 * ```
 *
 * @remarks
 * Default values applied when fields are missing:
 * - `ipAddress`: "0.0.0.0"
 * - `userAgent`: "unknown"
 * - `refreshToken`: null
 * - `refreshTokenExpiresAt`: null
 * - `deviceId`: null
 *
 * Branded types created:
 * - `id`: SessionIdSchema.make()
 * - `token`: TokenSchema.make()
 * - `userId`: UserIdSchema.make()
 * - `refreshToken`: TokenSchema.make() (if present)
 *
 * @see {@link SessionSchema} for the complete Session type definition
 */
function createSessionFromBetterAuth(betterAuthSession: any): Session {
  return {
    id: SessionIdSchema.make(betterAuthSession.id),
    expiresAt: new Date(betterAuthSession.expiresAt),
    token: TokenSchema.make(betterAuthSession.token),
    refreshToken: betterAuthSession.refreshToken
      ? TokenSchema.make(betterAuthSession.refreshToken)
      : null,
    refreshTokenExpiresAt: betterAuthSession.refreshTokenExpiresAt
      ? new Date(betterAuthSession.refreshTokenExpiresAt)
      : null,
    deviceId: betterAuthSession.deviceId || null,
    createdAt: new Date(betterAuthSession.createdAt),
    updatedAt: new Date(betterAuthSession.updatedAt),
    ipAddress: betterAuthSession.ipAddress || "0.0.0.0",
    userAgent: betterAuthSession.userAgent || "unknown",
    userId: UserIdSchema.make(betterAuthSession.userId),
  };
}

/**
 * Live implementation of AuthService using Better-Auth
 */
class AuthServiceImpl implements AuthService {
  constructor(
    private readonly emailService: EmailService,
    private readonly userRepository: UserRepository
  ) {}
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
          id: SessionIdSchema.make(crypto.randomUUID()),
          token: TokenSchema.make(crypto.randomUUID()),
          userId: UserIdSchema.make(userId),
          ipAddress: options?.ipAddress || "0.0.0.0",
          userAgent: options?.userAgent || "unknown",
          deviceId: options?.deviceId || null,
          expiresAt: options?.expiresIn
            ? new Date(Date.now() + options.expiresIn * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          refreshToken: null,
          refreshTokenExpiresAt: null,
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
        const { email, password } = credentials;
        const result = await auth.api.signInEmail({
          body: { email, password },
        });

        if (!result?.user) {
          throw new InvalidCredentialsError({
            message: "Invalid email or password",
            email,
          });
        }

        const { user } = result;

        // Create a session context using helper functions
        // Note: Better-Auth's signInEmail returns {user, token, redirect, url} but not session
        const authContext: AuthContext = {
          user: createUserFromBetterAuth(user),
          session: {
            id: SessionIdSchema.make(crypto.randomUUID()),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            token: result.token
              ? TokenSchema.make(result.token)
              : TokenSchema.make(crypto.randomUUID()),
            refreshToken: null,
            refreshTokenExpiresAt: null,
            deviceId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ipAddress: "0.0.0.0",
            userAgent: "unknown",
            userId: UserIdSchema.make(user.id),
          },
        };

        return authContext;
      },
      catch: (error) => {
        if (error instanceof InvalidCredentialsError) return error;
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
        const { name, email, password } = data;
        const result = await auth.api.signUpEmail({
          body: { name, email, password },
        });

        if (!result?.user) {
          throw new AuthError({ message: "Registration failed" });
        }

        const { user } = result;

        return createUserFromBetterAuth(user);
      },
      catch: (error) => {
        if (error instanceof AuthError) return error;
        return new AuthError({ message: "Registration failed", cause: error });
      },
    });

  getUserById = (userId: string): Effect.Effect<User, UserNotFoundError> => {
    const self = this;
    return Effect.gen(function* () {
      const userIdVO = UserId.fromString(userId);
      const domainUser = yield* self.userRepository.findById(userIdVO).pipe(
        Effect.mapError(
          (error) =>
            new UserNotFoundError({
              message: error.message || "Failed to get user",
              userId,
              cause: error,
            })
        )
      );

      if (!domainUser) {
        return yield* Effect.fail(
          new UserNotFoundError({ message: "User not found", userId })
        );
      }

      // Map domain User to auth User
      return {
        id: domainUser.id,
        name: domainUser.name,
        email: domainUser.email,
        emailVerified: domainUser.emailVerified,
        image: domainUser.image,
        phoneNumber: domainUser.phoneNumber,
        phoneVerified: domainUser.phoneVerified,
        dateOfBirth: domainUser.dateOfBirth,
        kycTier: domainUser.kycTier as BrandedKycTier,
        kycStatus: domainUser.kycStatus as KycStatus,
        kycData: domainUser.kycData,
        kycVerifiedAt: domainUser.kycVerifiedAt,
        biometricEnabled: domainUser.biometricEnabled,
        biometricPublicKey: domainUser.biometricPublicKey,
        isActive: domainUser.isActive,
        isSuspended: domainUser.isSuspended,
        suspendedAt: domainUser.suspendedAt,
        suspensionReason: domainUser.suspensionReason,
        createdAt: domainUser.createdAt,
        updatedAt: domainUser.updatedAt,
      };
    });
  };

  getUserByEmail = (email: string): Effect.Effect<User, UserNotFoundError> => {
    const self = this;
    return Effect.gen(function* () {
      const domainUser = yield* self.userRepository.findByEmail(email).pipe(
        Effect.mapError(
          (error) =>
            new UserNotFoundError({
              message: error.message || "Failed to get user by email",
              email,
              cause: error,
            })
        )
      );

      if (!domainUser) {
        return yield* Effect.fail(
          new UserNotFoundError({
            message: "User not found",
            email,
          })
        );
      }

      // Map domain User to auth User
      return {
        id: domainUser.id,
        name: domainUser.name,
        email: domainUser.email,
        emailVerified: domainUser.emailVerified,
        image: domainUser.image,
        phoneNumber: domainUser.phoneNumber,
        phoneVerified: domainUser.phoneVerified,
        dateOfBirth: domainUser.dateOfBirth,
        kycTier: domainUser.kycTier as BrandedKycTier,
        kycStatus: domainUser.kycStatus as KycStatus,
        kycData: domainUser.kycData,
        kycVerifiedAt: domainUser.kycVerifiedAt,
        biometricEnabled: domainUser.biometricEnabled,
        biometricPublicKey: domainUser.biometricPublicKey,
        isActive: domainUser.isActive,
        isSuspended: domainUser.isSuspended,
        suspendedAt: domainUser.suspendedAt,
        suspensionReason: domainUser.suspensionReason,
        createdAt: domainUser.createdAt,
        updatedAt: domainUser.updatedAt,
      };
    });
  };

  updateUser = (
    userId: string,
    updates: Partial<Pick<User, "name" | "email" | "image">>
  ): Effect.Effect<User, UserNotFoundError | AuthError> => {
    const self = this;
    return Effect.gen(function* () {
      const userIdVO = UserId.fromString(userId);
      const domainUser = yield* self.userRepository.findById(userIdVO).pipe(
        Effect.mapError(
          (error) =>
            new UserNotFoundError({
              message: error.message || "Failed to get user",
              userId,
              cause: error,
            })
        )
      );

      if (!domainUser) {
        return yield* Effect.fail(
          new UserNotFoundError({ message: "User not found", userId })
        );
      }

      // Create updated user with new values
      const updatedDomainUser = new (domainUser.constructor as any)({
        ...domainUser,
        name: updates.name ?? domainUser.name,
        email: updates.email ?? domainUser.email,
        image: updates.image !== undefined ? updates.image : domainUser.image,
        updatedAt: new Date(),
      });

      // Update in repository
      yield* self.userRepository.update(updatedDomainUser).pipe(
        Effect.mapError(
          (error) =>
            new AuthError({
              message: error.message || "Failed to update user",
              cause: error,
            })
        )
      );

      // Map domain User to auth User
      return {
        id: updatedDomainUser.id.value,
        name: updatedDomainUser.name,
        email: updatedDomainUser.email,
        emailVerified: updatedDomainUser.emailVerified,
        image: updatedDomainUser.image,
        phoneNumber: updatedDomainUser.phoneNumber,
        phoneVerified: updatedDomainUser.phoneVerified,
        dateOfBirth: updatedDomainUser.dateOfBirth,
        kycTier: updatedDomainUser.kycTier as BrandedKycTier,
        kycStatus: updatedDomainUser.kycStatus as KycStatus,
        kycData: updatedDomainUser.kycData,
        kycVerifiedAt: updatedDomainUser.kycVerifiedAt,
        biometricEnabled: updatedDomainUser.biometricEnabled,
        biometricPublicKey: updatedDomainUser.biometricPublicKey,
        isActive: updatedDomainUser.isActive,
        isSuspended: updatedDomainUser.isSuspended,
        suspendedAt: updatedDomainUser.suspendedAt,
        suspensionReason: updatedDomainUser.suspensionReason,
        createdAt: updatedDomainUser.createdAt,
        updatedAt: updatedDomainUser.updatedAt,
      };
    });
  };

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

        // Generate custom verification token
        const token = crypto.randomUUID(); // Refactor later
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store token in Better-Auth's verification table
        // Better-Auth uses identifier + value pattern
        await auth.api.sendVerificationEmail({
          body: { email, callbackURL: `/verify-email?token=${token}` },
        });

        // Send verification email using our EmailService
        const userName = user?.user?.name || (email.split("@")[0] as string);
        await Effect.runPromise(
          this.emailService.sendVerificationEmail(email, token, userName)
        );

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
        // Note: Rate limiting is handled at the RPC layer by RedisRateLimiterService
        // This method just handles the email sending logic

        // Get user information
        const user = await auth.api.getSession({
          headers: { "x-user-email": email },
        });

        if (!user?.user) {
          throw new EmailVerificationError({
            message: "User not found",
            email,
          });
        }

        if (user.user.emailVerified) {
          throw new EmailAlreadyVerifiedError({
            message: "Email is already verified",
            email,
          });
        }

        // Generate new verification token
        const token = crypto.randomUUID();

        // Update Better-Auth's verification table
        await auth.api.sendVerificationEmail({
          body: { email, callbackURL: `/verify-email?token=${token}` },
        });

        // Send verification email using our EmailService
        const userName = user.user.name || (email.split("@")[0] as string);
        await Effect.runPromise(
          this.emailService.sendVerificationEmail(email, token, userName)
        );
      },
      catch: (error) => {
        if (error instanceof EmailVerificationRateLimitError) {
          return error;
        }
        if (error instanceof EmailVerificationError) {
          return error;
        }
        if (error instanceof EmailAlreadyVerifiedError) {
          return new EmailVerificationError({
            message: error.message,
            email,
          });
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
 * Requires EmailService to be provided
 */
/**
 * Tag for UserRepository dependency
 */
const UserRepositoryTag = Context.GenericTag<UserRepository>(
  "@domain/UserRepository"
);

export const AuthServiceLive: Layer.Layer<
  AuthService,
  never,
  EmailService | UserRepository
> = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const emailService = yield* EmailService;
    const userRepository = yield* UserRepositoryTag;
    return new AuthServiceImpl(emailService, userRepository);
  })
);
