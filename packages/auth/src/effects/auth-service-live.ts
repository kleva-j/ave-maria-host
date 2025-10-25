import { AuthService } from "./auth-service.js";

import type {
  LoginCredentials,
  SessionOptions,
  RegisterData,
  AuthContext,
  Session,
  User,
} from "./auth-types.js";

import { Effect, Layer } from "effect";

import { auth } from "../index.js";
import {
  InvalidCredentialsError,
  SessionValidationError,
  SessionCreationError,
  SessionExpiredError,
  InvalidTokenError,
  UserNotFoundError,
  AuthError,
} from "./auth-errors.js";

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
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image ?? null,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
          session: {
            id: session.id,
            expiresAt: new Date(session.expiresAt),
            token: session.token,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            ipAddress: session.ipAddress || null,
            userAgent: session.userAgent || null,
            userId: session.userId,
          },
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
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image ?? null,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
          session: {
            id: session.id,
            expiresAt: new Date(session.expiresAt),
            token: session.token,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            ipAddress: session.ipAddress || null,
            userAgent: session.userAgent || null,
            userId: session.userId,
          },
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
  ): Effect.Effect<boolean, UserNotFoundError> =>
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
}

/**
 * Layer that provides the live AuthService implementation
 */
export const AuthServiceLive = Layer.succeed(
  AuthService,
  new AuthServiceImpl()
);
