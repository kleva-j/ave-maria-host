/**
 * @fileoverview Monitoring and Health Check Types
 *
 * Shared types for monitoring, health checks, and observability across the application.
 */

import { Data } from "effect";

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
