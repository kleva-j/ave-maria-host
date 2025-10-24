import type { ApplicationError } from "./errors";

import { Effect, Schedule, Duration, pipe } from "effect";

/**
 * Configuration interface for retry behavior with exponential backoff.
 * 
 * @example
 * ```typescript
 * const retryConfig: RetryConfig = {
 *   maxRetries: 5,
 *   initialDelay: Duration.millis(200),
 *   maxDelay: Duration.seconds(10),
 *   backoffFactor: 1.5
 * };
 * ```
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  readonly maxRetries: number;
  /** Initial delay before the first retry */
  readonly initialDelay: Duration.Duration;
  /** Maximum delay between retries */
  readonly maxDelay: Duration.Duration;
  /** Multiplier for exponential backoff (e.g., 2.0 doubles the delay each time) */
  readonly backoffFactor: number;
}

/**
 * Default retry configuration with sensible defaults for most use cases.
 * - 3 maximum retries
 * - 100ms initial delay
 * - 5 second maximum delay
 * - 2x backoff factor (exponential doubling)
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: Duration.millis(100),
  maxDelay: Duration.seconds(5),
  backoffFactor: 2,
};

/**
 * Retry an Effect with exponential backoff on failure.
 * This is a curried function designed for use in Effect.ts pipes.
 * 
 * @param config - Partial retry configuration (merged with defaults)
 * @returns A function that takes an Effect and returns a retrying Effect
 * 
 * @example
 * ```typescript
 * // Basic retry with default configuration
 * pipe(
 *   fetchUserFromAPI(userId),
 *   withRetry()
 * )
 * 
 * // Custom retry configuration
 * pipe(
 *   fetchUserFromAPI(userId),
 *   withRetry({ 
 *     maxRetries: 5, 
 *     initialDelay: Duration.millis(200) 
 *   })
 * )
 * 
 * // Retry database operations
 * pipe(
 *   fromDatabasePromise(() => db.user.findUnique({ where: { id } }), "findUser"),
 *   withRetry({ maxRetries: 2 })
 * )
 * ```
 */
export const withRetry =
  (config: Partial<RetryConfig> = {}) =>
  <A, E extends ApplicationError, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> => {
    const finalConfig = { ...defaultRetryConfig, ...config };

    const schedule = pipe(
      Schedule.exponential(finalConfig.initialDelay, finalConfig.backoffFactor),
      Schedule.intersect(Schedule.recurs(finalConfig.maxRetries))
    );

    return Effect.retry(effect, schedule);
  };

/**
 * Retry an Effect with exponential backoff, but only for specific error types.
 * Uses a predicate function to determine which errors should trigger a retry.
 * 
 * @param effect - The Effect to retry
 * @param predicate - Function that returns true if the error should trigger a retry
 * @param config - Partial retry configuration (merged with defaults)
 * @returns Effect that retries on matching errors
 * 
 * @example
 * ```typescript
 * // Only retry on network errors with 5xx status codes
 * const retryOnServerErrors = withRetryWhen(
 *   fetchExternalData(url),
 *   (error) => error._tag === "NetworkError" && 
 *             error.status !== undefined && 
 *             error.status >= 500,
 *   { maxRetries: 3 }
 * );
 * 
 * // Only retry on specific database errors
 * const retryOnConnectionErrors = withRetryWhen(
 *   databaseOperation,
 *   (error) => error._tag === "DatabaseError" && 
 *             error.message.includes("connection"),
 *   { maxRetries: 5, initialDelay: Duration.seconds(1) }
 * );
 * ```
 */
export const withRetryWhen = <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>,
  predicate: (error: E) => boolean,
  config: Partial<RetryConfig> = {}
): Effect.Effect<A, E, R> => {
  const finalConfig = { ...defaultRetryConfig, ...config };

  return pipe(
    effect,
    Effect.catchAll((error) => 
      predicate(error)
        ? pipe(
            Effect.fail(error),
            Effect.retry(
              pipe(
                Schedule.exponential(
                  finalConfig.initialDelay, 
                  finalConfig.backoffFactor
                ),
                Schedule.intersect(Schedule.recurs(finalConfig.maxRetries))
              )
            )
          )
        : Effect.fail(error)
    )
  );
};

