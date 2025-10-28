/**
 * @fileoverview Authentication RPC Definitions (@effect/rpc)
 *
 * This module defines authentication-related RPC endpoints using native @effect/rpc.
 * It provides secure, type-safe authentication operations with proper error handling.
 *
 * ## Key Features:
 * - **Effect Schema**: Type-safe schema definitions for auth operations
 * - **Security**: Proper validation and error handling for auth flows
 * - **Service Integration**: Seamless AuthService dependency injection
 * - **Middleware Support**: Built-in authentication middleware
 */

import type { Layer } from "effect";

import { Rpc, RpcGroup, RpcMiddleware } from "@effect/rpc";
import { Schema, Context, Effect } from "effect";
import { DatabaseService } from "@host/db";
import { AuthService } from "@host/auth";

/**
 * User data model using Effect Schema
 */
export class User extends Schema.Class<User>("User")({
  id: Schema.String.pipe(Schema.minLength(1)),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  name: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(100)),
  createdAt: Schema.optional(Schema.Date),
  updatedAt: Schema.optional(Schema.Date),
}) {}

/**
 * Session data model
 */
export class Session extends Schema.Class<Session>("Session")({
  id: Schema.String.pipe(Schema.minLength(1)),
  token: Schema.String.pipe(Schema.minLength(1)),
  expiresAt: Schema.Date,
  createdAt: Schema.optional(Schema.Date),
  updatedAt: Schema.optional(Schema.Date),
  userAgent: Schema.optional(Schema.String),
  ipAddress: Schema.optional(Schema.String),
}) {}

/**
 * Authentication response model
 */
export class AuthResponse extends Schema.Class<AuthResponse>("AuthResponse")({
  user: User,
  session: Schema.Struct({
    token: Schema.String,
    expiresAt: Schema.Date,
  }),
}) {}

/**
 * Token validation response model
 */
export class TokenValidationResponse extends Schema.Class<TokenValidationResponse>(
  "TokenValidationResponse"
)({
  valid: Schema.Boolean,
  user: User,
}) {}

/**
 * Session list response model
 */
export class SessionListResponse extends Schema.Class<SessionListResponse>(
  "SessionListResponse"
)({
  sessions: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      createdAt: Schema.Date,
      updatedAt: Schema.Date,
      userAgent: Schema.optional(Schema.String),
      ipAddress: Schema.optional(Schema.String),
    })
  ),
}) {}

/**
 * Generic success response model
 */
export class SuccessResponse extends Schema.Class<SuccessResponse>(
  "SuccessResponse"
)({
  success: Schema.Boolean,
  message: Schema.String,
}) {}

/**
 * Custom error types for authentication operations
 */
export class AuthenticationError extends Schema.TaggedError<AuthenticationError>()(
  "AuthenticationError",
  {
    type: Schema.Literal(
      "InvalidCredentials",
      "InvalidToken",
      "SessionExpired",
      "UserNotFound"
    ),
    message: Schema.String,
  }
) {}

export class AuthorizationError extends Schema.TaggedError<AuthorizationError>()(
  "AuthorizationError",
  {
    action: Schema.String,
    message: Schema.String,
  }
) {}

export class AuthValidationError extends Schema.TaggedError<AuthValidationError>()(
  "AuthValidationError",
  {
    field: Schema.String,
    value: Schema.Unknown,
    message: Schema.String,
  }
) {}

/**
 * Union of all auth-related errors
 */
export const AuthError = Schema.Union(
  AuthenticationError,
  AuthValidationError,
  AuthorizationError
);

/**
 * Authentication middleware context
 * This provides the current authenticated user to RPC handlers
 */
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  User
>() {}

/**
 * Authentication middleware definition
 * This middleware validates tokens and provides user context
 */
export class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()(
  "AuthMiddleware",
  {
    provides: CurrentUser,
    requiredForClient: true,
  }
) {}

/**
 * Authentication Payload
 */
export class AuthLoginPayload extends Schema.Class<AuthLoginPayload>(
  "AuthLoginPayload"
)({
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  password: Schema.String.pipe(Schema.minLength(8)),
}) {}

export class AuthRegisterPayload extends Schema.Class<AuthRegisterPayload>(
  "AuthRegisterPayload"
)({
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  password: Schema.String.pipe(Schema.minLength(8)),
  name: Schema.String.pipe(
    Schema.minLength(2),
    Schema.maxLength(100),
    Schema.trimmed()
  ),
}) {}

export class AuthValidateTokenPayload extends Schema.Class<AuthValidateTokenPayload>(
  "AuthValidateTokenPayload"
)({
  token: Schema.String.pipe(Schema.minLength(1)),
}) {}

export class AuthRefreshTokenPayload extends Schema.Class<AuthRefreshTokenPayload>(
  "AuthRefreshTokenPayload"
)({
  refreshToken: Schema.String.pipe(Schema.minLength(1)),
}) {}

