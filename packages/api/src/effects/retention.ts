/**
 * @fileoverview Retention Policy Enforcement for Enhanced Monitoring
 *
 * This module provides retention policy enforcement using Effect scheduling
 * for automatic cleanup of metrics based on time and count limits.
 */

import type { RetentionPolicy } from "./enhanced-types";
import type { EnhancedMetricStore } from "./storage";

import { Context, Data, Duration, Effect, Layer, Schedule, pipe } from "effect";

/**
 * Retention error types for policy enforcement failures.
 */
export class RetentionError extends Data.TaggedError("RetentionError")<{
  readonly operation: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Retention policy statistics for monitoring cleanup operations.
 */
export interface RetentionStats {
  readonly totalCleanupRuns: number;
  readonly totalMetricsRemoved: number;
  readonly lastCleanupTime: Date;
  readonly lastCleanupDuration: number;
  readonly averageCleanupDuration: number;
  readonly lastMetricsRemoved: number;
  readonly isRunning: boolean;
}

/**
 * Retention policy enforcement service interface.
 */
export interface RetentionPolicyService {
  readonly startCleanupSchedule: () => Effect.Effect<void, RetentionError>;
  readonly stopCleanupSchedule: () => Effect.Effect<void, RetentionError>;
  readonly runCleanupOnce: () => Effect.Effect<number, RetentionError>;
  readonly getStats: () => Effect.Effect<RetentionStats, RetentionError>;
  readonly updatePolicy: (
    policy: RetentionPolicy
  ) => Effect.Effect<void, RetentionError>;
}

/**
 * Retention policy enforcement implementation.
 */
export class RetentionPolicyServiceImpl implements RetentionPolicyService {
  private isScheduleRunning = false;
  private cleanupStats: RetentionStats = {
    totalCleanupRuns: 0,
    totalMetricsRemoved: 0,
    lastCleanupTime: new Date(),
    lastCleanupDuration: 0,
    averageCleanupDuration: 0,
    lastMetricsRemoved: 0,
    isRunning: false,
  };
  private cleanupDurations: number[] = [];

  constructor(
    private policy: RetentionPolicy,
    private readonly metricStore: EnhancedMetricStore
  ) {}

  readonly startCleanupSchedule = (): Effect.Effect<void, RetentionError> => {
    const self = this;
    return Effect.gen(function* (_) {
      if (self.isScheduleRunning) {
        yield* _(
          Effect.logInfo("Retention cleanup schedule is already running")
        );
        return;
      }

      yield* _(
        Effect.logInfo("Starting retention policy cleanup schedule", {
          cleanupInterval: Duration.toMillis(self.policy.cleanupInterval),
          maxAge: Duration.toMillis(self.policy.maxAge),
          maxCount: self.policy.maxCount,
        })
      );

      self.isScheduleRunning = true;
      self.cleanupStats = { ...self.cleanupStats, isRunning: true };

      // Create a scheduled cleanup effect that runs at the specified interval
      const scheduledCleanup = pipe(
        self.performCleanup(),
        Effect.repeat(Schedule.fixed(self.policy.cleanupInterval)),
        Effect.catchAll((error) =>
          Effect.gen(function* (_) {
            yield* _(Effect.logError("Retention cleanup failed", error));
            // Continue the schedule even if cleanup fails
            return 0;
          })
        ),
        Effect.fork
      );

      yield* _(scheduledCleanup);
    }).pipe(
      Effect.mapError(
        (error) =>
          new RetentionError({
            operation: "startCleanupSchedule",
            message: "Failed to start retention cleanup schedule",
            cause: error,
          })
      )
    );
  };

