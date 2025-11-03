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
  ExportMetadataOptions,
  NumericFilterOperator,
  ExportResultMetadata,
  EnhancedExportFormat,
  ExportConfiguration,
  FilterOperator,
  MetricMetadata,
  ExportTemplate,
  MetadataFilter,
  ExportResult,
  SortCriteria,
  MetricFilter,
  LabelFilter,
  ValueFilter,
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
export type ExportFormat =
  | "prometheus"
  | "json"
  | "csv"
  | "xml"
  | "yaml"
  | "custom";

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
  // Enhanced export methods with metadata and template support
  readonly exportWithMetadata: (
    filter: MetricFilter,
    format: EnhancedExportFormat,
    metadataOptions?: ExportMetadataOptions
  ) => Effect.Effect<ExportResult, ExportError>;
  readonly exportWithTemplate: (
    filter: MetricFilter,
    template: ExportTemplate
  ) => Effect.Effect<ExportResult, ExportError>;
  readonly validateFilter: (
    filter: MetricFilter
  ) => Effect.Effect<MetricFilter, ExportError>;
  readonly getAvailableTemplates: () => Effect.Effect<
    readonly ExportTemplate[],
    ExportError
  >;
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

        case "xml":
          return yield* _(self.exportXml(filter));

        case "yaml":
          return yield* _(self.exportYaml(filter));

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

  readonly exportWithMetadata = (
    filter: MetricFilter,
    format: EnhancedExportFormat,
    metadataOptions: ExportMetadataOptions = { includeAll: true }
  ): Effect.Effect<ExportResult, ExportError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const startTime = Date.now();

      yield* _(
        Effect.logDebug("Exporting metrics with enhanced metadata", {
          filter,
          format,
          metadataOptions,
        })
      );

      // Validate and enhance the filter
      const validatedFilter = yield* _(self.validateFilter(filter));

      // Apply enhanced filtering
      const filteredMetrics = yield* _(
        self.applyEnhancedFilter(validatedFilter),
        Effect.mapError(
          (error) =>
            new ExportError({
              format,
              message: "Failed to apply enhanced filter",
              cause: error,
            })
        )
      );

      // Export with the specified format
      let exportData: string;
      switch (format) {
        case "json":
          exportData = yield* _(
            self.exportJsonWithEnhancedMetadata(
              filteredMetrics,
              metadataOptions
            )
          );
          break;
        case "xml":
          exportData = yield* _(
            self.exportXmlWithMetadata(filteredMetrics, metadataOptions)
          );
          break;
        case "yaml":
          exportData = yield* _(
            self.exportYamlWithMetadata(filteredMetrics, metadataOptions)
          );
          break;
        case "csv":
          exportData = yield* _(
            self.exportCsvWithMetadata(filteredMetrics, metadataOptions)
          );
          break;
        default:
          exportData = yield* _(
            self.exportJson(validatedFilter, {
              ...DEFAULT_JSON_EXPORT_OPTIONS,
              includeMetadata: metadataOptions.includeAll,
            })
          );
      }

      const processingTime = Date.now() - startTime;
      const sizeBytes = new TextEncoder().encode(exportData).length;

      const resultMetadata: ExportResultMetadata = {
        format,
        exportedAt: new Date(),
        metricCount: filteredMetrics.length,
        sizeBytes,
        filter: validatedFilter,
        processingTimeMs: processingTime,
      };

      yield* _(
        Effect.logInfo(
          `Export completed: ${filteredMetrics.length} metrics, ${sizeBytes} bytes, ${processingTime}ms`
        )
      );

      return {
        data: exportData,
        metadata: resultMetadata,
      };
    });
  };

  readonly exportWithTemplate = (
    filter: MetricFilter,
    template: ExportTemplate
  ): Effect.Effect<ExportResult, ExportError> => {
    const self = this;
    return Effect.gen(function* (_) {
      const startTime = Date.now();

      yield* _(
        Effect.logDebug("Exporting metrics with custom template", {
          filter,
          template: template.name,
        })
      );

      // Validate filter and template
      const validatedFilter = yield* _(self.validateFilter(filter));
      yield* _(self.validateTemplate(template));

      // Apply enhanced filtering
      const filteredMetrics = yield* _(
        self.applyEnhancedFilter(validatedFilter)
      );

      // Apply template
      const exportData = yield* _(
        self.applyTemplate(filteredMetrics, template),
        Effect.mapError(
          (error) =>
            new ExportError({
              format: template.format as ExportFormat,
              message: `Failed to apply template: ${template.name}`,
              cause: error,
            })
        )
      );

      const processingTime = Date.now() - startTime;
      const sizeBytes = new TextEncoder().encode(exportData).length;

      const resultMetadata: ExportResultMetadata = {
        format: template.format as EnhancedExportFormat,
        exportedAt: new Date(),
        metricCount: filteredMetrics.length,
        sizeBytes,
        filter: validatedFilter,
        template: template.name,
        processingTimeMs: processingTime,
      };

      return {
        data: exportData,
        metadata: resultMetadata,
      };
    });
  };

  readonly validateFilter = (
    filter: MetricFilter
  ): Effect.Effect<MetricFilter, ExportError> => {
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Validating metric filter", { filter }));

      // Validate name pattern if provided
      if (filter.namePattern) {
        try {
          new RegExp(filter.namePattern);
        } catch (error) {
          return yield* _(
            Effect.fail(
              new ExportError({
                format: "json",
                message: `Invalid name pattern regex: ${filter.namePattern}`,
                cause: error,
              })
            )
          );
        }
      }

      // Validate label filters
      if (filter.labelFilters) {
        for (const labelFilter of filter.labelFilters) {
          if (labelFilter.operator === "regex") {
            try {
              new RegExp(labelFilter.value as string);
            } catch (error) {
              return yield* _(
                Effect.fail(
                  new ExportError({
                    format: "json",
                    message: `Invalid regex in label filter for key ${labelFilter.key}`,
                    cause: error,
                  })
                )
              );
            }
          }
        }
      }

      // Validate time range
      if (filter.timeRange) {
        if (filter.timeRange.start >= filter.timeRange.end) {
          return yield* _(
            Effect.fail(
              new ExportError({
                format: "json",
                message: "Invalid time range: start must be before end",
              })
            )
          );
        }
      }

      return filter;
    });
  };

  readonly getAvailableTemplates = (): Effect.Effect<
    readonly ExportTemplate[],
    ExportError
  > => {
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Getting available export templates"));

      // Return built-in templates
      const builtInTemplates: ExportTemplate[] = [
        {
          name: "prometheus-summary",
          format: "prometheus",
          template:
            "# HELP {{name}} {{description}}\n# TYPE {{name}} {{type}}\n{{name}}{{{labels}}} {{value}} {{timestamp}}",
          fileExtension: "prom",
          mimeType: "text/plain",
        },
        {
          name: "json-compact",
          format: "json",
          template: '{"n":"{{name}}","v":{{value}},"t":{{timestamp}}}',
          fileExtension: "json",
          mimeType: "application/json",
        },
        {
          name: "csv-simple",
          format: "csv",
          template: "{{name}},{{value}},{{timestamp}}",
          fileExtension: "csv",
          mimeType: "text/csv",
          includeHeaders: true,
        },
      ];

      return builtInTemplates;
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

  private readonly exportXml = (
    filter?: MetricFilter
  ): Effect.Effect<string, ExportError> => {
    const metricStore = this.metricStore;
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Starting XML export", { filter }));

      const metrics = yield* _(
        metricStore.getMetrics(filter || {}),
        Effect.mapError(
          (error) =>
            new ExportError({
              format: "xml",
              message: "Failed to retrieve metrics for XML export",
              cause: error,
            })
        )
      );

      yield* _(
        Effect.logInfo(`Exporting ${metrics.length} metrics to XML format`)
      );

      return exportMetricsToXml(metrics);
    }).pipe(
      Effect.mapError((error) =>
        error instanceof ExportError
          ? error
          : new ExportError({
              format: "xml",
              message: "Failed to export metrics in XML format",
              cause: error,
            })
      )
    );
  };

  private readonly exportYaml = (
    filter?: MetricFilter
  ): Effect.Effect<string, ExportError> => {
    const metricStore = this.metricStore;
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Starting YAML export", { filter }));

      const metrics = yield* _(
        metricStore.getMetrics(filter || {}),
        Effect.mapError(
          (error) =>
            new ExportError({
              format: "yaml",
              message: "Failed to retrieve metrics for YAML export",
              cause: error,
            })
        )
      );

      yield* _(
        Effect.logInfo(`Exporting ${metrics.length} metrics to YAML format`)
      );

      return exportMetricsToYaml(metrics);
    }).pipe(
      Effect.mapError((error) =>
        error instanceof ExportError
          ? error
          : new ExportError({
              format: "yaml",
              message: "Failed to export metrics in YAML format",
              cause: error,
            })
      )
    );
  };

  private readonly applyEnhancedFilter = (
    filter: MetricFilter
  ): Effect.Effect<readonly Metric[], ExportError> => {
    const metricStore = this.metricStore;
    return Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Applying enhanced filter", { filter }));

      // Get base metrics using existing filter
      let metrics = yield* _(
        metricStore.getMetrics(filter),
        Effect.mapError(
          (error) =>
            new ExportError({
              format: "json",
              message: "Failed to retrieve metrics for enhanced filtering",
              cause: error,
            })
        )
      );

      // Apply name pattern filter
      if (filter.namePattern) {
        const nameRegex = new RegExp(filter.namePattern);
        metrics = metrics.filter((metric) => nameRegex.test(metric.name));
      }

      // Apply label filters
      if (filter.labelFilters && filter.labelFilters.length > 0) {
        metrics = metrics.filter(
          (metric) =>
            filter.labelFilters?.every((labelFilter) =>
              applyLabelFilter(metric, labelFilter)
            ) ?? true
        );
      }

      // Apply metadata filters
      if (filter.metadataFilters && filter.metadataFilters.length > 0) {
        metrics = metrics.filter(
          (metric) =>
            filter.metadataFilters?.every((metadataFilter) =>
              applyMetadataFilter(metric, metadataFilter)
            ) ?? true
        );
      }

      // Apply value filters
      if (filter.valueFilters && filter.valueFilters.length > 0) {
        metrics = metrics.filter(
          (metric) =>
            filter.valueFilters?.every((valueFilter) =>
              applyValueFilter(metric, valueFilter)
            ) ?? true
        );
      }

      // Apply sorting
      if (filter.sortBy) {
        metrics = applySorting(metrics, filter.sortBy);
      }

      yield* _(
        Effect.logDebug(
          `Enhanced filtering completed: ${metrics.length} metrics remaining`
        )
      );

      return metrics;
    });
  };

  private readonly exportJsonWithEnhancedMetadata = (
    metrics: readonly Metric[],
    metadataOptions: ExportMetadataOptions
  ): Effect.Effect<string, ExportError> => {
    return Effect.gen(function* (_) {
      const exportData = metrics.map((metric) =>
        transformMetricWithEnhancedMetadata(metric, metadataOptions)
      );

      const exportWrapper = {
        metadata: {
          exportedAt: new Date().toISOString(),
          format: "json" as const,
          count: metrics.length,
          metadataOptions,
          ...(metadataOptions.includeSystemMetadata && {
            systemInfo: {
              version: "1.0.0",
              exporterVersion: "enhanced-monitoring-v1",
            },
          }),
        },
        metrics: exportData,
      };

      return JSON.stringify(exportWrapper, null, 2);
    });
  };

  private readonly exportXmlWithMetadata = (
    metrics: readonly Metric[],
    metadataOptions: ExportMetadataOptions
  ): Effect.Effect<string, ExportError> => {
    return Effect.gen(function* (_) {
      const xmlMetrics = metrics
        .map((metric) => transformMetricToXml(metric, metadataOptions))
        .join("\n");

      const xmlWrapper = `<?xml version="1.0" encoding="UTF-8"?>
<metrics>
  <metadata>
    <exportedAt>${new Date().toISOString()}</exportedAt>
    <format>xml</format>
    <count>${metrics.length}</count>
  </metadata>
  <data>
${xmlMetrics}
  </data>
</metrics>`;

      return xmlWrapper;
    });
  };

  private readonly exportYamlWithMetadata = (
    metrics: readonly Metric[],
    metadataOptions: ExportMetadataOptions
  ): Effect.Effect<string, ExportError> => {
    return Effect.gen(function* (_) {
      const yamlMetrics = metrics
        .map((metric) => transformMetricToYaml(metric, metadataOptions))
        .join("\n");

      const yamlWrapper = `metadata:
  exportedAt: ${new Date().toISOString()}
  format: yaml
  count: ${metrics.length}
metrics:
${yamlMetrics}`;

      return yamlWrapper;
    });
  };

  private readonly exportCsvWithMetadata = (
    metrics: readonly Metric[],
    metadataOptions: ExportMetadataOptions
  ): Effect.Effect<string, ExportError> => {
    return Effect.succeed(
      exportMetricsToCsvWithMetadata(metrics, metadataOptions)
    );
  };

  private readonly validateTemplate = (
    template: ExportTemplate
  ): Effect.Effect<void, ExportError> => {
    return Effect.gen(function* (_) {
      if (!template.name || template.name.trim() === "") {
        yield* _(
          Effect.fail(
            new ExportError({
              format: template.format as ExportFormat,
              message: "Template name cannot be empty",
            })
          )
        );
        return;
      }

      if (!template.template || template.template.trim() === "") {
        yield* _(
          Effect.fail(
            new ExportError({
              format: template.format as ExportFormat,
              message: "Template content cannot be empty",
            })
          )
        );
        return;
      }

      // Validate template placeholders
      const validPlaceholders = [
        "name",
        "value",
        "type",
        "timestamp",
        "labels",
        "metadata",
        "id",
      ];

      const matches = template.template.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        for (const match of matches) {
          const placeholder = match.replace(/[{}]/g, "").trim();
          if (!validPlaceholders.includes(placeholder)) {
            yield* _(
              Effect.logWarning(
                `Unknown placeholder in template: ${placeholder}`
              )
            );
          }
        }
      }
    });
  };

  private readonly applyTemplate = (
    metrics: readonly Metric[],
    template: ExportTemplate
  ): Effect.Effect<string, ExportError> => {
    return Effect.gen(function* (_) {
      const results = metrics.map((metric) => {
        let result = template.template;

        // Replace placeholders
        result = result.replace(/\{\{name\}\}/g, metric.name);
        result = result.replace(/\{\{id\}\}/g, metric.id);
        result = result.replace(/\{\{type\}\}/g, metric.type);
        result = result.replace(
          /\{\{timestamp\}\}/g,
          metric.timestamp.getTime().toString()
        );
        result = result.replace(
          /\{\{value\}\}/g,
          serializeMetricValueForTemplate(metric.value)
        );
        result = result.replace(
          /\{\{labels\}\}/g,
          serializeLabelsForTemplate(metric.labels)
        );
        result = result.replace(
          /\{\{metadata\}\}/g,
          metric.metadata ? JSON.stringify(metric.metadata) : ""
        );

        // Apply custom formatters if available
        if (template.customFormatters) {
          for (const [placeholder, formatter] of Object.entries(
            template.customFormatters
          )) {
            const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, "g");
            result = result.replace(regex, formatter(metric, metric));
          }
        }

        return result;
      });

      let output = results.join("\n");

      // Add headers if specified
      if (template.includeHeaders && template.format === "csv") {
        const headers = extractHeadersFromTemplate(template.template);
        output = `${headers}\n${output}`;
      }

      return output;
    });
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
 * Apply label filter to a metric.
 */
