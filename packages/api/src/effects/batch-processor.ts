/**
 * @fileoverview Batch Processor Implementation with Effect Scheduling
 *
 * This module provides a high-performance batch processor for metrics collection
 * using Effect.schedule instead of setTimeout for better integration with Effect-TS
 * patterns and improved reliability.
 */

import type { MonitoringService } from "./monitoring";
import type { EnhancedMetricStore } from "./storage";

import type {
  BatchConfiguration,
  BatchRetryConfig,
  Metric,
} from "./enhanced-types";

import { StructuredLogging, CorrelationId } from "./logging";

import {
  Schedule,
  Duration,
  Context,
  Effect,
  Fiber,
  Layer,
  Queue,
  Data,
  pipe,
  Ref,
} from "effect";

import { createMetricLabelKey } from "./enhanced-types";

/**
 * Batch processing error types.
 */
export class BatchError extends Data.TaggedError("BatchError")<{
  readonly batchId: string;
  readonly message: string;
  readonly partialFailures?: readonly string[];
  readonly cause?: unknown;
}> {}

/**
 * Partial batch failure error for handling individual metric failures.
 */
export class PartialBatchError extends Data.TaggedError("PartialBatchError")<{
  readonly batchId: string;
  readonly successfulMetrics: readonly Metric[];
  readonly failedMetrics: readonly { metric: Metric; error: unknown }[];
  readonly message: string;
}> {}

/**
 * Batch processing statistics for monitoring and performance analysis.
 */
export interface BatchStats {
  readonly totalBatches: number;
  readonly totalMetrics: number;
  readonly successfulBatches: number;
  readonly failedBatches: number;
  readonly partiallyFailedBatches: number;
  readonly retriedBatches: number;
  readonly averageBatchSize: number;
  readonly averageProcessingTime: number;
  readonly lastFlushTime?: Date;
  readonly pendingMetrics: number;
  readonly isRunning: boolean;
  readonly failureRate: number;
  readonly retrySuccessRate: number;
}

/**
 * Batch processor health status for monitoring.
 */
export interface BatchHealthStatus {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly details: {
    readonly isRunning: boolean;
    readonly queueSize: number;
    readonly failureRate: number;
    readonly averageLatency: number;
    readonly lastFlushAge?: number | undefined; // milliseconds since last flush
    readonly issues: readonly string[];
  };
  readonly recommendations: readonly string[];
}

/**
 * Batch processor interface for metrics collection.
 */
export interface BatchProcessor {
  readonly addMetric: (metric: Metric) => Effect.Effect<void, BatchError>;
  readonly addMetrics: (
    metrics: readonly Metric[]
  ) => Effect.Effect<void, BatchError>;
  readonly flush: () => Effect.Effect<void, BatchError>;
  readonly configure: (
    config: BatchConfiguration
  ) => Effect.Effect<void, BatchError>;
  readonly getStats: () => Effect.Effect<BatchStats, never>;
  readonly getConfiguration: () => Effect.Effect<BatchConfiguration, never>;
  readonly updateConfiguration: (
    updates: Partial<BatchConfiguration>
  ) => Effect.Effect<void, BatchError>;
  readonly autoTune: (
    targetLatency: Duration.Duration,
    metricsPerSecond: number
  ) => Effect.Effect<BatchConfiguration, BatchError>;
  readonly getHealthStatus: () => Effect.Effect<BatchHealthStatus, never>;
  readonly start: () => Effect.Effect<void, BatchError>;
  readonly stop: () => Effect.Effect<void, BatchError>;
  readonly isRunning: () => Effect.Effect<boolean, never>;
}

/**
 * Batch item with metadata for tracking and error handling.
 */
interface BatchItem {
  readonly metric: Metric;
  readonly addedAt: Date;
  readonly batchId: string;
}

/**
 * Internal batch state for tracking processing status.
 */
interface BatchState {
  readonly config: BatchConfiguration;
  readonly stats: BatchStats;
  readonly isRunning: boolean;
  readonly schedulerFiber?: Fiber.Fiber<void, BatchError> | undefined;
}

/**
 * Enhanced batch processor implementation using Effect scheduling.
 */
export class BatchProcessorImpl implements BatchProcessor {
  constructor(
    private readonly pendingQueue: Queue.Queue<BatchItem>,
    private readonly state: Ref.Ref<BatchState>,
    private readonly store: EnhancedMetricStore,
    private readonly monitoring?: MonitoringService
  ) {}