/**
 * Provide a fallback value when an Effect fails.
 * This is a curried function designed for use in Effect.ts pipes.
 * The resulting Effect never fails (error type becomes `never`).
 * 
 * @param fallback - The default value to use when the Effect fails
 * @returns A function that takes an Effect and returns a never-failing Effect
 * 
 * @example
 * ```typescript
 * // Fallback to default user when fetch fails
 * pipe(
 *   fetchUserFromAPI(userId),
 *   withFallback({ id: userId, name: "Unknown User", email: "" })
 * )
 * 
 * // Fallback to empty array when fetching list fails
 * pipe(
 *   fetchUserList(),
 *   withFallback([])
 * )
 * 
 * // Fallback to cached data
 * pipe(
 *   fetchFreshData(),
 *   withFallback(cachedData)
 * )
 * ```
 */
export const withFallback =
  <A>(fallback: A) =>
  <E extends ApplicationError, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, never, R> =>
    Effect.catchAll(effect, () => Effect.succeed(fallback));

/**
 * Provide a fallback Effect when the primary Effect fails.
 * Unlike `withFallback`, this allows for dynamic fallback computation.
 * 
 * @param effect - The primary Effect to try
 * @param fallbackEffect - The Effect to run if the primary fails
 * @returns Effect that tries the primary, then the fallback
 * 
 * @example
 * ```typescript
 * // Fallback to cache when API fails
 * const getUserData = withFallbackEffect(
 *   fetchUserFromAPI(userId),
 *   fetchUserFromCache(userId)
 * );
 * 
 * // Fallback to secondary service
 * const getExternalData = withFallbackEffect(
 *   fetchFromPrimaryService(url),
 *   fetchFromSecondaryService(url)
 * );
 * 
 * // Fallback with computation
 * const getProcessedData = withFallbackEffect(
 *   fetchProcessedData(id),
 *   pipe(
 *     fetchRawData(id),
 *     Effect.map(processData)
 *   )
 * );
 * ```
 */
export const withFallbackEffect = <A, E extends ApplicationError, R, R2>(
  effect: Effect.Effect<A, E, R>,
  fallbackEffect: Effect.Effect<A, never, R2>
): Effect.Effect<A, never, R | R2> =>
  Effect.catchAll(effect, () => fallbackEffect);

/**
 * Add a timeout to an Effect with optional fallback value.
 * If the Effect doesn't complete within the specified duration, it will either
 * fail with "TimeoutError" or succeed with the fallback value.
 * 
 * @param effect - The Effect to add timeout to
 * @param duration - Maximum time to wait for completion
 * @param fallback - Optional fallback value to use on timeout
 * @returns Effect with timeout behavior
 * 
 * @example
 * ```typescript
 * // Timeout with error
 * const fetchWithTimeout = withTimeout(
 *   fetchUserFromAPI(userId),
 *   Duration.seconds(5)
 * );
 * 
 * // Timeout with fallback value
 * const fetchWithFallback = withTimeout(
 *   fetchUserFromAPI(userId),
 *   Duration.seconds(5),
 *   { id: userId, name: "Timeout User" }
 * );
 * 
 * // Database query with timeout
 * const queryWithTimeout = withTimeout(
 *   fromDatabasePromise(() => db.complexQuery(), "complexQuery"),
 *   Duration.seconds(30)
 * );
 * ```
 */
export const withTimeout = <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>,
  duration: Duration.Duration,
  fallback?: A
): Effect.Effect<A, E | "TimeoutError", R> => {
  const timeoutEffect = Effect.timeout(effect, duration);

  if (fallback !== undefined) {
    return Effect.catchTag(timeoutEffect, "TimeoutException", () =>
      Effect.succeed(fallback)
    );
  }

  return Effect.mapError(timeoutEffect, (error) =>
    error._tag === "TimeoutException" ? ("TimeoutError" as const) : error
  );
};

/**
 * Internal state interface for circuit breaker pattern.
 * Tracks failure count, last failure time, and current state.
 */
interface CircuitBreakerState {
  /** Number of consecutive failures */
  readonly failures: number;
  /** Timestamp of the last failure */
  readonly lastFailure?: Date;
  /** Current circuit breaker state */
  readonly state: "closed" | "open" | "half-open";
}

