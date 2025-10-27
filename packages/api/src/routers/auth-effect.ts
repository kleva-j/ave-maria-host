/**
 * @fileoverview Effect-based Authentication Router
 *
 * This module demonstrates migrating authentication endpoints to Effect.ts patterns.
 * It provides secure, type-safe authentication operations with proper error handling
 * and service composition.
 *
 * ## Key Features:
 * - **Effect-Based Auth Operations**: All authentication operations use Effect patterns
 * - **Structured Error Handling**: Proper auth error types and recovery strategies
 * - **Service Composition**: Auth and database service dependency injection
 * - **Security**: Proper token validation and session management
 *
 * ## Migration Notes:
 * This router demonstrates how to migrate authentication endpoints from Promise-based
 * to Effect-based patterns while maintaining security and type safety.
 */

import { Effect, type Layer } from "effect";
import { z } from "zod";

// Import Effect utilities and error types
import {
  createEffectRouter,
  UnauthorizedError,
  effectProcedure,
  ValidationError,
  NotFoundError,
  AuthError,
} from "../effects";

// Import services (will be implemented in respective effect modules)
import { DatabaseService } from "@host/db";
import { AuthService } from "@host/auth";

/**
 * Input validation schemas for authentication operations
 */
const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long"),
});

const ValidateTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
});

/**
 * Effect-based authentication operations
 */

/**
 * User login with email and password
 */
const loginEffect = (email: string, password: string) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);

    // Validate credentials
    const authContext = yield* _(
      auth.login({ email, password }),
      Effect.catchTag("InvalidCredentialsError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Invalid email or password",
            action: "login",
          })
        )
      ),
      Effect.catchTag("UserNotFoundError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Invalid email or password",
            action: "login",
          })
        )
      )
    );

    // Create session
    const session = yield* _(
      auth.createSession(authContext.user.id),
      Effect.catchTag("SessionCreationError", () =>
        Effect.fail(
          new AuthError({
            message: "Failed to create session",
            type: "SessionExpired",
          })
        )
      ),
      Effect.catchTag("UserNotFoundError", () =>
        Effect.fail(
          new AuthError({
            message: "User not found during session creation",
            type: "UserNotFound",
          })
        )
      )
    );

    return {
      user: {
        id: authContext.user.id,
        email: authContext.user.email,
        name: authContext.user.name,
      },
      session: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    };
  });

/**
 * User registration
 */
const registerEffect = (email: string, password: string, name: string) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);
    const db = yield* _(DatabaseService);

    // Check if user already exists
    const existingUsers = yield* _(
      db.query("SELECT id FROM users WHERE email = $1", [email]),
      Effect.catchTag("DatabaseQueryError", () =>
        Effect.fail(
          new AuthError({
            message: "Failed to check existing user",
            type: "UserNotFound",
          })
        )
      )
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return yield* _(
        Effect.fail(
          new ValidationError({
            message: "User with this email already exists",
            field: "email",
            value: email,
          })
        )
      );
    }

    // Create user
    const user = yield* _(
      auth.register({ email, password, name }),
      Effect.catchTag("AuthError", () =>
        Effect.fail(
          new AuthError({
            message: "Failed to create user",
            type: "InvalidCredentials",
          })
        )
      )
    );

    // Create initial session
    const session = yield* _(
      auth.createSession(user.id),
      Effect.catchTag("SessionCreationError", () =>
        Effect.fail(
          new AuthError({
            message: "Failed to create initial session",
            type: "SessionExpired",
          })
        )
      ),
      Effect.catchTag("UserNotFoundError", () =>
        Effect.fail(
          new AuthError({
            message: "User not found during session creation",
            type: "UserNotFound",
          })
        )
      )
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      session: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    };
  });

/**
 * Validate authentication token
 */
const validateTokenEffect = (token: string) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);

    const authContext = yield* _(
      auth.validateToken(token),
      Effect.catchTag("InvalidTokenError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Invalid or expired token",
            action: "validateToken",
          })
        )
      ),
      Effect.catchTag("SessionExpiredError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Invalid or expired token",
            action: "validateToken",
          })
        )
      ),
      Effect.catchTag("UserNotFoundError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "User not found",
            action: "validateToken",
          })
        )
      )
    );

    return {
      valid: true,
      user: {
        id: authContext.user.id,
        email: authContext.user.email,
        name: authContext.user.name,
      },
    };
  });

/**
 * Refresh authentication token
 */
const refreshTokenEffect = (refreshToken: string) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);

    const newSession = yield* _(
      auth.refreshSession(refreshToken),
      Effect.catchTag("SessionValidationError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Invalid or expired refresh token",
            action: "refreshToken",
          })
        )
      ),
      Effect.catchTag("SessionExpiredError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Invalid or expired refresh token",
            action: "refreshToken",
          })
        )
      )
    );

    return {
      session: {
        token: newSession.token,
        expiresAt: newSession.expiresAt,
      },
    };
  });