  readonly addMetric = (metric: Metric): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));

      if (!currentState.isRunning) {
        yield* _(
          Effect.fail(
            new BatchError({
              batchId: "none",
              message: "Batch processor is not running",
            })
          )
        );
      }

      const batchId = yield* _(CorrelationId.generate());
      const batchItem: BatchItem = {
        metric,
        addedAt: new Date(),
        batchId,
      };

      yield* _(Queue.offer(self.pendingQueue, batchItem));

      // Check if we should flush immediately due to batch size
      const queueSize = yield* _(Queue.size(self.pendingQueue));
      if (queueSize >= currentState.config.maxBatchSize) {
        yield* _(self.flushInternal());
      }
    });
  };

  readonly addMetrics = (
    metrics: readonly Metric[]
  ): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      // Add all metrics to the queue
      for (const metric of metrics) {
        yield* _(self.addMetric(metric));
      }
    });
  };

  readonly flush = (): Effect.Effect<void, BatchError> => this.flushInternal();

  private readonly flushInternal = (): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const startTime = Date.now();
      const batchId = yield* _(CorrelationId.generate());

      // Drain all pending items from the queue
      const pendingItems: BatchItem[] = [];
      let item = yield* _(Queue.poll(self.pendingQueue));

      while (item._tag === "Some") {
        pendingItems.push(item.value);
        item = yield* _(Queue.poll(self.pendingQueue));
      }

      if (pendingItems.length === 0) {
        return;
      }

      const metrics = pendingItems.map((item) => item.metric);

      try {
        // Store metrics using the enhanced metric store
        yield* _(
          self.store.recordMetrics(metrics).pipe(
            Effect.mapError(
              (error) =>
                new BatchError({
                  batchId,
                  message: "Failed to store metrics",
                  cause: error,
                })
            )
          )
        );

        // Update statistics on successful flush
        yield* _(
          Ref.update(self.state, (state) => ({
            ...state,
            stats: {
              ...state.stats,
              totalBatches: state.stats.totalBatches + 1,
              totalMetrics: state.stats.totalMetrics + metrics.length,
              successfulBatches: state.stats.successfulBatches + 1,
              averageBatchSize: Math.round(
                (state.stats.totalMetrics + metrics.length) /
                  (state.stats.totalBatches + 1)
              ),
              averageProcessingTime: Math.round(
                (state.stats.averageProcessingTime * state.stats.totalBatches +
                  (Date.now() - startTime)) /
                  (state.stats.totalBatches + 1)
              ),
              lastFlushTime: new Date(),
              pendingMetrics: 0,
            },
          }))
        );

        yield* _(
          pipe(
            Effect.logDebug(
              `Successfully flushed batch with ${metrics.length} metrics`
            ),
            StructuredLogging.withMetadata({
              batchId,
              metricsCount: metrics.length,
              processingTime: Date.now() - startTime,
            })
          )
        );

        // Record batch processing metrics if monitoring service is available
        if (self.monitoring) {
          yield* _(
            pipe(
              self.monitoring.recordTimer(
                "batch.flush.duration",
                Date.now() - startTime,
                { [createMetricLabelKey("batchSize")]: metrics.length }
              ),
              Effect.andThen(
                self.monitoring.incrementCounter("batch.flush.success", {
                  [createMetricLabelKey("batchSize")]: metrics.length,
                })
              ),
              Effect.catchAll(() => Effect.void) // Don't fail batch processing if monitoring fails
            )
          );
        }
      } catch (error) {
        // Update statistics on failed flush
        for (const item of pendingItems) {
          yield* _(Queue.offer(self.pendingQueue, item));
        }
        yield* _(
          Ref.update(self.state, (state) => ({
            ...state,
            stats: {
              ...state.stats,
              totalBatches: state.stats.totalBatches + 1,
              failedBatches: state.stats.failedBatches + 1,
            },
          }))
        );

        yield* _(
          pipe(
            Effect.logError("Failed to flush batch", error),
            StructuredLogging.withMetadata({
              batchId,
              metricsCount: metrics.length,
              operation: "batch-flush",
            })
          )
        );

        // Record batch processing failure metrics if monitoring service is available
        if (self.monitoring) {
          yield* _(
            pipe(
              self.monitoring.incrementCounter("batch.flush.error", {
                [createMetricLabelKey("batchSize")]: metrics.length,
                [createMetricLabelKey("errorType")]:
                  error instanceof Error ? error.constructor.name : "Unknown",
              }),
              Effect.catchAll(() => Effect.void) // Don't fail batch processing if monitoring fails
            )
          );
        }

        yield* _(
          Effect.fail(
            new BatchError({
              batchId,
              message: `Failed to flush batch with ${metrics.length} metrics`,
              cause: error,
            })
          )
        );
      }
    });
  };

  readonly configure = (
    config: BatchConfiguration
  ): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));

      // Stop current scheduler if running
      if (currentState.schedulerFiber) {
        yield* _(Fiber.interrupt(currentState.schedulerFiber));
      }

      // Update configuration
      yield* _(
        Ref.update(self.state, (state) => ({
          ...state,
          config,
          schedulerFiber: undefined,
        }))
      );

      // Restart scheduler with new configuration if processor is running
      if (currentState.isRunning && config.enableAutoFlush) {
        yield* _(self.startScheduler());
      }

      yield* _(
        pipe(
          Effect.logInfo("Batch processor reconfigured"),
          StructuredLogging.withMetadata({
            maxBatchSize: config.maxBatchSize,
            flushIntervalMs: Duration.toMillis(config.flushInterval),
            component: "batch-processor",
            operation: "configure",
          })
        )
      );
    });
  };

  readonly getStats = (): Effect.Effect<BatchStats, never> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));
      const queueSize = yield* _(Queue.size(self.pendingQueue));

      return {
        ...currentState.stats,
        pendingMetrics: queueSize,
        isRunning: currentState.isRunning,
      };
    });
  };

  readonly getConfiguration = (): Effect.Effect<BatchConfiguration, never> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));
      return currentState.config;
    });
  };

  readonly updateConfiguration = (
    updates: Partial<BatchConfiguration>
  ): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentConfig = yield* _(self.getConfiguration());
      const newConfig: BatchConfiguration = { ...currentConfig, ...updates };
      yield* _(self.configure(newConfig));
    });
  };

  readonly autoTune = (
    targetLatency: Duration.Duration,
    metricsPerSecond: number
  ): Effect.Effect<BatchConfiguration, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentConfig = yield* _(self.getConfiguration());

      // Calculate optimal batch size and flush interval
      const optimalBatchSize = BatchProcessorUtils.calculateOptimalBatchSize(
        metricsPerSecond,
        targetLatency
      );

      const optimalFlushInterval =
        BatchProcessorUtils.calculateOptimalFlushInterval(
          optimalBatchSize,
          metricsPerSecond
        );

      const tunedConfig: BatchConfiguration = {
        ...currentConfig,
        maxBatchSize: optimalBatchSize,
        flushInterval: optimalFlushInterval,
      };

      yield* _(self.configure(tunedConfig));

      yield* _(
        pipe(
          Effect.logInfo("Auto-tuned batch processor"),
          StructuredLogging.withMetadata({
            optimalBatchSize,
            flushIntervalMs: Duration.toMillis(optimalFlushInterval),
            component: "batch-processor",
            operation: "auto-tune",
          })
        )
      );

      return tunedConfig;
    });
  };

  readonly getHealthStatus = (): Effect.Effect<BatchHealthStatus, never> => {
    const self = this;
    return Effect.gen(function* (_) {
      const stats = yield* _(self.getStats());
      const queueSize = yield* _(Queue.size(self.pendingQueue));

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check if processor is running
      if (!stats.isRunning) {
        issues.push("Batch processor is not running");
        recommendations.push("Start the batch processor");
      }

      // Check queue size
      if (queueSize > 1000) {
        issues.push(`High queue size: ${queueSize} pending metrics`);
        recommendations.push(
          "Consider increasing batch size or flush frequency"
        );
      }

      // Check failure rate
      if (stats.failureRate > 0.1) {
        issues.push(
          `High failure rate: ${(stats.failureRate * 100).toFixed(1)}%`
        );
        recommendations.push(
          "Check storage backend health and retry configuration"
        );
      }

      // Check last flush time
      let lastFlushAge: number | undefined;
      if (stats.lastFlushTime) {
        lastFlushAge = Date.now() - stats.lastFlushTime.getTime();
        if (lastFlushAge > 300000) {
          // 5 minutes
          issues.push(`Last flush was ${Math.round(lastFlushAge / 1000)}s ago`);
          recommendations.push("Check if auto-flush is enabled and working");
        }
      }

      // Determine overall health status
      let status: "healthy" | "degraded" | "unhealthy";
      if (issues.length === 0) {
        status = "healthy";
      } else if (issues.length <= 2 && stats.isRunning) {
        status = "degraded";
      } else {
        status = "unhealthy";
      }

      return {
        status,
        details: {
          isRunning: stats.isRunning,
          queueSize,
          failureRate: stats.failureRate,
          averageLatency: stats.averageProcessingTime,
          lastFlushAge,
          issues,
        },
        recommendations,
      };
    });
  };

  readonly start = (): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));

      if (currentState.isRunning) {
        yield* _(
          pipe(
            Effect.logWarning("Batch processor is already running"),
            StructuredLogging.withMetadata({
              component: "batch-processor",
              operation: "start",
            })
          )
        );
        return;
      }

      // Mark as running
      yield* _(
        Ref.update(self.state, (state) => ({
          ...state,
          isRunning: true,
        }))
      );

      // Start scheduler if auto-flush is enabled
      if (currentState.config.enableAutoFlush) {
        yield* _(self.startScheduler());
      }

      yield* _(
        pipe(
          Effect.logInfo("Batch processor started successfully"),
          StructuredLogging.withMetadata({
            component: "batch-processor",
            operation: "start",
          })
        )
      );
    });
  };

  readonly stop = (): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));

      if (!currentState.isRunning) {
        yield* _(
          pipe(
            Effect.logWarning("Batch processor is already stopped"),
            StructuredLogging.withMetadata({
              component: "batch-processor",
              operation: "stop",
            })
          )
        );
        return;
      }

      // Stop scheduler if running
      if (currentState.schedulerFiber) {
        yield* _(Fiber.interrupt(currentState.schedulerFiber));
      }

      // Flush any remaining metrics before stopping
      yield* _(self.flushInternal());

      // Mark as stopped
      yield* _(
        Ref.update(self.state, (state) => ({
          ...state,
          isRunning: false,
          schedulerFiber: undefined,
        }))
      );

      yield* _(
        pipe(
          Effect.logInfo("Batch processor stopped successfully"),
          StructuredLogging.withMetadata({
            component: "batch-processor",
            operation: "stop",
          })
        )
      );
    });
  };

  readonly isRunning = (): Effect.Effect<boolean, never> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));
      return currentState.isRunning;
    });
  };

  private readonly startScheduler = (): Effect.Effect<void, BatchError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const currentState = yield* _(Ref.get(self.state));

      // Create a scheduled flush effect using Effect.schedule
      const scheduledFlush = pipe(
        self.flushInternal(),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError("Scheduled flush failed", error),
            StructuredLogging.withMetadata({
              operation: "scheduled-flush",
              component: "batch-processor",
            })
          )
        ),
        Effect.schedule(Schedule.fixed(currentState.config.flushInterval)),
        Effect.forever
      );

      // Fork the scheduled flush as a fiber
      const schedulerFiber = yield* _(Effect.fork(scheduledFlush));

      // Update state with the scheduler fiber
      yield* _(
        Ref.update(self.state, (state) => ({
          ...state,
          schedulerFiber,
        }))
      );

      yield* _(
        Effect.logDebug(
          `Batch processor scheduler started with interval: ${Duration.toMillis(currentState.config.flushInterval)}ms`
        )
      );
    });
  };
}

