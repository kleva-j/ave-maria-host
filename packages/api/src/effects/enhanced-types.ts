/**
 * @fileoverview Enhanced Type System for Monitoring
 *
 * This module provides enhanced type definitions for the monitoring system,
 * including discriminated union types, metadata structures, and configuration interfaces.
 * It builds upon the existing monitoring system to provide better type safety and
 * more comprehensive metric collection capabilities.
 */

import type { LogLevel } from "./core";

import { type Duration, Schema } from "effect";

// Enhanced Metric Value Types (Discriminated Union)

/**
 * Enhanced metric value types using discriminated unions for type safety.
 */
export type MetricValue =
  | { readonly type: "number"; readonly value: number }
  | {
      readonly type: "number_with_unit";
      readonly value: number;
      readonly unit: string;
    }
  | {
      readonly type: "histogram";
      readonly buckets: HistogramBuckets;
      readonly samples: readonly number[];
    }
  | {
      readonly type: "distribution";
      readonly values: readonly number[];
      readonly percentiles: Record<string, number>;
    };

/**
 * Histogram bucket structure for histogram metrics.
 */
export interface HistogramBuckets {
  readonly boundaries: readonly number[];
  readonly counts: readonly number[];
  readonly sum: number;
  readonly count: number;
}

/**
 * Enhanced metric types extending the basic metric types.
 */
export type MetricType =
  | "counter"
  | "gauge"
  | "histogram"
  | "distribution"
  | "timer"
  | "summary";

// Schema Definitions (needed for branded types)

/**
 * Schema for validating metric names.
 */
export const MetricNameSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(255),
  Schema.pattern(/^[a-zA-Z][a-zA-Z0-9._-]*$/)
).pipe(Schema.brand("MetricName"));

/**
 * Schema for validating metric label keys.
 */
export const MetricLabelKeySchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(100),
  Schema.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)
).pipe(Schema.brand("MetricLabelKey"));

// Branded Types for Type Safety

/**
 * Branded type for metric names to prevent invalid values.
 */
export type MetricName = Schema.Schema.Type<typeof MetricNameSchema>;

/**
 * Branded type for metric label keys to ensure valid label names.
 */
export type MetricLabelKey = Schema.Schema.Type<typeof MetricLabelKeySchema>;

/**
 * Enhanced metric labels with branded keys.
 */
export type MetricLabels = {
  readonly [K in MetricLabelKey]?: string | number | boolean;
};

// Enhanced Metric Interfaces and Metadata

/**
 * Metadata structure for enhanced metrics providing context and correlation.
 */
export interface MetricMetadata {
  readonly source?: string;
  readonly correlationId?: string;
  readonly environment?: string;
  readonly version?: string;
  readonly component?: string;
  readonly service?: string;
  readonly traceId?: string;
  readonly spanId?: string;
}

/**
 * Enhanced metric interface with comprehensive metadata support.
 */
export interface Metric {
  readonly id: string;
  readonly name: MetricName;
  readonly value: MetricValue;
  readonly type: MetricType;
  readonly labels: MetricLabels;
  readonly timestamp: Date;
  readonly metadata?: MetricMetadata;
}

/**
 * Time range specification for metric queries.
 */
export interface TimeRange {
  readonly start: Date;
  readonly end: Date;
}

/**
 * Advanced metric filter interface for querying metrics.
 */
export interface MetricFilter {
  readonly names?: readonly MetricName[];
  readonly labels?: MetricLabels;
  readonly types?: readonly MetricType[];
  readonly timeRange?: TimeRange;
  readonly sources?: readonly string[];
  readonly correlationIds?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}
// Histogram and Distribution Specific Types

/**
 * Histogram snapshot for current state.
 */
export interface HistogramSnapshot {
  readonly buckets: readonly number[];
  readonly counts: readonly number[];
  readonly sum: number;
  readonly count: number;
  readonly percentiles: Record<string, number>;
}

/**
 * Distribution data for statistical analysis.
 */
export interface DistributionData {
  readonly values: readonly number[];
  readonly count: number;
  readonly sum: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly stddev: number;
  readonly percentiles: Record<string, number>;
}

// Configuration Interfaces

/**
 * Storage backend configuration options.
 */
export type StorageBackend = "in-memory" | "external";

/**
 * Retention policy configuration for metric storage.
 */
export interface RetentionPolicy {
  readonly maxAge: Duration.Duration;
  readonly maxCount: number;
  readonly cleanupInterval: Duration.Duration;
}

/**
 * Storage configuration for the monitoring system.
 */