export class AuthUploadProfilePayload extends Schema.Class<AuthUploadProfilePayload>(
  "AuthUploadProfilePayload"
)({
  name: Schema.optional(
    Schema.String.pipe(
      Schema.minLength(2),
      Schema.maxLength(100),
      Schema.trimmed()
    )
  ),
  email: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
  ),
}) {}

export class AuthRevokeSessionPayload extends Schema.Class<AuthRevokeSessionPayload>(
  "AuthRevokeSessionPayload"
)({
  sessionId: Schema.String.pipe(Schema.minLength(1)),
}) {}

/**
 * Authentication RPC Group Definition
 *
 * This defines all authentication-related RPC endpoints using @effect/rpc patterns.
 */
export class AuthRpcs extends RpcGroup.make(
  /**
   * User login with email and password
   *
   * @example
   * ```typescript
   * const auth = yield* client.Login({
   *   email: "user@example.com",
   *   password: "password123"
   * });
   * ```
   */
  Rpc.make("Login", {
    payload: AuthLoginPayload,
    success: AuthResponse,
    error: Schema.Union(AuthenticationError, AuthValidationError),
  }),

  /**
   * User registration
   *
   * @example
   * ```typescript
   * const auth = yield* client.Register({
   *   email: "user@example.com",
   *   password: "password123",
   *   name: "John Doe"
   * });
   * ```
   */
  Rpc.make("Register", {
    payload: AuthRegisterPayload,
    success: AuthResponse,
    error: Schema.Union(AuthenticationError, AuthValidationError),
  }),

  /**
   * Validate authentication token
   *
   * @example
   * ```typescript
   * const validation = yield* client.ValidateToken({
   *   token: "jwt-token-here"
   * });
   * ```
   */
  Rpc.make("ValidateToken", {
    payload: AuthValidateTokenPayload,
    success: TokenValidationResponse,
    error: AuthenticationError,
  }),

  /**
   * Refresh authentication token
   *
   * @example
   * ```typescript
   * const newSession = yield* client.RefreshToken({
   *   refreshToken: "refresh-token-here"
   * });
   * ```
   */
  Rpc.make("RefreshToken", {
    payload: AuthRefreshTokenPayload,
    success: Schema.Struct({
      session: Schema.Struct({
        token: Schema.String,
        expiresAt: Schema.Date,
      }),
    }),
    error: AuthenticationError,
  }),

  /**
   * Get current user profile (requires authentication)
   *
   * @example
   * ```typescript
   * const profile = yield* client.GetProfile({});
   * ```
   */
  Rpc.make("GetProfile", {
    payload: {},
    success: User,
    error: AuthenticationError,
  }).middleware(AuthMiddleware),

  /**
   * Update user profile (requires authentication)
   *
   * @example
   * ```typescript
   * const updated = yield* client.UpdateProfile({
   *   name: "New Name",
   *   email: "new@example.com"
   * });
   * ```
   */
  Rpc.make("UpdateProfile", {
    payload: AuthUploadProfilePayload,
    success: User,
    error: Schema.Union(AuthenticationError, AuthValidationError),
  }).middleware(AuthMiddleware),

  /**
   * Logout user (revoke current session)
   *
   * @example
   * ```typescript
   * const result = yield* client.Logout({});
   * ```
   */
  Rpc.make("Logout", {
    payload: {},
    success: SuccessResponse,
    error: AuthenticationError,
  }).middleware(AuthMiddleware),

  /**
   * Get user sessions (for security/account management)
   *
   * @example
   * ```typescript
   * const sessions = yield* client.GetSessions({});
   * ```
   */
  Rpc.make("GetSessions", {
    payload: {},
    success: SessionListResponse,
    error: AuthenticationError,
  }).middleware(AuthMiddleware),

  /**
   * Revoke a specific session
   *
   * @example
   * ```typescript
   * const result = yield* client.RevokeSession({
   *   sessionId: "session-id-here"
   * });
   * ```
   */
  Rpc.make("RevokeSession", {
    payload: AuthRevokeSessionPayload,
    success: SuccessResponse,
    error: Schema.Union(AuthenticationError, AuthValidationError),
  }).middleware(AuthMiddleware)
) {}

/**
 * Type helpers for extracting types from the RPC group
 */
export type AuthRpcGroup = typeof AuthRpcs;

/**
 * Authentication RPC handlers implementation
 * This provides the actual business logic for authentication operations
 */
export const AuthHandlersLive: Layer.Layer<
  | Rpc.Handler<"Login">
  | Rpc.Handler<"Register">
  | Rpc.Handler<"ValidateToken">
  | Rpc.Handler<"RefreshToken">
  | Rpc.Handler<"GetProfile">
  | Rpc.Handler<"UpdateProfile">
  | Rpc.Handler<"Logout">
  | Rpc.Handler<"GetSessions">
  | Rpc.Handler<"RevokeSession">,
  never,
  AuthService | DatabaseService
