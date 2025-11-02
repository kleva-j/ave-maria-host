/**
 * @fileoverview Advanced Health Check Caching and Performance Optimization
 *
 * This module provides sophisticated caching strategies and performance optimizations
 * for health checks using Effect's Ref and scheduling capabilities. It includes
 * cache warming, invalidation strategies, and performance monitoring.
 */

import {
  type Fiber,
  Duration,
  Schedule,
  Context,
  Effect,
  Queue,
  Layer,
  pipe,
  Ref,
} from "effect";

import type { EnhancedHealthCheckResult } from "./enhanced-health-checks";
import { HealthCheckError } from "./monitoring";
import { StructuredLogging } from "./logging";

/**
 * Cache entry with metadata.
 */
interface CacheEntry {
  readonly result: EnhancedHealthCheckResult;
  readonly cachedAt: Date;
  readonly expiresAt: Date;
  readonly accessCount: number;
  readonly lastAccessed: Date;
  readonly refreshInProgress: boolean;
}

/**
 * Cache statistics for monitoring.
 */
export interface CacheStatistics {
  readonly totalEntries: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number;
  readonly evictionCount: number;
  readonly refreshCount: number;
  readonly averageAccessTime: number;
  readonly memoryUsage: number;
}

/**
 * Cache configuration options.
 */
export interface CacheConfig {
  readonly maxEntries: number;
  readonly defaultTtl: Duration.Duration;
  readonly refreshThreshold: number; // Percentage of TTL when to start background refresh
  readonly evictionPolicy: EvictionPolicy;
  readonly enableStatistics: boolean;
  readonly enableBackgroundRefresh: boolean;
  readonly refreshConcurrency: number;
}

/**
 * Cache eviction policies.
 */
export type EvictionPolicy = "lru" | "lfu" | "ttl" | "random";

/**
 * Cache warming strategy.
 */
export interface WarmingStrategy {
  readonly checkNames: readonly string[];
  readonly interval: Duration.Duration;
  readonly staggerDelay: Duration.Duration;
  readonly onWarmingError?: (
    checkName: string,
    error: unknown
  ) => Effect.Effect<void, never>;
}

/**
 * Cache performance metrics.
 */
interface CacheMetrics {
  readonly hitCount: number;
  readonly missCount: number;
  readonly evictionCount: number;
  readonly refreshCount: number;
  readonly totalAccessTime: number;
  readonly accessCount: number;
}

/**
 * Health check cache interface.
 */
export interface HealthCheckCache {
  readonly get: (
    checkName: string
  ) => Effect.Effect<EnhancedHealthCheckResult | undefined, HealthCheckError>;

  readonly set: (
    checkName: string,
    result: EnhancedHealthCheckResult,
    ttl?: Duration.Duration
  ) => Effect.Effect<void, HealthCheckError>;

  readonly getWithRefresh: (
    checkName: string,
    refreshEffect: Effect.Effect<EnhancedHealthCheckResult, HealthCheckError>
  ) => Effect.Effect<EnhancedHealthCheckResult, HealthCheckError>;

  readonly invalidate: (
    pattern: string | RegExp
  ) => Effect.Effect<number, HealthCheckError>;

  readonly clear: () => Effect.Effect<void, HealthCheckError>;

  readonly warm: (
    strategy: WarmingStrategy,
    healthCheckEffects: Record<
      string,
      Effect.Effect<EnhancedHealthCheckResult, HealthCheckError>
    >
  ) => Effect.Effect<void, HealthCheckError>;

  readonly getStatistics: () => Effect.Effect<
    CacheStatistics,
    HealthCheckError
  >;

  readonly optimize: () => Effect.Effect<number, HealthCheckError>;

  readonly startMaintenance: (
    interval: Duration.Duration
  ) => Effect.Effect<
    Fiber.RuntimeFiber<void, HealthCheckError>,
    HealthCheckError
  >;
}

/**
 * Health check cache service tag.
 */
export const HealthCheckCache =
  Context.GenericTag<HealthCheckCache>("HealthCheckCache");

