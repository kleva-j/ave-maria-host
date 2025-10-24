import type { AuthErrorType, ConfigError } from "./core";

import { Data } from "effect";

/**
 * Abstract base class for all application errors using Effect.ts tagged errors.
 * Provides common error properties including timestamp tracking and cause chaining.
 * 
 * This class should not be instantiated directly. Use specific error subclasses instead.
 * 
 * @example
 * ```typescript
 * // Don't use AppError directly, use specific error types
 * throw new ValidationError({ message: "Invalid input", field: "email", value: "invalid" });
 * ```
 */
export abstract class AppError extends Data.TaggedError("AppError")<{
  /** Human-readable error message */
  readonly message: string;
  /** Optional underlying cause of the error */
  readonly cause?: unknown;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; cause?: unknown }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for input validation failures.
 * Used when user input or data doesn't meet validation requirements.
 * 
 * @example
 * ```typescript
 * // Throw validation error
 * throw new ValidationError({
 *   message: "Email format is invalid",
 *   field: "email",
 *   value: "not-an-email"
 * });
 * 
 * // Handle validation error
 * Effect.catchTag("ValidationError", (error) => {
 *   console.error(`Validation failed for ${error.field}: ${error.message}`);
 *   return Effect.succeed({ error: "Invalid input" });
 * })
 * ```
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  /** Human-readable error message describing the validation failure */
  readonly message: string;
  /** Name of the field that failed validation */
  readonly field: string;
  /** The invalid value that caused the validation failure */
  readonly value: unknown;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; field: string; value: unknown }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for missing resources or entities.
 * Used when a requested resource cannot be found in the system.
 * 
 * @example
 * ```typescript
 * // Throw not found error
 * throw new NotFoundError({
 *   message: "User not found",
 *   resource: "User",
 *   id: "user-123"
 * });
 * 
 * // Handle not found error
 * Effect.catchTag("NotFoundError", (error) => {
 *   return Effect.succeed({ error: `${error.resource} with ID ${error.id} not found` });
 * })
 * ```
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  /** Human-readable error message */
  readonly message: string;
  /** Type of resource that was not found (e.g., "User", "Order") */
  readonly resource: string;
  /** Identifier of the resource that was not found */
  readonly id: string;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; resource: string; id: string }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for authentication failures.
 * Used when a user is not authenticated or authentication credentials are invalid.
 * 
 * @example
 * ```typescript
 * // Throw unauthorized error
 * throw new UnauthorizedError({
 *   message: "Authentication required",
 *   action: "access_user_profile"
 * });
 * 
 * // Handle unauthorized error
 * Effect.catchTag("UnauthorizedError", (error) => {
 *   return Effect.succeed({ error: "Please log in to continue", redirectTo: "/login" });
 * })
 * ```
 */
export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  /** Human-readable error message */
  readonly message: string;
  /** The action that required authentication */
  readonly action: string;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; action: string }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for authorization failures.
 * Used when a user is authenticated but lacks permission to perform an action.
 * 
 * @example
 * ```typescript
 * // Throw forbidden error
 * throw new ForbiddenError({
 *   message: "Insufficient permissions",
 *   resource: "AdminPanel",
 *   action: "delete_user"
 * });
 * 
 * // Handle forbidden error
 * Effect.catchTag("ForbiddenError", (error) => {
 *   return Effect.succeed({ 
 *     error: `Access denied: cannot ${error.action} on ${error.resource}` 
 *   });
 * })
 * ```
 */
