/**
 * @fileoverview Cache Service for Performance Optimization
 *
 * This module provides a comprehensive caching service using Redis for
 * performance optimization across the AV-Daily platform. It supports
 * multiple caching strategies, TTL management, and cache invalidation patterns.
 */

import type { Redis } from "ioredis";

import type { RedisClient } from "../redis/redis-client";

import { Context, Effect, Layer, pipe, Data, Duration } from "effect";

import { RedisClient as RedisClientTag } from "../redis/redis-client";

/**
 * Cache entry with metadata.
 */
export interface CacheEntry<T> {
  readonly value: T;
  readonly cachedAt: Date;
  readonly expiresAt: Date;
  readonly tags: readonly string[];
}

/**
 * Cache options for set operations.
 */
export interface CacheOptions {
  readonly ttl?: Duration.Duration;
  readonly tags?: readonly string[];
  readonly compress?: boolean;
}

/**
 * Cache statistics.
 */
export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly totalKeys: number;
  readonly memoryUsage: number;
}

/**
 * Cache invalidation pattern.
 */
export type InvalidationPattern = string | RegExp | readonly string[];

/**
 * Cache errors.
 */
export class CacheError extends Data.TaggedError("CacheError")<{
  readonly operation: string;
  readonly key?: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Cache Service interface.
 */
export interface CacheService {
  /**
   * Get a value from cache.
   */
  readonly get: <T>(key: string) => Effect.Effect<T | null, CacheError>;

  /**
   * Set a value in cache.
   */
  readonly set: <T>(
    key: string,
    value: T,
    options?: CacheOptions
  ) => Effect.Effect<void, CacheError>;

  /**
   * Get or compute a value (cache-aside pattern).
   */
  readonly getOrSet: <T, E>(
    key: string,
    compute: Effect.Effect<T, E>,
    options?: CacheOptions
  ) => Effect.Effect<T, E | CacheError>;

  /**
   * Delete a specific key from cache.
   */
  readonly delete: (key: string) => Effect.Effect<boolean, CacheError>;

  /**
   * Delete multiple keys matching a pattern.
   */
  readonly deletePattern: (
    pattern: InvalidationPattern
  ) => Effect.Effect<number, CacheError>;

  /**
   * Invalidate cache entries by tags.
   */
  readonly invalidateByTags: (
    tags: readonly string[]
  ) => Effect.Effect<number, CacheError>;

  /**
   * Check if a key exists in cache.
   */
  readonly exists: (key: string) => Effect.Effect<boolean, CacheError>;

  /**
   * Get remaining TTL for a key.
   */
  readonly ttl: (key: string) => Effect.Effect<number, CacheError>;

  /**
   * Extend TTL for a key.
   */
  readonly extend: (
    key: string,
    duration: Duration.Duration
  ) => Effect.Effect<boolean, CacheError>;

  /**
   * Get multiple values at once.
   */
  readonly mget: <T>(
    keys: readonly string[]
  ) => Effect.Effect<readonly (T | null)[], CacheError>;

  /**
   * Set multiple values at once.
   */
  readonly mset: <T>(
    entries: readonly { key: string; value: T; options?: CacheOptions }[]
  ) => Effect.Effect<void, CacheError>;

  /**
   * Increment a numeric value.
   */
  readonly increment: (
    key: string,
    value?: number,
    ttl?: Duration.Duration
  ) => Effect.Effect<number, CacheError>;

  /**
   * Decrement a numeric value.
   */
  readonly decrement: (
    key: string,
    value?: number
  ) => Effect.Effect<number, CacheError>;

  /**
   * Get cache statistics.
   */
  readonly getStats: () => Effect.Effect<CacheStats, CacheError>;

  /**
   * Clear all cache entries.
   */
  readonly clear: () => Effect.Effect<void, CacheError>;

