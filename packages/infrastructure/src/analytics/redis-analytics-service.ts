/**
 * @fileoverview Redis Analytics Service for Real-Time Metrics
 *
 * This module provides a Redis-based analytics service for tracking real-time
 * financial metrics, user behavior, and system performance for the AV-Daily platform.
 * It integrates with Effect-TS for type-safe, composable analytics operations.
 */

import type { Redis } from "ioredis";

import { Context, Effect, Layer, pipe, Data, Duration } from "effect";

import { RedisClient as RedisClientTag } from "../redis/redis-client";
import type { RedisClient } from "../redis/redis-client";

/**
 * Analytics metric types for financial operations.
 */
export type AnalyticsMetricType =
  | "contribution"
  | "withdrawal"
  | "plan_created"
  | "plan_completed"
  | "wallet_funded"
  | "user_registered"
  | "transaction_failed"
  | "auto_save_executed";

/**
 * Time window for analytics aggregation.
 */
export type TimeWindow = "minute" | "hour" | "day" | "week" | "month";

/**
 * Analytics metric data structure.
 */
export interface AnalyticsMetric {
  readonly type: AnalyticsMetricType;
  readonly value: number;
  readonly userId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: Date;
}

/**
 * Aggregated analytics result.
 */
export interface AggregatedMetrics {
  readonly metricType: AnalyticsMetricType;
  readonly timeWindow: TimeWindow;
  readonly count: number;
  readonly sum: number;
  readonly average: number;
  readonly min: number;
  readonly max: number;
  readonly period: {
    readonly start: Date;
    readonly end: Date;
  };
}

/**
 * User analytics summary.
 */
export interface UserAnalytics {
  readonly userId: string;
  readonly totalContributions: number;
  readonly totalWithdrawals: number;
  readonly activePlans: number;
  readonly completedPlans: number;
  readonly savingsStreak: number;
  readonly lastActivity: Date;
}

/**
 * System-wide analytics summary.
 */
export interface SystemAnalytics {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly totalTransactions: number;
  readonly totalVolume: number;
  readonly successRate: number;
  readonly averageTransactionValue: number;
  readonly period: {
    readonly start: Date;
    readonly end: Date;
  };
}

/**
 * Analytics errors.
 */
export class AnalyticsError extends Data.TaggedError("AnalyticsError")<{
  readonly operation: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Redis Analytics Service interface.
 */
export interface RedisAnalyticsService {
  /**
   * Record a single analytics metric.
   */
  readonly recordMetric: (
    metric: AnalyticsMetric
  ) => Effect.Effect<void, AnalyticsError>;

  /**
   * Record multiple metrics in a batch.
   */
  readonly recordMetricsBatch: (
    metrics: readonly AnalyticsMetric[]
  ) => Effect.Effect<void, AnalyticsError>;

  /**
   * Get aggregated metrics for a specific type and time window.
   */
  readonly getAggregatedMetrics: (
    metricType: AnalyticsMetricType,
    timeWindow: TimeWindow,
    startDate?: Date,
    endDate?: Date
  ) => Effect.Effect<AggregatedMetrics, AnalyticsError>;

  /**
   * Get user-specific analytics.
   */
  readonly getUserAnalytics: (
    userId: string
  ) => Effect.Effect<UserAnalytics, AnalyticsError>;

  /**
   * Get system-wide analytics summary.
   */
  readonly getSystemAnalytics: (
    timeWindow: TimeWindow,
    startDate?: Date,
    endDate?: Date
  ) => Effect.Effect<SystemAnalytics, AnalyticsError>;

  /**
   * Increment a counter metric.
   */
  readonly incrementCounter: (
    key: string,
    value?: number,
    ttl?: Duration.Duration
  ) => Effect.Effect<number, AnalyticsError>;

  /**
   * Track user activity for streak calculation.
   */
  readonly trackUserActivity: (
    userId: string,
    activityType: string
  ) => Effect.Effect<void, AnalyticsError>;

  /**
   * Get top performers (users with highest metrics).
   */
  readonly getTopPerformers: (
    metricType: AnalyticsMetricType,
    limit: number,
    timeWindow: TimeWindow
  ) => Effect.Effect<
    readonly { userId: string; value: number }[],
    AnalyticsError
  >;