> = AuthRpcs.toLayer({
  /**
   * User login with email and password
   */
  Login: ({ email, password }) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);

      const authContext = yield* _(
        auth.login({ email, password }),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "InvalidCredentials",
              message: "Invalid email or password",
            })
        )
      );

      const session = yield* _(
        auth.createSession(authContext.user.id),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "SessionExpired",
              message: "Failed to create session",
            })
        )
      );

      return {
        user: authContext.user,
        session: {
          token: session.token,
          expiresAt: session.expiresAt,
        },
      };
    }),

  /**
   * User registration
   */
  Register: ({ email, password, name }) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const auth = yield* _(AuthService);

      // Check if user already exists
      const existingUsers = yield* _(
        db.query("SELECT id FROM users WHERE email = $1", [email]),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "UserNotFound",
              message: "Failed to check existing user",
            })
        )
      );

      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return yield* _(
          Effect.fail(
            new AuthValidationError({
              field: "email",
              value: email,
              message: "User with this email already exists",
            })
          )
        );
      }

      const user = yield* _(
        auth.register({ email, password, name }),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "InvalidCredentials",
              message: "Failed to create user",
            })
        )
      );

      const session = yield* _(
        auth.createSession(user.id),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "SessionExpired",
              message: "Failed to create initial session",
            })
        )
      );

      return {
        user,
        session: {
          token: session.token,
          expiresAt: session.expiresAt,
        },
      };
    }),

  /**
   * Validate authentication token
   */
  ValidateToken: ({ token }) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);

      const authContext = yield* _(
        auth.validateToken(token),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "InvalidToken",
              message: "Invalid or expired token",
            })
        )
      );

      return {
        valid: true,
        user: authContext.user,
      };
    }),

  /**
   * Refresh authentication token
   */
  RefreshToken: ({ refreshToken }) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);

      const newSession = yield* _(
        auth.refreshSession(refreshToken),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "InvalidToken",
              message: "Invalid or expired refresh token",
            })
        )
      );

      return {
        session: {
          token: newSession.token,
          expiresAt: newSession.expiresAt,
        },
      };
    }),

  /**
   * Get current user profile (requires authentication middleware)
   */
  GetProfile: () =>
    Effect.gen(function* (_) {
      const currentUser = yield* _(CurrentUser);
      return currentUser;
    }),

  /**
   * Update user profile (requires authentication middleware)
   */
  UpdateProfile: ({ name, email }) =>
    Effect.gen(function* (_) {
      const currentUser = yield* _(CurrentUser);
      const db = yield* _(DatabaseService);
      const auth = yield* _(AuthService);

      // Check if email is being changed and if it's already taken
      if (email && email !== currentUser.email) {
        const existingUsers = yield* _(
          db.query("SELECT id FROM users WHERE email = $1 AND id != $2", [
            email,
            currentUser.id,
          ]),
          Effect.mapError(
            () =>
              new AuthenticationError({
                type: "UserNotFound",
                message: "Failed to check email availability",
              })
          )
        );

        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
          return yield* _(
            Effect.fail(
              new AuthValidationError({
                field: "email",
                value: email,
                message: "Email is already taken",
              })
            )
          );
        }
      }

      const updates: { name?: string; email?: string } = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;

      const updatedUser = yield* _(
        auth.updateUser(currentUser.id, updates),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "UserNotFound",
              message: "Failed to update profile",
            })
        )
      );

      return updatedUser;
    }),

  /**
   * Logout user (revoke current session)
   */
  Logout: () =>
    Effect.gen(function* (_) {
      const currentUser = yield* _(CurrentUser);
      const auth = yield* _(AuthService);

      // Note: In a real implementation, we'd need to get the current session token
      // This is simplified for the example
      yield* _(
        auth.revokeSession(currentUser.id),
        Effect.catchAll(() => Effect.succeed(undefined))
      );

      return {
        success: true,
        message: "Logged out successfully",
      };
    }),

  /**
   * Get user sessions (requires authentication middleware)
   */
  GetSessions: () =>
    Effect.gen(function* (_) {
      const currentUser = yield* _(CurrentUser);
      const auth = yield* _(AuthService);

      const sessions = yield* _(
        auth.getUserSessions(currentUser.id),
        Effect.mapError(
          () =>
            new AuthenticationError({
              type: "UserNotFound",
              message: "Failed to fetch user sessions",
            })
        )
      );

      return {
        sessions: sessions.map((session) => ({
          id: session.id,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          userAgent: session.userAgent ?? undefined,
          ipAddress: session.ipAddress ?? undefined,
        })),
      };
    }),

  /**
   * Revoke a specific session
   */
  RevokeSession: ({ sessionId }) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);

      yield* _(
        auth.revokeSession(sessionId),
        Effect.mapError(
          () =>
            new AuthValidationError({
              field: "sessionId",
              value: sessionId,
              message: "Session not found",
            })
        )
      );

      return {
        success: true,
        message: "Session revoked successfully",
      };
    }),
});
