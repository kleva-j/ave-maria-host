/**
 * @fileoverview JSON Export Service Usage Example
 *
 * This example demonstrates how to use the JSON export service with streaming
 * support for the enhanced monitoring system.
 */

import type {
  StorageConfiguration,
  ExportConfiguration,
} from "../enhanced-types";

import { Effect, Stream, pipe, Duration } from "effect";

import { createMetricName, createNumericValue } from "../enhanced-types";
import {
  DEFAULT_STREAMING_EXPORT_OPTIONS,
  DEFAULT_JSON_EXPORT_OPTIONS,
  createExportService,
  ExportUtils,
} from "../export-service";

import {
  createInMemoryStorageBackend,
  createEnhancedMetricStore,
} from "../storage";

/**
 * Example configuration for the monitoring system.
 */
const exampleStorageConfig: StorageConfiguration = {
  maxMetrics: 10000,
  retentionPolicy: {
    maxAge: Duration.hours(24), // Keep metrics for 24 hours
    maxCount: 10000,
    cleanupInterval: Duration.minutes(30), // Cleanup every 30 minutes
  },
  storageBackend: "in-memory",
  enableCircularBuffer: true,
};

const exampleExportConfig: ExportConfiguration = {
  enablePrometheusExport: true,
  enableJsonExport: true,
  enableStreamingExport: true,
  includeMetadata: true,
  compressionEnabled: false,
};

/**
 * Example: Basic JSON Export
 */
export const basicJsonExportExample = Effect.gen(function* (_) {
  // Setup storage and export service
  const backend = createInMemoryStorageBackend(1000);
  const store = createEnhancedMetricStore(backend, exampleStorageConfig);
  const exportService = createExportService(store, exampleExportConfig);

  // Create some sample metrics
  const sampleMetrics = [
    {
      id: "metric-1",
      name: createMetricName("http.requests.total"),
      value: createNumericValue(1250),
      type: "counter" as const,
      labels: {},
      timestamp: new Date(),
      metadata: {
        source: "web-server",
        environment: "production",
        correlationId: "req-123",
      },
    },
    {
      id: "metric-2",
      name: createMetricName("response.time.ms"),
      value: createNumericValue(45.2),
      type: "gauge" as const,
      labels: {},
      timestamp: new Date(),
      metadata: {
        source: "web-server",
        environment: "production",
        correlationId: "req-124",
      },
    },
  ];

  // Store the metrics
  yield* _(Effect.logInfo("Storing sample metrics..."));
  for (const metric of sampleMetrics) {
    yield* _(store.recordMetric(metric));
  }

  // Export all metrics to JSON
  yield* _(Effect.logInfo("Exporting metrics to JSON..."));
  const jsonExport = yield* _(
    exportService.exportJson(undefined, {
      pretty: true,
      includeMetadata: true,
      includeTimestamp: true,
      dateFormat: "iso",
      compression: false,
    })
  );

  yield* _(Effect.logInfo("JSON Export Result:"));
  yield* _(Effect.logInfo(jsonExport));

  return jsonExport;
});

/**
 * Example: Filtered JSON Export
 */
export const filteredJsonExportExample = Effect.gen(function* (_) {
  // Setup storage and export service
  const backend = createInMemoryStorageBackend(1000);
  const store = createEnhancedMetricStore(backend, exampleStorageConfig);
  const exportService = createExportService(store, exampleExportConfig);

  // Create metrics with different types
  const metrics = [
    {
      id: "counter-1",
      name: createMetricName("api.calls.total"),
      value: createNumericValue(500),
      type: "counter" as const,
      labels: {},
      timestamp: new Date(),
    },
    {
      id: "gauge-1",
      name: createMetricName("memory.usage.bytes"),
      value: createNumericValue(1024000),
      type: "gauge" as const,
      labels: {},
      timestamp: new Date(),
    },
    {
      id: "timer-1",
      name: createMetricName("db.query.duration"),
      value: createNumericValue(25.5),
      type: "timer" as const,
      labels: {},
      timestamp: new Date(),
    },
  ];

  // Store metrics
  yield* _(Effect.logInfo("Storing metrics with different types..."));
  for (const metric of metrics) {
    yield* _(store.recordMetric(metric));
  }

  // Export only counter metrics
  yield* _(Effect.logInfo("Exporting only counter metrics..."));
  const counterFilter = ExportUtils.createTypeFilter(["counter"]);
  const counterExport = yield* _(
    exportService.exportFiltered(counterFilter, "json", {
      pretty: true,
      includeMetadata: false,
      includeTimestamp: true,
      dateFormat: "unix",
      compression: false,
    })
  );

  yield* _(Effect.logInfo("Counter Metrics Export:"));
  yield* _(Effect.logInfo(counterExport));

  return counterExport;
});

/**
 * Example: Streaming Metrics Export
 */
export const streamingExportExample = Effect.gen(function* (_) {
  // Setup storage and export service
  const backend = createInMemoryStorageBackend(1000);
  const store = createEnhancedMetricStore(backend, exampleStorageConfig);
  const exportService = createExportService(store, exampleExportConfig);

  // Create a larger set of metrics
  yield* _(Effect.logInfo("Creating large dataset for streaming..."));
  const largeMetricSet = Array.from({ length: 100 }, (_, i) => ({
    id: `stream-metric-${i}`,
    name: createMetricName(`stream.test.metric.${i}`),
    value: createNumericValue(Math.random() * 1000),
    type: "gauge" as const,
    labels: {},
    timestamp: new Date(),
    metadata: {
      source: "streaming-example",
      batchId: Math.floor(i / 10).toString(),
    },
  }));

  // Store all metrics
  for (const metric of largeMetricSet) {
    yield* _(store.recordMetric(metric));
  }

  // Stream metrics and process them
  yield* _(Effect.logInfo("Starting metric streaming..."));
  const streamedCount = yield* _(
    pipe(
      exportService.streamMetrics(undefined, {
        batchSize: 10,
        bufferSize: 50,
        includeMetadata: true,
        realTime: false,
        compression: false,
      }),
      Stream.runFold(0, (count, _metric) => count + 1)
    )
  );

  yield* _(Effect.logInfo(`Streamed ${streamedCount} metrics`));

  return streamedCount;
});