/**
 * Create a new batch processor instance.
 */
export const createBatchProcessor = (
  config: BatchConfiguration,
  store: EnhancedMetricStore,
  monitoring?: MonitoringService
): Effect.Effect<BatchProcessor, never> =>
  Effect.gen(function* (_) {
    const pendingQueue = yield* _(Queue.unbounded<BatchItem>());

    const initialState: BatchState = {
      config,
      stats: {
        totalBatches: 0,
        totalMetrics: 0,
        successfulBatches: 0,
        failedBatches: 0,
        partiallyFailedBatches: 0,
        retriedBatches: 0,
        averageBatchSize: 0,
        averageProcessingTime: 0,
        pendingMetrics: 0,
        isRunning: false,
        failureRate: 0,
        retrySuccessRate: 1,
      },
      isRunning: false,
    };

    const state = yield* _(Ref.make(initialState));

    return new BatchProcessorImpl(pendingQueue, state, store, monitoring);
  });

/**
 * Batch processor service interface for dependency injection.
 */
export interface BatchProcessorService extends BatchProcessor {}

/**
 * Context tag for batch processor service.
 */
export const BatchProcessorService = Context.GenericTag<BatchProcessorService>(
  "BatchProcessorService"
);

/**
 * Layer for batch processor service.
 */
