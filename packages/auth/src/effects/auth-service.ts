import type {
  InvalidCredentialsError,
  SessionValidationError,
  SessionCreationError,
  SessionExpiredError,
  InvalidTokenError,
  UnauthorizedError,
  UserNotFoundError,
  AuthError,
} from "./auth-errors.js";

import type {
  LoginCredentials,
  SessionOptions,
  RegisterData,
  AuthContext,
  Session,
  User,
} from "./auth-types.js";

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
