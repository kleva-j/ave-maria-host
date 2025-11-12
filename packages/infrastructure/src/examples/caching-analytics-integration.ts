/**
 * @fileoverview Integration Examples for Caching and Analytics Infrastructure
 *
 * This module demonstrates how to integrate the caching and analytics services
 * with the AV-Daily application, including common patterns and best practices.
 */

import type { MetricLabels } from "@host/api/effects/enhanced-types";

import { Effect, Layer, pipe, Duration, Schedule } from "effect";

import { createRedisHealthCheck } from "../monitoring/health-checks.js";
import { CacheService } from "../cache/cache-service.js";
import { RedisClient } from "..";

import {
  type AnalyticsMetric,
  RedisAnalyticsService,
} from "../analytics/redis-analytics-service.js";

import {
  type HealthCheckConfig,
  EnhancedHealthCheckRegistry,
  MonitoringService,
  HealthCheckError,
} from "@host/api";

/**
 * Example: Track a contribution transaction with caching and analytics.
 */
export const trackContributionExample = (
  userId: string,
  planId: string,
  amount: number
) =>
  Effect.gen(function* (_) {
    const analytics = yield* _(RedisAnalyticsService);
    const cache = yield* _(CacheService);
    const monitoring = yield* _(MonitoringService);

    // Record the contribution metric
    const metric: AnalyticsMetric = {
      type: "contribution",
      value: amount,
      userId,
      metadata: { planId },
      timestamp: new Date(),
    };

    yield* _(
      monitoring.monitorOperation(
        "track-contribution",
        analytics.recordMetric(metric)
      )
    );

    // Invalidate user's cached analytics
    yield* _(cache.invalidateByTags([`user:${userId}`, "analytics"]));

    // Track user activity for streak calculation
    yield* _(analytics.trackUserActivity(userId, "contribution"));

    yield* _(
      Effect.logInfo("Contribution tracked successfully"),
      Effect.annotateLogs("userId", userId),
      Effect.annotateLogs("amount", amount)
    );
  });

/**
 * Example: Get user analytics with caching.
 */
export const getUserAnalyticsWithCache = (userId: string) =>
  Effect.gen(function* (_) {
    const analytics = yield* _(RedisAnalyticsService);
    const cache = yield* _(CacheService);

    const cacheKey = `user:${userId}:analytics`;

    // Try to get from cache first, compute if not found
    const userAnalytics = yield* _(
      cache.getOrSet(cacheKey, analytics.getUserAnalytics(userId), {
        ttl: Duration.minutes(5),
        tags: [`user:${userId}`, "analytics"],
      })
    );

    return userAnalytics;
  });

/**
 * Example: Get system analytics with caching and monitoring.
 */
export const getSystemAnalyticsWithCache = (
  timeWindow: "day" | "week" | "month"
) =>
  Effect.gen(function* (_) {
    const analytics = yield* _(RedisAnalyticsService);
    const cache = yield* _(CacheService);
    const monitoring = yield* _(MonitoringService);

    const cacheKey = `system:analytics:${timeWindow}`;

    const systemAnalytics = yield* _(
      monitoring.monitorOperation(
        "get-system-analytics",
        cache.getOrSet(cacheKey, analytics.getSystemAnalytics(timeWindow), {
          ttl: Duration.minutes(10),
          tags: ["system", "analytics"],
        })
      )
    );

    return systemAnalytics;
  });

/**
 * Example: Batch record multiple metrics efficiently.
 */
export const batchRecordMetrics = (metrics: readonly AnalyticsMetric[]) =>
  Effect.gen(function* (_) {
    const analytics = yield* _(RedisAnalyticsService);
    const monitoring = yield* _(MonitoringService);

    yield* _(
      monitoring.monitorOperation(
        "batch-record-metrics",
        analytics.recordMetricsBatch(metrics),
        { batchSize: metrics.length } as MetricLabels
      )
    );

    yield* _(
      Effect.logInfo(`Batch recorded ${metrics.length} metrics`),
      Effect.annotateLogs("metrics.count", metrics.length)
    );
  });

/**
 * Example: Setup health checks for caching and analytics infrastructure.
 */
