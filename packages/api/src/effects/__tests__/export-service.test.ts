/**
 * @fileoverview Tests for Export Service Implementation
 *
 * This module tests the JSON export service with streaming support,
 * focusing on core functionality and streaming capabilities.
 */

import { describe, it, expect } from "vitest";
import { Effect, Stream, pipe, Duration } from "effect";
import {
  createExportService,
  MockExportService,
  ExportUtils,
  DEFAULT_JSON_EXPORT_OPTIONS,
  DEFAULT_STREAMING_EXPORT_OPTIONS,
} from "../export-service";
import { createInMemoryStorageBackend, createEnhancedMetricStore } from "../storage";
import type { Metric, StorageConfiguration, ExportConfiguration } from "../enhanced-types";
import { createMetricName, createNumericValue } from "../enhanced-types";

// Test configuration
const testStorageConfig: StorageConfiguration = {
  maxMetrics: 1000,
  retentionPolicy: {
    maxAge: Duration.hours(1),
    maxCount: 1000,
    cleanupInterval: Duration.minutes(5),
  },
  storageBackend: "in-memory",
  enableCircularBuffer: true,
};

const testExportConfig: ExportConfiguration = {
  enablePrometheusExport: true,
  enableJsonExport: true,
  enableStreamingExport: true,
  includeMetadata: true,
  compressionEnabled: false,
};

// Helper function to create test metrics
const createTestMetric = (
  name: string,
  value: number,
  type: Metric["type"] = "gauge"
): Metric => ({
  id: `test-${Date.now()}-${Math.random()}`,
  name: createMetricName(name),
  value: createNumericValue(value),
  type,
  labels: {},
  timestamp: new Date(),
  metadata: {
    source: "test",
    correlationId: "test-correlation",
    environment: "test",
  },
});