  readonly stopCleanupSchedule = (): Effect.Effect<void, RetentionError> => {
    const self = this;
    return Effect.gen(function* (_) {
      if (!self.isScheduleRunning) {
        yield* _(Effect.logInfo("Retention cleanup schedule is not running"));
        return;
      }

      yield* _(Effect.logInfo("Stopping retention policy cleanup schedule"));

      self.isScheduleRunning = false;
      self.cleanupStats = { ...self.cleanupStats, isRunning: false };
    }).pipe(
      Effect.mapError(
        (error) =>
          new RetentionError({
            operation: "stopCleanupSchedule",
            message: "Failed to stop retention cleanup schedule",
            cause: error,
          })
      )
    );
  };

  readonly runCleanupOnce = (): Effect.Effect<number, RetentionError> =>
    this.performCleanup().pipe(
      Effect.mapError(
        (error) =>
          new RetentionError({
            operation: "runCleanupOnce",
            message: "Failed to run cleanup operation",
            cause: error,
          })
      )
    );

  readonly getStats = (): Effect.Effect<RetentionStats, RetentionError> =>
    Effect.succeed(this.cleanupStats);

  readonly updatePolicy = (
    policy: RetentionPolicy
  ): Effect.Effect<void, RetentionError> => {
    const self = this;
    return Effect.gen(function* (_) {
      yield* _(
        Effect.logInfo("Updating retention policy", {
          oldMaxAge: Duration.toMillis(self.policy.maxAge),
          newMaxAge: Duration.toMillis(policy.maxAge),
          oldMaxCount: self.policy.maxCount,
          newMaxCount: policy.maxCount,
          oldCleanupInterval: Duration.toMillis(self.policy.cleanupInterval),
          newCleanupInterval: Duration.toMillis(policy.cleanupInterval),
        })
      );

      self.policy = policy;

      // If the cleanup interval changed and schedule is running, restart it
      if (self.isScheduleRunning) {
        yield* _(self.stopCleanupSchedule());
        yield* _(self.startCleanupSchedule());
      }
    }).pipe(
      Effect.mapError(
        (error) =>
          new RetentionError({
            operation: "updatePolicy",
            message: "Failed to update retention policy",
            cause: error,
          })
      )
    );
  };

  private readonly performCleanup = (): Effect.Effect<number, unknown> => {
    const self = this;
    return Effect.gen(function* (_) {
      const startTime = Date.now();

      yield* _(
        Effect.logDebug("Starting retention cleanup operation", {
          maxAge: Duration.toMillis(self.policy.maxAge),
          maxCount: self.policy.maxCount,
        })
      );

      // Perform the actual cleanup
      const removedCount = yield* _(self.metricStore.cleanup());

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update statistics
      self.updateCleanupStats(removedCount, duration);

      yield* _(
        Effect.logInfo("Retention cleanup completed", {
          removedCount,
          duration,
          totalRuns: self.cleanupStats.totalCleanupRuns,
          totalRemoved: self.cleanupStats.totalMetricsRemoved,
        })
      );

      return removedCount;
    });
  };