/**
 * Cache implementation with advanced features.
 */
class HealthCheckCacheImpl implements HealthCheckCache {
  constructor(
    private readonly cacheRef: Ref.Ref<Map<string, CacheEntry>>,
    private readonly metricsRef: Ref.Ref<CacheMetrics>,
    private readonly config: CacheConfig,
    private readonly refreshQueue: Queue.Queue<string>
  ) {}

  get(
    checkName: string
  ): Effect.Effect<EnhancedHealthCheckResult | undefined, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const startTime = Date.now();
        const cache = yield* _(Ref.get(self.cacheRef));
        const entry = cache.get(checkName);

        if (!entry) {
          yield* _(self.recordMiss());
          return undefined;
        }

        const now = new Date();
        if (now > entry.expiresAt) {
          // Entry expired, remove it and record miss
          yield* _(
            Ref.update(self.cacheRef, (cache) => {
              const newCache = new Map(cache);
              newCache.delete(checkName);
              return newCache;
            })
          );
          yield* _(self.recordMiss());
          return undefined;
        }

        // Update access statistics
        yield* _(
          Ref.update(self.cacheRef, (cache) => {
            const newCache = new Map(cache);
            const updatedEntry: CacheEntry = {
              ...entry,
              accessCount: entry.accessCount + 1,
              lastAccessed: now,
            };
            newCache.set(checkName, updatedEntry);
            return newCache;
          })
        );

        const accessTime = Date.now() - startTime;
        yield* _(self.recordHit(accessTime));

        // Check if we should trigger background refresh
        if (self.config.enableBackgroundRefresh) {
          const timeToExpiry = entry.expiresAt.getTime() - now.getTime();
          const totalTtl = entry.expiresAt.getTime() - entry.cachedAt.getTime();
          const refreshThreshold =
            totalTtl * (self.config.refreshThreshold / 100);

          if (timeToExpiry <= refreshThreshold && !entry.refreshInProgress) {
            yield* _(Queue.offer(self.refreshQueue, checkName));
          }
        }

