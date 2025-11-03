/**
 * @fileoverview Export Service Implementation for Enhanced Monitoring
 *
 * This module provides export services for metrics in various formats including
 * JSON export with streaming support, Prometheus format export, and filtered
 * export capabilities for the enhanced monitoring system.
 */

import { Context, Data, Effect, Layer, Stream, pipe } from "effect";

import type { EnhancedMetricStore } from "./storage";

import type {
  ExportConfiguration,
  MetricFilter,
  Metric,
} from "./enhanced-types";

/**
 * Export error types for the export service.
 */
export class ExportError extends Data.TaggedError("ExportError")<{
  readonly format: ExportFormat;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Export format types supported by the export service.
 */
export type ExportFormat = "prometheus" | "json" | "csv";

/**
 * JSON export formatting options for customizable output.
 */
export interface JsonExportOptions {
  readonly pretty: boolean;
  readonly includeMetadata: boolean;
  readonly includeTimestamp: boolean;
  readonly dateFormat: "iso" | "unix" | "unix-ms";
  readonly compression: boolean;
}

/**
 * Streaming export options for controlling stream behavior.
 */
export interface StreamingExportOptions {
  readonly batchSize: number;
  readonly bufferSize: number;
  readonly includeMetadata: boolean;
  readonly realTime: boolean;
  readonly compression: boolean;
}

/**
 * Export service interface providing multiple export formats and streaming capabilities.
 */
export interface ExportService {
  readonly exportPrometheus: (
    filter?: MetricFilter
  ) => Effect.Effect<string, ExportError>;
  readonly exportJson: (
    filter?: MetricFilter,
    options?: JsonExportOptions
  ) => Effect.Effect<string, ExportError>;
  readonly streamMetrics: (
    filter?: MetricFilter,
    options?: StreamingExportOptions
  ) => Stream.Stream<Metric, ExportError>;
  readonly streamJsonMetrics: (
    filter?: MetricFilter,
    options?: JsonExportOptions & StreamingExportOptions
  ) => Stream.Stream<string, ExportError>;
  readonly exportHistogram: (
    name: string,
    format: ExportFormat
  ) => Effect.Effect<string, ExportError>;
  readonly exportFiltered: (
    filter: MetricFilter,
    format: ExportFormat,
    options?: JsonExportOptions
  ) => Effect.Effect<string, ExportError>;
}

/**
 * Default JSON export options.
 */
export const DEFAULT_JSON_EXPORT_OPTIONS: JsonExportOptions = {
  pretty: false,
  includeMetadata: true,
  includeTimestamp: true,
  dateFormat: "iso",
  compression: false,
};

/**
 * Default streaming export options.
 */
export const DEFAULT_STREAMING_EXPORT_OPTIONS: StreamingExportOptions = {
  batchSize: 100,
  bufferSize: 1000,
  includeMetadata: true,
  realTime: false,
  compression: false,
};

/**
 * JSON export service implementation with streaming support.
 */
export class JsonExportServiceImpl implements ExportService {
  constructor(private readonly metricStore: EnhancedMetricStore) {}

  readonly exportPrometheus = (
    _filter?: MetricFilter
  ): Effect.Effect<string, ExportError> =>
    Effect.gen(function* (_) {
      // TODO: Implement Prometheus export in task 6.1
      yield* _(
        Effect.logWarning(
          "Prometheus export not yet implemented - returning placeholder"
        )
      );
      return "# Prometheus export not yet implemented";
    }).pipe(
      Effect.mapError(
        (error) =>
          new ExportError({
            format: "prometheus",
            message: "Failed to export metrics in Prometheus format",
            cause: error,
          })
      )
    );

