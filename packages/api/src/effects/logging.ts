/**
 * @fileoverview Effect.ts Built-in Logging Integration
 *
 * This module provides utilities and configurations for Effect's built-in logging system:
 * - Correlation ID management using Effect's annotation system
 * - Structured logging utilities with Effect.annotateLogs()
 * - Log span utilities for distributed tracing with Effect.withLogSpan()
 * - Integration with application configuration
 *
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { CorrelationId, StructuredLogging, LogSpan } from "@host/api/effects/logging";
 *
 * const program = Effect.gen(function* (_) {
 *   // Use Effect's built-in logging
 *   yield* _(Effect.logInfo("Starting user operation"));
 *
 *   // Add structured context
 *   yield* _(Effect.annotateLogs("userId", "123"));
 *
 *   // Use log spans for tracing
 *   yield* _(Effect.withLogSpan("user-fetch")(
 *     Effect.logDebug("Fetching user data")
 *   ));
 * });
 * ```
 */

import { Effect, FiberRef, pipe, Logger } from "effect";
import type { LoggingConfig } from "./core";

/**
 * Correlation ID type for distributed tracing.
 * Used with Effect's annotation system for request correlation.
 */
export type CorrelationId = string;

/**
 * Log metadata type for structured logging.
 * Used with Effect.annotateLogs() for adding context.
 */
export interface LogMetadata {
  readonly [key: string]: unknown;
}

/**
 * FiberRef for storing correlation ID in the current fiber context.
 * This allows correlation IDs to be automatically included in all log entries.
 */
export const CorrelationIdRef: FiberRef.FiberRef<CorrelationId | undefined> =
  FiberRef.unsafeMake<CorrelationId | undefined>(undefined);

/**
 * Logger configuration utilities for different environments.
 */
export namespace LoggerConfig {
  /**
   * Create a logger based on the logging configuration.
   * Selects the appropriate built-in logger based on format and environment.
   */
  export const createLogger = (config: LoggingConfig) => {
    switch (config.format) {
      case "json":
        return Logger.jsonLogger;
      case "pretty":
        return Logger.prettyLogger();
      default:
        // Default to pretty for development, JSON for production
        return process.env.NODE_ENV === "production"
          ? Logger.jsonLogger
          : Logger.prettyLogger();
    }
  };

  /**
   * Create a development-optimized logger with enhanced readability.
   */
  export const createDevelopmentLogger = () => {
    return Logger.prettyLogger();
  };

  /**
   * Create a production-optimized logger with JSON output.
   */
  export const createProductionLogger = () => {
    return Logger.jsonLogger;
  };

  /**
   * Create a test logger that suppresses most output.
   */
  export const createTestLogger = () => {
    return Logger.stringLogger;
  };
}

/**
 * Logger layer factories for different environments.
 * These provide simple logger configurations that can be used with Effect's runtime.
 *
 * Note: These are logger instances, not layers. Use them when configuring your Effect runtime.
 */
export namespace LoggerLayers {
  /**
   * Development logger with pretty formatting and debug level.
   */
  export const development = LoggerConfig.createDevelopmentLogger();

  /**
   * Production logger with JSON formatting and info level.
   */
  export const production = LoggerConfig.createProductionLogger();

  /**
   * Test logger with minimal output.
   */
  export const test = LoggerConfig.createTestLogger();

  /**
   * Create a logger based on environment.
   */
  export const fromEnvironment = (env?: string) => {
    switch (env || process.env.NODE_ENV) {
      case "production":
        return production;
      case "test":
        return test;
      default:
        return development;
    }
  };
}

/**
 * Correlation ID utilities using Effect's FiberRef system.
 */
export namespace CorrelationId {
  /**
   * Generate a new correlation ID using crypto.randomUUID or fallback.
   */
  export const generate = (): Effect.Effect<CorrelationId> =>
    Effect.sync(() => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback for environments without crypto.randomUUID
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    });

  /**
   * Set the correlation ID for the current fiber context.
   * All subsequent log entries will include this correlation ID.
   */
  export const set = (correlationId: CorrelationId): Effect.Effect<void> =>
    FiberRef.set(CorrelationIdRef, correlationId);

  /**
   * Get the current correlation ID from fiber context.
   */
  export const get = (): Effect.Effect<CorrelationId | undefined> =>
    FiberRef.get(CorrelationIdRef);

  /**
   * Run an Effect with a specific correlation ID.
   * The correlation ID will be automatically included in all log annotations.
   */
  export const withCorrelationId =
    <A, E, R>(correlationId: CorrelationId) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      Effect.gen(function* (_) {
        yield* _(FiberRef.set(CorrelationIdRef, correlationId));
        return yield* _(
          Effect.annotateLogs(effect, "correlationId", correlationId)
        );
      });

  /**
   * Run an Effect with a newly generated correlation ID.
   */
  export const withNewCorrelationId = <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    Effect.gen(function* (_) {
      const correlationId = yield* _(generate());
      yield* _(FiberRef.set(CorrelationIdRef, correlationId));
      return yield* _(
        Effect.annotateLogs(effect, "correlationId", correlationId)
      );
    });
}