export interface StorageConfiguration {
  readonly maxMetrics: number;
  readonly retentionPolicy: RetentionPolicy;
  readonly storageBackend: StorageBackend;
  readonly enableCircularBuffer: boolean;
  readonly externalStorageUrl?: string;
  readonly connectionTimeout?: Duration.Duration;
}

/**
 * Batch processing configuration.
 */
export interface BatchConfiguration {
  readonly maxBatchSize: number;
  readonly flushInterval: Duration.Duration;
  readonly maxWaitTime: Duration.Duration;
  readonly enableAutoFlush: boolean;
  readonly enableBatching: boolean;
  readonly enablePartialFailureRecovery: boolean;
  readonly retryConfig: BatchRetryConfig;
}

/**
 * Retry configuration for batch operations.
 */
export interface BatchRetryConfig {
  readonly maxRetries: number;
  readonly initialDelay: Duration.Duration;
  readonly maxDelay: Duration.Duration;
  readonly backoffMultiplier: number;
  readonly retryableErrors: readonly string[];
}

/**
 * Performance monitoring configuration.
 */
export interface PerformanceConfiguration {
  readonly enablePercentiles: boolean;
  readonly percentilesToTrack: readonly number[];
  readonly performanceWindowSize: Duration.Duration;
  readonly enableConcurrencyTracking: boolean;
  readonly enableThroughputTracking: boolean;
  readonly enableTrendAnalysis: boolean;
}

/**
 * Retry policy configuration for health checks and other operations.
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly retryableErrors?: readonly string[];
}

/**
 * Backoff strategy for retry operations.
 */
export type BackoffStrategy =
  | { readonly type: "fixed"; readonly delay: Duration.Duration }
  | {
      readonly type: "exponential";
      readonly initialDelay: Duration.Duration;
      readonly maxDelay: Duration.Duration;
    }
  | {
      readonly type: "linear";
      readonly initialDelay: Duration.Duration;
      readonly increment: Duration.Duration;
    };

/**
 * Health check configuration.
 */
export interface HealthCheckConfiguration {
  readonly enableHealthChecks: boolean;
  readonly defaultTimeout: Duration.Duration;
  readonly defaultRetryPolicy: RetryPolicy;
  readonly enableResultCaching: boolean;
  readonly cacheTtl: Duration.Duration;
  readonly enableDependencyChecks: boolean;
}

/**
 * Export configuration for metrics.
 */
export interface ExportConfiguration {
  readonly enablePrometheusExport: boolean;
  readonly enableJsonExport: boolean;
  readonly enableStreamingExport: boolean;
  readonly exportInterval?: Duration.Duration;
  readonly includeMetadata: boolean;
  readonly compressionEnabled: boolean;
}

/**
 * Logging configuration for the monitoring system.
 */
export interface LoggingConfiguration {
  readonly enableStructuredLogging: boolean;
  readonly logLevel: LogLevel;
  readonly enableCorrelationIds: boolean;
  readonly enableDistributedTracing: boolean;
  readonly logMetricOperations: boolean;
  readonly logHealthCheckResults: boolean;
}

/**
 * Feature flags for enabling/disabling monitoring capabilities.
 */
export interface FeatureFlags {
  readonly enableHistogramMetrics: boolean;
  readonly enableDistributionMetrics: boolean;
  readonly enablePerformanceMonitoring: boolean;
  readonly enableBatchProcessing: boolean;
  readonly enableHealthChecks: boolean;
  readonly enableExport: boolean;
  readonly enableAdvancedFiltering: boolean;
}

/**
 * Comprehensive monitoring system configuration.
 */
export interface MonitoringConfiguration {
  readonly storage: StorageConfiguration;
  readonly batch: BatchConfiguration;
  readonly performance: PerformanceConfiguration;
  readonly healthChecks: HealthCheckConfiguration;
  readonly export: ExportConfiguration;
  readonly logging: LoggingConfiguration;
  readonly enableFeatureFlags: boolean;
  readonly featureFlags?: FeatureFlags;
}

// Additional Schema Validation for Enhanced Types

/**
 * Schema for histogram buckets validation.
 */
export const HistogramBucketsSchema = Schema.Struct({
  boundaries: Schema.Array(Schema.Number),
  counts: Schema.Array(Schema.NonNegativeInt),
  sum: Schema.Number,
  count: Schema.NonNegativeInt,
});

/**
 * Schema for enhanced metric value validation.
 */