export const setupInfrastructureHealthChecks = Effect.gen(function* (_) {
  const healthRegistry = yield* _(EnhancedHealthCheckRegistry);
  const redisClient = yield* _(RedisClient);

  // Register Redis health check
  const redisHealthConfig: HealthCheckConfig = {
    name: "redis",
    group: "infrastructure",
    timeout: Duration.seconds(5),
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      initialDelay: Duration.millis(100),
      maxDelay: Duration.seconds(2),
    },
    check: createRedisHealthCheck(redisClient.client),
    cacheTtl: Duration.seconds(30),
    priority: 10,
  };

  yield* _(healthRegistry.registerHealthCheck(redisHealthConfig));

  // Register cache service health check
  const cacheHealthConfig: HealthCheckConfig = {
    name: "cache-service",
    group: "infrastructure",
    dependencies: ["redis"],
    timeout: Duration.seconds(5),
    retryPolicy: {
      maxAttempts: 2,
      backoffStrategy: "fixed",
      initialDelay: Duration.millis(500),
    },
    check: pipe(
      Effect.gen(function* () {
        const cache = yield* CacheService;
        const stats = yield* cache.getStats();

        const status: "healthy" | "degraded" | "unhealthy" =
          stats.hitRate > 50
            ? "healthy"
            : stats.hitRate > 20
              ? "degraded"
              : "unhealthy";

        return {
          name: "cache-service",
          status,
          message: `Cache hit rate: ${stats.hitRate.toFixed(1)}%`,
          responseTime: 0,
          timestamp: new Date(),
          metadata: {
            hitRate: stats.hitRate,
            totalKeys: stats.totalKeys,
            memoryUsage: stats.memoryUsage,
          },
        };
      }),
      Effect.mapError(
        (error) =>
          new HealthCheckError({
            checkName: "cache-service",
            message: `Cache health check failed: ${String(error)}`,
            cause: error,
          })
      )
    ),
    cacheTtl: Duration.seconds(30),
    priority: 8,
  };

  yield* _(healthRegistry.registerHealthCheck(cacheHealthConfig));

  // Register analytics service health check
  const analyticsHealthConfig: HealthCheckConfig = {
    name: "analytics-service",
    group: "infrastructure",
    dependencies: ["redis"],
    timeout: Duration.seconds(5),
    retryPolicy: {
      maxAttempts: 2,
      backoffStrategy: "fixed",
      initialDelay: Duration.millis(500),
    },
    check: pipe(
      Effect.gen(function* () {
        const analytics = yield* RedisAnalyticsService;

        // Test by getting system analytics
        const systemAnalytics = yield* pipe(
          analytics.getSystemAnalytics("day"),
          Effect.timeout(Duration.seconds(3))
        );

        return {
          name: "analytics-service",
          status: "healthy" as const,
          message: "Analytics service operational",
          responseTime: 0,
          timestamp: new Date(),
          metadata: {
            totalUsers: systemAnalytics.totalUsers,
            activeUsers: systemAnalytics.activeUsers,
            totalTransactions: systemAnalytics.totalTransactions,
          },
        };
      }),
      Effect.mapError(
        (error) =>
          new HealthCheckError({
            checkName: "analytics-service",
            message: `Analytics health check failed: ${String(error)}`,
            cause: error,
          })
      )
    ),
    cacheTtl: Duration.seconds(30),
    priority: 7,
  };

  yield* _(healthRegistry.registerHealthCheck(analyticsHealthConfig));

  yield* _(
    Effect.logInfo("Infrastructure health checks registered successfully")
  );
});

/**
 * Example: Scheduled cache cleanup and analytics data retention.
 */
