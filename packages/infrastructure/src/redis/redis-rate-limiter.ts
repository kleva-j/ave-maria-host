/**
 * @fileoverview Redis-Based Rate Limiter Service
 *
 * This module provides a Redis-backed rate limiter using the sliding window algorithm
 * for accurate and distributed rate limiting across multiple servers.
 *
 * ## Features:
 * - **Sliding Window Algorithm**: Accurate rate limiting without fixed time buckets
 * - **Atomic Operations**: Thread-safe using Redis transactions
 * - **Automatic Cleanup**: Expired entries are automatically removed
 * - **Distributed**: Works across multiple server instances
 *
 * ## Algorithm:
 * Uses Redis sorted sets where:
 * - Score: Timestamp of the request
 * - Member: Unique request ID
 *
 * For each request:
 * 1. Remove expired entries (older than the time window)
 * 2. Count remaining entries
 * 3. If under limit, add new entry
 * 4. Return success/failure
 */

import type { Redis } from "ioredis";

import { Effect, Context, Layer, Data } from "effect";

import { RedisClient } from "./redis-client";

// ============================================================================
// Error Types
// ============================================================================

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends Data.TaggedError(
  "RateLimitExceededError"
)<{
  readonly key: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly retryAfter: Date;
}> {}

/**
 * Rate limiter error for general failures
 */
