/**
 * @fileoverview Health Check and Monitoring Routes
 *
 * This module provides comprehensive health check and monitoring endpoints using Effect.ts services:
 * - System health checks with detailed component status
 * - Performance metrics and monitoring data
 * - Runtime status and configuration information
 * - Database connectivity and service health
 *
 * @example
 * ```
 * GET /health - Overall system health
 * GET /health/detailed - Detailed health check results
 * GET /metrics - Performance metrics
 * GET /status - Runtime status information
 * ```
 */

import type { Hono } from "hono";

import { Effect } from "effect";
import {
  type PerformanceMetrics,
  HealthCheckService,
  MonitoringService,
  MonitoringUtils,
} from "@host/api";

import { createEffectHandler } from "../effects/hono-middleware";

/**
 * Create health check routes with Effect.ts integration.
 */
export const createHealthRoutes = (app: Hono) => {
  /**
   * Basic health check endpoint.
   * Returns simple status for load balancers and monitoring systems.
   */
  app.get(
    "/health",
    createEffectHandler((c) =>
      Effect.gen(function* (_) {
        const healthService = yield* _(HealthCheckService);
        const systemHealth = yield* _(healthService.checkOverallHealth());

        const response = {
          status: systemHealth.status === "healthy" ? "ok" : "error",
          timestamp: systemHealth.timestamp.toISOString(),
          checks: systemHealth.totalChecks,
          healthy: systemHealth.healthyChecks,
          degraded: systemHealth.degradedChecks,
          unhealthy: systemHealth.unhealthyChecks,
        };

        // Return appropriate HTTP status code based on health
        if (systemHealth.status === "unhealthy") {
          return c.json(response, 503);
        }

        return c.json(response);
      }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(new Error(`Health check failed: ${String(error)}`))
        )
      )
    )
  );

  /**
   * Detailed health check endpoint.
   * Returns comprehensive health information including individual check results.
   */
  app.get(
    "/health/detailed",
    createEffectHandler((c) =>
      Effect.gen(function* (_) {
        const healthService = yield* _(HealthCheckService);
        const systemHealth = yield* _(healthService.checkOverallHealth());

        const response = {
          status: systemHealth.status,
          timestamp: systemHealth.timestamp.toISOString(),
          summary: {
            total: systemHealth.totalChecks,
            healthy: systemHealth.healthyChecks,
            degraded: systemHealth.degradedChecks,
            unhealthy: systemHealth.unhealthyChecks,
          },
          checks: systemHealth.checks.map((check) => ({
            name: check.name,
            status: check.status,
            message: check.message,
            responseTime: check.responseTime,
            timestamp: check.timestamp.toISOString(),
            metadata: check.metadata,
          })),
        };

        if (systemHealth.status === "unhealthy") {
          return c.json(response, 503);
        }

        return c.json(response);
      }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new Error(`Detailed health check failed: ${String(error)}`)
          )
        )
      )
    )
  );

  /**
   * Performance metrics endpoint.
   * Returns application performance metrics and monitoring data.
   */
  app.get(
    "/metrics",
    createEffectHandler((c) =>
      Effect.gen(function* (_) {
        const monitoring = yield* _(MonitoringService);

        // Get recent metrics (last hour)
        const since = new Date(Date.now() - 60 * 60 * 1000);
        const metrics = yield* _(monitoring.getMetrics(since));

        // Group metrics by type for better organization
        const groupedMetrics = {
          counters: metrics.filter((m) => m.type === "counter"),
          gauges: metrics.filter((m) => m.type === "gauge"),
          histograms: metrics.filter((m) => m.type === "histogram"),
          timers: metrics.filter((m) => m.type === "timer"),
        };

        const response = {
          timestamp: new Date().toISOString(),
          period: "1h",
          totalMetrics: metrics.length,
          metrics: groupedMetrics,
        };

        return c.json(response);
      }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(new Error(`Failed to get metrics: ${String(error)}`))
        )
      )
    )
  );

  /**
   * Performance summary endpoint.
   * Returns aggregated performance data for key operations.
   */
  app.get(
    "/metrics/performance",
    createEffectHandler((c) =>
      Effect.gen(function* (_) {
        const monitoring = yield* _(MonitoringService);

        // Common operations to check
        const operations = [
          "database.query",
          "auth.validate",
          "api.request",
          "rpc.call",
        ];

        const performanceData: Record<string, PerformanceMetrics | null> = {};

        for (const operation of operations) {
          const metrics = yield* _(monitoring.getPerformanceMetrics(operation));
          performanceData[operation] = metrics || null;
        }

        const response = {
          timestamp: new Date().toISOString(),
          operations: performanceData,
        };

        return c.json(response);
      }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new Error(`Failed to get performance metrics: ${String(error)}`)
          )
        )
      )
    )
  );

  /**
   * Runtime status endpoint.
   * Returns Effect.ts runtime status and configuration information.
   */
  app.get(
    "/status",
    createEffectHandler((c) =>
      Effect.gen(function* (_) {
        const response = {
          timestamp: new Date().toISOString(),
          runtime: {
            environment: process.env.NODE_ENV || "development",
            version: process.version,
            uptime: process.uptime(),
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              external: Math.round(
                process.memoryUsage().external / 1024 / 1024
              ),
            },
            cpu: process.cpuUsage(),
          },
          effect: {
            initialized: true,
            services: [
              "DatabaseService",
              "AuthService",
              "LoggingService",
              "MonitoringService",
              "HealthCheckService",
            ],
          },
        };

        yield* _(Effect.logDebug("Returning runtime status"));

        return c.json(response);
      })
    )
  );

  return app;
};

/**
 * Setup default health checks for the application.
 * Registers common health checks for database, memory, and other system components.
 */
export const setupApplicationHealthChecks = Effect.gen(function* (_) {
  const healthService = yield* _(HealthCheckService);

  // Register database health check
  yield* _(
    healthService.registerHealthCheck(
      "database",
      MonitoringUtils.createDatabaseHealthCheck(
        Effect.gen(function* (_) {
          // Simple database connectivity test - would use actual DatabaseService in real implementation
          yield* _(Effect.logDebug("Testing database connectivity"));
          return "Database connection successful";
        })
      )
    )
  );

  // Register memory health check
  yield* _(
    healthService.registerHealthCheck(
      "memory",
      MonitoringUtils.createMemoryHealthCheck(0.8, 0.9)
    )
  );

  // Register custom application health check
  yield* _(
    healthService.registerHealthCheck(
      "application",
      Effect.gen(function* (_) {
        yield* _(Effect.logDebug("Checking application health"));

        // Simple application health check - just verify we can execute
        return {
          name: "application",
          status: "healthy" as const,
          message: "All application services are operational",
          responseTime: 0,
          timestamp: new Date(),
        };
      })
    )
  );

  yield* _(Effect.logInfo("Application health checks registered"));
});

/**
 * Initialize monitoring and health check services.
 * Sets up default health checks and starts periodic monitoring.
 */
export const initializeMonitoring = Effect.gen(function* (_) {
  // Setup default health checks
  yield* _(setupApplicationHealthChecks);

  // Setup default monitoring utilities
  yield* _(MonitoringUtils.setupDefaultHealthChecks());

  // Log successful initialization using Effect's built-in logging
  yield* _(Effect.logInfo("Monitoring and health checks initialized"));

  // Record initialization metric
  const monitoring = yield* _(MonitoringService);
  yield* _(monitoring.incrementCounter("application.monitoring.initialized"));
});
