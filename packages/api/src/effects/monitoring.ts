/**
 * @fileoverview Monitoring and Observability with Effect.ts Integration
 *
 * This module provides comprehensive monitoring and observability capabilities that integrate
 * seamlessly with Effect's built-in logging and tracing system:
 * - Metrics collection using Effect's structured logging
 * - Performance monitoring with automatic log spans
 * - Health check system with Effect-based checks
 * - Integration with Effect's built-in observability features
 * - Distributed tracing using Effect's log spans
 *
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { MonitoringService, HealthCheckService } from "@host/api/effects/monitoring";
 *
 * const program = Effect.gen(function* (_) {
 *   const monitoring = yield* _(MonitoringService);
 *   const healthCheck = yield* _(HealthCheckService);
 *
 *   // Record metrics using Effect's logging
 *   yield* _(monitoring.recordMetric("api.requests", 1, { endpoint: "/users" }));
 *
 *   // Monitor operations with automatic spans
 *   const result = yield* _(monitoring.monitorOperation("user-fetch",
 *     Effect.succeed("user data")
 *   ));
 *
 *   // Check system health
 *   const health = yield* _(healthCheck.checkOverallHealth());
 * });
 * ```
 */

import {
  Duration,
  Schedule,
  Context,
  Effect,
  Data,
  Layer,
  pipe,
  Ref,
} from "effect";

import { StructuredLogging } from "./logging";
import type { Metric, MetricLabels, MetricType } from "./enhanced-types";

/**
 * Metric value types.
 */
export type MetricValue = number;

/**
 * Health check status enumeration.
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy";

/**
 * Health check result structure.
 */
export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly message?: string;
  readonly responseTime: number;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

/**
 * System health summary.
 */
export interface SystemHealth {
  readonly status: HealthStatus;
  readonly checks: readonly HealthCheckResult[];
  readonly totalChecks: number;
  readonly healthyChecks: number;
  readonly degradedChecks: number;
  readonly unhealthyChecks: number;
  readonly timestamp: Date;
}

/**
 * Performance metrics for operations.
 */
export interface PerformanceMetrics {
  readonly operation: string;
  readonly executionCount: number;
  readonly averageExecutionTime: number;
  readonly minExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly successRate: number;
  readonly errorRate: number;
  readonly lastExecution: Date;
}

/**
 * Tagged errors for monitoring operations.
 */