export const BatchProcessorLayer = (
  config: BatchConfiguration,
  store: EnhancedMetricStore,
  monitoring?: MonitoringService
) =>
  Layer.effect(
    BatchProcessorService,
    createBatchProcessor(config, store, monitoring)
  );

/**
 * Utility functions for batch processing configuration and management.
 */
export namespace BatchProcessorUtils {
  /**
   * Create a default retry configuration.
   */
  export const createDefaultRetryConfig = (): BatchRetryConfig => ({
    maxRetries: 3,
    initialDelay: Duration.millis(100),
    maxDelay: Duration.seconds(30),
    backoffMultiplier: 2,
    retryableErrors: ["StorageError", "NetworkError", "TimeoutError"],
  });

  /**
   * Create a default batch configuration.
   */
  export const createDefaultConfig = (): BatchConfiguration => ({
    maxBatchSize: 100,
    flushInterval: Duration.seconds(30),
    maxWaitTime: Duration.minutes(5),
    enableAutoFlush: true,
    enableBatching: true,
    enablePartialFailureRecovery: true,
    retryConfig: createDefaultRetryConfig(),
  });

  /**
   * Validate batch configuration for common issues.
   */
  export const validateConfig = (
    config: BatchConfiguration
  ): Effect.Effect<void, BatchError> =>
    Effect.gen(function* (_) {
      if (config.maxBatchSize <= 0) {
        yield* _(
          Effect.fail(
            new BatchError({
              batchId: "validation",
              message: "maxBatchSize must be greater than 0",
            })
          )
        );
      }

      if (Duration.toMillis(config.flushInterval) <= 0) {
        yield* _(
          Effect.fail(
            new BatchError({
              batchId: "validation",
              message: "flushInterval must be greater than 0",
            })
          )
        );
      }

      if (
        Duration.toMillis(config.maxWaitTime) <
        Duration.toMillis(config.flushInterval)
      ) {
        yield* _(
          Effect.fail(
            new BatchError({
              batchId: "validation",
              message:
                "maxWaitTime must be greater than or equal to flushInterval",
            })
          )
        );
      }
    });