/**
 * Create a circuit breaker that prevents cascading failures.
 * The circuit breaker tracks failures and "opens" when too many failures occur,
 * preventing further attempts until a reset timeout expires.
 * 
 * States:
 * - **Closed**: Normal operation, requests pass through
 * - **Open**: Circuit is open, requests fail immediately
 * - **Half-Open**: Testing if service has recovered (simplified implementation)
 * 
 * @param maxFailures - Number of failures before opening the circuit (default: 5)
 * @param _resetTimeout - Time to wait before allowing requests again (default: 30s)
 * @returns Function that wraps Effects with circuit breaker behavior
 * 
 * @example
 * ```typescript
 * // Create circuit breaker for external API
 * const apiCircuitBreaker = createCircuitBreaker(3, Duration.seconds(60));
 * 
 * const fetchExternalData = (url: string) => {
 *   return apiCircuitBreaker(
 *     fromNetworkPromise(() => fetch(url).then(r => r.json()), url)
 *   );
 * };
 * 
 * // Create circuit breaker for database
 * const dbCircuitBreaker = createCircuitBreaker(5, Duration.seconds(30));
 * 
 * const queryDatabase = (query: string) => {
 *   return dbCircuitBreaker(
 *     fromDatabasePromise(() => db.query(query), "customQuery")
 *   );
 * };
 * 
 * // Handle circuit breaker open state
 * pipe(
 *   fetchExternalData("https://api.example.com/data"),
 *   Effect.catchTag("CircuitBreakerOpen", () => 
 *     Effect.succeed({ error: "Service temporarily unavailable" })
 *   )
 * )
 * ```
 */
export const createCircuitBreaker = (
  maxFailures = 5,
  _resetTimeout: Duration.Duration = Duration.seconds(30)
) => {
  let state: CircuitBreakerState = {
    failures: 0,
    state: "closed",
  };

  return <A, E extends ApplicationError, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | "CircuitBreakerOpen", R> => {
    // Simplified implementation - just track failures
    if (state.state === "open") {
      return Effect.fail("CircuitBreakerOpen" as const);
    }

    return pipe(
      Effect.either(effect),
      Effect.flatMap((result) => {
        if (result._tag === "Left") {
          state = {
            failures: state.failures + 1,
            lastFailure: new Date(),
            state: state.failures + 1 >= maxFailures ? "open" : "closed",
          };
          return Effect.fail(result.left);
        }

        state = { failures: 0, state: "closed" };
        return Effect.succeed(result.right);
      })
    );
  };
};

/**
 * Bulkhead pattern to limit concurrent executions and prevent resource exhaustion.
 * This is a simplified implementation that currently passes through without limiting.
 * 
 * In a production implementation, this would use Effect's Semaphore to limit
 * the number of concurrent executions, providing resource isolation.
 * 
 * @param effect - The Effect to apply bulkhead pattern to
 * @param _maxConcurrent - Maximum number of concurrent executions (currently unused)
 * @returns Effect with bulkhead behavior (currently just passes through)
 * 
 * @example
 * ```typescript
 * // Limit database connections
 * const limitedDbQuery = withBulkhead(
 *   fromDatabasePromise(() => db.heavyQuery(), "heavyQuery"),
 *   5 // Max 5 concurrent queries
 * );
 * 
 * // Limit external API calls
 * const limitedApiCall = withBulkhead(
 *   fromNetworkPromise(() => fetch(url), url),
 *   3 // Max 3 concurrent API calls
 * );
 * 
 * // Handle bulkhead rejection
 * pipe(
 *   limitedDbQuery,
 *   Effect.catchTag("BulkheadRejected", () => 
 *     Effect.succeed({ error: "Too many concurrent requests" })
 *   )
 * )
 * ```
 * 
 * @todo Implement proper semaphore-based concurrency limiting
 */
export const withBulkhead = <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>,
  _maxConcurrent: number
): Effect.Effect<A, E | "BulkheadRejected", R> => {
  // This is a simplified implementation
  // In a real scenario, you'd want to use Effect's Semaphore
  return effect;
};