export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  /** Human-readable error message */
  readonly message: string;
  /** The resource that access was denied to */
  readonly resource: string;
  /** The action that was not permitted */
  readonly action: string;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; resource: string; action: string }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for database operation failures.
 * Used when database queries, transactions, or connections fail.
 * 
 * @example
 * ```typescript
 * // Throw database error
 * throw new DatabaseError({
 *   message: "Connection timeout",
 *   operation: "findUser",
 *   cause: originalError
 * });
 * 
 * // Handle database error
 * Effect.catchTag("DatabaseError", (error) => {
 *   console.error(`Database ${error.operation} failed: ${error.message}`);
 *   return Effect.succeed({ error: "Database temporarily unavailable" });
 * })
 * ```
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  /** Human-readable error message */
  readonly message: string;
  /** The database operation that failed (e.g., "findUser", "createOrder") */
  readonly operation: string;
  /** Optional underlying cause of the database error */
  readonly cause?: unknown;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; operation: string; cause?: unknown }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for authentication service failures.
 * Used for specific authentication-related errors with categorized types.
 * 
 * @example
 * ```typescript
 * // Throw auth error
 * throw new AuthError({
 *   message: "JWT token has expired",
 *   type: "SessionExpired"
 * });
 * 
 * // Handle auth error by type
 * Effect.catchTag("AuthError", (error) => {
 *   switch (error.type) {
 *     case "SessionExpired":
 *       return Effect.succeed({ error: "Session expired", action: "refresh" });
 *     case "InvalidToken":
 *       return Effect.succeed({ error: "Invalid token", action: "login" });
 *     default:
 *       return Effect.succeed({ error: "Authentication failed" });
 *   }
 * })
 * ```
 */
export class AuthError extends Data.TaggedError("AuthError")<{
  /** Human-readable error message */
  readonly message: string;
  /** Categorized type of authentication error */
  readonly type: AuthErrorType;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; type: AuthErrorType }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for external service communication failures.
 * Used when HTTP requests to external APIs or services fail.
 * 
 * @example
 * ```typescript
 * // Throw network error
 * throw new NetworkError({
 *   message: "Service unavailable",
 *   url: "https://api.external.com/data",
 *   status: 503,
 *   cause: fetchError
 * });
 * 
 * // Handle network error with retry logic
 * Effect.catchTag("NetworkError", (error) => {
 *   if (error.status && error.status >= 500) {
 *     // Retry on server errors
 *     return Effect.fail(error);
 *   }
 *   return Effect.succeed({ error: "External service unavailable" });
 * })
 * ```
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  /** Human-readable error message */
  readonly message: string;
  /** The URL that was being accessed when the error occurred */
  readonly url: string;
  /** Optional HTTP status code from the failed request */
  readonly status?: number;
  /** Optional underlying cause of the network error */
  readonly cause?: unknown;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: {
    message: string;
    url: string;
    status?: number;
    cause?: unknown;
  }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for domain-specific business logic violations.
 * Used when business rules or domain constraints are violated.
 * 
 * @example
 * ```typescript
 * // Throw business logic error
 * throw new BusinessLogicError({
 *   message: "Cannot cancel order after shipping",
 *   code: "ORDER_ALREADY_SHIPPED",
 *   context: { orderId: "order-123", status: "shipped" }
 * });
 * 
 * // Handle business logic error
 * Effect.catchTag("BusinessLogicError", (error) => {
 *   return Effect.succeed({ 
 *     error: error.message, 
 *     code: error.code,
 *     context: error.context 
 *   });
 * })
 * ```
 */
export class BusinessLogicError extends Data.TaggedError("BusinessLogicError")<{
  /** Human-readable error message describing the business rule violation */
  readonly message: string;
  /** Machine-readable error code for programmatic handling */
  readonly code: string;
  /** Optional additional context about the error */
  readonly context?: Record<string, unknown>;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: {
    message: string;
    code: string;
    context?: Record<string, unknown>;
  }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Union type of all application errors for comprehensive error handling.
 * Use this type when you need to handle any application error.
 * 
 * @example
 * ```typescript
 * const handleAnyError = (error: ApplicationError) => {
 *   console.error(`Error occurred at ${error.timestamp}: ${error.message}`);
 *   
 *   switch (error._tag) {
 *     case "ValidationError":
 *       return { type: "validation", field: error.field };
 *     case "NotFoundError":
 *       return { type: "not_found", resource: error.resource };
 *     case "NetworkError":
 *       return { type: "network", url: error.url };
 *     // ... handle other error types
 *     default:
 *       return { type: "unknown", message: error.message };
 *   }
 * };
 * ```
 */
export type ApplicationError =
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | DatabaseError
  | AuthError
  | NetworkError
  | BusinessLogicError
  | ConfigError;
