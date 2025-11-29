/**
 * @fileoverview Tests for Redis Rate Limiter Service
 *
 * This module contains comprehensive tests for the Redis-based rate limiter
 * using the sliding window algorithm.
 */

import type { Redis } from "ioredis";

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect, Layer } from "effect";

import { RedisClient } from "../redis-client";
import {
  RedisRateLimiterServiceLive,
  RedisRateLimiterService,
  RateLimitExceededError,
} from "../redis-rate-limiter";

// Mock Redis client for testing
class MockRedis {
  private data: Map<string, Array<[string, number]>> = new Map();

  async multi() {
    const commands: Array<() => Promise<any>> = [];
    const results: Array<[Error | null, any]> = [];

    return {
      zremrangebyscore: (key: string, min: number, max: number) => {
        commands.push(async () => {
          const entries = this.data.get(key) || [];
          const filtered = entries.filter(
            ([_member, score]) => score < min || score > max
          );
          this.data.set(key, filtered);
          return filtered.length;
        });
        return this;
      },
      zcard: (key: string) => {
        commands.push(async () => {
          const entries = this.data.get(key) || [];
          return entries.length;
        });
        return this;
      },
      zadd: (key: string, score: number, member: string) => {
        commands.push(async () => {
          const entries = this.data.get(key) || [];
          entries.push([member, score]);
          this.data.set(key, entries);
          return 1;
        });
        return this;
      },
      expire: (_key: string, _seconds: number) => {
        commands.push(async () => 1);
        return this;
      },
      exec: async () => {
        for (const cmd of commands) {
          try {
            const result = await cmd();
            results.push([null, result]);
          } catch (error) {
            results.push([error as Error, null]);
          }
        }
        return results;
      },
    };
  }

  async del(key: string) {
    this.data.delete(key);
    return 1;
  }

  async zrange(key: string, start: number, stop: number, _withScores?: string) {
    const entries = this.data.get(key) || [];
    const slice = entries.slice(start, stop + 1);
    const result: any[] = [];
    for (const [member, score] of slice) {
      result.push(member, score.toString());
    }
    return result;
  }

  async zrem(key: string, member: string) {
    const entries = this.data.get(key) || [];
    const filtered = entries.filter(([m]) => m !== member);
    this.data.set(key, filtered);
    return entries.length - filtered.length;
  }

  clear() {
    this.data.clear();
  }
}

describe("RedisRateLimiterService", () => {
  let mockRedis: MockRedis;
  let rateLimiter: RedisRateLimiterService;

  beforeEach(async () => {
    mockRedis = new MockRedis();

    // Create a test layer with the mock Redis client
    const testRedisClientLayer = Layer.succeed(RedisClient, {
      client: mockRedis as unknown as Redis,
    });

    const testRateLimiterLayer = RedisRateLimiterServiceLive.pipe(
      Layer.provide(testRedisClientLayer)
    );

    rateLimiter = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* RedisRateLimiterService;
      }).pipe(Effect.provide(testRateLimiterLayer))
    );
  });

  afterEach(() => {
    mockRedis.clear();
  });

  describe("checkLimit", () => {
    it("should allow requests under the limit", async () => {
      const key = "test:user1";
      const limit = 3;
      const windowMs = 1000;

      // First request should succeed
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));

      // Second request should succeed
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));

      // Third request should succeed
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
    });

    it("should reject requests over the limit", async () => {
      const key = "test:user2";
      const limit = 2;
      const windowMs = 1000;

      // First two requests should succeed
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));

      // Third request should fail
      const result = await Effect.runPromise(
        rateLimiter.checkLimit(key, limit, windowMs).pipe(Effect.either)
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(RateLimitExceededError);
        expect(result.left.key).toBe(key);
        expect(result.left.limit).toBe(limit);
      }
    });

    it("should allow requests after the window expires", async () => {
      const key = "test:user3";
      const limit = 2;
      const windowMs = 100; // 100ms window

      // Fill the limit
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow new request after window expires
      // Note: In a real implementation, expired entries would be cleaned up
      // For this test, we're just verifying the logic works
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
    });

    it("should handle different keys independently", async () => {
      const limit = 2;
      const windowMs = 1000;

      // Fill limit for user1
      await Effect.runPromise(
        rateLimiter.checkLimit("test:user1", limit, windowMs)
      );
      await Effect.runPromise(
        rateLimiter.checkLimit("test:user1", limit, windowMs)
      );

      // user2 should still be able to make requests
      await Effect.runPromise(
        rateLimiter.checkLimit("test:user2", limit, windowMs)
      );
      await Effect.runPromise(
        rateLimiter.checkLimit("test:user2", limit, windowMs)
      );
    });
  });

  describe("getRemainingRequests", () => {
    it("should return the correct number of remaining requests", async () => {
      const key = "test:user4";
      const limit = 5;
      const windowMs = 1000;

      // Initially should have full limit
      const remaining1 = await Effect.runPromise(
        rateLimiter.getRemainingRequests(key, limit, windowMs)
      );
      expect(remaining1).toBe(5);

      // After one request
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
      const remaining2 = await Effect.runPromise(
        rateLimiter.getRemainingRequests(key, limit, windowMs)
      );
      expect(remaining2).toBe(4);

      // After two more requests
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
      const remaining3 = await Effect.runPromise(
        rateLimiter.getRemainingRequests(key, limit, windowMs)
      );
      expect(remaining3).toBe(2);
    });

    it("should return 0 when limit is exceeded", async () => {
      const key = "test:user5";
      const limit = 2;
      const windowMs = 1000;

      // Fill the limit
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));

      const remaining = await Effect.runPromise(
        rateLimiter.getRemainingRequests(key, limit, windowMs)
      );
      expect(remaining).toBe(0);
    });
  });

  describe("resetLimit", () => {
    it("should reset the rate limit for a key", async () => {
      const key = "test:user6";
      const limit = 2;
      const windowMs = 1000;

      // Fill the limit
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));

      // Reset the limit
      await Effect.runPromise(rateLimiter.resetLimit(key));

      // Should be able to make requests again
      const remaining = await Effect.runPromise(
        rateLimiter.getRemainingRequests(key, limit, windowMs)
      );
      expect(remaining).toBe(limit);

      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));
    });
  });

  describe("getRetryAfter", () => {
    it("should return null when no rate limit is active", async () => {
      const key = "test:user7";
      const windowMs = 1000;

      const retryAfter = await Effect.runPromise(
        rateLimiter.getRetryAfter(key, windowMs)
      );
      expect(retryAfter).toBeNull();
    });

    it("should return a future date when rate limited", async () => {
      const key = "test:user8";
      const limit = 1;
      const windowMs = 1000;

      // Make a request to start the window
      await Effect.runPromise(rateLimiter.checkLimit(key, limit, windowMs));

      const retryAfter = await Effect.runPromise(
        rateLimiter.getRetryAfter(key, windowMs)
      );

      expect(retryAfter).not.toBeNull();
      if (retryAfter) {
        expect(retryAfter.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });
});