/**
 * Example: JSON Streaming Export
 */
export const jsonStreamingExportExample = Effect.gen(function* (_) {
  // Setup storage and export service
  const backend = createInMemoryStorageBackend(1000);
  const store = createEnhancedMetricStore(backend, exampleStorageConfig);
  const exportService = createExportService(store, exampleExportConfig);

  // Create sample metrics
  const metrics = [
    {
      id: "json-stream-1",
      name: createMetricName("json.stream.test1"),
      value: createNumericValue(100),
      type: "counter" as const,
      labels: {},
      timestamp: new Date(),
    },
    {
      id: "json-stream-2",
      name: createMetricName("json.stream.test2"),
      value: createNumericValue(200),
      type: "gauge" as const,
      labels: {},
      timestamp: new Date(),
    },
  ];

  // Store metrics
  for (const metric of metrics) {
    yield* _(store.recordMetric(metric));
  }

  // Stream JSON metrics
  yield* _(Effect.logInfo("Streaming JSON metrics..."));
  const jsonStrings: string[] = [];

  yield* _(
    pipe(
      exportService.streamJsonMetrics(undefined, {
        ...DEFAULT_JSON_EXPORT_OPTIONS,
        ...DEFAULT_STREAMING_EXPORT_OPTIONS,
        pretty: false,
      }),
      Stream.runForEach((jsonString) =>
        Effect.sync(() => {
          jsonStrings.push(jsonString);
        })
      )
    )
  );

  yield* _(Effect.logInfo(`Collected ${jsonStrings.length} JSON strings`));
  for (const [index, jsonString] of jsonStrings.entries()) {
    yield* _(Effect.logInfo(`JSON ${index + 1}: ${jsonString}`));
  }

  return jsonStrings;
});

/**
 * Example: Time-based Export
 */
export const timeBasedExportExample = Effect.gen(function* (_) {
  // Setup storage and export service
  const backend = createInMemoryStorageBackend(1000);
  const store = createEnhancedMetricStore(backend, exampleStorageConfig);
  const exportService = createExportService(store, exampleExportConfig);

  // Create metrics with different timestamps
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const timeBasedMetrics = [
    {
      id: "time-1",
      name: createMetricName("time.test.recent"),
      value: createNumericValue(1),
      type: "counter" as const,
      labels: {},
      timestamp: now,
    },
    {
      id: "time-2",
      name: createMetricName("time.test.hour.ago"),
      value: createNumericValue(2),
      type: "counter" as const,
      labels: {},
      timestamp: oneHourAgo,
    },
    {
      id: "time-3",
      name: createMetricName("time.test.two.hours.ago"),
      value: createNumericValue(3),
      type: "counter" as const,
      labels: {},
      timestamp: twoHoursAgo,
    },
  ];

  // Store metrics
  for (const metric of timeBasedMetrics) {
    yield* _(store.recordMetric(metric));
  }

  // Export metrics from the last hour only
  yield* _(Effect.logInfo("Exporting metrics from the last hour..."));
  const lastHourFilter = ExportUtils.createTimeRangeFilter(oneHourAgo, now);

  const recentExport = yield* _(
    exportService.exportFiltered(lastHourFilter, "json", {
      pretty: true,
      includeMetadata: false,
      includeTimestamp: true,
      dateFormat: "iso",
      compression: false,
    })
  );

  yield* _(Effect.logInfo("Recent Metrics Export:"));
  yield* _(Effect.logInfo(recentExport));

  return recentExport;
});

/**
 * Run all examples
 */
export const runAllExamples = Effect.gen(function* (_) {
  yield* _(Effect.logInfo("=== JSON Export Service Examples ==="));

  yield* _(Effect.logInfo("\n1. Basic JSON Export:"));
  yield* _(basicJsonExportExample);

  yield* _(Effect.logInfo("\n2. Filtered JSON Export:"));
  yield* _(filteredJsonExportExample);

  yield* _(Effect.logInfo("\n3. Streaming Export:"));
  yield* _(streamingExportExample);

  yield* _(Effect.logInfo("\n4. JSON Streaming Export:"));
  yield* _(jsonStreamingExportExample);

  yield* _(Effect.logInfo("\n5. Time-based Export:"));
  yield* _(timeBasedExportExample);

  yield* _(Effect.logInfo("\n=== All Examples Completed ==="));
});

// Export utility for running examples
export const runExample = (exampleName: string) => {
  switch (exampleName) {
    case "basic":
      return basicJsonExportExample;
    case "filtered":
      return filteredJsonExportExample;
    case "streaming":
      return streamingExportExample;
    case "json-streaming":
      return jsonStreamingExportExample;
    case "time-based":
      return timeBasedExportExample;
    case "all":
      return runAllExamples;
    default:
      return Effect.fail(new Error(`Unknown example: ${exampleName}`));
  }
};