        return entry.result;
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName,
            message: `Failed to get cached health check result: ${checkName}`,
            cause: error,
          })
        )
      )
    );
  }

  set(
    checkName: string,
    result: EnhancedHealthCheckResult,
    ttl?: Duration.Duration
  ): Effect.Effect<void, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const now = new Date();
        const effectiveTtl = ttl || self.config.defaultTtl;
        const expiresAt = new Date(
          now.getTime() + Duration.toMillis(effectiveTtl)
        );

        const entry: CacheEntry = {
          result,
          cachedAt: now,
          expiresAt,
          accessCount: 0,
          lastAccessed: now,
          refreshInProgress: false,
        };

        // Check if we need to evict entries
        const cache = yield* _(Ref.get(self.cacheRef));
        if (cache.size >= self.config.maxEntries) {
          yield* _(self.evictEntries(1));
        }

        yield* _(
          Ref.update(self.cacheRef, (cache) =>
            new Map(cache).set(checkName, entry)
          )
        );

        yield* _(
          pipe(
            Effect.logDebug(`Cached health check result: ${checkName}`),
            StructuredLogging.withMetadata({
              healthCheckName: checkName,
              cacheTtl: Duration.toMillis(effectiveTtl),
              cacheExpiresAt: expiresAt.toISOString(),
              cacheOperation: "set",
            })
          )
        );
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName,
            message: `Failed to cache health check result: ${checkName}`,
            cause: error,
          })
        )
      )
    );
  }

  getWithRefresh(
    checkName: string,
    refreshEffect: Effect.Effect<EnhancedHealthCheckResult, HealthCheckError>
  ): Effect.Effect<EnhancedHealthCheckResult, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const cached = yield* _(self.get(checkName));

        if (cached) {
          return cached;
        }

        // Cache miss, execute refresh effect
        const result = yield* _(refreshEffect);
        yield* _(self.set(checkName, result));
        yield* _(self.recordRefresh());

        return result;
      }),
      Effect.withLogSpan(`cache-refresh.${checkName}`)
    );
  }

  invalidate(
    pattern: string | RegExp
  ): Effect.Effect<number, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const cache = yield* _(Ref.get(self.cacheRef));
        let invalidatedCount = 0;

        const newCache = new Map<string, CacheEntry>();
        for (const [key, entry] of cache) {
          const matches =
            typeof pattern === "string"
              ? key.includes(pattern)
              : pattern.test(key);

          if (matches) {
            invalidatedCount++;
          } else {
            newCache.set(key, entry);
          }
        }

        yield* _(Ref.set(self.cacheRef, newCache));

        yield* _(
          Effect.logInfo(`Invalidated ${invalidatedCount} cache entries`),
          Effect.annotateLogs("cache.pattern", String(pattern)),
          Effect.annotateLogs("cache.invalidatedCount", invalidatedCount)
        );

        return invalidatedCount;
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: "cache",
            message: "Failed to invalidate cache entries",
            cause: error,
          })
        )
      )
    );
  }

  clear(): Effect.Effect<void, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const cache = yield* _(Ref.get(self.cacheRef));
        const entryCount = cache.size;

        yield* _(Ref.set(self.cacheRef, new Map()));
        yield* _(
          Ref.set(self.metricsRef, {
            hitCount: 0,
            missCount: 0,
            evictionCount: 0,
            refreshCount: 0,
            totalAccessTime: 0,
            accessCount: 0,
          })
        );

        yield* _(
          Effect.logInfo(`Cleared cache with ${entryCount} entries`),
          Effect.annotateLogs("cache.clearedEntries", entryCount)
        );
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: "cache",
            message: "Failed to clear cache",
            cause: error,
          })
        )
      )
    );
  }

  warm(
    strategy: WarmingStrategy,
    healthCheckEffects: Record<
      string,
      Effect.Effect<EnhancedHealthCheckResult, HealthCheckError>
    >
  ): Effect.Effect<void, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        yield* _(
          pipe(
            Effect.logInfo("Starting cache warming"),
            StructuredLogging.withMetadata({
              cacheWarmingChecks: strategy.checkNames.length,
              cacheWarmingInterval: Duration.toMillis(strategy.interval),
              cacheOperation: "warming",
            })
          )
        );

        // Warm each health check with staggered delays
        for (const [i, checkName] of strategy.checkNames.entries()) {
          const healthCheckEffect = healthCheckEffects[checkName];

          if (!healthCheckEffect) {
            yield* _(
              Effect.logWarning(
                `No health check effect found for warming: ${checkName}`
              ),
              Effect.annotateLogs("healthCheck.name", checkName)
            );
            continue;
          }

          // Stagger the warming requests
          if (i > 0) {
            yield* _(Effect.sleep(strategy.staggerDelay));
          }

          yield* _(
            pipe(
              healthCheckEffect,
              Effect.flatMap((result) => self.set(checkName, result)),
              Effect.catchAll((error) => {
                if (strategy.onWarmingError) {
                  return strategy.onWarmingError(checkName, error);
                }
                return pipe(
                  Effect.logWarning(`Failed to warm cache for: ${checkName}`),
                  Effect.annotateLogs("healthCheck.name", checkName),
                  Effect.annotateLogs("error", String(error))
                );
              }),
              Effect.withLogSpan(`cache-warming.${checkName}`)
            )
          );
        }

        yield* _(Effect.logInfo("Cache warming completed"));
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: "cache",
            message: "Failed to warm cache",
            cause: error,
          })
        )
      )
    );
  }

  getStatistics(): Effect.Effect<CacheStatistics, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const cache = yield* _(Ref.get(self.cacheRef));
        const metrics = yield* _(Ref.get(self.metricsRef));

        const totalRequests = metrics.hitCount + metrics.missCount;
        const hitRate =
          totalRequests > 0 ? (metrics.hitCount / totalRequests) * 100 : 0;
        const averageAccessTime =
          metrics.accessCount > 0
            ? metrics.totalAccessTime / metrics.accessCount
            : 0;

        // Estimate memory usage (rough calculation)
        const memoryUsage = cache.size * 1024; // Assume ~1KB per entry

        return {
          totalEntries: cache.size,
          hitCount: metrics.hitCount,
          missCount: metrics.missCount,
          hitRate,
          evictionCount: metrics.evictionCount,
          refreshCount: metrics.refreshCount,
          averageAccessTime,
          memoryUsage,
        };
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: "cache",
            message: "Failed to get cache statistics",
            cause: error,
          })
        )
      )
    );
  }

  optimize(): Effect.Effect<number, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const cache = yield* _(Ref.get(self.cacheRef));
        const now = new Date();
        let removedCount = 0;

        const optimizedCache = new Map<string, CacheEntry>();
        for (const [key, entry] of cache) {
          if (now <= entry.expiresAt) {
            optimizedCache.set(key, entry);
          } else {
            removedCount++;
          }
        }

        yield* _(Ref.set(self.cacheRef, optimizedCache));

        yield* _(
          Effect.logDebug(
            `Cache optimization removed ${removedCount} expired entries`
          ),
          Effect.annotateLogs("cache.removedEntries", removedCount),
          Effect.annotateLogs("cache.remainingEntries", optimizedCache.size)
        );

        return removedCount;
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: "cache",
            message: "Failed to optimize cache",
            cause: error,
          })
        )
      )
    );
  }

  startMaintenance(
    interval: Duration.Duration
  ): Effect.Effect<
    Fiber.RuntimeFiber<void, HealthCheckError>,
    HealthCheckError
  > {
    const maintenanceEffect = pipe(
      this.optimize(),
      Effect.flatMap((removedCount) => {
        if (removedCount > 0) {
          return pipe(
            Effect.logDebug("Cache maintenance completed"),
            Effect.annotateLogs("cache.removedEntries", removedCount),
            Effect.as(undefined)
          );
        }
        return Effect.void;
      }),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError("Cache maintenance failed", error),
          Effect.andThen(Effect.fail(error))
        )
      )
    );

    return pipe(
      Effect.schedule(maintenanceEffect, Schedule.fixed(interval)),
      Effect.fork,
      Effect.tap(() =>
        pipe(
          Effect.logInfo("Started cache maintenance"),
          Effect.annotateLogs(
            "cache.maintenanceInterval",
            Duration.toMillis(interval)
          )
        )
      ),
      Effect.map((fiber) => fiber as Fiber.RuntimeFiber<void, HealthCheckError>)
    );
  }

  // Private helper methods

  private recordHit(accessTime: number): Effect.Effect<void, never> {
    return Ref.update(this.metricsRef, (metrics) => ({
      ...metrics,
      hitCount: metrics.hitCount + 1,
      totalAccessTime: metrics.totalAccessTime + accessTime,
      accessCount: metrics.accessCount + 1,
    }));
  }

  private recordMiss(): Effect.Effect<void, never> {
    return Ref.update(this.metricsRef, (metrics) => ({
      ...metrics,
      missCount: metrics.missCount + 1,
    }));
  }

  private recordRefresh(): Effect.Effect<void, never> {
    return Ref.update(this.metricsRef, (metrics) => ({
      ...metrics,
      refreshCount: metrics.refreshCount + 1,
    }));
  }

  private evictEntries(count: number): Effect.Effect<void, never> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const cache = yield* _(Ref.get(self.cacheRef));
        const entries = Array.from(cache.entries());

        // Sort entries based on eviction policy
        const sortedEntries = self.sortForEviction(entries);
        const toEvict = sortedEntries.slice(0, count);

        const newCache = new Map(cache);
        for (const [key, _] of toEvict) {
          newCache.delete(key);
        }

        yield* _(Ref.set(self.cacheRef, newCache));
        yield* _(
          Ref.update(self.metricsRef, (metrics) => ({
            ...metrics,
            evictionCount: metrics.evictionCount + toEvict.length,
          }))
        );
      })
    );
  }

  private sortForEviction(
    entries: [string, CacheEntry][]
  ): [string, CacheEntry][] {
    switch (this.config.evictionPolicy) {
      case "lru":
        return entries.sort(
          (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
        );
      case "lfu":
        return entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      case "ttl":
        return entries.sort(
          (a, b) => a[1].expiresAt.getTime() - b[1].expiresAt.getTime()
        );
      case "random":
        return entries.sort(() => Math.random() - 0.5);
      default:
        return entries;
    }
  }
}