function applyLabelFilter(metric: Metric, filter: LabelFilter): boolean {
  const labelValue = metric.labels[filter.key as keyof typeof metric.labels];
  if (labelValue === undefined) {
    return (
      filter.operator === "not_equals" || filter.operator === "not_contains"
    );
  }

  const valueStr = String(labelValue);
  const filterValueStr = String(filter.value);
  const caseSensitive = filter.caseSensitive ?? true;

  const compareValue = caseSensitive ? valueStr : valueStr.toLowerCase();
  const filterCompareValue = caseSensitive
    ? filterValueStr
    : filterValueStr.toLowerCase();

  switch (filter.operator) {
    case "equals":
      return compareValue === filterCompareValue;
    case "not_equals":
      return compareValue !== filterCompareValue;
    case "contains":
      return compareValue.includes(filterCompareValue);
    case "not_contains":
      return !compareValue.includes(filterCompareValue);
    case "starts_with":
      return compareValue.startsWith(filterCompareValue);
    case "ends_with":
      return compareValue.endsWith(filterCompareValue);
    case "regex":
      try {
        const regex = new RegExp(filterValueStr, caseSensitive ? "" : "i");
        return regex.test(valueStr);
      } catch {
        return false;
      }
    case "in":
      if (Array.isArray(filter.value)) {
        return filter.value.some((v) =>
          caseSensitive
            ? String(v) === valueStr
            : String(v).toLowerCase() === compareValue
        );
      }
      return false;
    case "not_in":
      if (Array.isArray(filter.value)) {
        return !filter.value.some((v) =>
          caseSensitive
            ? String(v) === valueStr
            : String(v).toLowerCase() === compareValue
        );
      }
      return true;
    default:
      return false;
  }
}