export const scheduleMaintenanceTasks = Effect.gen(function* (_) {
  const cache = yield* _(CacheService);
  const analytics = yield* _(RedisAnalyticsService);

  // Schedule cache statistics logging every 5 minutes
  const cacheStatsTask = pipe(
    Effect.gen(function* (_) {
      const stats = yield* _(cache.getStats());
      yield* _(
        Effect.logInfo("Cache statistics"),
        Effect.annotateLogs("cache.hitRate", stats.hitRate),
        Effect.annotateLogs("cache.totalKeys", stats.totalKeys),
        Effect.annotateLogs("cache.memoryUsage", stats.memoryUsage)
      );
    }),
    Effect.schedule(Schedule.fixed(Duration.minutes(5))),
    Effect.fork
  );

  // Schedule old analytics data cleanup daily
  const analyticsCleanupTask = pipe(
    Effect.gen(function* (_) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const removed = yield* _(analytics.clearOldData(thirtyDaysAgo));

      yield* _(
        Effect.logInfo(
          `Analytics cleanup completed: ${removed} records removed`
        ),
        Effect.annotateLogs("analytics.removedRecords", removed)
      );
    }),
    Effect.schedule(Schedule.fixed(Duration.hours(24))),
    Effect.fork
  );

  const cacheStatsFiber = yield* _(cacheStatsTask);
  const analyticsCleanupFiber = yield* _(analyticsCleanupTask);

  yield* _(
    Effect.logInfo("Maintenance tasks scheduled successfully"),
    Effect.annotateLogs("tasks", "cache-stats, analytics-cleanup")
  );

  return {
    cacheStatsFiber,
    analyticsCleanupFiber,
  };
});

/**
 * Example: Cache warming strategy for frequently accessed data.
 */
export const warmFrequentlyAccessedCache = Effect.gen(function* (_) {
  const cache = yield* _(CacheService);
  const analytics = yield* _(RedisAnalyticsService);

  // Get top performers to warm their analytics
  const topContributors = yield* _(
    analytics.getTopPerformers("contribution", 100, "month")
  );

  const warmingEntries = yield* _(
    Effect.forEach(
      topContributors,
      (performer) =>
        Effect.gen(function* (_) {
          const userAnalytics = yield* _(
            analytics.getUserAnalytics(performer.userId)
          );

          return {
            key: `user:${performer.userId}:analytics`,
            value: userAnalytics,
            options: {
              ttl: Duration.minutes(15),
              tags: [`user:${performer.userId}`, "analytics"],
            },
          };
        }),
      { concurrency: 10 }
    )
  );

  const warmedCount = yield* _(cache.warm(warmingEntries));

  yield* _(
    Effect.logInfo(`Cache warming completed: ${warmedCount} entries`),
    Effect.annotateLogs("cache.warmedEntries", warmedCount)
  );

  return warmedCount;
});

/**
 * Example: Complete infrastructure layer composition.
 */
export const InfrastructureLayer = Layer.empty;
// To use, compose like this:
// Layer.mergeAll(
//   RedisClientLive,
//   Layer.provide(RedisAnalyticsServiceLive, RedisClientLive),
//   Layer.provide(CacheServiceLive, RedisClientLive)
// );

/**
 * Example: Run a complete workflow with all services.
 */
export const completeWorkflowExample = (
  userId: string,
  planId: string,
  amount: number
) =>
  pipe(
    Effect.gen(function* (_) {
      // Track the contribution
      yield* _(trackContributionExample(userId, planId, amount));

      // Get updated user analytics (will use cache if available)
      const userAnalytics = yield* _(getUserAnalyticsWithCache(userId));

      // Get system analytics
      const systemAnalytics = yield* _(getSystemAnalyticsWithCache("day"));

      // Check health of all infrastructure services
      const healthRegistry = yield* _(EnhancedHealthCheckRegistry);
      const healthSummary = yield* _(healthRegistry.getHealthSummary());

      yield* _(
        Effect.logInfo("Complete workflow executed successfully"),
        Effect.annotateLogs("userId", userId),
        Effect.annotateLogs(
          "userTotalContributions",
          userAnalytics.totalContributions
        ),
        Effect.annotateLogs(
          "systemTotalTransactions",
          systemAnalytics.totalTransactions
        ),
        Effect.annotateLogs("healthStatus", healthSummary.status)
      );

      return {
        userAnalytics,
        systemAnalytics,
        healthSummary,
      };
    })
    // Provide all necessary layers
    // .pipe(Effect.provide(InfrastructureLayer))
  );