export const MetricValueSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("number"),
    value: Schema.Number,
  }),
  Schema.Struct({
    type: Schema.Literal("number_with_unit"),
    value: Schema.Number,
    unit: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("histogram"),
    buckets: HistogramBucketsSchema,
    samples: Schema.Array(Schema.Number),
  }),
  Schema.Struct({
    type: Schema.Literal("distribution"),
    values: Schema.Array(Schema.Number),
    percentiles: Schema.Record({ key: Schema.String, value: Schema.Number }),
  })
);

/**
 * Schema for metric metadata validation.
 */
export const MetricMetadataSchema = Schema.Struct({
  source: Schema.optional(Schema.String),
  correlationId: Schema.optional(Schema.String),
  environment: Schema.optional(Schema.String),
  version: Schema.optional(Schema.String),
  component: Schema.optional(Schema.String),
  service: Schema.optional(Schema.String),
  traceId: Schema.optional(Schema.String),
  spanId: Schema.optional(Schema.String),
});

/**
 * Schema for enhanced metric validation.
 */
export const MetricSchema = Schema.Struct({
  id: Schema.String,
  name: MetricNameSchema,
  value: MetricValueSchema,
  type: Schema.Union(
    Schema.Literal("counter"),
    Schema.Literal("gauge"),
    Schema.Literal("histogram"),
    Schema.Literal("distribution"),
    Schema.Literal("timer"),
    Schema.Literal("summary")
  ),
  labels: Schema.Record({
    key: Schema.String,
    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
  }),
  timestamp: Schema.DateFromSelf, // Use DateFromSelf to accept Date objects directly
  metadata: Schema.optional(MetricMetadataSchema),
});

// Configuration Validation Schemas

/**
 * Schema for retention policy validation.
 */
export const RetentionPolicySchema = Schema.Struct({
  maxAge: Schema.String, // Duration string representation
  maxCount: Schema.NonNegativeInt,
  cleanupInterval: Schema.String, // Duration string representation
});

/**
 * Schema for storage configuration validation.
 */
export const StorageConfigurationSchema = Schema.Struct({
  maxMetrics: Schema.NonNegativeInt,
  retentionPolicy: RetentionPolicySchema,
  storageBackend: Schema.Union(
    Schema.Literal("in-memory"),
    Schema.Literal("external")
  ),
  enableCircularBuffer: Schema.Boolean,
  externalStorageUrl: Schema.optional(Schema.String),
  connectionTimeout: Schema.optional(Schema.String), // Duration string representation
});

/**
 * Schema for batch retry configuration validation.
 */
export const BatchRetryConfigSchema = Schema.Struct({
  maxRetries: Schema.NonNegativeInt,
  initialDelay: Schema.String, // Duration string representation
  maxDelay: Schema.String, // Duration string representation
  backoffMultiplier: Schema.Number,
  retryableErrors: Schema.Array(Schema.String),
});

/**
 * Schema for batch configuration validation.
 */
export const BatchConfigurationSchema = Schema.Struct({
  maxBatchSize: Schema.NonNegativeInt,
  flushInterval: Schema.String, // Duration string representation
  maxWaitTime: Schema.String, // Duration string representation
  enableAutoFlush: Schema.Boolean,
  enableBatching: Schema.Boolean,
  enablePartialFailureRecovery: Schema.Boolean,
  retryConfig: BatchRetryConfigSchema,
});

/**
 * Schema for performance configuration validation.
 */
export const PerformanceConfigurationSchema = Schema.Struct({
  enablePercentiles: Schema.Boolean,
  percentilesToTrack: Schema.Array(Schema.Number),
  performanceWindowSize: Schema.String, // Duration string representation
  enableConcurrencyTracking: Schema.Boolean,
  enableThroughputTracking: Schema.Boolean,
  enableTrendAnalysis: Schema.Boolean,
});

/**
 * Schema for backoff strategy validation.
 */
export const BackoffStrategySchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("fixed"),
    delay: Schema.String, // Duration string representation
  }),
  Schema.Struct({
    type: Schema.Literal("exponential"),
    initialDelay: Schema.String, // Duration string representation
    maxDelay: Schema.String, // Duration string representation
  }),
  Schema.Struct({
    type: Schema.Literal("linear"),
    initialDelay: Schema.String, // Duration string representation
    increment: Schema.String, // Duration string representation
  })
);

/**
 * Schema for retry policy validation.
 */