  private updateCleanupStats(removedCount: number, duration: number): void {
    this.cleanupDurations.push(duration);

    // Keep only the last 100 durations for average calculation
    if (this.cleanupDurations.length > 100) {
      this.cleanupDurations.shift();
    }

    const averageDuration =
      this.cleanupDurations.reduce((sum, d) => sum + d, 0) /
      this.cleanupDurations.length;

    this.cleanupStats = {
      totalCleanupRuns: this.cleanupStats.totalCleanupRuns + 1,
      totalMetricsRemoved: this.cleanupStats.totalMetricsRemoved + removedCount,
      lastCleanupTime: new Date(),
      lastCleanupDuration: duration,
      averageCleanupDuration: averageDuration,
      lastMetricsRemoved: removedCount,
      isRunning: this.cleanupStats.isRunning,
    };
  }
}

/**
 * Context tag for retention policy service.
 */
export const RetentionPolicyService =
  Context.GenericTag<RetentionPolicyService>("RetentionPolicyService");

/**
 * Layer for retention policy service.
 */
export const RetentionPolicyServiceLayer = (
  policy: RetentionPolicy,
  metricStore: EnhancedMetricStore
) =>
  Layer.succeed(
    RetentionPolicyService,
    new RetentionPolicyServiceImpl(policy, metricStore)
  );

/**
 * Enhanced retention policy with additional configuration options.
 */
export interface EnhancedRetentionPolicy extends RetentionPolicy {
  readonly enableTimeBasedCleanup: boolean;
  readonly enableCountBasedCleanup: boolean;
  readonly enableScheduledCleanup: boolean;
  readonly cleanupBatchSize?: number;
  readonly maxCleanupDuration?: Duration.Duration;
}

/**
 * Enhanced retention policy service with additional features.
 */
export interface EnhancedRetentionPolicyService extends RetentionPolicyService {
  readonly runPartialCleanup: (
    batchSize: number
  ) => Effect.Effect<number, RetentionError>;
  readonly getCleanupProgress: () => Effect.Effect<
    CleanupProgress,
    RetentionError
  >;
  readonly pauseCleanup: () => Effect.Effect<void, RetentionError>;
  readonly resumeCleanup: () => Effect.Effect<void, RetentionError>;
}

/**
 * Cleanup progress information.
 */
export interface CleanupProgress {
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly currentBatch: number;
  readonly totalBatches: number;
  readonly processedMetrics: number;
  readonly estimatedTimeRemaining: number;
}

/**
 * Enhanced retention policy service implementation.
 */
export class EnhancedRetentionPolicyServiceImpl
  extends RetentionPolicyServiceImpl
  implements EnhancedRetentionPolicyService
{
  private isPaused = false;
  private cleanupProgress: CleanupProgress = {
    isRunning: false,
    isPaused: false,
    currentBatch: 0,
    totalBatches: 0,
    processedMetrics: 0,
    estimatedTimeRemaining: 0,
  };

  constructor(
    private readonly enhancedPolicy: EnhancedRetentionPolicy,
    metricStore: EnhancedMetricStore
  ) {
    super(enhancedPolicy, metricStore);
  }

  readonly runPartialCleanup = (
    batchSize: number
  ): Effect.Effect<number, RetentionError> => {
    const self = this;
    return Effect.gen(function* (_) {
      if (self.isPaused) {
        return yield* _(
          Effect.fail(
            new RetentionError({
              operation: "runPartialCleanup",
              message: "Cleanup is currently paused",
            })
          )
        );
      }

      yield* _(
        Effect.logDebug(`Running partial cleanup with batch size: ${batchSize}`)
      );

      // This would implement batched cleanup logic
      // For now, delegate to the base cleanup method
      return yield* _(self.runCleanupOnce());
    });
  };

  readonly getCleanupProgress = (): Effect.Effect<
    CleanupProgress,
    RetentionError
  > => Effect.succeed(this.cleanupProgress);

  readonly pauseCleanup = (): Effect.Effect<void, RetentionError> => {
    const self = this;
    return Effect.gen(function* (_) {
      yield* _(Effect.logInfo("Pausing retention cleanup"));
      self.isPaused = true;
      self.cleanupProgress = { ...self.cleanupProgress, isPaused: true };
    });
  };

  readonly resumeCleanup = (): Effect.Effect<void, RetentionError> => {
    const self = this;
    return Effect.gen(function* (_) {
      yield* _(Effect.logInfo("Resuming retention cleanup"));
      self.isPaused = false;
      self.cleanupProgress = { ...self.cleanupProgress, isPaused: false };
    });
  };
}

/**
 * Context tag for enhanced retention policy service.
 */
export const EnhancedRetentionPolicyService =
  Context.GenericTag<EnhancedRetentionPolicyService>(
    "EnhancedRetentionPolicyService"
  );

/**
 * Layer for enhanced retention policy service.
 */
export const EnhancedRetentionPolicyServiceLayer = (
  policy: EnhancedRetentionPolicy,
  metricStore: EnhancedMetricStore
) =>
  Layer.succeed(
    EnhancedRetentionPolicyService,
    new EnhancedRetentionPolicyServiceImpl(policy, metricStore)
  );

/**
 * Utility functions for retention policy management.
 */
export namespace RetentionUtils {
  /**
   * Create a default retention policy.
   */
  export const createDefaultPolicy = (): RetentionPolicy => ({
    maxAge: Duration.hours(24), // 24 hours
    maxCount: 10000,
    cleanupInterval: Duration.minutes(30), // 30 minutes
  });