/**
 * Structured logging utilities using Effect's built-in annotation system.
 */
export namespace StructuredLogging {
  /**
   * Add structured metadata to all log entries in the given Effect.
   * Uses Effect.annotateLogs() for persistent context.
   */
  export const withMetadata =
    <A, E, R>(metadata: LogMetadata) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
      let annotatedEffect = effect;

      for (const [key, value] of Object.entries(metadata)) {
        annotatedEffect = Effect.annotateLogs(annotatedEffect, key, value);
      }

      return annotatedEffect;
    };

  /**
   * Log an operation with automatic timing and structured context.
   * Uses Effect.withLogSpan() for distributed tracing.
   */
  export const logOperation =
    <A, E, R>(operationName: string, metadata?: LogMetadata) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      pipe(
        effect,
        Effect.withLogSpan(operationName),
        metadata ? withMetadata(metadata) : (x) => x,
        Effect.tap(() =>
          Effect.logInfo(`Starting operation: ${operationName}`)
        ),
        Effect.tapBoth({
          onFailure: (error) =>
            Effect.logError(`Operation failed: ${operationName}`, error),
          onSuccess: () =>
            Effect.logInfo(`Operation completed: ${operationName}`),
        })
      );

  /**
   * Create a request-scoped logging context with correlation ID and metadata.
   */
  export const withRequestContext =
    <A, E, R>(requestId: string, metadata?: LogMetadata) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      pipe(
        effect,
        CorrelationId.withCorrelationId(requestId),
        withMetadata({
          requestId,
          ...metadata,
        }),
        Effect.withLogSpan(`request-${requestId}`)
      );
}

/**
 * Log span utilities for distributed tracing using Effect's built-in spans.
 */
export namespace LogSpan {
  /**
   * Create a named log span for grouping related log messages.
   * Uses Effect.withLogSpan() for automatic span management.
   */
  export const create =
    <A, E, R>(spanName: string) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      Effect.withLogSpan(effect, spanName);

  /**
   * Create a database operation span with automatic timing.
   */
  export const database =
    <A, E, R>(operation: string, table?: string) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
      const spanName = table ? `db.${operation}.${table}` : `db.${operation}`;
      return pipe(
        effect,
        Effect.withLogSpan(spanName),
        Effect.annotateLogs("db.operation", operation),
        table ? Effect.annotateLogs("db.table", table) : (x) => x
      );
    };

  /**
   * Create an API operation span with HTTP context.
   */
  export const api =
    <A, E, R>(method: string, path: string) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      pipe(
        effect,
        Effect.withLogSpan(
          `api.${method.toLowerCase()}.${path.replace(/\//g, ".")}`
        ),
        Effect.annotateLogs("http.method", method),
        Effect.annotateLogs("http.path", path)
      );

  /**
   * Create a service operation span for internal service calls.
   */
  export const service =
    <A, E, R>(serviceName: string, operation: string) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      pipe(
        effect,
        Effect.withLogSpan(`service.${serviceName}.${operation}`),
        Effect.annotateLogs("service.name", serviceName),
        Effect.annotateLogs("service.operation", operation)
      );
}

/**
 * Convenience re-exports of Effect's built-in logging functions.
 * These are the primary logging functions you should use in your application.
 */
export const {
  annotateLogs,
  withLogSpan,
  logWarning,
  logTrace,
  logDebug,
  logError,
  logFatal,
  logInfo,
} = Effect;

/**
 * Utility functions for common logging patterns.
 */
export namespace LoggingUtils {
  /**
   * Log the start and completion of an async operation with timing.
   */
  export const timeOperation =
    <A, E, R>(operationName: string, metadata?: LogMetadata) =>
    (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      pipe(
        Effect.logInfo(`Starting ${operationName}`),
        Effect.andThen(effect),
        Effect.withLogSpan(operationName),
        metadata ? StructuredLogging.withMetadata(metadata) : (x) => x,
        Effect.tap(() => Effect.logInfo(`Completed ${operationName}`))
      );

  /**
   * Log errors with structured context and correlation ID.
   */
  export const logErrorWithContext = (
    message: string,
    error: unknown,
    metadata?: LogMetadata
  ): Effect.Effect<void> =>
    pipe(
      Effect.logError(message, error),
      metadata ? StructuredLogging.withMetadata(metadata) : (x) => x
    );

  /**
   * Create a logger that automatically includes correlation ID from context.
   */
  export const withAutoCorrelation = <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    Effect.gen(function* (_) {
      const correlationId = yield* _(CorrelationId.get());

      if (correlationId) {
        return yield* _(
          Effect.annotateLogs(effect, "correlationId", correlationId)
        );
      }

      return yield* _(effect);
    });
}