  readonly exportJson = (
    filter?: MetricFilter,
    options: JsonExportOptions = DEFAULT_JSON_EXPORT_OPTIONS
  ): Effect.Effect<string, ExportError> => {
    const metricStore = this.metricStore;
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Starting JSON export", { filter, options }));

      // Retrieve metrics from store
      const metrics = yield* _(
        metricStore.getMetrics(filter || {}),
        Effect.mapError(
          (error) =>
            new ExportError({
              format: "json",
              message: "Failed to retrieve metrics for JSON export",
              cause: error,
            })
        )
      );

      yield* _(
        Effect.logInfo(`Exporting ${metrics.length} metrics to JSON format`)
      );

      // Transform metrics for export
      const exportData = metrics.map((metric) =>
        transformMetricForJsonExport(metric, options)
      );

      // Create export wrapper with metadata
      const exportWrapper = {
        metadata: {
          exportedAt: new Date().toISOString(),
          format: "json" as const,
          count: metrics.length,
          filter: filter || {},
          options,
        },
        metrics: exportData,
      };

      // Serialize to JSON
      const jsonString = options.pretty
        ? JSON.stringify(exportWrapper, null, 2)
        : JSON.stringify(exportWrapper);

      yield* _(
        Effect.logDebug(
          `JSON export completed, size: ${jsonString.length} bytes`
        )
      );

      return jsonString;
    }).pipe(
      Effect.mapError(
        (error) =>
          new ExportError({
            format: "json",
            message: "Failed to export metrics in JSON format",
            cause: error,
          })
      )
    );
  };

  readonly streamMetrics = (
    filter?: MetricFilter,
    options: StreamingExportOptions = DEFAULT_STREAMING_EXPORT_OPTIONS
  ): Stream.Stream<Metric, ExportError> => {
    const metricStore = this.metricStore;

    return pipe(
      // Create a stream that retrieves metrics in batches
      Stream.fromEffect(
        Effect.gen(function* (_) {
          yield* _(
            Effect.logDebug("Starting metric streaming", { filter, options })
          );

          // Get all metrics matching the filter
          const allMetrics = yield* _(
            metricStore.getMetrics(filter || {}),
            Effect.mapError(
              (error) =>
                new ExportError({
                  format: "json",
                  message: "Failed to retrieve metrics for streaming",
                  cause: error,
                })
            )
          );

          yield* _(Effect.logInfo(`Streaming ${allMetrics.length} metrics`));

          return allMetrics;
        })
      ),
      // Flatten the array into individual metrics
      Stream.flatMap((metrics) => Stream.fromIterable(metrics)),
      // Process in batches for better performance
      Stream.buffer({ capacity: options.bufferSize }),
      // Add error handling
      Stream.catchAll((error) =>
        Stream.fromEffect(
          Effect.gen(function* (_) {
            yield* _(Effect.logError("Error in metric streaming", error));
            return yield* _(Effect.fail(error));
          })
        )
      )
    );
  };

  readonly streamJsonMetrics = (
    filter?: MetricFilter,
    options: JsonExportOptions & StreamingExportOptions = {
      ...DEFAULT_JSON_EXPORT_OPTIONS,
      ...DEFAULT_STREAMING_EXPORT_OPTIONS,
    }
  ): Stream.Stream<string, ExportError> => {
    return pipe(
      this.streamMetrics(filter, options),
      // Transform each metric to JSON string
      Stream.map((metric) => {
        const exportData = transformMetricForJsonExport(metric, options);
        return options.pretty
          ? JSON.stringify(exportData, null, 2)
          : JSON.stringify(exportData);
      }),
      // Add error handling for JSON serialization
      Stream.catchAll((error) =>
        Stream.fromEffect(
          Effect.gen(function* (_) {
            yield* _(Effect.logError("Error in JSON metric streaming", error));
            return yield* _(Effect.fail(error));
          })
        )
      )
    );
  };

  readonly exportHistogram = (
    name: string,
    format: ExportFormat
  ): Effect.Effect<string, ExportError> => {
    const metricStore = this.metricStore;
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Exporting histogram", { name, format }));

      // Get histogram metrics by name
      const metrics = yield* _(
        metricStore.getMetricsByName(name),
        Effect.mapError(
          (error) =>
            new ExportError({
              format,
              message: `Failed to retrieve histogram metrics for ${name}`,
              cause: error,
            })
        )
      );

      // Filter for histogram metrics only
      const histogramMetrics = metrics.filter(
        (metric) => metric.type === "histogram"
      );

      if (histogramMetrics.length === 0) {
        return yield* _(
          Effect.fail(
            new ExportError({
              format,
              message: `No histogram metrics found with name: ${name}`,
            })
          )
        );
      }

      yield* _(
        Effect.logInfo(
          `Exporting ${histogramMetrics.length} histogram metrics for ${name}`
        )
      );

      switch (format) {
        case "json":
          return JSON.stringify({
            name,
            type: "histogram",
            metrics: histogramMetrics.map((metric) =>
              transformMetricForJsonExport(metric, DEFAULT_JSON_EXPORT_OPTIONS)
            ),
          });

        case "prometheus":
          // TODO: Implement Prometheus histogram format in task 6.1
          yield* _(
            Effect.logWarning("Prometheus histogram export not yet implemented")
          );
          return `# Prometheus histogram export for ${name} not yet implemented`;

        case "csv":
          return exportHistogramToCsv(histogramMetrics);

        default:
          return yield* _(
            Effect.fail(
              new ExportError({
                format,
                message: `Unsupported export format: ${format}`,
              })
            )
          );
      }
    }).pipe(
      Effect.mapError((error) =>
        error instanceof ExportError
          ? error
          : new ExportError({
              format,
              message: `Failed to export histogram ${name}`,
              cause: error,
            })
      )
    );
  };

  readonly exportFiltered = (
    filter: MetricFilter,
    format: ExportFormat,
    options: JsonExportOptions = DEFAULT_JSON_EXPORT_OPTIONS
  ): Effect.Effect<string, ExportError> => {
    const self = this;
    return Effect.gen(function* (_) {
      yield* _(
        Effect.logDebug("Exporting filtered metrics", {
          filter,
          format,
          options,
        })
      );

      switch (format) {
        case "json":
          return yield* _(self.exportJson(filter, options));

        case "prometheus":
          return yield* _(self.exportPrometheus(filter));

        case "csv":
          return yield* _(self.exportCsv(filter));

        default:
          return yield* _(
            Effect.fail(
              new ExportError({
                format,
                message: `Unsupported export format: ${format}`,
              })
            )
          );
      }
    });
  };

  private readonly exportCsv = (
    filter?: MetricFilter
  ): Effect.Effect<string, ExportError> => {
    const metricStore = this.metricStore;
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Starting CSV export", { filter }));

      const metrics = yield* _(
        metricStore.getMetrics(filter || {}),
        Effect.mapError(
          (error) =>
            new ExportError({
              format: "csv",
              message: "Failed to retrieve metrics for CSV export",
              cause: error,
            })
        )
      );

      yield* _(
        Effect.logInfo(`Exporting ${metrics.length} metrics to CSV format`)
      );

      return exportMetricsToCsv(metrics);
    }).pipe(
      Effect.mapError((error) =>
        error instanceof ExportError
          ? error
          : new ExportError({
              format: "csv",
              message: "Failed to export metrics in CSV format",
              cause: error,
            })
      )
    );
  };
}

