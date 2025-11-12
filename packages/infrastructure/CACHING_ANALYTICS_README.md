# Caching and Analytics Infrastructure

This document describes the caching and analytics infrastructure services implemented for the AV-Daily platform.

## Overview

The infrastructure layer now includes three key services for performance optimization and real-time metrics:

1. **RedisAnalyticsService** - Real-time analytics and metrics tracking
2. **CacheService** - High-performance caching with Redis
3. **Health Check Services** - Infrastructure monitoring and health checks

## RedisAnalyticsService

### Purpose

Tracks real-time financial metrics, user behavior, and system performance using Redis for fast aggregation and querying.

### Features

- **Metric Recording**: Track various financial operations (contributions, withdrawals, plan creation, etc.)
- **Time-Series Data**: Store metrics in sorted sets for efficient time-based queries
- **Aggregation**: Automatic aggregation by minute, hour, day, week, and month
- **User Analytics**: Track user-specific metrics including streaks and activity
- **System Analytics**: System-wide metrics including transaction volumes and success rates
- **Leaderboards**: Track top performers for gamification features
- **Data Retention**: Automatic cleanup of old data

### Usage Example

```typescript
import { Effect } from "effect";
import { RedisAnalyticsService } from "@host/infrastructure";

const trackContribution = (userId: string, amount: number) =>
  Effect.gen(function* (_) {
    const analytics = yield* _(RedisAnalyticsService);

    // Record a contribution metric
    yield* _(
      analytics.recordMetric({
        type: "contribution",
        value: amount,
        userId,
        metadata: { planId: "plan-123" },
        timestamp: new Date(),
      })
    );

    // Track user activity for streak calculation
    yield* _(analytics.trackUserActivity(userId, "contribution"));

    // Get user analytics
    const userAnalytics = yield* _(analytics.getUserAnalytics(userId));

    return userAnalytics;
  });
```

### Metric Types

- `contribution` - User contributions to savings plans
- `withdrawal` - Withdrawals from savings plans
- `plan_created` - New savings plan creation
- `plan_completed` - Completed savings plans
- `wallet_funded` - Wallet funding operations
- `user_registered` - New user registrations
- `transaction_failed` - Failed transactions
- `auto_save_executed` - Automated savings executions

### Time Windows

- `minute` - Per-minute aggregation
- `hour` - Hourly aggregation
- `day` - Daily aggregation
- `week` - Weekly aggregation
- `month` - Monthly aggregation

## CacheService

### Purpose

Provides high-performance caching using Redis to reduce database load and improve response times.

### Features

- **Get/Set Operations**: Basic cache operations with TTL support
- **Cache-Aside Pattern**: `getOrSet` for automatic cache population
- **Tag-Based Invalidation**: Invalidate related cache entries by tags
- **Pattern Matching**: Delete multiple keys using patterns or regex
- **Batch Operations**: `mget` and `mset` for efficient bulk operations
- **Counters**: Atomic increment/decrement operations
- **Statistics**: Track hit rate, miss rate, and memory usage
- **Cache Warming**: Preload frequently accessed data

### Usage Example

```typescript
import { Effect, Duration } from "effect";
import { CacheService } from "@host/infrastructure";

const getUserData = (userId: string) =>
  Effect.gen(function* (_) {
    const cache = yield* _(CacheService);

    // Cache-aside pattern: get from cache or compute
    const userData = yield* _(
      cache.getOrSet(
        `user:${userId}:data`,
        fetchUserFromDatabase(userId), // Fallback computation
        {
          ttl: Duration.minutes(5),
          tags: [`user:${userId}`, "user-data"],
        }
      )
    );

    return userData;
  });

// Invalidate user cache when data changes
const invalidateUserCache = (userId: string) =>
  Effect.gen(function* (_) {
    const cache = yield* _(CacheService);

    // Invalidate all cache entries tagged with this user
    yield* _(cache.invalidateByTags([`user:${userId}`]));
  });
```

### Cache Options

```typescript
interface CacheOptions {
  ttl?: Duration.Duration; // Time to live
  tags?: readonly string[]; // Tags for invalidation
  compress?: boolean; // Compression (future feature)
}
```

### Cache Statistics

```typescript
interface CacheStats {
  hits: number; // Cache hits
  misses: number; // Cache misses
  hitRate: number; // Hit rate percentage
  totalKeys: number; // Total cached keys
  memoryUsage: number; // Memory usage in bytes
}
```

## Health Check Services

### Purpose

Provides health check implementations for infrastructure services to monitor system health.

### Available Health Checks

1. **Redis Health Check** - Verifies Redis connectivity and performance
2. **Database Health Check** - Tests database connection with a query
3. **Memory Health Check** - Monitors application memory usage
4. **Disk Space Health Check** - Checks disk write capability
5. **Application Health Check** - Basic application status
6. **Composite Health Check** - Combines multiple checks

### Usage Example

```typescript
import { Effect, Duration } from "effect";
import { EnhancedHealthCheckRegistry } from "@host/api/effects/enhanced-health-checks";
import { createRedisHealthCheck } from "@host/infrastructure";

const setupHealthChecks = Effect.gen(function* (_) {
  const healthRegistry = yield* _(EnhancedHealthCheckRegistry);
  const redisClient = yield* _(RedisClient);

  // Register Redis health check
  yield* _(
    healthRegistry.registerHealthCheck({
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
    })
  );

  // Get overall health status
  const health = yield* _(healthRegistry.getHealthSummary());

  return health;
});
```

## Integration Patterns

### 1. Track and Cache Pattern

Track metrics and invalidate related cache entries:

```typescript
const processContribution = (userId: string, amount: number) =>
  Effect.gen(function* (_) {
    const analytics = yield* _(RedisAnalyticsService);
    const cache = yield* _(CacheService);

    // Record the metric
    yield* _(
      analytics.recordMetric({
        type: "contribution",
        value: amount,
        userId,
        timestamp: new Date(),
      })
    );

    // Invalidate user's cached analytics
    yield* _(cache.invalidateByTags([`user:${userId}`, "analytics"]));
  });
```

### 2. Monitored Cache Operations

Monitor cache operations with metrics:

```typescript
const getCachedData = (key: string) =>
  Effect.gen(function* (_) {
    const cache = yield* _(CacheService);
    const monitoring = yield* _(MonitoringService);

    const data = yield* _(
      monitoring.monitorOperation(
        "cache-get",
        cache.get(key),
        { cacheKey: key }
      )
    );

    return data;
  });
```

### 3. Scheduled Maintenance

Schedule periodic maintenance tasks:

```typescript
const scheduleMaintenanceTasks = Effect.gen(function* (_) {
  const cache = yield* _(CacheService);
  const analytics = yield* _(RedisAnalyticsService);

  // Log cache statistics every 5 minutes
  const cacheStatsTask = pipe(
    Effect.gen(function* (_) {
      const stats = yield* _(cache.getStats());
      yield* _(Effect.logInfo("Cache stats", stats));
    }),
    Effect.schedule(Schedule.fixed(Duration.minutes(5))),
    Effect.fork
  );

  // Clean old analytics data daily
  const cleanupTask = pipe(
    Effect.gen(function* (_) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      yield* _(analytics.clearOldData(thirtyDaysAgo));
    }),
    Effect.schedule(Schedule.fixed(Duration.hours(24))),
    Effect.fork
  );

  return { cacheStatsTask, cleanupTask };
});
```

## Configuration

### Redis Client Setup

You need to provide a Redis client to the services:

```typescript
import { Layer, Effect } from "effect";
import Redis from "ioredis";
import { RedisClient } from "@host/infrastructure";

const RedisClientLive = Layer.effect(
  RedisClient,
  Effect.sync(() => ({
    client: new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || "0"),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    }),
  }))
);
```

### Layer Composition

Compose all infrastructure layers:

```typescript
import { Layer } from "effect";
import {
  RedisAnalyticsServiceLive,
  CacheServiceLive,
} from "@host/infrastructure";

const InfrastructureLayer = Layer.mergeAll(
  Layer.provide(RedisAnalyticsServiceLive, RedisClientLive),
  Layer.provide(CacheServiceLive, RedisClientLive)
);
```

## Performance Considerations

### Caching Strategy

1. **Cache Frequently Accessed Data**: User profiles, plan details, analytics summaries
2. **Use Appropriate TTLs**: Short TTL for real-time data, longer for static data
3. **Tag-Based Invalidation**: Group related cache entries for efficient invalidation
4. **Cache Warming**: Preload frequently accessed data during startup or low-traffic periods

### Analytics Optimization

1. **Batch Recording**: Use `recordMetricsBatch` for multiple metrics
2. **Aggregation Windows**: Choose appropriate time windows for queries
3. **Data Retention**: Regularly clean old data to manage storage
4. **Leaderboards**: Use sorted sets for efficient top-N queries

### Monitoring

1. **Track Cache Hit Rate**: Aim for >70% hit rate
2. **Monitor Memory Usage**: Set alerts for high memory usage
3. **Health Checks**: Regular health checks with appropriate timeouts
4. **Performance Metrics**: Track operation latencies

## Error Handling

All services use Effect-TS tagged errors for type-safe error handling:

```typescript
import { Effect } from "effect";
import { CacheError, AnalyticsError } from "@host/infrastructure";

const handleErrors = Effect.gen(function* (_) {
  const cache = yield* _(CacheService);

  const result = yield* _(
    cache.get("key"),
    Effect.catchTag("CacheError", (error) =>
      Effect.gen(function* (_) {
        yield* _(Effect.logError("Cache error", error));
        return null; // Fallback value
      })
    )
  );

  return result;
});
```

## Testing

### Unit Testing

Test services with mock Redis client:

```typescript
import { Effect, Layer, Ref } from "effect";
import { describe, it, expect } from "vitest";

describe("CacheService", () => {
  it("should cache and retrieve values", async () => {
    const program = Effect.gen(function* (_) {
      const cache = yield* _(CacheService);

      yield* _(cache.set("test-key", { value: "test" }));
      const result = yield* _(cache.get("test-key"));

      return result;
    });

    const result = await Effect.runPromise(
      Effect.provide(program, TestInfrastructureLayer)
    );

    expect(result).toEqual({ value: "test" });
  });
});
```

## Best Practices

1. **Always Use TTLs**: Prevent unbounded cache growth
2. **Tag Related Entries**: Enable efficient bulk invalidation
3. **Monitor Performance**: Track cache hit rates and operation latencies
4. **Handle Errors Gracefully**: Provide fallbacks for cache/analytics failures
5. **Use Batch Operations**: Reduce network overhead for multiple operations
6. **Schedule Maintenance**: Regular cleanup and optimization tasks
7. **Health Checks**: Monitor infrastructure service health
8. **Log Important Events**: Track cache invalidations and analytics recording

## Future Enhancements

1. **Compression**: Compress large cached values
2. **Distributed Caching**: Support for Redis Cluster
3. **Advanced Analytics**: Machine learning-based insights
4. **Real-Time Dashboards**: WebSocket-based live analytics
5. **Cache Replication**: Multi-region cache replication
6. **Custom Eviction Policies**: More sophisticated cache eviction strategies