/**
 * Get current user profile (requires authentication)
 */
const getProfileEffect = (token: string) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);

    const authContext = yield* _(
      auth.validateToken(token),
      Effect.catchTag("InvalidTokenError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Authentication required",
            action: "getProfile",
          })
        )
      ),
      Effect.catchTag("SessionExpiredError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Authentication required",
            action: "getProfile",
          })
        )
      ),
      Effect.catchTag("UserNotFoundError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "User not found",
            action: "getProfile",
          })
        )
      )
    );

    return {
      id: authContext.user.id,
      email: authContext.user.email,
      name: authContext.user.name,
      createdAt: authContext.user.createdAt,
      updatedAt: authContext.user.updatedAt,
    };
  });

/**
 * Update user profile (requires authentication)
 */
const updateProfileEffect = (
  token: string,
  updates: { name?: string; email?: string }
) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);
    const db = yield* _(DatabaseService);

    // Validate token and get current user
    const authContext = yield* _(
      auth.validateToken(token),
      Effect.catchTag("InvalidTokenError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Authentication required",
            action: "updateProfile",
          })
        )
      ),
      Effect.catchTag("SessionExpiredError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "Authentication required",
            action: "updateProfile",
          })
        )
      ),
      Effect.catchTag("UserNotFoundError", () =>
        Effect.fail(
          new UnauthorizedError({
            message: "User not found",
            action: "updateProfile",
          })
        )
      )
    );

    const currentUser = authContext.user;

    // Check if email is being changed and if it's already taken
    if (updates.email && updates.email !== currentUser.email) {
      const existingUsers = yield* _(
        db.query("SELECT id FROM users WHERE email = $1 AND id != $2", [
          updates.email,
          currentUser.id,
        ]),
        Effect.catchTag("DatabaseQueryError", () =>
          Effect.fail(
            new AuthError({
              message: "Failed to check email availability",
              type: "UserNotFound",
            })
          )
        )
      );

      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return yield* _(
          Effect.fail(
            new ValidationError({
              message: "Email is already taken",
              field: "email",
              value: updates.email,
            })
          )
        );
      }
    }

    // Update user profile
    const filteredUpdates: { name?: string; email?: string } = {};
    if (updates.name !== undefined) filteredUpdates.name = updates.name;
    if (updates.email !== undefined) filteredUpdates.email = updates.email;

    const updatedUser = yield* _(
      auth.updateUser(currentUser.id, filteredUpdates),
      Effect.catchTag("UserNotFoundError", () =>
        Effect.fail(
          new AuthError({
            message: "Failed to update profile",
            type: "UserNotFound",
          })
        )
      ),
      Effect.catchTag("AuthError", () =>
        Effect.fail(
          new AuthError({
            message: "Failed to update profile",
            type: "UserNotFound",
          })
        )
      )
    );

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      updatedAt: updatedUser.updatedAt,
    };
  });

/**
 * Logout user (revoke session)
 */
const logoutEffect = (token: string) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);

    yield* _(
      auth.revokeSession(token),
      Effect.catchTag("AuthError", () => {
        // Even if token is invalid, we consider logout successful
        return Effect.succeed(undefined);
      })
    );

    return { success: true, message: "Logged out successfully" };
  });

/**
 * Effect-based authentication router
 */