export class MonitoringError extends Data.TaggedError("MonitoringError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class HealthCheckError extends Data.TaggedError("HealthCheckError")<{
  readonly checkName: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Monitoring service interface that leverages Effect's built-in observability.
 */
export interface MonitoringService {
  /**
   * Record a metric using Effect's structured logging system.
   * Metrics are logged with structured annotations for easy aggregation.
   */
  readonly recordMetric: (
    name: string,
    value: MetricValue,
    labels?: MetricLabels,
    type?: MetricType
  ) => Effect.Effect<void, MonitoringError>;

  /**
   * Get all recorded metrics.
   */
  readonly getMetrics: (
    since: Date
  ) => Effect.Effect<readonly Metric[], MonitoringError>;

  /**
   * Increment a counter metric.
   */
  readonly incrementCounter: (
    name: string,
    labels?: MetricLabels,
    increment?: number
  ) => Effect.Effect<void, MonitoringError>;

  /**
   * Set a gauge metric value.
   */
  readonly setGauge: (
    name: string,
    value: MetricValue,
    labels?: MetricLabels
  ) => Effect.Effect<void, MonitoringError>;

  /**
   * Record a timer value with automatic log span integration.
   */
  readonly recordTimer: (
    name: string,
    duration: number,
    labels?: MetricLabels
  ) => Effect.Effect<void, MonitoringError>;

  /**
   * Monitor an Effect operation with automatic timing and tracing.
   * Uses Effect's withLogSpan for distributed tracing integration.
   */
  readonly monitorOperation: <A, E, R>(
    operationName: string,
    operation: Effect.Effect<A, E, R>,
    labels?: MetricLabels
  ) => Effect.Effect<A, E | MonitoringError, R>;

  /**
   * Get performance metrics for a specific operation.
   */
  readonly getPerformanceMetrics: (
    operation: string
  ) => Effect.Effect<PerformanceMetrics | undefined, MonitoringError>;

  /**
   * Clear all stored metrics (useful for testing).
   */
  readonly clearMetrics: () => Effect.Effect<void, MonitoringError>;
}

/**
 * Health check service interface.
 */
export interface HealthCheckService {
  /**
   * Register a health check function.
   */
  readonly registerHealthCheck: (
    name: string,
    check: Effect.Effect<HealthCheckResult, HealthCheckError>
  ) => Effect.Effect<void>;

  /**
   * Perform a specific health check by name.
   */
  readonly performHealthCheck: (
    name: string
  ) => Effect.Effect<HealthCheckResult, HealthCheckError>;

  /**
   * Perform all registered health checks.
   */
  readonly performAllHealthChecks: () => Effect.Effect<
    readonly HealthCheckResult[],
    HealthCheckError
  >;

  /**
   * Get overall system health status.
   */
  readonly checkOverallHealth: () => Effect.Effect<
    SystemHealth,
    HealthCheckError
  >;
}

/**
 * Effect.ts service context tags.
 */
export const MonitoringService =
  Context.GenericTag<MonitoringService>("MonitoringService");
export const HealthCheckService =
  Context.GenericTag<HealthCheckService>("HealthCheckService");

/**
 * Monitoring service implementation using Effect's logging and FiberRef for state.
 */
class EffectMonitoringService implements MonitoringService {
  constructor(
    private readonly metricsRef: Ref.Ref<Map<string, PerformanceMetrics>>,
    private readonly actualMetricsRef: Ref.Ref<Metric[]>,
    private readonly enableDetailedLogging: boolean = true
  ) {}

  recordMetric(
    name: string,
    value: MetricValue,
    labels?: MetricLabels,
    type: MetricType = "gauge"
  ): Effect.Effect<void, MonitoringError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        // Create the metric object using enhanced types
        const metric: Metric = {
          id: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name as Metric["name"], // Cast to the branded type
          value: { type: "number", value },
          type,
          labels: labels || {},
          timestamp: new Date(),
        };

        // Store the metric
        yield* _(
          Ref.update(self.actualMetricsRef, (metrics) => {
            const newMetrics = [...metrics, metric];
            // Keep only last 10000 metrics to prevent memory issues
            return newMetrics.length > 10000
              ? newMetrics.slice(-10000)
              : newMetrics;
          })
        );

        // Log the metric with annotations
        yield* _(
          pipe(
            Effect.logInfo(`Recording ${type} metric: ${name}`),
            Effect.annotateLogs("metric.name", name),
            Effect.annotateLogs("metric.type", type),
            Effect.annotateLogs("metric.value", value),
            labels
              ? Effect.annotateLogs("metric.labels", JSON.stringify(labels))
              : (x) => x
          )
        );
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new MonitoringError({
            message: `Failed to record metric: ${name}`,
            cause: error,
          })
        )
      )
    );
  }

  getMetrics(since: Date): Effect.Effect<readonly Metric[], MonitoringError> {
    return pipe(
      Ref.get(this.actualMetricsRef),
      Effect.map((metrics) =>
        metrics.filter((metric) => metric.timestamp >= since)
      ),
      Effect.catchAll((error) =>
        Effect.fail(
          new MonitoringError({
            message: "Failed to get metrics",
            cause: error,
          })
        )
      )
    );
  }

  incrementCounter(
    name: string,
    labels?: MetricLabels,
    increment = 1
  ): Effect.Effect<void, MonitoringError> {
    return this.recordMetric(name, increment, labels, "counter");
  }

  setGauge(
    name: string,
    value: MetricValue,
    labels?: MetricLabels
  ): Effect.Effect<void, MonitoringError> {
    return this.recordMetric(name, value, labels, "gauge");
  }

  recordTimer(
    name: string,
    duration: number,
    labels?: MetricLabels
  ): Effect.Effect<void, MonitoringError> {
    return pipe(
      this.recordMetric(name, duration, labels, "timer"),
      Effect.annotateLogs("timer.duration_ms", duration)
    );
  }

  monitorOperation<A, E, R>(
    operationName: string,
    operation: Effect.Effect<A, E, R>,
    labels?: MetricLabels
  ): Effect.Effect<A, E | MonitoringError, R> {
    return pipe(
      Effect.logDebug(`Starting monitored operation: ${operationName}`),
      Effect.andThen(
        pipe(
          operation,
          Effect.withLogSpan(operationName),
          labels ? StructuredLogging.withMetadata(labels) : (x) => x,
          Effect.timed,
          Effect.tap(([duration, _]) => {
            const durationMs = Duration.toMillis(duration);
            return pipe(
              this.recordTimer(`${operationName}.duration`, durationMs, labels),
              Effect.andThen(
                this.incrementCounter(`${operationName}.success`, labels)
              ),
              Effect.andThen(
                this.updatePerformanceMetrics(operationName, durationMs, true)
              )
            );
          }),
          Effect.map(([_, result]) => result),
          Effect.tapError((error) =>
            pipe(
              this.incrementCounter(`${operationName}.error`, labels),
              Effect.andThen(
                Effect.logError(`Operation failed: ${operationName}`, error)
              )
            )
          )
        )
      ),
      Effect.tap(() =>
        Effect.logDebug(`Completed monitored operation: ${operationName}`)
      )
    );
  }

  private updatePerformanceMetrics(
    operation: string,
    duration: number,
    success: boolean
  ): Effect.Effect<void, MonitoringError> {
    return pipe(
      Ref.modify(this.metricsRef, (metrics) => {
        const existing = metrics.get(operation);
        const now = new Date();

        if (!existing) {
          const newMetrics: PerformanceMetrics = {
            operation,
            executionCount: 1,
            averageExecutionTime: duration,
            minExecutionTime: duration,
            maxExecutionTime: duration,
            successRate: success ? 100 : 0,
            errorRate: success ? 0 : 100,
            lastExecution: now,
          };
          return [undefined, new Map(metrics).set(operation, newMetrics)];
        }

        const totalExecutions = existing.executionCount + 1;
        const newAverage =
          (existing.averageExecutionTime * existing.executionCount + duration) /
          totalExecutions;
        const successCount =
          Math.round((existing.successRate / 100) * existing.executionCount) +
          (success ? 1 : 0);
        const newSuccessRate = (successCount / totalExecutions) * 100;

        const updatedMetrics: PerformanceMetrics = {
          operation,
          executionCount: totalExecutions,
          averageExecutionTime: newAverage,
          minExecutionTime: Math.min(existing.minExecutionTime, duration),
          maxExecutionTime: Math.max(existing.maxExecutionTime, duration),
          successRate: newSuccessRate,
          errorRate: 100 - newSuccessRate,
          lastExecution: now,
        };

        return [undefined, new Map(metrics).set(operation, updatedMetrics)];
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new MonitoringError({
            message: `Failed to update performance metrics for operation: ${operation}`,
            cause: error,
          })
        )
      )
    );
  }

  getPerformanceMetrics(
    operation: string
  ): Effect.Effect<PerformanceMetrics | undefined, MonitoringError> {
    return pipe(
      Ref.get(this.metricsRef),
      Effect.map((metrics) => metrics.get(operation)),
      Effect.catchAll((error) =>
        Effect.fail(
          new MonitoringError({
            message: `Failed to get performance metrics for operation: ${operation}`,
            cause: error,
          })
        )
      )
    );
  }

  clearMetrics(): Effect.Effect<void, MonitoringError> {
    const self = this;
    return pipe(
      Effect.gen(function* (_) {
        yield* _(Ref.set(self.metricsRef, new Map()));
        yield* _(Ref.set(self.actualMetricsRef, []));
        yield* _(Effect.logInfo("Cleared all metrics"));
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new MonitoringError({
            message: "Failed to clear metrics",
            cause: error,
          })
        )
      )
    );
  }
}

