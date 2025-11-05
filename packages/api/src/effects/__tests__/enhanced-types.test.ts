/**
 * @fileoverview Unit tests for Enhanced Type System
 * 
 * Tests discriminated union validation, configuration interface validation,
 * and branded type safety for the enhanced monitoring system.
 */

import { Effect, Duration, Schema } from "effect";
import { describe, it, expect } from "vitest";
import {
  // Types
  type PerformanceConfiguration,
  type StorageConfiguration,
  type BatchConfiguration,
  type HistogramBuckets,
  type BackoffStrategy,
  type MetricValue,
  type RetryPolicy,
  type Metric,
  
  // Schemas
  PerformanceConfigurationSchema,
  MonitoringConfigurationSchema,
  StorageConfigurationSchema,
  BatchConfigurationSchema,
  HistogramBucketsSchema,
  BackoffStrategySchema,
  MetricLabelKeySchema,
  RetryPolicySchema,
  MetricValueSchema,
  MetricNameSchema,
  MetricSchema,
  
  // Utilities
  validateMonitoringConfiguration,
  createNumericValueWithUnit,
  createDistributionValue,
  createMetricLabelKey,
  createHistogramValue,
  isDistributionValue,
  createNumericValue,
  createMetricName,
  isHistogramValue,
  validateMetric,
  isNumericValue,
} from "../enhanced-types";