/**
 * Apply metadata filter to a metric.
 */
function applyMetadataFilter(metric: Metric, filter: MetadataFilter): boolean {
  if (!metric.metadata) {
    return (
      filter.operator === "not_equals" || filter.operator === "not_contains"
    );
  }

  const metadataValue = metric.metadata[filter.field];
  if (metadataValue === undefined) {
    return (
      filter.operator === "not_equals" || filter.operator === "not_contains"
    );
  }

  const valueStr = String(metadataValue);
  const filterValueStr = String(filter.value);
  const caseSensitive = filter.caseSensitive ?? true;

  const compareValue = caseSensitive ? valueStr : valueStr.toLowerCase();
  const filterCompareValue = caseSensitive
    ? filterValueStr
    : filterValueStr.toLowerCase();

  switch (filter.operator) {
    case "equals":
      return compareValue === filterCompareValue;
    case "not_equals":
      return compareValue !== filterCompareValue;
    case "contains":
      return compareValue.includes(filterCompareValue);
    case "not_contains":
      return !compareValue.includes(filterCompareValue);
    case "starts_with":
      return compareValue.startsWith(filterCompareValue);
    case "ends_with":
      return compareValue.endsWith(filterCompareValue);
    case "regex":
      try {
        const regex = new RegExp(filterValueStr, caseSensitive ? "" : "i");
        return regex.test(valueStr);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Apply value filter to a metric.
 */
function applyValueFilter(metric: Metric, filter: ValueFilter): boolean {
  let numericValue: number;

  switch (metric.value.type) {
    case "number":
      numericValue = metric.value.value;
      break;
    case "number_with_unit":
      numericValue = metric.value.value;
      // Check unit if specified in filter
      if (filter.unit && metric.value.unit !== filter.unit) {
        return false;
      }
      break;
    case "histogram":
      numericValue = metric.value.buckets.sum;
      break;
    case "distribution":
      numericValue =
        metric.value.values.reduce((a, b) => a + b, 0) /
        metric.value.values.length;
      break;
    default:
      return false;
  }

  switch (filter.operator) {
    case "equals":
      return typeof filter.value === "number" && numericValue === filter.value;
    case "not_equals":
      return typeof filter.value === "number" && numericValue !== filter.value;
    case "greater_than":
      return typeof filter.value === "number" && numericValue > filter.value;
    case "greater_than_or_equal":
      return typeof filter.value === "number" && numericValue >= filter.value;
    case "less_than":
      return typeof filter.value === "number" && numericValue < filter.value;
    case "less_than_or_equal":
      return typeof filter.value === "number" && numericValue <= filter.value;
    case "between":
      if (Array.isArray(filter.value) && filter.value.length === 2) {
        return (
          numericValue >= filter.value[0] && numericValue <= filter.value[1]
        );
      }
      return false;
    case "not_between":
      if (Array.isArray(filter.value) && filter.value.length === 2) {
        return numericValue < filter.value[0] || numericValue > filter.value[1];
      }
      return true;
    default:
      return false;
  }
}

/**
 * Apply sorting to metrics.
 */
function applySorting(
  metrics: readonly Metric[],
  sortCriteria: SortCriteria
): readonly Metric[] {
  const sorted = [...metrics].sort((a, b) => {
    const result = compareMetrics(a, b, sortCriteria);
    if (result !== 0 || !sortCriteria.secondarySort) {
      return result;
    }
    return compareMetrics(a, b, sortCriteria.secondarySort);
  });

  return sorted;
}

/**
 * Compare two metrics based on sort criteria.
 */
function compareMetrics(
  a: Metric,
  b: Metric,
  sortCriteria: SortCriteria
): number {
  let aValue: string | number;
  let bValue: string | number;

  switch (sortCriteria.field) {
    case "name":
      aValue = a.name;
      bValue = b.name;
      break;
    case "timestamp":
      aValue = a.timestamp.getTime();
      bValue = b.timestamp.getTime();
      break;
    case "type":
      aValue = a.type;
      bValue = b.type;
      break;
    case "value":
      aValue = getNumericValueForSorting(a.value);
      bValue = getNumericValueForSorting(b.value);
      break;
    case "source":
      aValue = a.metadata?.source || "";
      bValue = b.metadata?.source || "";
      break;
    default:
      return 0;
  }

  if (aValue < bValue) {
    return sortCriteria.direction === "asc" ? -1 : 1;
  }
  if (aValue > bValue) {
    return sortCriteria.direction === "asc" ? 1 : -1;
  }
  return 0;
}

/**
 * Get numeric value for sorting purposes.
 */
function getNumericValueForSorting(value: Metric["value"]): number {
  switch (value.type) {
    case "number":
    case "number_with_unit":
      return value.value;
    case "histogram":
      return value.buckets.sum;
    case "distribution":
      return value.values.reduce((a, b) => a + b, 0) / value.values.length;
    default:
      return 0;
  }
}

/**
 * Transform metric with enhanced metadata options.
 */
interface TransformedMetric {
  readonly id: string;
  readonly name: string;
  readonly value: Metric["value"];
  readonly type: Metric["type"];
  readonly timestamp: string;
  readonly labels?: Metric["labels"];
  readonly metadata?: Partial<MetricMetadata>;
}

function transformMetricWithEnhancedMetadata(
  metric: Metric,
  metadataOptions: ExportMetadataOptions
): TransformedMetric {
  const baseMetric: TransformedMetric = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    type: metric.type,
    timestamp: metric.timestamp.toISOString(),
  };

  // Include labels if not explicitly excluded
  if (
    metadataOptions.includeAll ||
    !metadataOptions.excludeFields?.includes("labels" as keyof MetricMetadata)
  ) {
    (baseMetric as TransformedMetric & { labels: Metric["labels"] }).labels =
      metric.labels;
  }

  // Handle metadata inclusion
  if (
    metric.metadata &&
    (metadataOptions.includeAll || metadataOptions.includeFields)
  ) {
    const metadata: Partial<MetricMetadata> = {};

    if (metadataOptions.includeAll) {
      Object.assign(metadata, metric.metadata);
    } else if (metadataOptions.includeFields) {
      for (const field of metadataOptions.includeFields) {
        if (metric.metadata[field] !== undefined) {
          (metadata as Record<string, unknown>)[field] = metric.metadata[field];
        }
      }
    }

    // Apply exclusions
    if (metadataOptions.excludeFields) {
      for (const field of metadataOptions.excludeFields) {
        delete (metadata as Record<string, unknown>)[field];
      }
    }

    if (Object.keys(metadata).length > 0) {
      (
        baseMetric as TransformedMetric & { metadata: Partial<MetricMetadata> }
      ).metadata = metadata;
    }
  }

  return baseMetric;
}

/**
 * Export metrics to XML format.
 */
function exportMetricsToXml(metrics: readonly Metric[]): string {
  const xmlMetrics = metrics
    .map((metric) => transformMetricToXml(metric, { includeAll: true }))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<metrics>
${xmlMetrics}
</metrics>`;
}

/**
 * Transform metric to XML format.
 */
function transformMetricToXml(
  metric: Metric,
  metadataOptions: ExportMetadataOptions
): string {
  const labels = Object.entries(metric.labels)
    .map(([key, value]) => `<label key="${key}">${value}</label>`)
    .join("");

  let metadataXml = "";
  if (metric.metadata && metadataOptions.includeAll) {
    metadataXml = Object.entries(metric.metadata)
      .map(([key, value]) => `<${key}>${value}</${key}>`)
      .join("");
    metadataXml = `<metadata>${metadataXml}</metadata>`;
  }

  return `    <metric>
      <id>${metric.id}</id>
      <name>${metric.name}</name>
      <type>${metric.type}</type>
      <value>${serializeMetricValueForCsv(metric.value)}</value>
      <timestamp>${metric.timestamp.toISOString()}</timestamp>
      <labels>${labels}</labels>
      ${metadataXml}
    </metric>`;
}

/**
 * Export metrics to YAML format.
 */
function exportMetricsToYaml(metrics: readonly Metric[]): string {
  const yamlMetrics = metrics
    .map((metric) => transformMetricToYaml(metric, { includeAll: true }))
    .join("\n");

  return `metrics:
${yamlMetrics}`;
}

/**
 * Transform metric to YAML format.
 */
function transformMetricToYaml(
  metric: Metric,
  metadataOptions: ExportMetadataOptions
): string {
  const labels = Object.entries(metric.labels)
    .map(([key, value]) => `    ${key}: ${JSON.stringify(value)}`)
    .join("\n");

  let metadataYaml = "";
  if (metric.metadata && metadataOptions.includeAll) {
    metadataYaml = Object.entries(metric.metadata)
      .map(([key, value]) => `    ${key}: ${JSON.stringify(value)}`)
      .join("\n");
    metadataYaml = `  metadata:\n${metadataYaml}`;
  }

  return `  - id: ${metric.id}
    name: ${metric.name}
    type: ${metric.type}
    value: ${serializeMetricValueForCsv(metric.value)}
    timestamp: ${metric.timestamp.toISOString()}
    labels:
${labels}
${metadataYaml}`;
}

/**
 * Export metrics to CSV with metadata options.
 */
function exportMetricsToCsvWithMetadata(
  metrics: readonly Metric[],
  metadataOptions: ExportMetadataOptions
): string {
  const baseHeaders = ["id", "name", "type", "value", "timestamp"];

  // Determine which metadata fields to include
  const metadataFields: (keyof MetricMetadata)[] = [];
  if (metadataOptions.includeAll && metrics.length > 0) {
    const allMetadataFields = new Set<keyof MetricMetadata>();
    for (const metric of metrics) {
      if (metric.metadata) {
        for (const key of Object.keys(
          metric.metadata
        ) as (keyof MetricMetadata)[]) {
          allMetadataFields.add(key);
        }
      }
    }
    metadataFields.push(...Array.from(allMetadataFields));
  } else if (metadataOptions.includeFields) {
    metadataFields.push(...metadataOptions.includeFields);
  }

  // Apply exclusions
  const finalMetadataFields = metadataFields.filter(
    (field) => !metadataOptions.excludeFields?.includes(field)
  );

  const headers = [...baseHeaders, "labels", ...finalMetadataFields];

  const rows = metrics.map((metric) => {
    const baseRow = [
      metric.id,
      metric.name,
      metric.type,
      serializeMetricValueForCsv(metric.value),
      metric.timestamp.toISOString(),
      JSON.stringify(metric.labels),
    ];

    const metadataRow = finalMetadataFields.map(
      (field) => metric.metadata?.[field] || ""
    );

    return [...baseRow, ...metadataRow];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Serialize metric value for template.
 */
function serializeMetricValueForTemplate(value: Metric["value"]): string {
  switch (value.type) {
    case "number":
      return value.value.toString();
    case "number_with_unit":
      return value.value.toString();
    case "histogram":
      return value.buckets.sum.toString();
    case "distribution":
      return (
        value.values.reduce((a, b) => a + b, 0) / value.values.length
      ).toString();
    default:
      return "0";
  }
}

/**
 * Serialize labels for template.
 */
function serializeLabelsForTemplate(labels: Metric["labels"]): string {
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(",");
}

/**
 * Extract headers from CSV template.
 */
function extractHeadersFromTemplate(template: string): string {
  const placeholders = template.match(/\{\{([^}]+)\}\}/g) || [];
  return placeholders.map((p) => p.replace(/[{}]/g, "")).join(",");
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

  exportWithMetadata: (
    filter: MetricFilter,
    format: EnhancedExportFormat,
    metadataOptions?: ExportMetadataOptions
  ) =>
    Effect.gen(function* (_) {
      yield* _(
        Effect.logDebug("Mock: Exporting with metadata", {
          filter,
          format,
          metadataOptions,
        })
      );
      return {
        data: `# Mock ${format} export with metadata`,
        metadata: {
          format,
          exportedAt: new Date(),
          metricCount: 0,
          sizeBytes: 0,
          filter,
          processingTimeMs: 1,
        },
      };
    }),

  exportWithTemplate: (filter: MetricFilter, template: ExportTemplate) =>
    Effect.gen(function* (_) {
      yield* _(
        Effect.logDebug("Mock: Exporting with template", {
          filter,
          template: template.name,
        })
      );
      return {
        data: `# Mock export using template: ${template.name}`,
        metadata: {
          format: template.format as EnhancedExportFormat,
          exportedAt: new Date(),
          metricCount: 0,
          sizeBytes: 0,
          filter,
          template: template.name,
          processingTimeMs: 1,
        },
      };
    }),

  validateFilter: (filter: MetricFilter) =>
    Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Mock: Validating filter", { filter }));
      return filter;
    }),

  getAvailableTemplates: () =>
    Effect.gen(function* (_) {
      yield* _(Effect.logDebug("Mock: Getting available templates"));
      return [
        {
          name: "mock-template",
          format: "json" as const,
          template: '{"name": "{{name}}", "value": {{value}}}',
          fileExtension: "json",
          mimeType: "application/json",
        },
      ];
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
   * Create a label filter for advanced label-based filtering.
   */
  export const createLabelFilter = (
    key: string,
    operator: FilterOperator,
    value: string | number | boolean | readonly (string | number | boolean)[],
    caseSensitive = true
  ): LabelFilter => ({
    key,
    operator,
    value,
    caseSensitive,
  });

  /**
   * Create a metadata filter for filtering based on metric metadata.
   */
  export const createMetadataFilter = (
    field: keyof MetricMetadata,
    operator: FilterOperator,
    value: string,
    caseSensitive = true
  ): MetadataFilter => ({
    field,
    operator,
    value,
    caseSensitive,
  });

  /**
   * Create a value filter for filtering based on metric values.
   */
  export const createValueFilter = (
    operator: NumericFilterOperator,
    value: number | readonly [number, number],
    unit?: string
  ): ValueFilter => ({
    operator,
    value,
    ...(unit !== undefined && { unit }),
  });

  /**
   * Create a comprehensive filter with enhanced capabilities.
   */
  export const createEnhancedFilter = (options: {
    names?: readonly string[];
    namePattern?: string;
    types?: readonly Metric["type"][];
    timeRange?: { start: Date; end: Date };
    labelFilters?: readonly LabelFilter[];
    metadataFilters?: readonly MetadataFilter[];
    valueFilters?: readonly ValueFilter[];
    sortBy?: SortCriteria;
    limit?: number;
    offset?: number;
  }): MetricFilter => ({
    ...(options.names && { names: options.names as readonly Metric["name"][] }),
    ...(options.namePattern && { namePattern: options.namePattern }),
    ...(options.types && { types: options.types }),
    ...(options.timeRange && { timeRange: options.timeRange }),
    ...(options.labelFilters && { labelFilters: options.labelFilters }),
    ...(options.metadataFilters && {
      metadataFilters: options.metadataFilters,
    }),
    ...(options.valueFilters && { valueFilters: options.valueFilters }),
    ...(options.sortBy && { sortBy: options.sortBy }),
    ...(options.limit !== undefined && { limit: options.limit }),
    ...(options.offset !== undefined && { offset: options.offset }),
  });

  /**
   * Create export metadata options.
   */
  export const createMetadataOptions = (options: {
    includeAll?: boolean;
    includeFields?: readonly (keyof MetricMetadata)[];
    excludeFields?: readonly (keyof MetricMetadata)[];
    includeSystemMetadata?: boolean;
    includeFilterInfo?: boolean;
  }): ExportMetadataOptions => ({
    includeAll: options.includeAll ?? true,
    ...(options.includeFields && { includeFields: options.includeFields }),
    ...(options.excludeFields && { excludeFields: options.excludeFields }),
    ...(options.includeSystemMetadata !== undefined && {
      includeSystemMetadata: options.includeSystemMetadata,
    }),
    ...(options.includeFilterInfo !== undefined && {
      includeFilterInfo: options.includeFilterInfo,
    }),
  });

  /**
   * Create a custom export template.
   */
  export const createTemplate = (
    name: string,
    format: EnhancedExportFormat,
    template: string,
    options?: {
      fileExtension?: string;
      mimeType?: string;
      includeHeaders?: boolean;
    }
  ): ExportTemplate => ({
    name,
    format,
    template,
    ...(options?.fileExtension && { fileExtension: options.fileExtension }),
    ...(options?.mimeType && { mimeType: options.mimeType }),
    ...(options?.includeHeaders !== undefined && {
      includeHeaders: options.includeHeaders,
    }),
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

  /**
   * Validate filter syntax and structure.
   */
  export const validateFilterSyntax = (filter: MetricFilter): string[] => {
    const errors: string[] = [];

    // Validate name pattern regex
    if (filter.namePattern) {
      try {
        new RegExp(filter.namePattern);
      } catch {
        errors.push(`Invalid name pattern regex: ${filter.namePattern}`);
      }
    }

    // Validate label filters
    if (filter.labelFilters) {
      filter.labelFilters.forEach((labelFilter, index) => {
        if (!labelFilter.key || labelFilter.key.trim() === "") {
          errors.push(`Label filter ${index}: key cannot be empty`);
        }
        if (labelFilter.operator === "regex") {
          try {
            new RegExp(labelFilter.value as string);
          } catch {
            errors.push(`Label filter ${index}: invalid regex pattern`);
          }
        }
      });
    }

    // Validate time range
    if (filter.timeRange) {
      if (filter.timeRange.start >= filter.timeRange.end) {
        errors.push("Time range: start must be before end");
      }
    }

    // Validate pagination
    if (filter.offset !== undefined && filter.offset < 0) {
      errors.push("Offset must be non-negative");
    }
    if (filter.limit !== undefined && filter.limit <= 0) {
      errors.push("Limit must be positive");
    }

    return errors;
  };

  /**
   * Get supported export formats.
   */
  export const getSupportedFormats = (): readonly EnhancedExportFormat[] => [
    "json",
    "csv",
    "xml",
    "yaml",
    "prometheus",
    "custom",
  ];

  /**
   * Get MIME type for export format.
   */
  export const getMimeType = (format: EnhancedExportFormat): string => {
    switch (format) {
      case "json":
        return "application/json";
      case "csv":
        return "text/csv";
      case "xml":
        return "application/xml";
      case "yaml":
        return "application/x-yaml";
      case "prometheus":
        return "text/plain";
      case "custom":
        return "text/plain";
      default:
        return "text/plain";
    }
  };

  /**
   * Get file extension for export format.
   */
  export const getFileExtension = (format: EnhancedExportFormat): string => {
    switch (format) {
      case "json":
        return "json";
      case "csv":
        return "csv";
      case "xml":
        return "xml";
      case "yaml":
        return "yaml";
      case "prometheus":
        return "prom";
      case "custom":
        return "txt";
      default:
        return "txt";
    }
  };
}