/**
 * Health check service implementation using Effect's logging and error handling.
 */
class EffectHealthCheckService implements HealthCheckService {
  constructor(
    private readonly checksRef: Ref.Ref<
      Map<string, Effect.Effect<HealthCheckResult, HealthCheckError>>
    >,
    private readonly lastResultsRef: Ref.Ref<HealthCheckResult[]>
  ) {}

  registerHealthCheck(
    name: string,
    check: Effect.Effect<HealthCheckResult, HealthCheckError>
  ): Effect.Effect<void> {
    return pipe(
      Ref.update(this.checksRef, (checks) => new Map(checks).set(name, check)),
      Effect.andThen(Effect.logInfo(`Registered health check: ${name}`)),
      Effect.annotateLogs("healthCheck.name", name)
    );
  }

  performHealthCheck(
    name: string
  ): Effect.Effect<HealthCheckResult, HealthCheckError> {
    return pipe(
      Ref.get(this.checksRef),
      Effect.flatMap((checks) => {
        const check = checks.get(name);
        if (!check) {
          return Effect.fail(
            new HealthCheckError({
              checkName: name,
              message: `Health check not found: ${name}`,
            })
          );
        }

        return pipe(
          check,
          Effect.withLogSpan(`health-check.${name}`),
          Effect.timed,
          Effect.map(([duration, result]) => ({
            ...result,
            responseTime: Duration.toMillis(duration),
          })),
          Effect.tap((result) =>
            pipe(
              Effect.logInfo(`Health check completed: ${name}`),
              Effect.annotateLogs("healthCheck.name", name),
              Effect.annotateLogs("healthCheck.status", result.status),
              Effect.annotateLogs(
                "healthCheck.responseTime",
                result.responseTime
              )
            )
          ),
          Effect.tapError((error) =>
            Effect.logError(`Health check failed: ${name}`, error)
          )
        );
      })
    );
  }