export const authEffectRouter = {
  /**
   * User login
   *
   * @example
   * ```typescript
   * const result = await client.auth.login({
   *   email: "user@example.com",
   *   password: "password123"
   * });
   * ```
   */
  login: effectProcedure<AuthService>()
    .input(LoginSchema)
    .handler(({ input }) => loginEffect(input.email, input.password)),

  /**
   * User registration
   *
   * @example
   * ```typescript
   * const result = await client.auth.register({
   *   email: "user@example.com",
   *   password: "password123",
   *   name: "John Doe"
   * });
   * ```
   */
  register: effectProcedure<AuthService | DatabaseService>()
    .input(RegisterSchema)
    .handler(({ input }) =>
      registerEffect(input.email, input.password, input.name)
    ),

  /**
   * Validate authentication token
   *
   * @example
   * ```typescript
   * const result = await client.auth.validateToken({
   *   token: "jwt-token-here"
   * });
   * ```
   */
  validateToken: effectProcedure<AuthService>()
    .input(ValidateTokenSchema)
    .handler(({ input }) => validateTokenEffect(input.token)),

  /**
   * Refresh authentication token
   *
   * @example
   * ```typescript
   * const result = await client.auth.refreshToken({
   *   refreshToken: "refresh-token-here"
   * });
   * ```
   */
  refreshToken: effectProcedure<AuthService>()
    .input(RefreshTokenSchema)
    .handler(({ input }) => refreshTokenEffect(input.refreshToken)),

  /**
   * Get current user profile
   * Requires authentication token in context
   *
   * @example
   * ```typescript
   * const profile = await client.auth.getProfile({
   *   token: "jwt-token-here"
   * });
   * ```
   */
  getProfile: effectProcedure<AuthService>()
    .input(ValidateTokenSchema)
    .handler(({ input }) => getProfileEffect(input.token)),

  /**
   * Update user profile
   * Requires authentication token in context
   *
   * @example
   * ```typescript
   * const updated = await client.auth.updateProfile({
   *   token: "jwt-token-here",
   *   name: "New Name",
   *   email: "new@example.com"
   * });
   * ```
   */
  updateProfile: effectProcedure<AuthService | DatabaseService>()
    .input(ValidateTokenSchema.merge(UpdateProfileSchema))
    .handler(({ input }) => {
      const { token, ...rawUpdates } = input;

      // Filter out undefined values to match the expected type
      const updates: { name?: string; email?: string } = {};
      if (rawUpdates.name !== undefined) updates.name = rawUpdates.name;
      if (rawUpdates.email !== undefined) updates.email = rawUpdates.email;

      return updateProfileEffect(token, updates);
    }),

  /**
   * Logout user (revoke session)
   *
   * @example
   * ```typescript
   * const result = await client.auth.logout({
   *   token: "jwt-token-here"
   * });
   * ```
   */
  logout: effectProcedure<AuthService>()
    .input(ValidateTokenSchema)
    .handler(({ input }) => logoutEffect(input.token)),

  /**
   * Get user sessions (for security/account management)
   */
  getSessions: effectProcedure<AuthService>()
    .input(ValidateTokenSchema)
    .handler(({ input }) =>
      Effect.gen(function* (_) {
        const auth = yield* _(AuthService);

        const authContext = yield* _(
          auth.validateToken(input.token),
          Effect.catchTag("InvalidTokenError", () =>
            Effect.fail(
              new UnauthorizedError({
                message: "Authentication required",
                action: "getSessions",
              })
            )
          ),
          Effect.catchTag("SessionExpiredError", () =>
            Effect.fail(
              new UnauthorizedError({
                message: "Authentication required",
                action: "getSessions",
              })
            )
          ),
          Effect.catchTag("UserNotFoundError", () =>
            Effect.fail(
              new UnauthorizedError({
                message: "User not found",
                action: "getSessions",
              })
            )
          )
        );

        const sessions = yield* _(
          auth.getUserSessions(authContext.user.id),
          Effect.catchTag("UserNotFoundError", () =>
            Effect.fail(
              new AuthError({
                message: "Failed to fetch user sessions",
                type: "UserNotFound",
              })
            )
          )
        );

        return {
          sessions: sessions.map((session) => ({
            id: session.id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
          })),
        };
      })
    ),

  /**
   * Revoke a specific session
   */
  revokeSession: effectProcedure<AuthService>()
    .input(
      ValidateTokenSchema.merge(
        z.object({
          sessionId: z.string().min(1, "Session ID is required"),
        })
      )
    )
    .handler(({ input }) =>
      Effect.gen(function* (_) {
        const auth = yield* _(AuthService);

        // Validate current token
        yield* _(
          auth.validateToken(input.token),
          Effect.catchTag("InvalidTokenError", () =>
            Effect.fail(
              new UnauthorizedError({
                message: "Authentication required",
                action: "revokeSession",
              })
            )
          ),
          Effect.catchTag("SessionExpiredError", () =>
            Effect.fail(
              new UnauthorizedError({
                message: "Authentication required",
                action: "revokeSession",
              })
            )
          ),
          Effect.catchTag("UserNotFoundError", () =>
            Effect.fail(
              new UnauthorizedError({
                message: "User not found",
                action: "revokeSession",
              })
            )
          )
        );

        // Revoke the specified session
        yield* _(
          auth.revokeSession(input.sessionId),
          Effect.catchTag("AuthError", () =>
            Effect.fail(
              new NotFoundError({
                message: "Session not found",
                resource: "Session",
                id: input.sessionId,
              })
            )
          )
        );

        return { success: true, message: "Session revoked successfully" };
      })
    ),
};

/**
 * Type definitions for the Effect-based auth router
 */
export type AuthEffectRouter = typeof authEffectRouter;

/**
 * Example of how to use the Effect router with the createEffectRouter utility
 */
export const createAuthEffectRouterWithLayer = (layer: Layer.Layer<AuthService | DatabaseService>) =>
  createEffectRouter(authEffectRouter, layer);
