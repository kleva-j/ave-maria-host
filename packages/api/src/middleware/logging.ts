/**
 * @fileoverview Logging Middleware
 *
 * This module provides structured logging for API requests and responses.
 * It helps with debugging, monitoring, and auditing API usage.
 *
 * ## Key Features:
 * - **Request Logging**: Log all incoming requests with context
 * - **Response Logging**: Log responses with timing information
 * - **Error Logging**: Detailed error logging with stack traces
 * - **Performance Tracking**: Track request duration and performance metrics
 * - **Audit Trail**: Maintain audit logs for financial operations
 */

import { Effect, Context, Layer } from "effect";

// ============================================================================
// Logger Service
// ============================================================================

/**
 * Log level enumeration
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log entry structure
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
  readonly error?: unknown;
}

/**
 * Logger service interface
 */
export interface LoggerService {
  /**
   * Log a debug message
   */
  readonly debug: (message: string, context?: Record<string, unknown>) => Effect.Effect<void>;

  /**
   * Log an info message
   */
  readonly info: (message: string, context?: Record<string, unknown>) => Effect.Effect<void>;

  /**
   * Log a warning message
   */
  readonly warn: (message: string, context?: Record<string, unknown>) => Effect.Effect<void>;

  /**
   * Log an error message
   */
  readonly error: (
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log an audit event (for financial operations)
   */
  readonly audit: (
    event: string,
    userId: string,
    details: Record<string, unknown>
  ) => Effect.Effect<void>;
}

export const LoggerService = Context.GenericTag<LoggerService>("LoggerService");

// ============================================================================
// Console Logger Implementation
// ============================================================================

/**
 * Console-based logger implementation
 * In production, this should be replaced with a proper logging service
 */
export const ConsoleLoggerLive: Layer.Layer<LoggerService> = Layer.succeed(
  LoggerService,
  LoggerService.of({
    debug: (message, context) =>
      Effect.sync(() => {
        console.debug(`[DEBUG] ${message}`, context);
      }),

    info: (message, context) =>
      Effect.sync(() => {
        console.info(`[INFO] ${message}`, context);
      }),

    warn: (message, context) =>
      Effect.sync(() => {
        console.warn(`[WARN] ${message}`, context);
      }),

    error: (message, error, context) =>
      Effect.sync(() => {
        console.error(`[ERROR] ${message}`, { error, context });
      }),

    audit: (event, userId, details) =>
      Effect.sync(() => {
        console.log(`[AUDIT] ${event}`, {
          userId,
          timestamp: new Date().toISOString(),
          ...details,
        });
      }),
  })
);

// ============================================================================
// Logging Middleware
// ============================================================================

/**
 * Log request start
 */
export const logRequestStart = (
  endpoint: string,
  userId?: string
) =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggerService);

    yield* _(
      logger.info(`Request started: ${endpoint}`, {
        endpoint,
        userId,
        timestamp: new Date().toISOString(),
      })
    );
  });

/**
 * Log request completion
 */
export const logRequestComplete = (
  endpoint: string,
  userId?: string,
  duration?: number
) =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggerService);

    yield* _(
      logger.info(`Request completed: ${endpoint}`, {
        endpoint,
        userId,
        duration,
        timestamp: new Date().toISOString(),
      })
    );
  });

/**
 * Log request error
 */
export const logRequestError = (
  endpoint: string,
  error: unknown,
  userId?: string
) =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggerService);

    yield* _(
      logger.error(`Request failed: ${endpoint}`, error, {
        endpoint,
        userId,
        timestamp: new Date().toISOString(),
      })
    );
  });

/**
 * Log audit event for financial operations
 */
export const logAuditEvent = (
  event: string,
  userId: string,
  details: Record<string, unknown>
) =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggerService);

    yield* _(logger.audit(event, userId, details));
  });

/**
 * Wrap an effect with request logging
 */
export const withRequestLogging = <A, E, R>(
  endpoint: string,
  userId: string | undefined,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | LoggerService> => {
  const startTime = Date.now();

  return Effect.gen(function* (_) {
    // Log request start
    yield* _(logRequestStart(endpoint, userId));

    // Execute the effect
    const result = yield* _(
      effect.pipe(
        Effect.tapError((error) => logRequestError(endpoint, error, userId))
      )
    );

    // Log request completion
    const duration = Date.now() - startTime;
    yield* _(logRequestComplete(endpoint, userId, duration));

    return result;
  });
};