  /**
   * Warm cache with precomputed values.
   */
  readonly warm: <T>(
    entries: readonly { key: string; value: T; options?: CacheOptions }[]
  ) => Effect.Effect<number, CacheError>;
}

/**
 * Cache Service tag.
 */
export const CacheService = Context.GenericTag<CacheService>("CacheService");

/**
 * Cache Service implementation using Redis.
 */
class CacheServiceImpl implements CacheService {
  private readonly prefix = "cache:";
  private readonly tagPrefix = "tag:";
  private readonly statsKey = "cache:stats";

  constructor(private readonly redis: Redis) {}

  get<T>(key: string): Effect.Effect<T | null, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const fullKey = self.prefix + key;

        const data = yield* _(
          Effect.tryPromise({
            try: () => self.redis.get(fullKey),
            catch: (error) =>
              new CacheError({
                operation: "get",
                key,
                message: "Failed to get value from cache",
                cause: error,
              }),
          })
        );

        if (!data) {
          yield* _(self.recordMiss());
          return null;
        }

        yield* _(self.recordHit());

        try {
          return JSON.parse(data) as T;
        } catch (error) {
          yield* _(
            Effect.logWarning(`Failed to parse cached value for key: ${key}`),
            Effect.annotateLogs("cache.key", key)
          );
          return null;
        }
      })
    );
  }

  set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Effect.Effect<void, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const fullKey = self.prefix + key;
        const serialized = JSON.stringify(value);
        const ttlSeconds = options?.ttl
          ? Math.floor(Duration.toSeconds(options.ttl))
          : 3600; // Default 1 hour

        yield* _(
          Effect.tryPromise({
            try: () => self.redis.setex(fullKey, ttlSeconds, serialized),
            catch: (error) =>
              new CacheError({
                operation: "set",
                key,
                message: "Failed to set value in cache",
                cause: error,
              }),
          })
        );

        // Store tags if provided
        if (options?.tags && options.tags.length > 0) {
          yield* _(self.storeTags(key, options.tags));
        }

        yield* _(
          Effect.logDebug(`Cached value for key: ${key}`),
          Effect.annotateLogs("cache.key", key),
          Effect.annotateLogs("cache.ttl", ttlSeconds)
        );
      })
    );
  }

  getOrSet<T, E>(
    key: string,
    compute: Effect.Effect<T, E>,
    options?: CacheOptions
  ): Effect.Effect<T, E | CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        // Try to get from cache first
        const cached = yield* _(self.get<T>(key));

        if (cached !== null) {
          return cached;
        }

        // Cache miss, compute the value
        const computed = yield* _(compute);

        // Store in cache
        yield* _(self.set(key, computed, options));

        return computed;
      })
    );
  }

  delete(key: string): Effect.Effect<boolean, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const fullKey = self.prefix + key;

        const result = yield* _(
          Effect.tryPromise({
            try: () => self.redis.del(fullKey),
            catch: (error) =>
              new CacheError({
                operation: "delete",
                key,
                message: "Failed to delete key from cache",
                cause: error,
              }),
          })
        );

        // Clean up tags
        yield* _(self.cleanupTags(key));

        return result > 0;
      })
    );
  }

  deletePattern(
    pattern: InvalidationPattern
  ): Effect.Effect<number, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        let keys: string[];

        if (Array.isArray(pattern)) {
          // Array of specific keys
          keys = pattern.map((k) => self.prefix + k);
        } else if (pattern instanceof RegExp) {
          // RegExp pattern - scan all keys and filter
          const allKeys = yield* _(
            Effect.tryPromise({
              try: () => self.redis.keys(`${self.prefix}*`),
              catch: (error) =>
                new CacheError({
                  operation: "deletePattern",
                  message: "Failed to scan keys",
                  cause: error,
                }),
            })
          );
          keys = allKeys.filter((k) =>
            pattern.test(k.substring(self.prefix.length))
          );
        } else {
          // String pattern
          keys = yield* _(
            Effect.tryPromise({
              try: () => self.redis.keys(self.prefix + pattern),
              catch: (error) =>
                new CacheError({
                  operation: "deletePattern",
                  message: "Failed to scan keys with pattern",
                  cause: error,
                }),
            })
          );
        }

        if (keys.length === 0) {
          return 0;
        }

        const deleted = yield* _(
          Effect.tryPromise({
            try: () => self.redis.del(...keys),
            catch: (error) =>
              new CacheError({
                operation: "deletePattern",
                message: "Failed to delete keys",
                cause: error,
              }),
          })
        );

        yield* _(
          Effect.logInfo(`Deleted ${deleted} keys matching pattern`),
          Effect.annotateLogs("cache.deletedKeys", deleted)
        );

        return deleted;
      })
    );
  }

  invalidateByTags(tags: readonly string[]): Effect.Effect<number, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        let totalDeleted = 0;

        for (const tag of tags) {
          const tagKey = self.tagPrefix + tag;

          // Get all keys associated with this tag
          const keys = yield* _(
            Effect.tryPromise({
              try: () => self.redis.smembers(tagKey),
              catch: (error) =>
                new CacheError({
                  operation: "invalidateByTags",
                  message: `Failed to get keys for tag: ${tag}`,
                  cause: error,
                }),
            })
          );

          if (keys.length > 0) {
            const fullKeys = keys.map((k) => self.prefix + k);
            const deleted = yield* _(
              Effect.tryPromise({
                try: () => self.redis.del(...fullKeys),
                catch: (error) =>
                  new CacheError({
                    operation: "invalidateByTags",
                    message: `Failed to delete keys for tag: ${tag}`,
                    cause: error,
                  }),
              })
            );
            totalDeleted += deleted;
          }

          // Remove the tag set
          yield* _(
            Effect.tryPromise({
              try: () => self.redis.del(tagKey),
              catch: (error) =>
                new CacheError({
                  operation: "invalidateByTags",
                  message: `Failed to delete tag set: ${tag}`,
                  cause: error,
                }),
            })
          );
        }

        yield* _(
          Effect.logInfo(
            `Invalidated ${totalDeleted} keys for ${tags.length} tags`
          ),
          Effect.annotateLogs("cache.invalidatedKeys", totalDeleted),
          Effect.annotateLogs("cache.tags", tags.join(", "))
        );

        return totalDeleted;
      })
    );
  }

  exists(key: string): Effect.Effect<boolean, CacheError> {
    const fullKey = this.prefix + key;

    return pipe(
      Effect.tryPromise({
        try: () => this.redis.exists(fullKey),
        catch: (error) =>
          new CacheError({
            operation: "exists",
            key,
            message: "Failed to check key existence",
            cause: error,
          }),
      }),
      Effect.map((result) => result > 0)
    );
  }

  ttl(key: string): Effect.Effect<number, CacheError> {
    const fullKey = this.prefix + key;

    return Effect.tryPromise({
      try: () => this.redis.ttl(fullKey),
      catch: (error) =>
        new CacheError({
          operation: "ttl",
          key,
          message: "Failed to get TTL",
          cause: error,
        }),
    });
  }

  extend(
    key: string,
    duration: Duration.Duration
  ): Effect.Effect<boolean, CacheError> {
    const fullKey = this.prefix + key;
    const seconds = Math.floor(Duration.toSeconds(duration));

    return pipe(
      Effect.tryPromise({
        try: () => this.redis.expire(fullKey, seconds),
        catch: (error) =>
          new CacheError({
            operation: "extend",
            key,
            message: "Failed to extend TTL",
            cause: error,
          }),
      }),
      Effect.map((result) => result === 1)
    );
  }

  mget<T>(
    keys: readonly string[]
  ): Effect.Effect<readonly (T | null)[], CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const fullKeys = keys.map((k) => self.prefix + k);

        const values = yield* _(
          Effect.tryPromise({
            try: () => self.redis.mget(...fullKeys),
            catch: (error) =>
              new CacheError({
                operation: "mget",
                message: "Failed to get multiple values",
                cause: error,
              }),
          })
        );

        return values.map((v) => {
          if (!v) {
            return null;
          }
          try {
            return JSON.parse(v) as T;
          } catch {
            return null;
          }
        });
      })
    );
  }

  mset<T>(
    entries: readonly { key: string; value: T; options?: CacheOptions }[]
  ): Effect.Effect<void, CacheError> {
    return pipe(
      Effect.forEach(
        entries,
        (entry) => this.set(entry.key, entry.value, entry.options),
        { concurrency: 10 }
      ),
      Effect.asVoid
    );
  }

  increment(
    key: string,
    value = 1,
    ttl?: Duration.Duration
  ): Effect.Effect<number, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const fullKey = self.prefix + key;

        const newValue = yield* _(
          Effect.tryPromise({
            try: () => self.redis.incrby(fullKey, value),
            catch: (error) =>
              new CacheError({
                operation: "increment",
                key,
                message: "Failed to increment value",
                cause: error,
              }),
          })
        );

        if (ttl) {
          yield* _(
            Effect.tryPromise({
              try: () =>
                self.redis.expire(fullKey, Math.floor(Duration.toSeconds(ttl))),
              catch: (error) =>
                new CacheError({
                  operation: "increment",
                  key,
                  message: "Failed to set TTL after increment",
                  cause: error,
                }),
            })
          );
        }

        return newValue;
      })
    );
  }

  decrement(key: string, value = 1): Effect.Effect<number, CacheError> {
    const fullKey = this.prefix + key;

    return Effect.tryPromise({
      try: () => this.redis.decrby(fullKey, value),
      catch: (error) =>
        new CacheError({
          operation: "decrement",
          key,
          message: "Failed to decrement value",
          cause: error,
        }),
    });
  }

  getStats(): Effect.Effect<CacheStats, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        interface CacheStatsData {
          hits?: string;
          misses?: string;
          [key: string]: string | undefined;
        }

        const stats = yield* _(
          Effect.tryPromise({
            try: () =>
              self.redis.hgetall(self.statsKey) as Promise<CacheStatsData>,
            catch: (error) =>
              new CacheError({
                operation: "getStats",
                message: "Failed to get cache statistics",
                cause: error,
              }),
          })
        );

        const hits = Number(stats.hits ?? 0);
        const misses = Number(stats.misses ?? 0);
        const total = hits + misses;
        const hitRate = total > 0 ? (hits / total) * 100 : 0;

        // Get total keys count
        const keys = yield* _(
          Effect.tryPromise({
            try: () => self.redis.keys(`${self.prefix}*`),
            catch: (error) =>
              new CacheError({
                operation: "getStats",
                message: "Failed to count keys",
                cause: error,
              }),
          })
        );

        // Get memory usage (approximate)
        const info = yield* _(
          Effect.tryPromise({
            try: () => self.redis.info("memory"),
            catch: (error) =>
              new CacheError({
                operation: "getStats",
                message: "Failed to get memory info",
                cause: error,
              }),
          })
        );

        const memoryMatch = (info || "").match(/used_memory:(\d+)/);
        const memoryUsage = memoryMatch
          ? Number.parseInt(memoryMatch[1] as string, 10)
          : 0;

        return {
          hits,
          misses,
          hitRate,
          totalKeys: keys.length,
          memoryUsage,
        };
      })
    );
  }

  clear(): Effect.Effect<void, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        // Delete all cache keys
        const keys = yield* _(
          Effect.tryPromise({
            try: () => self.redis.keys(`${self.prefix}*`),
            catch: (error) =>
              new CacheError({
                operation: "clear",
                message: "Failed to scan keys for clearing",
                cause: error,
              }),
          })
        );

        if (keys.length > 0) {
          yield* _(
            Effect.tryPromise({
              try: () => self.redis.del(...keys),
              catch: (error) =>
                new CacheError({
                  operation: "clear",
                  message: "Failed to delete keys",
                  cause: error,
                }),
            })
          );
        }

        // Delete all tag keys
        const tagKeys = yield* _(
          Effect.tryPromise({
            try: () => self.redis.keys(`${self.tagPrefix}*`),
            catch: (error) =>
              new CacheError({
                operation: "clear",
                message: "Failed to scan tag keys",
                cause: error,
              }),
          })
        );

        if (tagKeys.length > 0) {
          yield* _(
            Effect.tryPromise({
              try: () => self.redis.del(...tagKeys),
              catch: (error) =>
                new CacheError({
                  operation: "clear",
                  message: "Failed to delete tag keys",
                  cause: error,
                }),
            })
          );
        }

        // Reset stats
        yield* _(
          Effect.tryPromise({
            try: () => self.redis.del(self.statsKey),
            catch: (error) =>
              new CacheError({
                operation: "clear",
                message: "Failed to reset stats",
                cause: error,
              }),
          })
        );

        yield* _(Effect.logInfo("Cache cleared successfully"));
      })
    );
  }

  warm<T>(
    entries: readonly { key: string; value: T; options?: CacheOptions }[]
  ): Effect.Effect<number, CacheError> {
    const self = this;
    return Effect.gen(function* (_) {
      yield* _(
        Effect.logInfo(`Warming cache with ${entries.length} entries`),
        Effect.annotateLogs("cache.warmingEntries", entries.length)
      );

      yield* _(
        self.mset(entries),
        Effect.catchAll((error) => Effect.fail(error))
      );

      yield* _(
        Effect.logInfo("Cache warming completed"),
        Effect.annotateLogs("cache.warmedEntries", entries.length)
      );

      return entries.length;
    });
  }

  // Private helper methods

  private recordHit(): Effect.Effect<void, never> {
    return pipe(
      Effect.tryPromise({
        try: () => this.redis.hincrby(this.statsKey, "hits", 1),
        catch: () => undefined,
      }),
      Effect.asVoid,
      Effect.catchAll(() => Effect.void)
    );
  }

  private recordMiss(): Effect.Effect<void, never> {
    return pipe(
      Effect.tryPromise({
        try: () => this.redis.hincrby(this.statsKey, "misses", 1),
        catch: () => undefined,
      }),
      Effect.asVoid,
      Effect.catchAll(() => Effect.void)
    );
  }

  private storeTags(
    key: string,
    tags: readonly string[]
  ): Effect.Effect<void, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        for (const tag of tags) {
          const tagKey = self.tagPrefix + tag;
          yield* _(
            Effect.tryPromise({
              try: () => self.redis.sadd(tagKey, key),
              catch: (error) =>
                new CacheError({
                  operation: "storeTags",
                  key,
                  message: `Failed to store tag: ${tag}`,
                  cause: error,
                }),
            })
          );
        }
      })
    );
  }

  private cleanupTags(key: string): Effect.Effect<void, CacheError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        // Get all tag keys
        const tagKeys = yield* _(
          Effect.tryPromise({
            try: () => self.redis.keys(`${self.tagPrefix}*`),
            catch: (error) =>
              new CacheError({
                operation: "cleanupTags",
                key,
                message: "Failed to scan tag keys",
                cause: error,
              }),
          })
        );

        // Remove key from all tag sets
        for (const tagKey of tagKeys) {
          yield* _(
            Effect.tryPromise({
              try: () => self.redis.srem(tagKey, key),
              catch: () => undefined, // Ignore errors
            }),
            Effect.catchAll(() => Effect.void)
          );
        }
      })
    );
  }
}

/**
 * Create Cache Service layer with Redis client dependency.
 */
export const CacheServiceLive: Layer.Layer<CacheService, never, RedisClient> =
  Layer.effect(
    CacheService,
    Effect.gen(function* (_) {
      const { client } = yield* _(RedisClientTag);
      return new CacheServiceImpl(client);
    })
  );