  /**
   * Clear analytics data older than specified date.
   */
  readonly clearOldData: (
    beforeDate: Date
  ) => Effect.Effect<number, AnalyticsError>;
}

/**
 * Redis Analytics Service tag.
 */
export const RedisAnalyticsService = Context.GenericTag<RedisAnalyticsService>(
  "RedisAnalyticsService"
);

/**
 * Redis Analytics Service implementation.
 */
class RedisAnalyticsServiceImpl implements RedisAnalyticsService {
  constructor(private readonly redis: Redis) {}

  recordMetric(metric: AnalyticsMetric): Effect.Effect<void, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const timestamp = metric.timestamp.getTime();
        const timeKey = self.getTimeKey(metric.type, metric.timestamp);

        // Store metric in sorted set for time-series data
        yield* _(
          Effect.tryPromise({
            try: () =>
              self.redis.zadd(
                `metrics:${metric.type}`,
                timestamp,
                JSON.stringify({
                  value: metric.value,
                  userId: metric.userId,
                  metadata: metric.metadata,
                  timestamp,
                })
              ),
            catch: (error) =>
              new AnalyticsError({
                operation: "recordMetric",
                message: "Failed to record metric in sorted set",
                cause: error,
              }),
          })
        );

        // Update aggregated counters for different time windows
        yield* _(
          Effect.tryPromise({
            try: () =>
              self.redis
                .multi()
                .hincrby(timeKey, "count", 1)
                .hincrbyfloat(timeKey, "sum", metric.value)
                .exec(),
            catch: (error) =>
              new AnalyticsError({
                operation: "recordMetric",
                message: "Failed to update aggregated counters",
                cause: error,
              }),
          })
        );

        // Update min/max values
        yield* _(self.updateMinMax(timeKey, metric.value));

        // Track user-specific metrics if userId provided
        if (metric.userId) {
          yield* _(self.updateUserMetrics(metric.userId, metric));
        }

