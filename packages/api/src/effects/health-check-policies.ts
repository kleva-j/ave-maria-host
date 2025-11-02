/**
 * @fileoverview Health Check Timeout and Retry Policies using Effect Patterns
 *
 * This module provides comprehensive timeout and retry policy implementations
 * using Effect's built-in patterns and Schedule combinators. It demonstrates
 * advanced retry strategies with exponential backoff, jitter, and configurable
 * timeout handling.
 */

import type { HealthCheckResult } from "./monitoring";
import type { HealthCheckError } from "./monitoring";

import { Duration, Schedule, Effect, Data, pipe } from "effect";
import { StructuredLogging } from "./logging";

/**
 * Timeout configuration for health checks.
 */
export interface TimeoutConfig {
  readonly duration: Duration.Duration;
  readonly onTimeout?: (
    elapsed: Duration.Duration
  ) => Effect.Effect<HealthCheckResult, HealthCheckError>;
}

/**
 * Simple retry policy configuration.
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelay: Duration.Duration;
  readonly maxDelay: Duration.Duration;
  readonly backoffFactor: number;
  readonly retryableCondition?: (error: unknown) => boolean;
}

/**
 * Health check timeout exception.
 */
export class HealthCheckTimeoutError extends Data.TaggedError(
  "HealthCheckTimeoutError"
)<{
  readonly checkName: string;
  readonly timeout: Duration.Duration;
  readonly elapsed: Duration.Duration;
}> {}

/**
 * Health check retry exhausted exception.
 */
export class RetryExhaustedError extends Data.TaggedError(
  "RetryExhaustedError"
)<{
  readonly checkName: string;
  readonly attempts: number;
  readonly lastError: unknown;
}> {}

/**
 * Health check policies and utilities using Effect patterns.
 */
export namespace HealthCheckPolicies {
  /**
   * Apply timeout to a health check using Effect.timeout.
   */
  export const withTimeout =
    <A, E, R>(config: TimeoutConfig) =>
    (
      effect: Effect.Effect<A, E, R>
    ): Effect.Effect<A, E | HealthCheckTimeoutError, R> =>
      pipe(
        effect,
        Effect.timeout(config.duration),
        Effect.catchTag("TimeoutException", () => {
          const elapsed = config.duration;

          return Effect.fail(
            new HealthCheckTimeoutError({
              checkName: "unknown",
              timeout: config.duration,
              elapsed,
            })
          );
        })
      );

  /**
   * Create a fixed delay retry policy.
   */
  export const fixedDelayPolicy = (
    maxAttempts: number,
    delay: Duration.Duration
  ): RetryPolicy => ({
    maxAttempts,
    initialDelay: delay,
    maxDelay: delay,
    backoffFactor: 1,
  });

  /**
   * Create an exponential backoff retry policy.
   */
  export const exponentialBackoffPolicy = (
    maxAttempts: number,
    initialDelay: Duration.Duration = Duration.millis(100),
    maxDelay: Duration.Duration = Duration.seconds(30)
  ): RetryPolicy => ({
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffFactor: 2,
  });

  /**
   * Apply retry policy to a health check using Effect.retry.
   */
  export const withRetry =
    <A, E, R>(policy: RetryPolicy, checkName = "unknown") =>
    (
      effect: Effect.Effect<A, E, R>
    ): Effect.Effect<A, E | RetryExhaustedError, R> => {
      // Create a simple exponential backoff schedule
      const schedule = pipe(
        Schedule.exponential(policy.initialDelay, policy.backoffFactor),
        Schedule.compose(Schedule.recurs(policy.maxAttempts - 1))
      );

      return pipe(
        Effect.retry(effect, schedule),
        Effect.catchAll((error) =>
          Effect.fail(
            new RetryExhaustedError({
              checkName,
              attempts: policy.maxAttempts,
              lastError: error,
            })
          )
        )
      );
    };

  /**
   * Combine timeout and retry policies.
   */
  export const withTimeoutAndRetry =
    <A, E, R>(
      timeout: Duration.Duration,
      retryPolicy: RetryPolicy,
      checkName = "unknown"
    ) =>
    (
      effect: Effect.Effect<A, E, R>
    ): Effect.Effect<A, E | HealthCheckTimeoutError | RetryExhaustedError, R> =>
      pipe(
        effect,
        withTimeout({ duration: timeout }),
        withRetry(retryPolicy, checkName)
      );