  performAllHealthChecks(): Effect.Effect<
    readonly HealthCheckResult[],
    HealthCheckError
  > {
    return pipe(
      Ref.get(this.checksRef),
      Effect.flatMap((checks) => {
        const checkNames = Array.from(checks.keys());

        return pipe(
          Effect.forEach(checkNames, (name) =>
            pipe(
              this.performHealthCheck(name),
              Effect.either,
              Effect.map((result) =>
                result._tag === "Right"
                  ? result.right
                  : {
                      name,
                      status: "unhealthy" as const,
                      message: result.left.message,
                      responseTime: 0,
                      timestamp: new Date(),
                    }
              )
            )
          ),
          Effect.tap((results) => Ref.set(this.lastResultsRef, results)),
          Effect.withLogSpan("health-checks.all")
        );
      })
    );
  }

  checkOverallHealth(): Effect.Effect<SystemHealth, HealthCheckError> {
    return pipe(
      this.performAllHealthChecks(),
      Effect.map((results) => {
        const totalChecks = results.length;
        const healthyChecks = results.filter(
          (r) => r.status === "healthy"
        ).length;
        const degradedChecks = results.filter(
          (r) => r.status === "degraded"
        ).length;
        const unhealthyChecks = results.filter(
          (r) => r.status === "unhealthy"
        ).length;

        const overallStatus: HealthStatus =
          unhealthyChecks > 0
            ? "unhealthy"
            : degradedChecks > 0
              ? "degraded"
              : "healthy";

        return {
          status: overallStatus,
          checks: results,
          totalChecks,
          healthyChecks,
          degradedChecks,
          unhealthyChecks,
          timestamp: new Date(),
        };
      }),
      Effect.tap((health) =>
        pipe(
          Effect.logInfo("System health check completed"),
          Effect.annotateLogs("health.status", health.status),
          Effect.annotateLogs("health.totalChecks", health.totalChecks),
          Effect.annotateLogs("health.healthyChecks", health.healthyChecks),
          Effect.annotateLogs("health.degradedChecks", health.degradedChecks),
          Effect.annotateLogs("health.unhealthyChecks", health.unhealthyChecks)
        )
      ),
      Effect.withLogSpan("system-health-check")
    );
  }
}

/**
 * Live implementation layers for monitoring services.
 */
export const MonitoringServiceLive: Layer.Layer<MonitoringService> =
  Layer.effect(
    MonitoringService,
    Effect.gen(function* (_) {
      const metricsRef = yield* _(
        Ref.make(new Map<string, PerformanceMetrics>())
      );
      const actualMetricsRef = yield* _(Ref.make<Metric[]>([]));
      return new EffectMonitoringService(metricsRef, actualMetricsRef);
    })
  );

export const HealthCheckServiceLive: Layer.Layer<HealthCheckService> =
  Layer.effect(
    HealthCheckService,
    Effect.gen(function* (_) {
      const checksRef = yield* _(
        Ref.make(
          new Map<string, Effect.Effect<HealthCheckResult, HealthCheckError>>()
        )
      );
      const lastResultsRef = yield* _(Ref.make<HealthCheckResult[]>([]));
      return new EffectHealthCheckService(checksRef, lastResultsRef);
    })
  );

/**
 * Combined monitoring layer.
 */
export const MonitoringLayer: Layer.Layer<
  MonitoringService | HealthCheckService
> = Layer.mergeAll(MonitoringServiceLive, HealthCheckServiceLive);

/**
 * Monitoring utilities that leverage Effect's built-in features.
 */
