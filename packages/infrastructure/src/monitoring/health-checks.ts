/**
 * @fileoverview Health Check Implementations for Infrastructure Services
 *
 * This module provides concrete health check implementations for various
 * infrastructure services including database, Redis, and external APIs.
 */

import type Redis from "ioredis";

import type { HealthCheckResult } from "@host/shared";

import { Effect, pipe, Duration } from "effect";
import { HealthCheckError } from "@host/shared";

/**
 * Create a Redis health check.
 */
export const createRedisHealthCheck = (
  redis: Redis
): Effect.Effect<HealthCheckResult, HealthCheckError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const start = Date.now();
        await redis.ping();
        const responseTime = Date.now() - start;

        // Get Redis info for additional metadata
        const info = await redis.info("server");
        const versionMatch = info.match(/redis_version:([^\r\n]+)/);
        const version = versionMatch ? versionMatch[1] : "unknown";

        return {
          name: "redis",
          status: "healthy" as const,
          message: `Redis connection successful (v${version})`,
          responseTime,
          timestamp: new Date(),
          metadata: {
            version,
            responseTimeMs: responseTime,
          },
        };
      },
      catch: (error) =>
        new HealthCheckError({
          checkName: "redis",
          message: "Redis health check failed",
          cause: error,
        }),
    }),
    Effect.timeout(Duration.seconds(5)),
    Effect.sandbox,
    Effect.catchAll((cause) => {
      // Check for timeout specifically
      const isTimeout = String(cause).includes("TimeoutException");
      const isInterrupted = String(cause).includes("Interrupted");

      const message = isTimeout
        ? "Redis health check timed out"
        : isInterrupted
          ? "Redis health check was interrupted"
          : "Redis connection failed";

      return Effect.succeed({
        name: "redis",
        status: "unhealthy" as const,
        message,
        responseTime: 0,
        timestamp: new Date(),
        metadata: { error: String(cause) },
      });
    })
  );

/**
 * Create a database health check using a simple query.
 */
export const createDatabaseHealthCheck = <T>(
  testQuery: Effect.Effect<T, unknown>
): Effect.Effect<HealthCheckResult, HealthCheckError> =>
  pipe(
    testQuery,
    Effect.timed,
    Effect.map(([duration, _]) => ({
      name: "database",
      status: "healthy" as const,
      message: "Database connection successful",
      responseTime: Duration.toMillis(duration),
      timestamp: new Date(),
      metadata: {
        responseTimeMs: Duration.toMillis(duration),
      },
    })),
    Effect.timeout(Duration.seconds(10)),
    Effect.catchAll((error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Database connection failed";

      return Effect.succeed({
        name: "database",
        status: "unhealthy" as const,
        message:
          error instanceof Error &&
          "name" in error &&
          error.name === "TimeoutException"
            ? "Database health check timed out"
            : errorMessage,
        responseTime: 0,
        timestamp: new Date(),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    })
  );

/**
 * Create a memory health check with configurable thresholds.
 */
export const createMemoryHealthCheck = (
  warningThreshold = 0.8,
  criticalThreshold = 0.9
): Effect.Effect<HealthCheckResult, HealthCheckError> =>
  Effect.sync(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const usageRatio = heapUsedMB / heapTotalMB;

    let status: "healthy" | "degraded" | "unhealthy";
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
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
    };
  });

/**
 * Create a disk space health check.
 */
export const createDiskSpaceHealthCheck = (): Effect.Effect<
  HealthCheckResult,
  HealthCheckError
> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // This is a simplified check - in production, you'd use a library like 'diskusage'
        // For now, we'll just check if we can write to temp directory
        const fs = await import("node:fs/promises");
        const os = await import("node:os");
        const path = await import("node:path");

        const tmpDir = os.tmpdir();
        const testFile = path.join(tmpDir, `.health-check-${Date.now()}`);

        try {
          await fs.writeFile(testFile, "test");
          await fs.unlink(testFile);

          return {
            name: "disk",
            status: "healthy" as const,
            message: "Disk space check passed",
            responseTime: 0,
            timestamp: new Date(),
            metadata: {
              tmpDir,
              writable: true,
            },
          };
        } catch (error) {
          return {
            name: "disk",
            status: "unhealthy" as const,
            message: "Cannot write to disk",
            responseTime: 0,
            timestamp: new Date(),
            metadata: {
              tmpDir,
              writable: false,
              error: String(error),
            },
          };
        }
      },
      catch: (error) =>
        new HealthCheckError({
          checkName: "disk",
          message: "Disk space health check failed",
          cause: error,
        }),
    }),
    Effect.catchAll((error) =>
      Effect.succeed({
        name: "disk",
        status: "unhealthy" as const,
        message: "Disk space check failed",
        responseTime: 0,
        timestamp: new Date(),
        metadata: { error: String(error) },
      })
    )
  );

/**
 * Create an application health check.
 */
export const createApplicationHealthCheck = (): Effect.Effect<
  HealthCheckResult,
  HealthCheckError
> =>
  Effect.succeed({
    name: "application",
    status: "healthy" as const,
    message: "Application is running",
    responseTime: 0,
    timestamp: new Date(),
    metadata: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    },
  });

/**
 * Create a composite health check that combines multiple checks.
 */
export const createCompositeHealthCheck = (
  name: string,
  checks: readonly Effect.Effect<HealthCheckResult, HealthCheckError>[]
): Effect.Effect<HealthCheckResult, HealthCheckError> =>
  pipe(
    Effect.all(
      checks.map((check) => Effect.either(check)),
      { concurrency: "unbounded" }
    ),
    Effect.map((results) => {
      const anyDegraded = results.some(
        (r) => r._tag === "Right" && r.right.status === "degraded"
      );
      const anyUnhealthy = results.some(
        (r) => r._tag === "Left" || r.right.status === "unhealthy"
      );

      let status: "healthy" | "degraded" | "unhealthy";
      if (anyUnhealthy) {
        status = "unhealthy";
      } else if (anyDegraded) {
        status = "degraded";
      } else {
        status = "healthy";
      }

      const failedChecks = results
        .filter((r) => r._tag === "Left" || r.right.status !== "healthy")
        .map((r) => (r._tag === "Left" ? "unknown" : r.right.name));

      return {
        name,
        status,
        message:
          status === "healthy"
            ? "All checks passed"
            : `Some checks failed: ${failedChecks.join(", ")}`,
        responseTime: 0,
        timestamp: new Date(),
        metadata: {
          totalChecks: results.length,
          failedChecks,
        },
      };
    })
  );