describe("Export Service", () => {
  describe("JSON Export", () => {
    it("should export metrics to JSON format", async () => {
      // Setup
      const backend = createInMemoryStorageBackend(100);
      const store = createEnhancedMetricStore(backend, testStorageConfig);
      const exportService = createExportService(store, testExportConfig);

      // Create test metrics
      const testMetrics = [
        createTestMetric("test.counter", 42, "counter"),
        createTestMetric("test.gauge", 100, "gauge"),
      ];

      // Store metrics
      const storeEffect = Effect.gen(function* (_) {
        for (const metric of testMetrics) {
          yield* _(store.recordMetric(metric));
        }
      });

      await Effect.runPromise(storeEffect);

      // Export to JSON
      const jsonResult = await Effect.runPromise(
        exportService.exportJson(undefined, DEFAULT_JSON_EXPORT_OPTIONS)
      );

      // Verify result
      expect(jsonResult).toBeDefined();
      const parsed = JSON.parse(jsonResult);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.format).toBe("json");
      expect(parsed.metadata.count).toBe(2);
      expect(parsed.metrics).toHaveLength(2);
      expect(parsed.metrics[0].name).toBe("test.counter");
      expect(parsed.metrics[1].name).toBe("test.gauge");
    });

    it("should export with custom JSON options", async () => {
      // Setup
      const backend = createInMemoryStorageBackend(100);
      const store = createEnhancedMetricStore(backend, testStorageConfig);
      const exportService = createExportService(store, testExportConfig);

      // Create test metric
      const testMetric = createTestMetric("test.metric", 123);
      await Effect.runPromise(store.recordMetric(testMetric));

      // Export with custom options
      const jsonResult = await Effect.runPromise(
        exportService.exportJson(undefined, {
          pretty: true,
          includeMetadata: false,
          includeTimestamp: false,
          dateFormat: "unix",
          compression: false,
        })
      );

      // Verify result
      expect(jsonResult).toBeDefined();
      const parsed = JSON.parse(jsonResult);
      expect(parsed.metrics[0].metadata).toBeUndefined();
      expect(parsed.metrics[0].timestamp).toBeUndefined();
    });
  });

  describe("Streaming Export", () => {
    it("should stream metrics", async () => {
      // Setup
      const backend = createInMemoryStorageBackend(100);
      const store = createEnhancedMetricStore(backend, testStorageConfig);
      const exportService = createExportService(store, testExportConfig);

      // Create test metrics
      const testMetrics = [
        createTestMetric("stream.test1", 1),
        createTestMetric("stream.test2", 2),
        createTestMetric("stream.test3", 3),
      ];

      // Store metrics
      const storeEffect = Effect.gen(function* (_) {
        for (const metric of testMetrics) {
          yield* _(store.recordMetric(metric));
        }
      });

      await Effect.runPromise(storeEffect);

      // Stream metrics
      const streamedMetrics: Metric[] = [];
      const streamEffect = pipe(
        exportService.streamMetrics(undefined, DEFAULT_STREAMING_EXPORT_OPTIONS),
        Stream.runForEach((metric) =>
          Effect.sync(() => {
            streamedMetrics.push(metric);
          })
        )
      );

      await Effect.runPromise(streamEffect);

      // Verify results
      expect(streamedMetrics).toHaveLength(3);
      expect(streamedMetrics.map(m => String(m.name))).toEqual([
        "stream.test1",
        "stream.test2", 
        "stream.test3"
      ]);
    });

    it("should stream JSON metrics", async () => {
      // Setup
      const backend = createInMemoryStorageBackend(100);
      const store = createEnhancedMetricStore(backend, testStorageConfig);
      const exportService = createExportService(store, testExportConfig);

      // Create test metric
      const testMetric = createTestMetric("json.stream.test", 42);
      await Effect.runPromise(store.recordMetric(testMetric));

      // Stream JSON metrics
      const jsonStrings: string[] = [];
      const streamEffect = pipe(
        exportService.streamJsonMetrics(undefined, {
          ...DEFAULT_JSON_EXPORT_OPTIONS,
          ...DEFAULT_STREAMING_EXPORT_OPTIONS,
        }),
        Stream.runForEach((jsonString) =>
          Effect.sync(() => {
            jsonStrings.push(jsonString);
          })
        )
      );

      await Effect.runPromise(streamEffect);

      // Verify results
      expect(jsonStrings).toHaveLength(1);
      const firstJsonString = jsonStrings[0];
      expect(firstJsonString).toBeDefined();
      const parsed = JSON.parse(firstJsonString as string);
      expect(String(parsed.name)).toBe("json.stream.test");
      expect(parsed.value.value).toBe(42);
    });
  });

  describe("Filtered Export", () => {
    it("should export filtered metrics", async () => {
      // Setup
      const backend = createInMemoryStorageBackend(100);
      const store = createEnhancedMetricStore(backend, testStorageConfig);
      const exportService = createExportService(store, testExportConfig);

      // Create test metrics with different types
      const testMetrics = [
        createTestMetric("counter.test", 1, "counter"),
        createTestMetric("gauge.test", 2, "gauge"),
        createTestMetric("timer.test", 3, "timer"),
      ];

      // Store metrics
      const storeEffect = Effect.gen(function* (_) {
        for (const metric of testMetrics) {
          yield* _(store.recordMetric(metric));
        }
      });

      await Effect.runPromise(storeEffect);

      // Export filtered metrics (only counters)
      const filter = ExportUtils.createTypeFilter(["counter"]);
      const jsonResult = await Effect.runPromise(
        exportService.exportFiltered(filter, "json")
      );

      // Verify result
      const parsed = JSON.parse(jsonResult);
      expect(parsed.metrics).toHaveLength(1);
      expect(parsed.metrics[0].type).toBe("counter");
      expect(parsed.metrics[0].name).toBe("counter.test");
    });
  });

  describe("Mock Export Service", () => {
    it("should provide mock implementations", async () => {
      // Test JSON export
      const jsonResult = await Effect.runPromise(
        MockExportService.exportJson()
      );
      expect(jsonResult).toBeDefined();
      const parsed = JSON.parse(jsonResult);
      expect(parsed.metadata.format).toBe("json");
      expect(parsed.metrics).toEqual([]);

      // Test Prometheus export
      const prometheusResult = await Effect.runPromise(
        MockExportService.exportPrometheus()
      );
      expect(prometheusResult).toBe("# Mock Prometheus export");

      // Test histogram export
      const histogramResult = await Effect.runPromise(
        MockExportService.exportHistogram("test.histogram", "json")
      );
      expect(histogramResult).toBe("# Mock json histogram export for test.histogram");
    });
  });

  describe("Export Utils", () => {
    it("should create time range filters", () => {
      const start = new Date("2023-01-01");
      const end = new Date("2023-01-02");
      const filter = ExportUtils.createTimeRangeFilter(start, end);

      expect(filter.timeRange).toBeDefined();
      expect(filter.timeRange?.start).toBe(start);
      expect(filter.timeRange?.end).toBe(end);
    });

    it("should create name filters", () => {
      const names = ["metric1", "metric2"];
      const filter = ExportUtils.createNameFilter(names);

      expect(filter.names).toBeDefined();
      expect(filter.names).toEqual(names);
    });

    it("should create type filters", () => {
      const types: Metric["type"][] = ["counter", "gauge"];
      const filter = ExportUtils.createTypeFilter(types);

      expect(filter.types).toBeDefined();
      expect(filter.types).toEqual(types);
    });

    it("should estimate export size", () => {
      const size = ExportUtils.estimateExportSize(100, "json", true);
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe("number");

      const csvSize = ExportUtils.estimateExportSize(100, "csv", false);
      expect(csvSize).toBeLessThan(size); // CSV should be smaller
    });
  });
});