  /**
   * Calculate optimal batch size based on metric throughput.
   */
  export const calculateOptimalBatchSize = (
    metricsPerSecond: number,
    targetLatency: Duration.Duration
  ): number => {
    const targetLatencyMs = Duration.toMillis(targetLatency);
    const optimalSize = Math.ceil((metricsPerSecond * targetLatencyMs) / 1000);

    // Clamp between reasonable bounds
    return Math.max(10, Math.min(1000, optimalSize));
  };

  /**
   * Calculate optimal flush interval based on batch size and throughput.
   */
  export const calculateOptimalFlushInterval = (
    batchSize: number,
    metricsPerSecond: number
  ): Duration.Duration => {
    if (metricsPerSecond <= 0) {
      return Duration.seconds(30); // Default fallback
    }

    const intervalSeconds = batchSize / metricsPerSecond;

    // Clamp between reasonable bounds (1 second to 5 minutes)
    const clampedSeconds = Math.max(1, Math.min(300, intervalSeconds));

    return Duration.seconds(clampedSeconds);
  };
}

/**
 * Graceful shutdown utility for batch processor.
 */
export const gracefulShutdown = (
  processor: BatchProcessor,
  timeout: Duration.Duration = Duration.seconds(30)
): Effect.Effect<void, BatchError> =>
  Effect.gen(function* (_) {
    yield* _(Effect.logInfo("Initiating graceful shutdown of batch processor"));

    // Stop accepting new metrics and flush remaining ones
    const shutdownEffect = pipe(
      processor.stop(),
      Effect.timeout(timeout),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          yield* _(
            Effect.logError("Graceful shutdown timed out or failed", error)
          );
          yield* _(
            Effect.fail(
              new BatchError({
                batchId: "shutdown",
                message: "Graceful shutdown failed",
                cause: error,
              })
            )
          );
        })
      )
    );

    yield* _(shutdownEffect);
    yield* _(Effect.logInfo("Batch processor shutdown completed"));
  });

/**
 * Health check for batch processor.
 */
export const healthCheck = (
  processor: BatchProcessor
): Effect.Effect<
  { status: "healthy" | "unhealthy"; details: BatchStats },
  never
> =>
  Effect.gen(function* (_) {
    const stats = yield* _(processor.getStats());
    const isHealthy = stats.isRunning && stats.pendingMetrics < 10000; // Arbitrary threshold

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      details: stats,
    };
  });