export const RetryPolicySchema = Schema.Struct({
  maxAttempts: Schema.NonNegativeInt,
  backoffStrategy: BackoffStrategySchema,
  retryableErrors: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * Schema for health check configuration validation.
 */
export const HealthCheckConfigurationSchema = Schema.Struct({
  enableHealthChecks: Schema.Boolean,
  defaultTimeout: Schema.String, // Duration string representation
  defaultRetryPolicy: RetryPolicySchema,
  enableResultCaching: Schema.Boolean,
  cacheTtl: Schema.String, // Duration string representation
  enableDependencyChecks: Schema.Boolean,
});

/**
 * Schema for export configuration validation.
 */
export const ExportConfigurationSchema = Schema.Struct({
  enablePrometheusExport: Schema.Boolean,
  enableJsonExport: Schema.Boolean,
  enableStreamingExport: Schema.Boolean,
  exportInterval: Schema.optional(Schema.String), // Duration string representation
  includeMetadata: Schema.Boolean,
  compressionEnabled: Schema.Boolean,
});

/**
 * Schema for logging configuration validation.
 */
export const LoggingConfigurationSchema = Schema.Struct({
  enableStructuredLogging: Schema.Boolean,
  logLevel: Schema.Union(
    Schema.Literal("debug"),
    Schema.Literal("info"),
    Schema.Literal("warn"),
    Schema.Literal("error")
  ),
  enableCorrelationIds: Schema.Boolean,
  enableDistributedTracing: Schema.Boolean,
  logMetricOperations: Schema.Boolean,
  logHealthCheckResults: Schema.Boolean,
});

/**
 * Schema for feature flags validation.
 */
export const FeatureFlagsSchema = Schema.Struct({
  enableHistogramMetrics: Schema.Boolean,
  enableDistributionMetrics: Schema.Boolean,
  enablePerformanceMonitoring: Schema.Boolean,
  enableBatchProcessing: Schema.Boolean,
  enableHealthChecks: Schema.Boolean,
  enableExport: Schema.Boolean,
  enableAdvancedFiltering: Schema.Boolean,
});

/**
 * Schema for comprehensive monitoring configuration validation.
 */
export const MonitoringConfigurationSchema = Schema.Struct({
  storage: StorageConfigurationSchema,
  batch: BatchConfigurationSchema,
  performance: PerformanceConfigurationSchema,
  healthChecks: HealthCheckConfigurationSchema,
  export: ExportConfigurationSchema,
  logging: LoggingConfigurationSchema,
  enableFeatureFlags: Schema.Boolean,
  featureFlags: Schema.optional(FeatureFlagsSchema),
});

// Type Guards and Utilities

/**
 * Type guard for histogram metric values.
 */
export const isHistogramValue = (
  value: MetricValue
): value is Extract<MetricValue, { type: "histogram" }> =>
  value.type === "histogram";

/**
 * Type guard for distribution metric values.
 */
export const isDistributionValue = (
  value: MetricValue
): value is Extract<MetricValue, { type: "distribution" }> =>
  value.type === "distribution";

/**
 * Type guard for numeric metric values.
 */
export const isNumericValue = (
  value: MetricValue
): value is Extract<MetricValue, { type: "number" | "number_with_unit" }> =>
  value.type === "number" || value.type === "number_with_unit";

/**
 * Utility to create a branded metric name.
 */
export const createMetricName = (name: string): MetricName => {
  return Schema.decodeUnknownSync(MetricNameSchema)(name);
};

/**
 * Utility to create a branded metric label key.
 */
export const createMetricLabelKey = (key: string): MetricLabelKey => {
  return Schema.decodeUnknownSync(MetricLabelKeySchema)(key);
};

/**
 * Utility to validate an enhanced metric.
 */
export const validateMetric = Schema.decodeUnknown(MetricSchema);

/**
 * Utility to validate monitoring configuration.
 */
export const validateMonitoringConfiguration = Schema.decodeUnknown(
  MonitoringConfigurationSchema
);

/**
 * Utility to create a simple numeric metric value.
 */
export const createNumericValue = (value: number): MetricValue => ({
  type: "number",
  value,
});

/**
 * Utility to create a numeric metric value with unit.
 */
export const createNumericValueWithUnit = (
  value: number,
  unit: string
): MetricValue => ({ type: "number_with_unit", value, unit });

/**
 * Utility to create a histogram metric value.
 */
export const createHistogramValue = (
  buckets: HistogramBuckets,
  samples: readonly number[]
): MetricValue => ({ type: "histogram", buckets, samples });

/**
 * Utility to create a distribution metric value.
 */
export const createDistributionValue = (
  values: readonly number[],
  percentiles: Record<string, number>
): MetricValue => ({ type: "distribution", values, percentiles });