        yield* _(
          Effect.logDebug(`Recorded analytics metric: ${metric.type}`),
          Effect.annotateLogs("metric.type", metric.type),
          Effect.annotateLogs("metric.value", metric.value)
        );
      }),
      Effect.catchAll((error) => {
        if (error._tag === "AnalyticsError") {
          return Effect.fail(error);
        }
        return Effect.fail(
          new AnalyticsError({
            operation: "recordMetric",
            message: "Unexpected error recording metric",
            cause: error,
          })
        );
      })
    );
  }

  recordMetricsBatch(
    metrics: readonly AnalyticsMetric[]
  ): Effect.Effect<void, AnalyticsError> {
    return pipe(
      Effect.forEach(metrics, (metric) => this.recordMetric(metric), {
        concurrency: 10,
      }),
      Effect.asVoid,
      Effect.catchAll((error) =>
        Effect.fail(
          new AnalyticsError({
            operation: "recordMetricsBatch",
            message: `Failed to record batch of ${metrics.length} metrics`,
            cause: error,
          })
        )
      )
    );
  }

  getAggregatedMetrics(
    metricType: AnalyticsMetricType,
    timeWindow: TimeWindow,
    startDate?: Date,
    endDate?: Date
  ): Effect.Effect<AggregatedMetrics, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const end = endDate || new Date();
        const start = startDate || self.getStartDate(timeWindow, end);
        const timeKey = self.getTimeKey(metricType, start, timeWindow);

        const data = yield* _(
          Effect.tryPromise({
            try: () => self.redis.hgetall(timeKey),
            catch: (error) =>
              new AnalyticsError({
                operation: "getAggregatedMetrics",
                message: "Failed to fetch aggregated metrics",
                cause: error,
              }),
          })
        );

        const count = Number.parseInt(data.count || "0", 10);
        const sum = Number.parseFloat(data.sum || "0");
        const min = Number.parseFloat(data.min || "0");
        const max = Number.parseFloat(data.max || "0");
        const average = count > 0 ? sum / count : 0;

        return {
          metricType,
          timeWindow,
          count,
          sum,
          average,
          min,
          max,
          period: { start, end },
        };
      })
    );
  }

  getUserAnalytics(
    userId: string
  ): Effect.Effect<UserAnalytics, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const userKey = `user:${userId}:analytics`;

        const data = yield* _(
          Effect.tryPromise({
            try: () => self.redis.hgetall(userKey),
            catch: (error) =>
              new AnalyticsError({
                operation: "getUserAnalytics",
                message: `Failed to fetch analytics for user: ${userId}`,
                cause: error,
              }),
          })
        );

        const lastActivityTimestamp = data.lastActivity
          ? Number.parseInt(data.lastActivity, 10)
          : Date.now();

        return {
          userId,
          totalContributions: Number.parseInt(
            data.totalContributions || "0",
            10
          ),
          totalWithdrawals: Number.parseInt(data.totalWithdrawals || "0", 10),
          activePlans: Number.parseInt(data.activePlans || "0", 10),
          completedPlans: Number.parseInt(data.completedPlans || "0", 10),
          savingsStreak: Number.parseInt(data.savingsStreak || "0", 10),
          lastActivity: new Date(lastActivityTimestamp),
        };
      })
    );
  }

  getSystemAnalytics(
    timeWindow: TimeWindow,
    startDate?: Date,
    endDate?: Date
  ): Effect.Effect<SystemAnalytics, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const end = endDate || new Date();
        const start = startDate || self.getStartDate(timeWindow, end);

        // Fetch aggregated data for all transaction types
        const contributions = yield* _(
          self.getAggregatedMetrics("contribution", timeWindow, start, end)
        );
        const withdrawals = yield* _(
          self.getAggregatedMetrics("withdrawal", timeWindow, start, end)
        );
        const walletFunded = yield* _(
          self.getAggregatedMetrics("wallet_funded", timeWindow, start, end)
        );

        const totalTransactions =
          contributions.count + withdrawals.count + walletFunded.count;
        const totalVolume =
          contributions.sum + withdrawals.sum + walletFunded.sum;

        // Get user counts
        const totalUsersStr = yield* _(
          Effect.tryPromise({
            try: () => self.redis.get("system:totalUsers"),
            catch: (error) =>
              new AnalyticsError({
                operation: "getSystemAnalytics",
                message: "Failed to fetch total users",
                cause: error,
              }),
          })
        );

        const activeUsers = yield* _(
          Effect.tryPromise({
            try: () => self.redis.scard(`system:activeUsers:${timeWindow}`),
            catch: (error) =>
              new AnalyticsError({
                operation: "getSystemAnalytics",
                message: "Failed to fetch active users",
                cause: error,
              }),
          })
        );

        const totalUsers = Number.parseInt(totalUsersStr || "0", 10);

        // Calculate success rate
        const failedTransactions = yield* _(
          self.getAggregatedMetrics(
            "transaction_failed",
            timeWindow,
            start,
            end
          )
        );
        const successRate =
          totalTransactions > 0
            ? ((totalTransactions - failedTransactions.count) /
                totalTransactions) *
              100
            : 100;

        const averageTransactionValue =
          totalTransactions > 0 ? totalVolume / totalTransactions : 0;

        return {
          totalUsers,
          activeUsers,
          totalTransactions,
          totalVolume,
          successRate,
          averageTransactionValue,
          period: { start, end },
        };
      })
    );
  }

  incrementCounter(
    key: string,
    value = 1,
    ttl?: Duration.Duration
  ): Effect.Effect<number, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const newValue = yield* _(
          Effect.tryPromise({
            try: () => self.redis.incrby(key, value),
            catch: (error) =>
              new AnalyticsError({
                operation: "incrementCounter",
                message: `Failed to increment counter: ${key}`,
                cause: error,
              }),
          })
        );

        if (ttl) {
          yield* _(
            Effect.tryPromise({
              try: () =>
                self.redis.expire(key, Math.floor(Duration.toSeconds(ttl))),
              catch: (error) =>
                new AnalyticsError({
                  operation: "incrementCounter",
                  message: `Failed to set TTL for counter: ${key}`,
                  cause: error,
                }),
            })
          );
        }

        return newValue;
      })
    );
  }

  trackUserActivity(
    userId: string,
    activityType: string
  ): Effect.Effect<void, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const now = Date.now();
        const userKey = `user:${userId}:analytics`;

        // Update last activity
        yield* _(
          Effect.tryPromise({
            try: () => self.redis.hset(userKey, "lastActivity", now),
            catch: (error) =>
              new AnalyticsError({
                operation: "trackUserActivity",
                message: `Failed to track activity for user: ${userId}`,
                cause: error,
              }),
          })
        );

        // Add to active users set for different time windows
        yield* _(
          Effect.tryPromise({
            try: () =>
              self.redis
                .multi()
                .sadd("system:activeUsers:day", userId)
                .sadd("system:activeUsers:week", userId)
                .sadd("system:activeUsers:month", userId)
                .expire("system:activeUsers:day", 86400) // 1 day
                .expire("system:activeUsers:week", 604800) // 7 days
                .expire("system:activeUsers:month", 2592000) // 30 days
                .exec(),
            catch: (error) =>
              new AnalyticsError({
                operation: "trackUserActivity",
                message: "Failed to update active users sets",
                cause: error,
              }),
          })
        );

        // Track activity in sorted set for streak calculation
        const activityKey = `user:${userId}:activity:${activityType}`;
        yield* _(
          Effect.tryPromise({
            try: () => self.redis.zadd(activityKey, now, now.toString()),
            catch: (error) =>
              new AnalyticsError({
                operation: "trackUserActivity",
                message: "Failed to track activity in sorted set",
                cause: error,
              }),
          })
        );
      })
    );
  }

  getTopPerformers(
    metricType: AnalyticsMetricType,
    limit: number,
    timeWindow: TimeWindow
  ): Effect.Effect<
    readonly { userId: string; value: number }[],
    AnalyticsError
  > {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const leaderboardKey = `leaderboard:${metricType}:${timeWindow}`;

        const results = yield* _(
          Effect.tryPromise({
            try: () =>
              self.redis.zrevrange(leaderboardKey, 0, limit - 1, "WITHSCORES"),
            catch: (error) =>
              new AnalyticsError({
                operation: "getTopPerformers",
                message: "Failed to fetch top performers",
                cause: error,
              }),
          })
        );

        const performers: { userId: string; value: number }[] = [];
        for (let i = 0; i < results.length; i += 2) {
          const userId = results[i];
          const value = results[i + 1];

          if (!userId || !value) {
            continue;
          }

          performers.push({
            userId,
            value: Number.parseFloat(value),
          });
        }

        return performers;
      })
    );
  }

  clearOldData(beforeDate: Date): Effect.Effect<number, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const timestamp = beforeDate.getTime();
        let totalRemoved = 0;

        // Get all metric keys
        const metricTypes: AnalyticsMetricType[] = [
          "contribution",
          "withdrawal",
          "plan_created",
          "plan_completed",
          "wallet_funded",
          "user_registered",
          "transaction_failed",
          "auto_save_executed",
        ];

        for (const metricType of metricTypes) {
          const removed = yield* _(
            Effect.tryPromise({
              try: () =>
                self.redis.zremrangebyscore(
                  `metrics:${metricType}`,
                  "-inf",
                  timestamp
                ),
              catch: (error) =>
                new AnalyticsError({
                  operation: "clearOldData",
                  message: `Failed to clear old data for metric: ${metricType}`,
                  cause: error,
                }),
            })
          );
          totalRemoved += removed;
        }

        yield* _(
          Effect.logInfo(`Cleared ${totalRemoved} old analytics records`),
          Effect.annotateLogs("analytics.removedRecords", totalRemoved),
          Effect.annotateLogs("analytics.beforeDate", beforeDate.toISOString())
        );

        return totalRemoved;
      })
    );
  }

  // Private helper methods

  private getTimeKey(
    metricType: AnalyticsMetricType,
    date: Date,
    window?: TimeWindow
  ): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");

    const effectiveWindow = window || "day";

    switch (effectiveWindow) {
      case "minute": {
        const minute = String(d.getMinutes()).padStart(2, "0");
        return `agg:${metricType}:${year}${month}${day}${hour}${minute}`;
      }
      case "hour":
        return `agg:${metricType}:${year}${month}${day}${hour}`;
      case "day":
        return `agg:${metricType}:${year}${month}${day}`;
      case "week": {
        const weekNum = this.getWeekNumber(d);
        return `agg:${metricType}:${year}W${weekNum}`;
      }
      case "month":
        return `agg:${metricType}:${year}${month}`;
      default:
        return `agg:${metricType}:${year}${month}${day}`;
    }
  }

  private getWeekNumber(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return String(weekNo).padStart(2, "0");
  }

  private getStartDate(window: TimeWindow, endDate: Date): Date {
    const start = new Date(endDate);

    switch (window) {
      case "minute":
        start.setMinutes(start.getMinutes() - 1);
        break;
      case "hour":
        start.setHours(start.getHours() - 1);
        break;
      case "day":
        start.setDate(start.getDate() - 1);
        break;
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return start;
  }

  private updateMinMax(
    key: string,
    value: number
  ): Effect.Effect<void, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const currentMin = yield* _(
          Effect.tryPromise({
            try: () => self.redis.hget(key, "min"),
            catch: (error) =>
              new AnalyticsError({
                operation: "updateMinMax",
                message: "Failed to get current min value",
                cause: error,
              }),
          })
        );

        const currentMax = yield* _(
          Effect.tryPromise({
            try: () => self.redis.hget(key, "max"),
            catch: (error) =>
              new AnalyticsError({
                operation: "updateMinMax",
                message: "Failed to get current max value",
                cause: error,
              }),
          })
        );

        const multi = self.redis.multi();

        if (!currentMin || value < Number.parseFloat(currentMin)) {
          multi.hset(key, "min", value);
        }

        if (!currentMax || value > Number.parseFloat(currentMax)) {
          multi.hset(key, "max", value);
        }

        yield* _(
          Effect.tryPromise({
            try: () => multi.exec(),
            catch: (error) =>
              new AnalyticsError({
                operation: "updateMinMax",
                message: "Failed to update min/max values",
                cause: error,
              }),
          })
        );
      })
    );
  }

  private updateUserMetrics(
    userId: string,
    metric: AnalyticsMetric
  ): Effect.Effect<void, AnalyticsError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const userKey = `user:${userId}:analytics`;

        // Update user-specific counters based on metric type
        const multi = self.redis.multi();

        switch (metric.type) {
          case "contribution": {
            multi.hincrby(userKey, "totalContributions", 1);
            break;
          }
          case "withdrawal": {
            multi.hincrby(userKey, "totalWithdrawals", 1);
            break;
          }
          case "plan_created": {
            multi.hincrby(userKey, "activePlans", 1);
            break;
          }
          case "plan_completed": {
            multi.hincrby(userKey, "completedPlans", 1);
            multi.hincrby(userKey, "activePlans", -1);
            break;
          }
        }

        multi.hset(userKey, "lastActivity", metric.timestamp.getTime());

        yield* _(
          Effect.tryPromise({
            try: () => multi.exec(),
            catch: (error) =>
              new AnalyticsError({
                operation: "updateUserMetrics",
                message: `Failed to update user metrics for: ${userId}`,
                cause: error,
              }),
          })
        );

        // Update leaderboard
        const leaderboardKey = `leaderboard:${metric.type}:day`;
        yield* _(
          Effect.tryPromise({
            try: () => self.redis.zincrby(leaderboardKey, metric.value, userId),
            catch: (error) =>
              new AnalyticsError({
                operation: "updateUserMetrics",
                message: "Failed to update leaderboard",
                cause: error,
              }),
          })
        );
      })
    );
  }
}

/**
 * Create Redis Analytics Service layer with Redis client dependency.
 */
export const RedisAnalyticsServiceLive: Layer.Layer<
  RedisAnalyticsService,
  never,
  RedisClient
> = Layer.effect(
  RedisAnalyticsService,
  Effect.gen(function* (_) {
    const { client } = yield* _(RedisClientTag);
    return new RedisAnalyticsServiceImpl(client);
  })
);