/**
 * Exported metric data structure for JSON export.
 */
interface ExportedMetric {
  readonly id: string;
  readonly name: string;
  readonly value: Metric["value"];
  readonly type: Metric["type"];
  readonly labels: Metric["labels"];
  timestamp?: string | number;
  metadata?: Metric["metadata"];
}

/**
 * Transform a metric for JSON export based on options.
 */
function transformMetricForJsonExport(
  metric: Metric,
  options: JsonExportOptions
): ExportedMetric {
  const baseMetric: ExportedMetric = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    type: metric.type,
    labels: metric.labels,
  };

  // Include timestamp based on options
  if (options.includeTimestamp) {
    switch (options.dateFormat) {
      case "iso":
        baseMetric.timestamp = metric.timestamp.toISOString();
        break;
      case "unix":
        baseMetric.timestamp = Math.floor(metric.timestamp.getTime() / 1000);
        break;
      case "unix-ms":
        baseMetric.timestamp = metric.timestamp.getTime();
        break;
    }
  }

  // Include metadata based on options
  if (options.includeMetadata && metric.metadata) {
    baseMetric.metadata = metric.metadata;
  }

  return baseMetric;
}

/**
 * Export histogram metrics to CSV format.
 */
function exportHistogramToCsv(metrics: readonly Metric[]): string {
  const headers = [
    "id",
    "name",
    "timestamp",
    "bucket_boundaries",
    "bucket_counts",
    "sum",
    "count",
    "labels",
  ];

  const rows = metrics.map((metric) => {
    if (metric.value.type !== "histogram") {
      throw new Error("Expected histogram metric");
    }

    const buckets = metric.value.buckets;
    return [
      metric.id,
      metric.name,
      metric.timestamp.toISOString(),
      buckets.boundaries.join(";"),
      buckets.counts.join(";"),
      buckets.sum.toString(),
      buckets.count.toString(),
      JSON.stringify(metric.labels),
    ];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Export general metrics to CSV format.
 */
function exportMetricsToCsv(metrics: readonly Metric[]): string {
  const headers = [
    "id",
    "name",
    "type",
    "value",
    "timestamp",
    "labels",
    "metadata",
  ];

  const rows = metrics.map((metric) => [
    metric.id,
    metric.name,
    metric.type,
    serializeMetricValueForCsv(metric.value),
    metric.timestamp.toISOString(),
    JSON.stringify(metric.labels),
    metric.metadata ? JSON.stringify(metric.metadata) : "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Serialize metric value for CSV export.
 */
function serializeMetricValueForCsv(value: Metric["value"]): string {
  switch (value.type) {
    case "number":
      return value.value.toString();
    case "number_with_unit":
      return `${value.value} ${value.unit}`;
    case "histogram":
      return `histogram(sum=${value.buckets.sum},count=${value.buckets.count})`;
    case "distribution":
      return `distribution(count=${value.values.length},mean=${
        value.values.reduce((a, b) => a + b, 0) / value.values.length
      })`;
    default:
      return JSON.stringify(value);
  }
}

/**
 * Create an export service with the specified metric store and configuration.
 */
export const createExportService = (
  metricStore: EnhancedMetricStore,
  _config: ExportConfiguration
): ExportService => new JsonExportServiceImpl(metricStore);

/**
 * Export service interface for dependency injection.
 */
export interface ExportServiceInterface extends ExportService {}

/**
 * Context tag for export service.
 */
export const ExportServiceTag =
  Context.GenericTag<ExportServiceInterface>("ExportService");

/**
 * Layer for export service with JSON and streaming support.
 */
export const ExportServiceLayer = (config: ExportConfiguration) =>
  Layer.effect(
    ExportServiceTag,
    Effect.gen(function* (_) {
      const metricStore = yield* _(
        Effect.serviceOption(
          Context.GenericTag<EnhancedMetricStore>("EnhancedMetricStoreService")
        )
      );

      if (metricStore._tag === "None") {
        return yield* _(
          Effect.fail(
            new ExportError({
              format: "json",
              message: "EnhancedMetricStore service not available",
            })
          )
        );
      }

      return createExportService(metricStore.value, config);
    })
  );

/**
 * Mock export service for testing environments.
 */
export const MockExportService: ExportService = {
  exportPrometheus: (filter?: MetricFilter) =>
    Effect.gen(function* (_) {
      yield* _(
        Effect.logDebug("Mock: Exporting Prometheus format", { filter })
      );
      return "# Mock Prometheus export";
    }),

  exportJson: (filter?: MetricFilter, options?: JsonExportOptions) =>
    Effect.gen(function* (_) {
      yield* _(
        Effect.logDebug("Mock: Exporting JSON format", { filter, options })
      );
      return JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          format: "json",
          count: 0,
          filter: filter || {},
          options: options || DEFAULT_JSON_EXPORT_OPTIONS,
        },
        metrics: [],
      });
    }),

  streamMetrics: (filter?: MetricFilter, options?: StreamingExportOptions) => {
    return Stream.fromEffect(
      Effect.gen(function* (_) {
        yield* _(
          Effect.logDebug("Mock: Streaming metrics", { filter, options })
        );
        return [];
      })
    ).pipe(Stream.flatMap((metrics) => Stream.fromIterable(metrics)));
  },

  streamJsonMetrics: (
    filter?: MetricFilter,
    options?: JsonExportOptions & StreamingExportOptions
  ) => {
    return Stream.fromEffect(
      Effect.gen(function* (_) {
        yield* _(
          Effect.logDebug("Mock: Streaming JSON metrics", { filter, options })
        );
        return "{}";
      })
    );
  },

  exportHistogram: (name: string, format: ExportFormat) =>
    Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Mock: Exporting histogram", { name, format }));
      return `# Mock ${format} histogram export for ${name}`;
    }),

  exportFiltered: (
    filter: MetricFilter,
    format: ExportFormat,
    options?: JsonExportOptions
  ) =>
    Effect.gen(function* (_) {
      yield* _(
        Effect.logDebug("Mock: Exporting filtered metrics", {
          filter,
          format,
          options,
        })
      );
      return `# Mock ${format} filtered export`;
    }),
};

/**
 * Layer for mock export service.
 */
export const MockExportServiceLayer: Layer.Layer<ExportServiceInterface> =
  Layer.succeed(ExportServiceTag, MockExportService);

/**
 * Utility functions for export service.
 */
export namespace ExportUtils {
  /**
   * Create a metric filter for time-based export.
   */
  export const createTimeRangeFilter = (
    start: Date,
    end: Date,
    additionalFilter?: Partial<MetricFilter>
  ): MetricFilter => ({
    timeRange: { start, end },
    ...additionalFilter,
  });

  /**
   * Create a metric filter for specific metric names.
   */
  export const createNameFilter = (
    names: readonly string[],
    additionalFilter?: Partial<MetricFilter>
  ): MetricFilter => ({
    names: names as readonly Metric["name"][],
    ...additionalFilter,
  });

  /**
   * Create a metric filter for specific metric types.
   */
  export const createTypeFilter = (
    types: readonly Metric["type"][],
    additionalFilter?: Partial<MetricFilter>
  ): MetricFilter => ({
    types,
    ...additionalFilter,
  });

  /**
   * Validate export options.
   */
  export const validateJsonExportOptions = (
    options: Partial<JsonExportOptions>
  ): JsonExportOptions => ({
    ...DEFAULT_JSON_EXPORT_OPTIONS,
    ...options,
  });

  /**
   * Validate streaming export options.
   */
  export const validateStreamingExportOptions = (
    options: Partial<StreamingExportOptions>
  ): StreamingExportOptions => ({
    ...DEFAULT_STREAMING_EXPORT_OPTIONS,
    ...options,
  });

  /**
   * Calculate estimated export size for a given number of metrics.
   */
  export const estimateExportSize = (
    metricCount: number,
    format: ExportFormat,
    includeMetadata = true
  ): number => {
    // Rough estimation in bytes
    const baseMetricSize = 200; // Base size per metric
    const metadataSize = includeMetadata ? 100 : 0;
    const formatMultiplier =
      format === "json" ? 1.2 : format === "csv" ? 0.8 : 1.0;

    return Math.ceil(
      metricCount * (baseMetricSize + metadataSize) * formatMultiplier
    );
  };
}
