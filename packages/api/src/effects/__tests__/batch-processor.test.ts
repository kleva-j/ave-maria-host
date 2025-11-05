/**
 * @fileoverview Tests for Batch Processor Implementation
 *
 * This module contains tests for the batch processor functionality,
 * focusing on core functional logic and Effect scheduling behavior.
 */

import type {
  StorageConfiguration,
  BatchConfiguration,
  Metric,
} from "../enhanced-types";

import { createNumericValue, createMetricName } from "../enhanced-types";
import { describe, it, expect, beforeEach } from "vitest";
import { Effect, Duration } from "effect";

import {
  type BatchProcessor,
  createBatchProcessor,
  BatchProcessorUtils,
  BatchError,
} from "../batch-processor";

import {
  createInMemoryStorageBackend,
  createEnhancedMetricStore,
} from "../storage";

describe("BatchProcessor", () => {
  let processor: BatchProcessor;
  let testConfig: BatchConfiguration;
  let storageConfig: StorageConfiguration;

  beforeEach(async () => {
    // Create test configuration
    testConfig = {
      maxBatchSize: 5,
      flushInterval: Duration.millis(100),
      maxWaitTime: Duration.seconds(1),
      enableAutoFlush: true,
      enableBatching: true,
      enablePartialFailureRecovery: true,
      retryConfig: {
        maxRetries: 2,
        initialDelay: Duration.millis(10),
        maxDelay: Duration.millis(100),
        backoffMultiplier: 2,
        retryableErrors: ["StorageError"],
      },
    };

    storageConfig = {
      maxMetrics: 1000,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: 1000,
        cleanupInterval: Duration.minutes(5),
      },
      storageBackend: "in-memory",
      enableCircularBuffer: true,
    };

    // Create storage backend and metric store
    const backend = createInMemoryStorageBackend(1000);
    const store = createEnhancedMetricStore(backend, storageConfig);

    // Create batch processor
    const processorEffect = createBatchProcessor(testConfig, store);
    processor = await Effect.runPromise(processorEffect);
  });

  describe("Configuration", () => {
    it("should create processor with default configuration", async () => {
      const defaultConfig = BatchProcessorUtils.createDefaultConfig();
      expect(defaultConfig.maxBatchSize).toBeGreaterThan(0);
      expect(Duration.toMillis(defaultConfig.flushInterval)).toBeGreaterThan(0);
      expect(defaultConfig.enableBatching).toBe(true);
    });

    it("should validate configuration correctly", async () => {
      const invalidConfig = {
        ...testConfig,
        maxBatchSize: 0, // Invalid
      };

      const validationResult = await Effect.runPromise(
        BatchProcessorUtils.validateConfig(invalidConfig).pipe(Effect.either)
      );

      expect(validationResult._tag).toBe("Left");
      if (validationResult._tag === "Left") {
        expect(validationResult.left).toBeInstanceOf(BatchError);
      }
    });

    it("should update configuration at runtime", async () => {
      await Effect.runPromise(processor.start());

      const updates = { maxBatchSize: 10 };
      await Effect.runPromise(processor.updateConfiguration(updates));

      const newConfig = await Effect.runPromise(processor.getConfiguration());
      expect(newConfig.maxBatchSize).toBe(10);

      await Effect.runPromise(processor.stop());
    });
  });

  describe("Basic Operations", () => {
    it("should start and stop processor", async () => {
      // Initially not running
      const initialRunning = await Effect.runPromise(processor.isRunning());
      expect(initialRunning).toBe(false);

      // Start processor
      await Effect.runPromise(processor.start());
      const runningAfterStart = await Effect.runPromise(processor.isRunning());
      expect(runningAfterStart).toBe(true);

      // Stop processor
      await Effect.runPromise(processor.stop());
      const runningAfterStop = await Effect.runPromise(processor.isRunning());
      expect(runningAfterStop).toBe(false);
    });

    it("should add single metric", async () => {
      await Effect.runPromise(processor.start());

      const metric: Metric = {
        id: "test-1",
        name: createMetricName("test.metric"),
        value: createNumericValue(42),
        type: "gauge",
        labels: {},
        timestamp: new Date(),
      };

      await Effect.runPromise(processor.addMetric(metric));

      const stats = await Effect.runPromise(processor.getStats());
      expect(stats.isRunning).toBe(true);

      await Effect.runPromise(processor.stop());
    });

    it("should add multiple metrics", async () => {
      await Effect.runPromise(processor.start());

      const metrics: Metric[] = Array.from({ length: 3 }, (_, i) => ({
        id: `test-${i}`,
        name: createMetricName("test.metric"),
        value: createNumericValue(i),
        type: "counter" as const,
        labels: {},
        timestamp: new Date(),
      }));

      await Effect.runPromise(processor.addMetrics(metrics));

      const stats = await Effect.runPromise(processor.getStats());
      expect(stats.isRunning).toBe(true);

      await Effect.runPromise(processor.stop());
    });

    it("should flush metrics manually", async () => {
      await Effect.runPromise(processor.start());

      const metric: Metric = {
        id: "test-flush",
        name: createMetricName("test.flush"),
        value: createNumericValue(100),
        type: "gauge",
        labels: {},
        timestamp: new Date(),
      };

      await Effect.runPromise(processor.addMetric(metric));
      await Effect.runPromise(processor.flush());

      const stats = await Effect.runPromise(processor.getStats());
      expect(stats.totalMetrics).toBeGreaterThan(0);

      await Effect.runPromise(processor.stop());
    });
  });

  describe("Batch Processing", () => {
    it("should flush automatically when batch size is reached", async () => {
      await Effect.runPromise(processor.start());

      // Add metrics equal to batch size
      const metrics: Metric[] = Array.from(
        { length: testConfig.maxBatchSize },
        (_, i) => ({
          id: `batch-${i}`,
          name: createMetricName("batch.test"),
          value: createNumericValue(i),
          type: "counter" as const,
          labels: {},
          timestamp: new Date(),
        })
      );

      await Effect.runPromise(processor.addMetrics(metrics));

      // Give some time for processing
      await Effect.runPromise(Effect.sleep(Duration.millis(50)));

      const stats = await Effect.runPromise(processor.getStats());
      expect(stats.totalBatches).toBeGreaterThan(0);

      await Effect.runPromise(processor.stop());
    });

    it("should handle empty flush gracefully", async () => {
      await Effect.runPromise(processor.start());

      // Flush without adding any metrics
      await Effect.runPromise(processor.flush());

      const stats = await Effect.runPromise(processor.getStats());
      expect(stats.totalBatches).toBe(0);

      await Effect.runPromise(processor.stop());
    });
  });

  describe("Statistics and Health", () => {
    it("should track processing statistics", async () => {
      await Effect.runPromise(processor.start());

      const metric: Metric = {
        id: "stats-test",
        name: createMetricName("stats.test"),
        value: createNumericValue(1),
        type: "gauge",
        labels: {},
        timestamp: new Date(),
      };

      await Effect.runPromise(processor.addMetric(metric));
      await Effect.runPromise(processor.flush());

      const stats = await Effect.runPromise(processor.getStats());
      expect(stats.totalBatches).toBeGreaterThan(0);
      expect(stats.totalMetrics).toBeGreaterThan(0);
      expect(stats.successfulBatches).toBeGreaterThan(0);
      expect(stats.isRunning).toBe(true);

      await Effect.runPromise(processor.stop());
    });

    it("should provide health status", async () => {
      await Effect.runPromise(processor.start());

      const healthStatus = await Effect.runPromise(processor.getHealthStatus());
      expect(healthStatus.status).toMatch(/healthy|degraded|unhealthy/);
      expect(healthStatus.details.isRunning).toBe(true);
      expect(Array.isArray(healthStatus.recommendations)).toBe(true);

      await Effect.runPromise(processor.stop());
    });
  });

  describe("Auto-tuning", () => {
    it("should auto-tune configuration based on performance", async () => {
      await Effect.runPromise(processor.start());

      const targetLatency = Duration.millis(100);
      const metricsPerSecond = 50;

      const tunedConfig = await Effect.runPromise(
        processor.autoTune(targetLatency, metricsPerSecond)
      );

      expect(tunedConfig.maxBatchSize).toBeGreaterThan(0);
      expect(Duration.toMillis(tunedConfig.flushInterval)).toBeGreaterThan(0);

      await Effect.runPromise(processor.stop());
    });
  });

  describe("Error Handling", () => {
    it("should reject operations when not running", async () => {
      const metric: Metric = {
        id: "error-test",
        name: createMetricName("error.test"),
        value: createNumericValue(1),
        type: "gauge",
        labels: {},
        timestamp: new Date(),
      };

      const result = await Effect.runPromise(
        processor.addMetric(metric).pipe(Effect.either)
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(BatchError);
      }
    });

    it("should handle configuration validation errors", async () => {
      const invalidConfig = {
        ...testConfig,
        maxBatchSize: -1, // Invalid
      };

      const result = await Effect.runPromise(
        processor.configure(invalidConfig).pipe(Effect.either)
      );

      expect(result._tag).toBe("Left");
    });
  });

  describe("Utility Functions", () => {
    it("should calculate optimal batch size", () => {
      const metricsPerSecond = 100;
      const targetLatency = Duration.seconds(1);

      const optimalSize = BatchProcessorUtils.calculateOptimalBatchSize(
        metricsPerSecond,
        targetLatency
      );

      expect(optimalSize).toBeGreaterThan(0);
      expect(optimalSize).toBeLessThanOrEqual(1000); // Max clamp
    });

    it("should calculate optimal flush interval", () => {
      const batchSize = 50;
      const metricsPerSecond = 25;

      const optimalInterval = BatchProcessorUtils.calculateOptimalFlushInterval(
        batchSize,
        metricsPerSecond
      );

      expect(Duration.toMillis(optimalInterval)).toBeGreaterThan(0);
    });

    it("should handle zero metrics per second gracefully", () => {
      const batchSize = 50;
      const metricsPerSecond = 0;

      const optimalInterval = BatchProcessorUtils.calculateOptimalFlushInterval(
        batchSize,
        metricsPerSecond
      );

      expect(Duration.toMillis(optimalInterval)).toBe(30000); // Default fallback
    });
  });
});