export class RateLimiterError extends Data.TaggedError("RateLimiterError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Rate Limiter Service Interface
// ============================================================================

/**
 * Redis-based rate limiter service interface
 */
export interface RedisRateLimiterService {
  /**
   * Check if a request is allowed and increment the counter if so
   *
   * @param key - Unique identifier for the rate limit (e.g., "email:verification:user@example.com")
   * @param limit - Maximum number of requests allowed in the time window
   * @param windowMs - Time window in milliseconds
   * @returns Effect that succeeds if request is allowed, fails with RateLimitExceededError if not
   */
  readonly checkLimit: (
    key: string,
    limit: number,
    windowMs: number
  ) => Effect.Effect<void, RateLimitExceededError | RateLimiterError>;

  /**
   * Get the number of remaining requests for a key
   *
   * @param key - Unique identifier for the rate limit
   * @param limit - Maximum number of requests allowed in the time window
   * @param windowMs - Time window in milliseconds
   * @returns Effect with the number of remaining requests
   */
  readonly getRemainingRequests: (
    key: string,
    limit: number,
    windowMs: number
  ) => Effect.Effect<number, RateLimiterError>;

  /**
   * Reset the rate limit for a key (admin operation)
   *
   * @param key - Unique identifier for the rate limit
   * @returns Effect that completes when the limit is reset
   */
  readonly resetLimit: (key: string) => Effect.Effect<void, RateLimiterError>;

  /**
   * Get the retry-after timestamp for a rate-limited key
   *
   * @param key - Unique identifier for the rate limit
   * @param windowMs - Time window in milliseconds
   * @returns Effect with the Date when the limit will reset, or null if not rate limited
   */
  readonly getRetryAfter: (
    key: string,
    windowMs: number
  ) => Effect.Effect<Date | null, RateLimiterError>;
}

/**
 * Redis rate limiter service tag
 */
export const RedisRateLimiterService =
  Context.GenericTag<RedisRateLimiterService>("RedisRateLimiterService");

// ============================================================================
// Implementation
// ============================================================================

/**
 * Redis rate limiter implementation using sliding window algorithm
 */
class RedisRateLimiterServiceImpl implements RedisRateLimiterService {
  constructor(private readonly redis: Redis) {}

  checkLimit = (
    key: string,
    limit: number,
    windowMs: number
  ): Effect.Effect<void, RateLimitExceededError | RateLimiterError> =>
    Effect.gen(this, function* () {
      const now = Date.now();
      const windowStart = now - windowMs;
      const redisKey = `ratelimit:${key}`;

      try {
        // Use Redis transaction for atomic operations
        const multi = this.redis.multi();

        // 1. Remove expired entries
        multi.zremrangebyscore(redisKey, 0, windowStart);

        // 2. Count current entries
        multi.zcard(redisKey);

        // 3. Add new entry (we'll remove it if over limit)
        const requestId = `${now}:${Math.random()}`;
        multi.zadd(redisKey, now, requestId);

        // 4. Set expiration on the key
        multi.expire(redisKey, Math.ceil(windowMs / 1000));

        // Execute transaction
        const results = yield* Effect.tryPromise({
          try: () => multi.exec(),
          catch: (error) =>
            new RateLimiterError({
              message: "Failed to execute rate limit check",
              cause: error,
            }),
        });

        if (!results) {
          return yield* Effect.fail(
            new RateLimiterError({
              message: "Redis transaction returned null",
            })
          );
        }

        // Extract count from results (index 1 is zcard result)
        const countResult = results[1];
        if (!countResult || countResult[0]) {
          return yield* Effect.fail(
            new RateLimiterError({
              message: "Failed to get current count",
              cause: countResult?.[0],
            })
          );
        }

        const currentCount = countResult[1] as number;

        // Check if over limit (currentCount includes the entry we just added)
        if (currentCount > limit) {
          // Remove the entry we just added since we're over limit
          yield* Effect.tryPromise({
            try: () => this.redis.zrem(redisKey, requestId),
            catch: (error) =>
              new RateLimiterError({
                message: "Failed to remove excess entry",
                cause: error,
              }),
          });

          // Get the oldest entry to calculate retry-after
          const oldestEntry = yield* Effect.tryPromise({
            try: () => this.redis.zrange(redisKey, 0, 0, "WITHSCORES"),
            catch: (error) =>
              new RateLimiterError({
                message: "Failed to get oldest entry",
                cause: error,
              }),
          });

          const oldestTimestamp =
            oldestEntry.length >= 2 && oldestEntry[1] !== undefined
              ? Number.parseInt(oldestEntry[1], 10)
              : now - windowMs;
          const retryAfter = new Date(oldestTimestamp + windowMs);

          return yield* Effect.fail(
            new RateLimitExceededError({
              key,
              limit,
              windowMs,
              retryAfter,
            })
          );
        }

        // Request is allowed
        return yield* Effect.succeed(undefined);
      } catch (error) {
        return yield* Effect.fail(
          new RateLimiterError({
            message: "Unexpected error in rate limit check",
            cause: error,
          })
        );
      }
    });

  getRemainingRequests = (
    key: string,
    limit: number,
    windowMs: number
  ): Effect.Effect<number, RateLimiterError> =>
    Effect.gen(this, function* () {
      const now = Date.now();
      const windowStart = now - windowMs;
      const redisKey = `ratelimit:${key}`;

      // Remove expired entries and count remaining
      const multi = this.redis.multi();
      multi.zremrangebyscore(redisKey, 0, windowStart);
      multi.zcard(redisKey);

      const results = yield* Effect.tryPromise({
        try: () => multi.exec(),
        catch: (error) =>
          new RateLimiterError({
            message: "Failed to get remaining requests",
            cause: error,
          }),
      });

      if (!results) {
        return yield* Effect.fail(
          new RateLimiterError({
            message: "Redis transaction returned null",
          })
        );
      }

      const countResult = results[1];
      if (!countResult || countResult[0]) {
        return yield* Effect.fail(
          new RateLimiterError({
            message: "Failed to get current count",
            cause: countResult?.[0],
          })
        );
      }

      const currentCount = countResult[1] as number;
      const remaining = Math.max(0, limit - currentCount);

      return yield* Effect.succeed(remaining);
    });

  resetLimit = (key: string): Effect.Effect<void, RateLimiterError> =>
    Effect.gen(this, function* () {
      const redisKey = `ratelimit:${key}`;

      yield* Effect.tryPromise({
        try: () => this.redis.del(redisKey),
        catch: (error) =>
          new RateLimiterError({
            message: "Failed to reset rate limit",
            cause: error,
          }),
      });

      return yield* Effect.succeed(undefined);
    });

  getRetryAfter = (
    key: string,
    windowMs: number
  ): Effect.Effect<Date | null, RateLimiterError> =>
    Effect.gen(this, function* () {
      const redisKey = `ratelimit:${key}`;

      // Get the oldest entry
      const oldestEntry = yield* Effect.tryPromise({
        try: () => this.redis.zrange(redisKey, 0, 0, "WITHSCORES"),
        catch: (error) =>
          new RateLimiterError({
            message: "Failed to get retry-after time",
            cause: error,
          }),
      });

      if (oldestEntry.length < 2) {
        return yield* Effect.succeed(null);
      }

      const oldestTimestamp = Number.parseInt(oldestEntry[1] as string, 10);
      const retryAfter = new Date(oldestTimestamp + windowMs);

      return yield* Effect.succeed(retryAfter);
    });
}

// ============================================================================
// Layer
// ============================================================================

/**
 * Live implementation of Redis rate limiter service
 * Requires RedisClient to be provided
 */
export const RedisRateLimiterServiceLive: Layer.Layer<
  RedisRateLimiterService,
  never,
  RedisClient
> = Layer.effect(
  RedisRateLimiterService,
  Effect.gen(function* () {
    const redisClient = yield* RedisClient;
    return new RedisRateLimiterServiceImpl(redisClient.client);
  })
);