/**
 * Default cache configuration.
 */
export const DefaultCacheConfig: CacheConfig = {
  maxEntries: 1000,
  defaultTtl: Duration.minutes(5),
  refreshThreshold: 80, // Start refresh when 80% of TTL has elapsed
  evictionPolicy: "lru",
  enableStatistics: true,
  enableBackgroundRefresh: true,
  refreshConcurrency: 3,
};

/**
 * Live implementation layer for health check cache.
 */
export const HealthCheckCacheLive: Layer.Layer<HealthCheckCache> = Layer.effect(
  HealthCheckCache,
  Effect.gen(function* (_) {
    const cacheRef = yield* _(Ref.make(new Map<string, CacheEntry>()));
    const metricsRef = yield* _(
      Ref.make<CacheMetrics>({
        hitCount: 0,
        missCount: 0,
        evictionCount: 0,
        refreshCount: 0,
        totalAccessTime: 0,
        accessCount: 0,
      })
    );
    const refreshQueue = yield* _(Queue.unbounded<string>());

    return new HealthCheckCacheImpl(
      cacheRef,
      metricsRef,
      DefaultCacheConfig,
      refreshQueue
    );
  })
);

/**
 * Configurable cache layer.
 */
export const makeHealthCheckCacheLayer = (
  config: Partial<CacheConfig>
): Layer.Layer<HealthCheckCache> =>
  Layer.effect(
    HealthCheckCache,
    Effect.gen(function* (_) {
      const finalConfig = { ...DefaultCacheConfig, ...config };
      const cacheRef = yield* _(Ref.make(new Map<string, CacheEntry>()));
      const metricsRef = yield* _(
        Ref.make<CacheMetrics>({
          hitCount: 0,
          missCount: 0,
          evictionCount: 0,
          refreshCount: 0,
          totalAccessTime: 0,
          accessCount: 0,
        })
      );
      const refreshQueue = yield* _(Queue.unbounded<string>());

      return new HealthCheckCacheImpl(
        cacheRef,
        metricsRef,
        finalConfig,
        refreshQueue
      );
    })
  );