  /**
   * Create an enhanced retention policy with default values.
   */
  export const createDefaultEnhancedPolicy = (): EnhancedRetentionPolicy => ({
    ...createDefaultPolicy(),
    enableTimeBasedCleanup: true,
    enableCountBasedCleanup: true,
    enableScheduledCleanup: true,
    cleanupBatchSize: 1000,
    maxCleanupDuration: Duration.minutes(5),
  });

  /**
   * Validate retention policy configuration.
   */
  export const validatePolicy = (
    policy: RetentionPolicy
  ): Effect.Effect<void, RetentionError> =>
    Effect.gen(function* (_) {
      if (Duration.toMillis(policy.maxAge) <= 0) {
        return yield* _(
          Effect.fail(
            new RetentionError({
              operation: "validatePolicy",
              message: "maxAge must be positive",
            })
          )
        );
      }

      if (policy.maxCount <= 0) {
        return yield* _(
          Effect.fail(
            new RetentionError({
              operation: "validatePolicy",
              message: "maxCount must be positive",
            })
          )
        );
      }

      if (Duration.toMillis(policy.cleanupInterval) <= 0) {
        return yield* _(
          Effect.fail(
            new RetentionError({
              operation: "validatePolicy",
              message: "cleanupInterval must be positive",
            })
          )
        );
      }

      // Warn if cleanup interval is too frequent
      if (Duration.toMillis(policy.cleanupInterval) < 60000) {
        // Less than 1 minute
        yield* _(
          Effect.logWarning(
            "Cleanup interval is very frequent (< 1 minute), this may impact performance"
          )
        );
      }

      // Warn if max age is very short
      if (Duration.toMillis(policy.maxAge) < 300000) {
        // Less than 5 minutes
        yield* _(
          Effect.logWarning(
            "Max age is very short (< 5 minutes), metrics may be cleaned up too quickly"
          )
        );
      }
    });

  /**
   * Calculate estimated cleanup time based on metric count and policy.
   */
  export const estimateCleanupTime = (
    metricCount: number,
    policy: RetentionPolicy,
    avgCleanupDuration: number
  ): number => {
    // Simple estimation based on historical data
    const estimatedMetricsToClean = Math.max(0, metricCount - policy.maxCount);
    const cleanupRatio = estimatedMetricsToClean / metricCount;
    return avgCleanupDuration * cleanupRatio;
  };

  /**
   * Create a retention policy optimized for high-throughput scenarios.
   */
  export const createHighThroughputPolicy = (): EnhancedRetentionPolicy => ({
    maxAge: Duration.hours(6), // Shorter retention for high throughput
    maxCount: 50000, // Higher count limit
    cleanupInterval: Duration.minutes(15), // More frequent cleanup
    enableTimeBasedCleanup: true,
    enableCountBasedCleanup: true,
    enableScheduledCleanup: true,
    cleanupBatchSize: 5000, // Larger batches
    maxCleanupDuration: Duration.minutes(2), // Faster cleanup
  });

  /**
   * Create a retention policy optimized for low-resource scenarios.
   */
  export const createLowResourcePolicy = (): EnhancedRetentionPolicy => ({
    maxAge: Duration.hours(12),
    maxCount: 5000, // Lower count limit
    cleanupInterval: Duration.hours(1), // Less frequent cleanup
    enableTimeBasedCleanup: true,
    enableCountBasedCleanup: true,
    enableScheduledCleanup: true,
    cleanupBatchSize: 500, // Smaller batches
    maxCleanupDuration: Duration.minutes(10), // Allow more time
  });
}