describe("Enhanced Type System", () => {
  describe("Discriminated Union Validation", () => {
    describe("MetricValue Types", () => {
      it("should validate numeric metric values", () => {
        const numericValue: MetricValue = { type: "number", value: 42 };
        
        const result = Schema.decodeUnknownSync(MetricValueSchema)(numericValue);
        
        expect(result).toEqual(numericValue);
        expect(isNumericValue(result)).toBe(true);
        expect(isHistogramValue(result)).toBe(false);
        expect(isDistributionValue(result)).toBe(false);
      });

      it("should validate numeric metric values with units", () => {
        const numericWithUnitValue: MetricValue = {
          type: "number_with_unit",
          value: 100,
          unit: "ms"
        };
        
        const result = Schema.decodeUnknownSync(MetricValueSchema)(numericWithUnitValue);
        
        expect(result).toEqual(numericWithUnitValue);
        expect(isNumericValue(result)).toBe(true);
        expect(isHistogramValue(result)).toBe(false);
        expect(isDistributionValue(result)).toBe(false);
      });

      it("should validate histogram metric values", () => {
        const histogramBuckets: HistogramBuckets = {
          boundaries: [1, 5, 10, 50, 100],
          counts: [1, 2, 3, 1, 0],
          sum: 25,
          count: 7
        };
        
        const histogramValue: MetricValue = {
          type: "histogram",
          buckets: histogramBuckets,
          samples: [1, 2, 3, 5, 8, 10, 15]
        };
        
        const result = Schema.decodeUnknownSync(MetricValueSchema)(histogramValue);
        
        expect(result).toEqual(histogramValue);
        expect(isHistogramValue(result)).toBe(true);
        expect(isNumericValue(result)).toBe(false);
        expect(isDistributionValue(result)).toBe(false);
      });

      it("should validate distribution metric values", () => {
        const distributionValue: MetricValue = {
          type: "distribution",
          values: [1, 2, 3, 4, 5],
          percentiles: {
            "p50": 3,
            "p95": 5,
            "p99": 5
          }
        };
        
        const result = Schema.decodeUnknownSync(MetricValueSchema)(distributionValue);
        
        expect(result).toEqual(distributionValue);
        expect(isDistributionValue(result)).toBe(true);
        expect(isNumericValue(result)).toBe(false);
        expect(isHistogramValue(result)).toBe(false);
      });

      it("should reject invalid metric value types", () => {
        const invalidValue = { type: "invalid", value: 42 };
        
        expect(() => {
          Schema.decodeUnknownSync(MetricValueSchema)(invalidValue);
        }).toThrow();
      });

      it("should reject metric values with missing required fields", () => {
        const incompleteHistogram = { type: "histogram", buckets: {} };
        
        expect(() => {
          Schema.decodeUnknownSync(MetricValueSchema)(incompleteHistogram);
        }).toThrow();
      });
    });

    describe("HistogramBuckets Validation", () => {
      it("should validate valid histogram buckets", () => {
        const validBuckets: HistogramBuckets = {
          boundaries: [1, 5, 10],
          counts: [2, 3, 1],
          sum: 15,
          count: 6
        };
        
        const result = Schema.decodeUnknownSync(HistogramBucketsSchema)(validBuckets);
        
        expect(result).toEqual(validBuckets);
      });

      it("should reject histogram buckets with negative counts", () => {
        const invalidBuckets = {
          boundaries: [1, 5, 10],
          counts: [2, -1, 1], // negative count
          sum: 15,
          count: 6
        };
        
        expect(() => {
          Schema.decodeUnknownSync(HistogramBucketsSchema)(invalidBuckets);
        }).toThrow();
      });

      it("should reject histogram buckets with negative total count", () => {
        const invalidBuckets = {
          boundaries: [1, 5, 10],
          counts: [2, 3, 1],
          sum: 15,
          count: -1 // negative total count
        };
        
        expect(() => {
          Schema.decodeUnknownSync(HistogramBucketsSchema)(invalidBuckets);
        }).toThrow();
      });
    });
  });

  describe("Branded Type Safety", () => {
    describe("MetricName Validation", () => {
      it("should create valid metric names", () => {
        const validNames = [
          "api_requests_total",
          "http.request.duration",
          "memory-usage",
          "CPU_utilization"
        ];
        
        for (const name of validNames) {
          expect(() => createMetricName(name)).not.toThrow();
          const metricName = createMetricName(name);
          expect(typeof metricName).toBe("string");
        }
      });

      it("should reject invalid metric names", () => {
        const invalidNames = [
          "", // empty
          "123invalid", // starts with number
          "invalid@name", // invalid character
          "a".repeat(256), // too long
          "invalid name", // space
          "invalid#name" // hash character
        ];
        
        for (const name of invalidNames) {
          expect(() => createMetricName(name)).toThrow();
        }
      });

      it("should validate metric names with schema", () => {
        const validName = "valid_metric_name";
        const result = Schema.decodeUnknownSync(MetricNameSchema)(validName);
        expect(result).toBe(validName);
      });
    });

    describe("MetricLabelKey Validation", () => {
      it("should create valid metric label keys", () => {
        const validKeys = [
          "endpoint",
          "status_code",
          "method",
          "service_name"
        ];
        
        for (const key of validKeys) {
          expect(() => createMetricLabelKey(key)).not.toThrow();
          const labelKey = createMetricLabelKey(key);
          expect(typeof labelKey).toBe("string");
        }
      });

      it("should reject invalid metric label keys", () => {
        const invalidKeys = [
          "", // empty
          "123invalid", // starts with number
          "invalid-key", // hyphen not allowed
          "invalid.key", // dot not allowed
          "a".repeat(101), // too long
          "invalid key" // space
        ];
        
        for (const key of invalidKeys) {
          expect(() => createMetricLabelKey(key)).toThrow();
        }
      });

      it("should validate metric label keys with schema", () => {
        const validKey = "valid_label_key";
        const result = Schema.decodeUnknownSync(MetricLabelKeySchema)(validKey);
        expect(result).toBe(validKey);
      });
    });
  });

  describe("Enhanced Metric Validation", () => {
    it("should validate complete metric objects", () => {
      const validMetric: Metric = {
        id: "metric-123",
        name: createMetricName("test_metric"),
        value: createNumericValue(42),
        type: "gauge",
        labels: {},
        timestamp: new Date(),
        metadata: {
          source: "test",
          correlationId: "corr-123"
        }
      };
      
      const result = Schema.decodeUnknownSync(MetricSchema)(validMetric);
      expect(result).toEqual(validMetric);
    });

    it("should validate metrics without optional fields", () => {
      const minimalMetric: Metric = {
        id: "metric-456",
        name: createMetricName("minimal_metric"),
        value: createNumericValue(100),
        type: "counter",
        labels: {},
        timestamp: new Date()
      };
      
      const result = Schema.decodeUnknownSync(MetricSchema)(minimalMetric);
      expect(result).toEqual(minimalMetric);
    });

    it("should reject metrics with invalid names", () => {
      const invalidMetric = {
        id: "metric-789",
        name: "invalid name", // invalid metric name
        value: createNumericValue(50),
        type: "gauge",
        labels: {},
        timestamp: new Date()
      };
      
      expect(() => {
        Schema.decodeUnknownSync(MetricSchema)(invalidMetric);
      }).toThrow();
    });
  });

  describe("Configuration Interface Validation", () => {
    describe("StorageConfiguration", () => {
      it("should validate valid storage configuration", () => {
        const validConfig: StorageConfiguration = {
          maxMetrics: 10000,
          retentionPolicy: {
            maxAge: Duration.hours(24),
            maxCount: 5000,
            cleanupInterval: Duration.minutes(30)
          },
          storageBackend: "in-memory",
          enableCircularBuffer: true
        };
        
        // Convert Duration objects to strings for schema validation
        const configForValidation = {
          ...validConfig,
          retentionPolicy: {
            ...validConfig.retentionPolicy,
            maxAge: "24 hours",
            cleanupInterval: "30 minutes"
          }
        };
        
        const result = Schema.decodeUnknownSync(StorageConfigurationSchema)(configForValidation);
        expect(result.maxMetrics).toBe(validConfig.maxMetrics);
        expect(result.storageBackend).toBe(validConfig.storageBackend);
        expect(result.enableCircularBuffer).toBe(validConfig.enableCircularBuffer);
      });

      it("should reject storage configuration with negative maxMetrics", () => {
        const invalidConfig = {
          maxMetrics: -1000, // negative value
          retentionPolicy: {
            maxAge: "24 hours",
            maxCount: 5000,
            cleanupInterval: "30 minutes"
          },
          storageBackend: "in-memory",
          enableCircularBuffer: true
        };
        
        expect(() => {
          Schema.decodeUnknownSync(StorageConfigurationSchema)(invalidConfig);
        }).toThrow();
      });

      it("should reject storage configuration with invalid backend", () => {
        const invalidConfig = {
          maxMetrics: 10000,
          retentionPolicy: {
            maxAge: "24 hours",
            maxCount: 5000,
            cleanupInterval: "30 minutes"
          },
          storageBackend: "invalid-backend", // invalid backend
          enableCircularBuffer: true
        };
        
        expect(() => {
          Schema.decodeUnknownSync(StorageConfigurationSchema)(invalidConfig);
        }).toThrow();
      });
    });

    describe("BatchConfiguration", () => {
      it("should validate valid batch configuration", () => {
        const validConfig: BatchConfiguration = {
          maxBatchSize: 100,
          flushInterval: Duration.seconds(5),
          maxWaitTime: Duration.seconds(10),
          enableAutoFlush: true,
          enableBatching: true
        };
        
        const configForValidation = {
          ...validConfig,
          flushInterval: "5 seconds",
          maxWaitTime: "10 seconds"
        };
        
        const result = Schema.decodeUnknownSync(BatchConfigurationSchema)(configForValidation);
        expect(result.maxBatchSize).toBe(validConfig.maxBatchSize);
        expect(result.enableAutoFlush).toBe(validConfig.enableAutoFlush);
        expect(result.enableBatching).toBe(validConfig.enableBatching);
      });

      it("should reject batch configuration with negative batch size", () => {
        const invalidConfig = {
          maxBatchSize: -50, // negative value
          flushInterval: "5 seconds",
          maxWaitTime: "10 seconds",
          enableAutoFlush: true,
          enableBatching: true
        };
        
        expect(() => {
          Schema.decodeUnknownSync(BatchConfigurationSchema)(invalidConfig);
        }).toThrow();
      });
    });

    describe("PerformanceConfiguration", () => {
      it("should validate valid performance configuration", () => {
        const validConfig: PerformanceConfiguration = {
          enablePercentiles: true,
          percentilesToTrack: [50, 95, 99],
          performanceWindowSize: Duration.minutes(5),
          enableConcurrencyTracking: true,
          enableThroughputTracking: true,
          enableTrendAnalysis: false
        };
        
        const configForValidation = {
          ...validConfig,
          performanceWindowSize: "5 minutes"
        };
        
        const result = Schema.decodeUnknownSync(PerformanceConfigurationSchema)(configForValidation);
        expect(result.enablePercentiles).toBe(validConfig.enablePercentiles);
        expect(result.percentilesToTrack).toEqual(validConfig.percentilesToTrack);
        expect(result.enableConcurrencyTracking).toBe(validConfig.enableConcurrencyTracking);
      });
    });

    describe("RetryPolicy and BackoffStrategy", () => {
      it("should validate fixed backoff strategy", () => {
        const fixedStrategy: BackoffStrategy = {
          type: "fixed",
          delay: Duration.seconds(1)
        };
        
        const strategyForValidation = {
          type: "fixed",
          delay: "1 second"
        };
        
        const result = Schema.decodeUnknownSync(BackoffStrategySchema)(strategyForValidation);
        expect(result.type).toBe("fixed");
      });

      it("should validate exponential backoff strategy", () => {
        const exponentialStrategy: BackoffStrategy = {
          type: "exponential",
          initialDelay: Duration.millis(100),
          maxDelay: Duration.seconds(30)
        };
        
        const strategyForValidation = {
          type: "exponential",
          initialDelay: "100 milliseconds",
          maxDelay: "30 seconds"
        };
        
        const result = Schema.decodeUnknownSync(BackoffStrategySchema)(strategyForValidation);
        expect(result.type).toBe("exponential");
      });

      it("should validate linear backoff strategy", () => {
        const linearStrategy: BackoffStrategy = {
          type: "linear",
          initialDelay: Duration.millis(500),
          increment: Duration.millis(200)
        };
        
        const strategyForValidation = {
          type: "linear",
          initialDelay: "500 milliseconds",
          increment: "200 milliseconds"
        };
        
        const result = Schema.decodeUnknownSync(BackoffStrategySchema)(strategyForValidation);
        expect(result.type).toBe("linear");
      });

      it("should validate retry policy with fixed strategy", () => {
        const retryPolicy: RetryPolicy = {
          maxAttempts: 3,
          backoffStrategy: {
            type: "fixed",
            delay: Duration.seconds(1)
          },
          retryableErrors: ["NetworkError", "TimeoutError"]
        };
        
        const policyForValidation = {
          maxAttempts: 3,
          backoffStrategy: {
            type: "fixed",
            delay: "1 second"
          },
          retryableErrors: ["NetworkError", "TimeoutError"]
        };
        
        const result = Schema.decodeUnknownSync(RetryPolicySchema)(policyForValidation);
        expect(result.maxAttempts).toBe(retryPolicy.maxAttempts);
        expect(result.backoffStrategy.type).toBe("fixed");
        expect(result.retryableErrors).toEqual(retryPolicy.retryableErrors);
      });

      it("should reject retry policy with negative max attempts", () => {
        const invalidPolicy = {
          maxAttempts: -1, // negative value
          backoffStrategy: {
            type: "fixed",
            delay: "1 second"
          }
        };
        
        expect(() => {
          Schema.decodeUnknownSync(RetryPolicySchema)(invalidPolicy);
        }).toThrow();
      });

      it("should reject backoff strategy with invalid type", () => {
        const invalidStrategy = {
          type: "invalid-type", // invalid type
          delay: "1 second"
        };
        
        expect(() => {
          Schema.decodeUnknownSync(BackoffStrategySchema)(invalidStrategy);
        }).toThrow();
      });
    });

    describe("Complete MonitoringConfiguration", () => {
      it("should validate complete monitoring configuration", () => {
        const completeConfig = {
          storage: {
            maxMetrics: 10000,
            retentionPolicy: {
              maxAge: "24 hours",
              maxCount: 5000,
              cleanupInterval: "30 minutes"
            },
            storageBackend: "in-memory",
            enableCircularBuffer: true
          },
          batch: {
            maxBatchSize: 100,
            flushInterval: "5 seconds",
            maxWaitTime: "10 seconds",
            enableAutoFlush: true,
            enableBatching: true
          },
          performance: {
            enablePercentiles: true,
            percentilesToTrack: [50, 95, 99],
            performanceWindowSize: "5 minutes",
            enableConcurrencyTracking: true,
            enableThroughputTracking: true,
            enableTrendAnalysis: false
          },
          healthChecks: {
            enableHealthChecks: true,
            defaultTimeout: "30 seconds",
            defaultRetryPolicy: {
              maxAttempts: 3,
              backoffStrategy: {
                type: "exponential",
                initialDelay: "100 milliseconds",
                maxDelay: "5 seconds"
              }
            },
            enableResultCaching: true,
            cacheTtl: "5 minutes",
            enableDependencyChecks: true
          },
          export: {
            enablePrometheusExport: true,
            enableJsonExport: true,
            enableStreamingExport: false,
            includeMetadata: true,
            compressionEnabled: false
          },
          logging: {
            enableStructuredLogging: true,
            logLevel: "info",
            enableCorrelationIds: true,
            enableDistributedTracing: true,
            logMetricOperations: false,
            logHealthCheckResults: true
          },
          enableFeatureFlags: true,
          featureFlags: {
            enableHistogramMetrics: true,
            enableDistributionMetrics: true,
            enablePerformanceMonitoring: true,
            enableBatchProcessing: true,
            enableHealthChecks: true,
            enableExport: true,
            enableAdvancedFiltering: false
          }
        };
        
        const result = Schema.decodeUnknownSync(MonitoringConfigurationSchema)(completeConfig);
        expect(result.storage.maxMetrics).toBe(10000);
        expect(result.batch.maxBatchSize).toBe(100);
        expect(result.performance.enablePercentiles).toBe(true);
        expect(result.enableFeatureFlags).toBe(true);
      });

      it("should validate monitoring configuration without optional feature flags", () => {
        const configWithoutFlags = {
          storage: {
            maxMetrics: 5000,
            retentionPolicy: {
              maxAge: "12 hours",
              maxCount: 2500,
              cleanupInterval: "15 minutes"
            },
            storageBackend: "external",
            enableCircularBuffer: false
          },
          batch: {
            maxBatchSize: 50,
            flushInterval: "10 seconds",
            maxWaitTime: "20 seconds",
            enableAutoFlush: false,
            enableBatching: false
          },
          performance: {
            enablePercentiles: false,
            percentilesToTrack: [],
            performanceWindowSize: "1 minute",
            enableConcurrencyTracking: false,
            enableThroughputTracking: false,
            enableTrendAnalysis: false
          },
          healthChecks: {
            enableHealthChecks: false,
            defaultTimeout: "10 seconds",
            defaultRetryPolicy: {
              maxAttempts: 1,
              backoffStrategy: {
                type: "fixed",
                delay: "1 second"
              }
            },
            enableResultCaching: false,
            cacheTtl: "1 minute",
            enableDependencyChecks: false
          },
          export: {
            enablePrometheusExport: false,
            enableJsonExport: false,
            enableStreamingExport: false,
            includeMetadata: false,
            compressionEnabled: false
          },
          logging: {
            enableStructuredLogging: false,
            logLevel: "error",
            enableCorrelationIds: false,
            enableDistributedTracing: false,
            logMetricOperations: false,
            logHealthCheckResults: false
          },
          enableFeatureFlags: false
        };
        
        const result = Schema.decodeUnknownSync(MonitoringConfigurationSchema)(configWithoutFlags);
        expect(result.enableFeatureFlags).toBe(false);
        expect(result.featureFlags).toBeUndefined();
      });
    });
  });

  describe("Utility Functions", () => {
    describe("Metric Value Creation Utilities", () => {
      it("should create numeric values correctly", () => {
        const value = createNumericValue(42);
        expect(value).toEqual({ type: "number", value: 42 });
        expect(isNumericValue(value)).toBe(true);
      });

      it("should create numeric values with units correctly", () => {
        const value = createNumericValueWithUnit(100, "ms");
        expect(value).toEqual({ type: "number_with_unit", value: 100, unit: "ms" });
        expect(isNumericValue(value)).toBe(true);
      });

      it("should create histogram values correctly", () => {
        const buckets: HistogramBuckets = {
          boundaries: [1, 5, 10],
          counts: [1, 2, 1],
          sum: 12,
          count: 4
        };
        const samples = [1, 3, 7, 9];
        
        const value = createHistogramValue(buckets, samples);
        expect(value).toEqual({ type: "histogram", buckets, samples });
        expect(isHistogramValue(value)).toBe(true);
      });

      it("should create distribution values correctly", () => {
        const values = [1, 2, 3, 4, 5];
        const percentiles = { "p50": 3, "p95": 5, "p99": 5 };
        
        const value = createDistributionValue(values, percentiles);
        expect(value).toEqual({ type: "distribution", values, percentiles });
        expect(isDistributionValue(value)).toBe(true);
      });
    });

    describe("Validation Utilities", () => {
      it("should validate metrics using utility function", () => {
        const metric: Metric = {
          id: "test-metric",
          name: createMetricName("test_metric"),
          value: createNumericValue(42),
          type: "gauge",
          labels: {},
          timestamp: new Date()
        };
        
        const result = Effect.runSync(validateMetric(metric));
        expect(result).toEqual(metric);
      });

      it("should validate monitoring configuration using utility function", () => {
        const config = {
          storage: {
            maxMetrics: 1000,
            retentionPolicy: {
              maxAge: "1 hour",
              maxCount: 500,
              cleanupInterval: "10 minutes"
            },
            storageBackend: "in-memory",
            enableCircularBuffer: true
          },
          batch: {
            maxBatchSize: 10,
            flushInterval: "1 second",
            maxWaitTime: "2 seconds",
            enableAutoFlush: true,
            enableBatching: true
          },
          performance: {
            enablePercentiles: true,
            percentilesToTrack: [95],
            performanceWindowSize: "1 minute",
            enableConcurrencyTracking: false,
            enableThroughputTracking: false,
            enableTrendAnalysis: false
          },
          healthChecks: {
            enableHealthChecks: true,
            defaultTimeout: "5 seconds",
            defaultRetryPolicy: {
              maxAttempts: 2,
              backoffStrategy: {
                type: "fixed",
                delay: "500 milliseconds"
              }
            },
            enableResultCaching: false,
            cacheTtl: "30 seconds",
            enableDependencyChecks: false
          },
          export: {
            enablePrometheusExport: true,
            enableJsonExport: false,
            enableStreamingExport: false,
            includeMetadata: true,
            compressionEnabled: false
          },
          logging: {
            enableStructuredLogging: true,
            logLevel: "debug",
            enableCorrelationIds: true,
            enableDistributedTracing: false,
            logMetricOperations: true,
            logHealthCheckResults: false
          },
          enableFeatureFlags: false
        };
        
        const result = Effect.runSync(validateMonitoringConfiguration(config));
        expect(result.storage.maxMetrics).toBe(1000);
        expect(result.enableFeatureFlags).toBe(false);
      });
    });
  });
});