/**
 * Cache utilities and helpers.
 */
export namespace CacheUtils {
  /**
   * Create a warming strategy for critical health checks.
   */
  export const createCriticalWarmingStrategy = (
    checkNames: readonly string[],
    interval = Duration.minutes(1)
  ): WarmingStrategy => ({
    checkNames,
    interval,
    staggerDelay: Duration.millis(100),
    onWarmingError: (checkName, error) =>
      pipe(
        Effect.logError(
          `Critical health check warming failed: ${checkName}`,
          error
        ),
        Effect.annotateLogs("healthCheck.name", checkName),
        Effect.annotateLogs("healthCheck.critical", true)
      ),
  });

  /**
   * Create cache configuration optimized for high-frequency checks.
   */
  export const highFrequencyConfig: CacheConfig = {
    maxEntries: 5000,
    defaultTtl: Duration.seconds(30),
    refreshThreshold: 90,
    evictionPolicy: "lfu",
    enableStatistics: true,
    enableBackgroundRefresh: true,
    refreshConcurrency: 10,
  };

  /**
   * Create cache configuration optimized for low-frequency, expensive checks.
   */
  export const lowFrequencyConfig: CacheConfig = {
    maxEntries: 100,
    defaultTtl: Duration.minutes(30),
    refreshThreshold: 50,
    evictionPolicy: "ttl",
    enableStatistics: true,
    enableBackgroundRefresh: false,
    refreshConcurrency: 1,
  };
}