  /**
   * Create a health check with comprehensive error handling.
   */
  export const createRobustHealthCheck = <A, E, R>(
    name: string,
    effect: Effect.Effect<A, E, R>,
    options: {
      timeout: Duration.Duration;
      retryPolicy: RetryPolicy;
      fallback?: Effect.Effect<A, never, R>;
    }
  ): Effect.Effect<A, E | HealthCheckTimeoutError | RetryExhaustedError, R> => {
    const baseEffect = pipe(
      effect,
      withTimeoutAndRetry(options.timeout, options.retryPolicy, name),
      Effect.withLogSpan(`robust-health-check.${name}`),
      StructuredLogging.withMetadata({
        healthCheckName: name,
        timeout: Duration.toMillis(options.timeout),
        maxRetries: options.retryPolicy.maxAttempts,
      })
    );

    return options.fallback
      ? pipe(
          baseEffect,
          Effect.orElse(() => options.fallback as Effect.Effect<A, never, R>)
        )
      : baseEffect;
  };

  /**
   * Create common retry policies with sensible defaults.
   */
  export const CommonPolicies = {
    /**
     * Quick retry policy for fast operations.
     */
    quick: exponentialBackoffPolicy(
      2,
      Duration.millis(50),
      Duration.millis(500)
    ),

    /**
     * Standard retry policy for most health checks.
     */
    standard: exponentialBackoffPolicy(
      3,
      Duration.millis(100),
      Duration.seconds(5)
    ),

    /**
     * Aggressive retry policy for critical health checks.
     */
    aggressive: exponentialBackoffPolicy(
      5,
      Duration.millis(200),
      Duration.seconds(10)
    ),
  };

  /**
   * Utility to create retryable conditions for specific error types.
   */
  export const RetryConditions = {
    /**
     * Retry on timeout errors only.
     */
    timeoutOnly: (error: unknown): boolean =>
      Boolean(
        error &&
          typeof error === "object" &&
          "_tag" in error &&
          (error._tag === "TimeoutException" ||
            error._tag === "HealthCheckTimeoutError")
      ),

    /**
     * Retry on network-related errors.
     */
    networkErrors: (error: unknown): boolean => {
      if (!error || typeof error !== "object") return false;

      const errorString = String(error).toLowerCase();
      return (
        errorString.includes("network") ||
        errorString.includes("connection") ||
        errorString.includes("timeout") ||
        errorString.includes("econnrefused") ||
        errorString.includes("enotfound")
      );
    },

    /**
     * Retry on temporary failures (5xx HTTP status codes, timeouts, network errors).
     */
    temporaryFailures: (error: unknown): boolean => {
      if (
        RetryConditions.networkErrors(error) ||
        RetryConditions.timeoutOnly(error)
      ) {
        return true;
      }

      // Check for HTTP 5xx errors
      if (error && typeof error === "object" && "status" in error) {
        const status = (error as { status: unknown }).status;
        return typeof status === "number" && status >= 500 && status < 600;
      }

      return false;
    },

    /**
     * Never retry (for testing or specific use cases).
     */
    never: (): boolean => false,

    /**
     * Always retry (use with caution).
     */
    always: (): boolean => true,
  };

  /**
   * Create timeout configurations for different scenarios.
   */
  export const TimeoutConfigs = {
    /**
     * Fast timeout for quick operations.
     */
    fast: { duration: Duration.seconds(1) },

    /**
     * Standard timeout for most health checks.
     */
    standard: { duration: Duration.seconds(5) },

    /**
     * Slow timeout for expensive operations.
     */
    slow: { duration: Duration.seconds(15) },

    /**
     * Very slow timeout for database migrations or similar.
     */
    verySlow: { duration: Duration.seconds(60) },

    /**
     * Custom timeout with fallback.
     */
    withFallback: (
      duration: Duration.Duration,
      fallbackResult: HealthCheckResult
    ): TimeoutConfig => ({
      duration,
      onTimeout: () => Effect.succeed(fallbackResult),
    }),
  };
}
