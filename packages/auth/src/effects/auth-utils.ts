import type { AuthContext } from "./auth-types.js";

import { Effect } from "effect";

import {
  type SessionValidationError,
  type SessionExpiredError,
  type UserNotFoundError,
  type InvalidTokenError,
  UnauthorizedError,
} from "./auth-errors.js";

import { AuthService } from "./auth-service.js";

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
export const extractUserId = (authContext: AuthContext): string =>
  authContext.user.id;

/**
 * Utility function to extract session ID from auth context
 */
export const extractSessionId = (authContext: AuthContext): string =>
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