describe("BatchProcessorUtils", () => {
  describe("Configuration Creation", () => {
    it("should create default configuration", () => {
      const config = BatchProcessorUtils.createDefaultConfig();

      expect(config.maxBatchSize).toBeGreaterThan(0);
      expect(Duration.toMillis(config.flushInterval)).toBeGreaterThan(0);
      expect(config.enableBatching).toBe(true);
      expect(config.enableAutoFlush).toBe(true);
      expect(config.retryConfig.maxRetries).toBeGreaterThan(0);
    });

    it("should validate configuration parameters", async () => {
      const validConfig = BatchProcessorUtils.createDefaultConfig();

      const validationResult = await Effect.runPromise(
        BatchProcessorUtils.validateConfig(validConfig).pipe(Effect.either)
      );

      expect(validationResult._tag).toBe("Right");
    });
  });

  describe("Performance Calculations", () => {
    it("should calculate reasonable batch sizes", () => {
      const testCases = [
        {
          metricsPerSecond: 10,
          targetLatency: Duration.seconds(1),
          expectedMin: 10,
          expectedMax: 100,
        },
        {
          metricsPerSecond: 100,
          targetLatency: Duration.millis(500),
          expectedMin: 10,
          expectedMax: 100,
        },
        {
          metricsPerSecond: 1000,
          targetLatency: Duration.millis(100),
          expectedMin: 10,
          expectedMax: 1000,
        },
      ];

      for (const {
        metricsPerSecond,
        targetLatency,
        expectedMin,
        expectedMax,
      } of testCases) {
        const batchSize = BatchProcessorUtils.calculateOptimalBatchSize(
          metricsPerSecond,
          targetLatency
        );

        expect(batchSize).toBeGreaterThanOrEqual(expectedMin);
        expect(batchSize).toBeLessThanOrEqual(expectedMax);
      }
    });

    it("should calculate reasonable flush intervals", () => {
      const testCases = [
        { batchSize: 10, metricsPerSecond: 10, expectedSeconds: 1 },
        { batchSize: 50, metricsPerSecond: 25, expectedSeconds: 2 },
        { batchSize: 100, metricsPerSecond: 50, expectedSeconds: 2 },
      ];

      for (const {
        batchSize,
        metricsPerSecond,
        expectedSeconds,
      } of testCases) {
        const interval = BatchProcessorUtils.calculateOptimalFlushInterval(
          batchSize,
          metricsPerSecond
        );

        const actualSeconds = Duration.toMillis(interval) / 1000;
        expect(actualSeconds).toBeCloseTo(expectedSeconds, 0);
      }
    });
  });
});