export namespace MonitoringUtils {
  /**
   * Create a database health check using Effect's error handling.
   */
  export const createDatabaseHealthCheck = (
    testQuery: Effect.Effect<unknown, unknown>
  ): Effect.Effect<HealthCheckResult, HealthCheckError> =>
    pipe(
      testQuery,
      Effect.withLogSpan("health-check.database"),
      Effect.timed,
      Effect.map(([duration, _]) => ({
        name: "database",
        status: "healthy" as const,
        message: "Database connection successful",
        responseTime: Duration.toMillis(duration),
        timestamp: new Date(),
      })),
      Effect.catchAll((error) =>
        Effect.succeed({
          name: "database",
          status: "unhealthy" as const,
          message: "Database connection failed",
          responseTime: 0,
          timestamp: new Date(),
          metadata: { error: String(error) },
        })
      )
    );

  /**
   * Create a memory health check with Effect's sync operations.
   */
  export const createMemoryHealthCheck = (
    warningThreshold = 0.8,
    criticalThreshold = 0.9
  ): Effect.Effect<HealthCheckResult, HealthCheckError> =>
    pipe(
      Effect.sync(() => {
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
        const usageRatio = heapUsedMB / heapTotalMB;

        let status: HealthStatus;
        let message: string;

        if (usageRatio >= criticalThreshold) {
          status = "unhealthy";
          message = `Memory usage critical: ${(usageRatio * 100).toFixed(1)}%`;
        } else if (usageRatio >= warningThreshold) {
          status = "degraded";
          message = `Memory usage high: ${(usageRatio * 100).toFixed(1)}%`;
        } else {
          status = "healthy";
          message = `Memory usage normal: ${(usageRatio * 100).toFixed(1)}%`;
        }

        return {
          name: "memory",
          status,
          message,
          responseTime: 0,
          timestamp: new Date(),
          metadata: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
            usagePercentage: Math.round(usageRatio * 100),
          },
        };
      }),
      Effect.withLogSpan("health-check.memory"),
      Effect.annotateLogs("memory.heapUsed", process.memoryUsage().heapUsed),
      Effect.annotateLogs("memory.heapTotal", process.memoryUsage().heapTotal)
    );

  /**
   * Monitor an operation with automatic metrics collection.
   */
  export const monitorOperation = <A, E, R>(
    operationName: string,
    operation: Effect.Effect<A, E, R>,
    labels?: MetricLabels
  ): Effect.Effect<A, E | MonitoringError, R | MonitoringService> =>
    Effect.gen(function* (_) {
      const monitoring = yield* _(MonitoringService);
      return yield* _(
        monitoring.monitorOperation(operationName, operation, labels)
      );
    });

  /**
   * Set up default health checks for common system components.
   */
  export const setupDefaultHealthChecks = (): Effect.Effect<
    void,
    never,
    HealthCheckService
  > =>
    Effect.gen(function* (_) {
      const healthService = yield* _(HealthCheckService);

      // Register memory health check
      yield* _(
        healthService.registerHealthCheck("memory", createMemoryHealthCheck())
      );

      // Register application health check
      yield* _(
        healthService.registerHealthCheck(
          "application",
          Effect.succeed({
            name: "application",
            status: "healthy" as const,
            message: "Application is running",
            responseTime: 0,
            timestamp: new Date(),
          })
        )
      );

      yield* _(Effect.logInfo("Default health checks registered"));
    });

  /**
   * Schedule periodic health checks using Effect's scheduling.
   */
  export const scheduleHealthChecks = (
    interval: Duration.Duration = Duration.minutes(5)
  ): Effect.Effect<void, HealthCheckError, HealthCheckService> =>
    Effect.gen(function* (_) {
      const healthService = yield* _(HealthCheckService);

      const healthCheckEffect = pipe(
        healthService.checkOverallHealth(),
        Effect.tap((health) => {
          if (health.status !== "healthy") {
            return pipe(
              Effect.logWarning("System health degraded"),
              Effect.annotateLogs("health.status", health.status),
              Effect.annotateLogs(
                "health.unhealthyChecks",
                health.unhealthyChecks
              ),
              Effect.annotateLogs(
                "health.degradedChecks",
                health.degradedChecks
              )
            );
          }
          return Effect.logDebug("System health check completed successfully");
        }),
        Effect.withLogSpan("scheduled-health-check")
      );

      yield* _(Effect.schedule(healthCheckEffect, Schedule.fixed(interval)));
    });
}
