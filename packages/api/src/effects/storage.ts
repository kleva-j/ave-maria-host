/**
 * @fileoverview Storage Backend Implementation for Enhanced Monitoring
 *
 * This module provides optimized storage implementations including a high-performance
 * CircularBuffer with O(1) operations and configurable storage backends for the
 * enhanced monitoring system.
 */

import { Context, Data, Duration, Effect, Layer } from "effect";

import type {
  StorageConfiguration,
  MetadataFilter,
  SortCriteria,
  MetricFilter,
  ValueFilter,
  LabelFilter,
  MetricName,
  Metric,
} from "./enhanced-types";

/**
 * Storage error types for the monitoring system.
 */
export class StorageError extends Data.TaggedError("StorageError")<{
  readonly operation: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * High-performance CircularBuffer implementation with O(1) operations.
 * Uses bit masking for modulo arithmetic when capacity is a power of 2.
 *
 * @template T The type of items stored in the buffer
 */
export class CircularBuffer<T> {
  private readonly buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;
  private readonly isPowerOfTwo: boolean;
  private readonly mask: number;

  constructor(private readonly capacity: number) {
    if (capacity <= 0) {
      throw new Error("CircularBuffer capacity must be positive");
    }

    this.buffer = new Array(capacity);
    this.isPowerOfTwo = (capacity & (capacity - 1)) === 0;
    this.mask = this.isPowerOfTwo ? capacity - 1 : 0;
  }

  /**
   * Enqueue an item to the buffer. O(1) operation.
   * If buffer is full, overwrites the oldest item.
   */
  enqueue(item: T): void {
    this.buffer[this.tail] = item;

    if (this.isPowerOfTwo) {
      this.tail = (this.tail + 1) & this.mask;
    } else {
      this.tail = (this.tail + 1) % this.capacity;
    }

    if (this.size < this.capacity) {
      this.size++;
    } else {
      // Buffer is full, move head forward (overwrite oldest)
      if (this.isPowerOfTwo) {
        this.head = (this.head + 1) & this.mask;
      } else {
        this.head = (this.head + 1) % this.capacity;
      }
    }
  }

  /**
   * Dequeue an item from the buffer. O(1) operation.
   * Returns undefined if buffer is empty.
   */
  dequeue(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }

    const item = this.buffer[this.head];

    if (this.isPowerOfTwo) {
      this.head = (this.head + 1) & this.mask;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }

    this.size--;
    return item;
  }

  /**
   * Peek at the oldest item without removing it. O(1) operation.
   * Returns undefined if buffer is empty.
   */
  peek(): T | undefined {
    return this.size === 0 ? undefined : this.buffer[this.head];
  }

  /**
   * Peek at the newest item without removing it. O(1) operation.
   * Returns undefined if buffer is empty.
   */
  peekLast(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }

    const lastIndex = this.isPowerOfTwo
      ? (this.tail - 1) & this.mask
      : (this.tail - 1 + this.capacity) % this.capacity;

    return this.buffer[lastIndex];
  }

  /**
   * Add multiple items to the buffer efficiently. O(n) operation.
   */
  enqueueBatch(items: readonly T[]): void {
    for (const item of items) {
      this.enqueue(item);
    }
  }

  /**
   * Remove multiple items from the buffer efficiently. O(n) operation.
   */
  dequeueBatch(count: number): T[] {
    const result: T[] = [];
    const actualCount = Math.min(count, this.size);

    for (let i = 0; i < actualCount; i++) {
      const item = this.dequeue();
      if (item !== undefined) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Convert buffer contents to array efficiently. O(n) operation.
   * Returns items in chronological order (oldest first).
   */
  toArray(): T[] {
    if (this.size === 0) {
      return [];
    }

    const result: T[] = [];

    for (let i = 0; i < this.size; i++) {
      const index = this.isPowerOfTwo
        ? (this.head + i) & this.mask
        : (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Convert buffer contents to array in reverse order. O(n) operation.
   * Returns items in reverse chronological order (newest first).
   */
  toArrayReverse(): T[] {
    if (this.size === 0) {
      return [];
    }

    const result: T[] = [];

    for (let i = this.size - 1; i >= 0; i--) {
      const index = this.isPowerOfTwo
        ? (this.head + i) & this.mask
        : (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Get a slice of the buffer. O(n) operation where n is the slice size.
   */
  slice(start: number, end?: number): T[] {
    const array = this.toArray();
    return array.slice(start, end);
  }

  /**
   * Clear all items from the buffer. O(1) operation.
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  /**
   * Check if buffer is empty. O(1) operation.
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Check if buffer is full. O(1) operation.
   */
  isFull(): boolean {
    return this.size === this.capacity;
  }

  /**
   * Get current number of items in buffer. O(1) operation.
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get buffer capacity. O(1) operation.
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Get available space in buffer. O(1) operation.
   */
  getAvailableSpace(): number {
    return this.capacity - this.size;
  }

  /**
   * Iterate over buffer items in chronological order.
   */
  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.size; i++) {
      const index = this.isPowerOfTwo
        ? (this.head + i) & this.mask
        : (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        yield item;
      }
    }
  }

  /**
   * Find an item in the buffer using a predicate. O(n) operation.
   */
  find(predicate: (item: T, index: number) => boolean): T | undefined {
    for (let i = 0; i < this.size; i++) {
      const index = this.isPowerOfTwo
        ? (this.head + i) & this.mask
        : (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined && predicate(item, i)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Filter buffer items using a predicate. O(n) operation.
   */
  filter(predicate: (item: T, index: number) => boolean): T[] {
    const result: T[] = [];

    for (let i = 0; i < this.size; i++) {
      const index = this.isPowerOfTwo
        ? (this.head + i) & this.mask
        : (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined && predicate(item, i)) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Map buffer items to a new array. O(n) operation.
   */
  map<U>(mapper: (item: T, index: number) => U): U[] {
    const result: U[] = [];

    for (let i = 0; i < this.size; i++) {
      const index = this.isPowerOfTwo
        ? (this.head + i) & this.mask
        : (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(mapper(item, i));
      }
    }

    return result;
  }

  /**
   * Get buffer statistics for monitoring and debugging.
   */
  getStats(): {
    capacity: number;
    size: number;
    availableSpace: number;
    utilizationPercent: number;
    isEmpty: boolean;
    isFull: boolean;
    isPowerOfTwo: boolean;
  } {
    return {
      capacity: this.capacity,
      size: this.size,
      availableSpace: this.getAvailableSpace(),
      utilizationPercent: (this.size / this.capacity) * 100,
      isEmpty: this.isEmpty(),
      isFull: this.isFull(),
      isPowerOfTwo: this.isPowerOfTwo,
    };
  }
}

/**
 * Storage backend interface for pluggable metric storage implementations.
 */
export interface StorageBackend {
  readonly store: (
    metrics: readonly Metric[]
  ) => Effect.Effect<void, StorageError>;
  readonly retrieve: (
    filter: MetricFilter
  ) => Effect.Effect<readonly Metric[], StorageError>;
  readonly cleanup: (
    maxAge: Date,
    maxCount: number
  ) => Effect.Effect<number, StorageError>;
  readonly getStats: () => Effect.Effect<StorageStats, StorageError>;
}

/**
 * Storage statistics for monitoring backend performance.
 */
export interface StorageStats {
  readonly totalMetrics: number;
  readonly memoryUsage: number;
  readonly oldestMetricAge?: Date | undefined;
  readonly newestMetricAge?: Date | undefined;
  readonly storageType: string;
}

/**
 * Enhanced metric store interface with batch recording support.
 */
export interface EnhancedMetricStore {
  readonly recordMetric: (metric: Metric) => Effect.Effect<void, StorageError>;
  readonly recordMetrics: (
    metrics: readonly Metric[]
  ) => Effect.Effect<void, StorageError>;
  readonly getMetrics: (
    filter: MetricFilter
  ) => Effect.Effect<readonly Metric[], StorageError>;
  readonly getMetricsByName: (
    name: string
  ) => Effect.Effect<readonly Metric[], StorageError>;
  readonly getMetricsByTimeRange: (
    start: Date,
    end: Date
  ) => Effect.Effect<readonly Metric[], StorageError>;
  readonly cleanup: () => Effect.Effect<number, StorageError>;
  readonly getStats: () => Effect.Effect<StorageStats, StorageError>;
  readonly clear: () => Effect.Effect<void, StorageError>;
}

/**
 * In-memory storage backend implementation using CircularBuffer.
 */
export class InMemoryStorageBackend implements StorageBackend {
  private readonly buffer: CircularBuffer<Metric>;

  constructor(capacity: number) {
    this.buffer = new CircularBuffer<Metric>(capacity);
  }

  readonly store = (
    metrics: readonly Metric[]
  ): Effect.Effect<void, StorageError> =>
    Effect.try({
      try: () => {
        this.buffer.enqueueBatch(metrics);
      },
      catch: (error) =>
        new StorageError({
          operation: "store",
          message: `Failed to store ${metrics.length} metrics`,
          cause: error,
        }),
    });

  readonly retrieve = (
    filter: MetricFilter
  ): Effect.Effect<readonly Metric[], StorageError> =>
    Effect.try({
      try: () => {
        const allMetrics = this.buffer.toArray();
        return this.applyFilter(allMetrics, filter);
      },
      catch: (error) =>
        new StorageError({
          operation: "retrieve",
          message: "Failed to retrieve metrics",
          cause: error,
        }),
    });

  readonly cleanup = (
    maxAge: Date,
    maxCount: number
  ): Effect.Effect<number, StorageError> =>
    Effect.try({
      try: () => {
        const allMetrics = this.buffer.toArray();
        let removedCount = 0;

        // Remove metrics older than maxAge
        const validMetrics = allMetrics.filter((metric) => {
          if (metric.timestamp < maxAge) {
            removedCount++;
            return false;
          }
          return true;
        });

        // If still over maxCount, remove oldest metrics
        if (validMetrics.length > maxCount) {
          const excessCount = validMetrics.length - maxCount;
          validMetrics.splice(0, excessCount);
          removedCount += excessCount;
        }

        // Rebuild buffer with remaining metrics
        this.buffer.clear();
        this.buffer.enqueueBatch(validMetrics);

        return removedCount;
      },
      catch: (error) =>
        new StorageError({
          operation: "cleanup",
          message: "Failed to cleanup metrics",
          cause: error,
        }),
    });

  readonly getStats = (): Effect.Effect<StorageStats, StorageError> =>
    Effect.try({
      try: () => {
        const bufferSize = this.buffer.getSize();
        const metrics = this.buffer.toArray();

        const oldestMetric = metrics.length > 0 ? metrics[0] : undefined;
        const newestMetric =
          metrics.length > 0 ? metrics[metrics.length - 1] : undefined;

        return {
          totalMetrics: bufferSize,
          memoryUsage: this.estimateMemoryUsage(metrics),
          oldestMetricAge: oldestMetric?.timestamp,
          newestMetricAge: newestMetric?.timestamp,
          storageType: "in-memory-circular-buffer",
        };
      },
      catch: (error) =>
        new StorageError({
          operation: "getStats",
          message: "Failed to get storage statistics",
          cause: error,
        }),
    });

  private applyFilter(
    metrics: readonly Metric[],
    filter: MetricFilter
  ): readonly Metric[] {
    let filtered = metrics;

    // Filter by names
    const names = filter.names;
    if (names && names.length > 0) {
      filtered = filtered.filter((metric) => names.includes(metric.name));
    }

    // Filter by name pattern (enhanced filtering)
    if (filter.namePattern) {
      try {
        const nameRegex = new RegExp(filter.namePattern);
        filtered = filtered.filter((metric) => nameRegex.test(metric.name));
      } catch {
        // Invalid regex, skip pattern filtering
      }
    }

    // Filter by types
    const types = filter.types;
    if (types && types.length > 0) {
      filtered = filtered.filter((metric) => types.includes(metric.type));
    }

    // Filter by time range
    const timeRange = filter.timeRange;
    if (timeRange) {
      filtered = filtered.filter(
        (metric) =>
          metric.timestamp >= timeRange.start &&
          metric.timestamp <= timeRange.end
      );
    }

    // Filter by labels (basic)
    if (filter.labels) {
      filtered = filtered.filter((metric) => {
        return Object.entries(filter.labels || {}).every(
          ([key, value]) =>
            metric.labels[key as keyof typeof metric.labels] === value
        );
      });
    }

    // Filter by advanced label filters (enhanced filtering)
    if (filter.labelFilters && filter.labelFilters.length > 0) {
      filtered = filtered.filter(
        (metric) =>
          filter.labelFilters?.every((labelFilter) =>
            this.applyLabelFilter(metric, labelFilter)
          ) ?? true
      );
    }

    // Filter by metadata filters (enhanced filtering)
    if (filter.metadataFilters && filter.metadataFilters.length > 0) {
      filtered = filtered.filter(
        (metric) =>
          filter.metadataFilters?.every((metadataFilter) =>
            this.applyMetadataFilter(metric, metadataFilter)
          ) ?? true
      );
    }

    // Filter by value filters (enhanced filtering)
    if (filter.valueFilters && filter.valueFilters.length > 0) {
      filtered = filtered.filter(
        (metric) =>
          filter.valueFilters?.every((valueFilter) =>
            this.applyValueFilter(metric, valueFilter)
          ) ?? true
      );
    }

    // Filter by sources
    if (filter.sources && filter.sources.length > 0) {
      filtered = filtered.filter(
        (metric) =>
          metric.metadata?.source &&
          (filter.sources || []).includes(metric.metadata.source)
      );
    }

    // Filter by correlation IDs
    if (filter.correlationIds && filter.correlationIds.length > 0) {
      filtered = filtered.filter(
        (metric) =>
          metric.metadata?.correlationId &&
          (filter.correlationIds || []).includes(metric.metadata.correlationId)
      );
    }

    // Apply sorting (enhanced filtering)
    if (filter.sortBy) {
      filtered = this.applySorting(filtered, filter.sortBy);
    }

    // Apply offset and limit
    if (filter.offset || filter.limit) {
      const start = filter.offset || 0;
      const end = filter.limit ? start + filter.limit : undefined;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  private applyLabelFilter(metric: Metric, filter: LabelFilter): boolean {
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

  private applyMetadataFilter(metric: Metric, filter: MetadataFilter): boolean {
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

  private applyValueFilter(metric: Metric, filter: ValueFilter): boolean {
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
        return (
          typeof filter.value === "number" && numericValue === filter.value
        );
      case "not_equals":
        return (
          typeof filter.value === "number" && numericValue !== filter.value
        );
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
          return (
            numericValue < filter.value[0] || numericValue > filter.value[1]
          );
        }
        return true;
      default:
        return false;
    }
  }

  private applySorting(
    metrics: readonly Metric[],
    sortCriteria: SortCriteria
  ): readonly Metric[] {
    const sorted = [...metrics].sort((a, b) => {
      const result = this.compareMetrics(a, b, sortCriteria);
      if (result !== 0 || !sortCriteria.secondarySort) {
        return result;
      }
      return this.compareMetrics(a, b, sortCriteria.secondarySort);
    });

    return sorted;
  }

  private compareMetrics(
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
        aValue = this.getNumericValueForSorting(a.value);
        bValue = this.getNumericValueForSorting(b.value);
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

  private getNumericValueForSorting(value: Metric["value"]): number {
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

  private estimateMemoryUsage(metrics: readonly Metric[]): number {
    // Rough estimation of memory usage in bytes
    // This is a simplified calculation for monitoring purposes
    // TODO: Calculate actual memory usage
    const avgMetricSize = 500; // Estimated average size per metric in bytes
    return metrics.length * avgMetricSize;
  }
}

/**
 * Enhanced metric store implementation with configurable backends.
 */
export class EnhancedMetricStoreImpl implements EnhancedMetricStore {
  constructor(
    private readonly backend: StorageBackend,
    private readonly config: StorageConfiguration
  ) {}

  readonly recordMetric = (metric: Metric): Effect.Effect<void, StorageError> =>
    this.backend.store([metric]);

  readonly recordMetrics = (
    metrics: readonly Metric[]
  ): Effect.Effect<void, StorageError> => this.backend.store(metrics);

  readonly getMetrics = (
    filter: MetricFilter
  ): Effect.Effect<readonly Metric[], StorageError> =>
    this.backend.retrieve(filter);

  readonly getMetricsByName = (
    name: string
  ): Effect.Effect<readonly Metric[], StorageError> =>
    this.backend.retrieve({ names: [name as MetricName] });

  readonly getMetricsByTimeRange = (
    start: Date,
    end: Date
  ): Effect.Effect<readonly Metric[], StorageError> =>
    this.backend.retrieve({ timeRange: { start, end } });

  readonly cleanup = (): Effect.Effect<number, StorageError> => {
    const maxAge = new Date(
      Date.now() - Duration.toMillis(this.config.retentionPolicy.maxAge)
    );
    return this.backend.cleanup(maxAge, this.config.retentionPolicy.maxCount);
  };

  readonly getStats = (): Effect.Effect<StorageStats, StorageError> =>
    this.backend.getStats();

  readonly clear = (): Effect.Effect<void, StorageError> => {
    const self = this;
    return Effect.gen(function* (_) {
      // Clear by setting retention to zero
      yield* _(self.backend.cleanup(new Date(), 0));
    });
  };
}

/**
 * Create an in-memory storage backend with the specified capacity.
 */
export const createInMemoryStorageBackend = (
  capacity: number
): StorageBackend => new InMemoryStorageBackend(capacity);

/**
 * Create an enhanced metric store with the specified backend and configuration.
 */
export const createEnhancedMetricStore = (
  backend: StorageBackend,
  config: StorageConfiguration
): EnhancedMetricStore => new EnhancedMetricStoreImpl(backend, config);

/**
 * Effect layer for in-memory storage backend.
 */
export const InMemoryStorageBackendLayer = (capacity: number) =>
  Effect.succeed(createInMemoryStorageBackend(capacity));

/**
 * Effect layer for enhanced metric store with in-memory backend.
 */
export const InMemoryEnhancedMetricStoreLayer = (
  capacity: number,
  config: StorageConfiguration
) =>
  Effect.gen(function* (_) {
    const backend = yield* _(InMemoryStorageBackendLayer(capacity));
    return createEnhancedMetricStore(backend, config);
  });

/**
 * External storage backend interface for integrating with external systems.
 */
export interface ExternalStorageConfig {
  readonly url: string;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly batchSize: number;
}

/**
 * External storage backend implementation (placeholder for actual external systems).
 * This would typically integrate with databases, time-series databases, or other storage systems.
 */
export class ExternalStorageBackend implements StorageBackend {
  constructor(private readonly config: ExternalStorageConfig) {}

  readonly store = (
    metrics: readonly Metric[]
  ): Effect.Effect<void, StorageError> => {
    const config = this.config;
    return Effect.gen(function* (_) {
      // This is a placeholder implementation
      // In a real implementation, this would send metrics to an external system
      // TODO: Implement actual external storage integration
      yield* _(
        Effect.logInfo(
          `Storing ${metrics.length} metrics to external storage at ${config.url}`
        )
      );

      // Simulate network delay
      yield* _(Effect.sleep(10));

      // For now, just succeed - in real implementation, this would make HTTP calls
      // or use database drivers to persist the metrics
      // TODO: Implement actual external storage integration
      return;
    }).pipe(
      Effect.mapError(
        (error) =>
          new StorageError({
            operation: "store",
            message: `Failed to store metrics to external storage: ${config.url}`,
            cause: error,
          })
      )
    );
  };

  readonly retrieve = (
    filter: MetricFilter
  ): Effect.Effect<readonly Metric[], StorageError> => {
    const config = this.config;
    return Effect.gen(function* (_) {
      // Placeholder implementation - would query external storage
      // TODO: Implement actual external storage integration
      yield* _(
        Effect.logInfo(
          `Retrieving metrics from external storage with filter: ${JSON.stringify(filter)}`
        )
      );

      // Simulate network delay
      yield* _(Effect.sleep(20));

      // Return empty array for now - real implementation would query the external system
      // TODO: Implement actual external storage integration
      return [];
    }).pipe(
      Effect.mapError(
        (error) =>
          new StorageError({
            operation: "retrieve",
            message: `Failed to retrieve metrics from external storage: ${config.url}`,
            cause: error,
          })
      )
    );
  };

  readonly cleanup = (
    maxAge: Date,
    maxCount: number
  ): Effect.Effect<number, StorageError> => {
    const config = this.config;
    return Effect.gen(function* (_) {
      // Placeholder implementation - would cleanup external storage
      // TODO: Implement actual external storage integration
      yield* _(
        Effect.logInfo(
          `Cleaning up metrics older than ${maxAge.toISOString()} or exceeding ${maxCount} count`
        )
      );

      // Simulate cleanup operation
      yield* _(Effect.sleep(50));

      // Return 0 for now - real implementation would return actual cleanup count
      // TODO: Implement actual external storage integration
      return 0;
    }).pipe(
      Effect.mapError(
        (error) =>
          new StorageError({
            operation: "cleanup",
            message: `Failed to cleanup external storage: ${config.url}`,
            cause: error,
          })
      )
    );
  };

  readonly getStats = (): Effect.Effect<StorageStats, StorageError> => {
    const config = this.config;
    return Effect.gen(function* (_) {
      // Placeholder implementation - would get stats from external storage
      // TODO: Implement actual external storage integration
      yield* _(
        Effect.logInfo(`Getting stats from external storage: ${config.url}`)
      );

      // Simulate network delay
      yield* _(Effect.sleep(15));

      return {
        totalMetrics: 0,
        memoryUsage: 0,
        storageType: `external-${config.url}`,
      };
    }).pipe(
      Effect.mapError(
        (error) =>
          new StorageError({
            operation: "getStats",
            message: `Failed to get stats from external storage: ${config.url}`,
            cause: error,
          })
      )
    );
  };
}

/**
 * Hybrid storage backend that combines in-memory and external storage.
 * Uses in-memory for fast access and external for persistence.
 */
export class HybridStorageBackend implements StorageBackend {
  constructor(
    private readonly inMemoryBackend: InMemoryStorageBackend,
    private readonly externalBackend: ExternalStorageBackend,
    private readonly syncInterval: number = 30000 // 30 seconds
  ) {}

  readonly store = (
    metrics: readonly Metric[]
  ): Effect.Effect<void, StorageError> => {
    const inMemoryBackend = this.inMemoryBackend;
    const externalBackend = this.externalBackend;
    return Effect.gen(function* (_) {
      // Store in memory first for fast access
      yield* _(inMemoryBackend.store(metrics));

      // Asynchronously store to external backend (fire and forget)
      Effect.runFork(
        externalBackend
          .store(metrics)
          .pipe(
            Effect.catchAll((error) =>
              Effect.logError("Failed to store to external backend", error)
            )
          )
      );
    });
  };

  readonly retrieve = (
    filter: MetricFilter
  ): Effect.Effect<readonly Metric[], StorageError> => {
    const inMemoryBackend = this.inMemoryBackend;
    const externalBackend = this.externalBackend;
    return Effect.gen(function* (_) {
      // Try in-memory first for fast retrieval
      const inMemoryResults = yield* _(inMemoryBackend.retrieve(filter));

      // If we have recent data in memory, return it
      if (inMemoryResults.length > 0) {
        return inMemoryResults;
      }

      // Otherwise, fall back to external storage
      return yield* _(externalBackend.retrieve(filter));
    });
  };

  readonly cleanup = (
    maxAge: Date,
    maxCount: number
  ): Effect.Effect<number, StorageError> => {
    const inMemoryBackend = this.inMemoryBackend;
    const externalBackend = this.externalBackend;
    return Effect.gen(function* (_) {
      // Cleanup both backends
      const inMemoryCleanup = yield* _(
        inMemoryBackend.cleanup(maxAge, maxCount)
      );
      const externalCleanup = yield* _(
        externalBackend.cleanup(maxAge, maxCount)
      );

      return inMemoryCleanup + externalCleanup;
    });
  };

  readonly getStats = (): Effect.Effect<StorageStats, StorageError> => {
    const inMemoryBackend = this.inMemoryBackend;
    const externalBackend = this.externalBackend;
    return Effect.gen(function* (_) {
      const inMemoryStats = yield* _(inMemoryBackend.getStats());
      const externalStats = yield* _(externalBackend.getStats());

      return {
        totalMetrics: inMemoryStats.totalMetrics + externalStats.totalMetrics,
        memoryUsage: inMemoryStats.memoryUsage,
        oldestMetricAge:
          inMemoryStats.oldestMetricAge || externalStats.oldestMetricAge,
        newestMetricAge:
          inMemoryStats.newestMetricAge || externalStats.newestMetricAge,
        storageType: "hybrid-in-memory-external",
      };
    });
  };
}

/**
 * Storage backend factory functions for creating different types of backends.
 */
export namespace StorageBackendFactory {
  export const createInMemory = (capacity: number): StorageBackend =>
    new InMemoryStorageBackend(capacity);

  export const createExternal = (
    config: ExternalStorageConfig
  ): StorageBackend => new ExternalStorageBackend(config);

  export const createHybrid = (
    inMemoryCapacity: number,
    externalConfig: ExternalStorageConfig,
    syncInterval?: number
  ): StorageBackend => {
    const inMemoryBackend = new InMemoryStorageBackend(inMemoryCapacity);
    const externalBackend = new ExternalStorageBackend(externalConfig);
    return new HybridStorageBackend(
      inMemoryBackend,
      externalBackend,
      syncInterval
    );
  };

  export const fromConfiguration = (
    config: StorageConfiguration
  ): StorageBackend => {
    switch (config.storageBackend) {
      case "in-memory":
        return createInMemory(config.maxMetrics);

      case "external":
        if (!config.externalStorageUrl) {
          throw new Error(
            "External storage URL is required for external backend"
          );
        }
        return createExternal({
          url: config.externalStorageUrl,
          timeout: config.connectionTimeout
            ? Duration.toMillis(config.connectionTimeout)
            : 5000,
          retryAttempts: 3,
          batchSize: 100,
        });

      default:
        throw new Error(
          `Unsupported storage backend: ${config.storageBackend}`
        );
    }
  };
}

/**
 * Enhanced metric store service interface for dependency injection.
 */
export interface EnhancedMetricStoreService extends EnhancedMetricStore {}

/**
 * Context tag for enhanced metric store service.
 */
export const EnhancedMetricStoreService =
  Context.GenericTag<EnhancedMetricStoreService>("EnhancedMetricStoreService");

/**
 * Layer for enhanced metric store service with configurable backend.
 */
export const EnhancedMetricStoreLayer = (config: StorageConfiguration) =>
  Layer.effect(
    EnhancedMetricStoreService,
    Effect.succeed(
      createEnhancedMetricStore(
        StorageBackendFactory.fromConfiguration(config),
        config
      )
    )
  );

/**
 * Layer for enhanced metric store service with in-memory backend.
 */
export const InMemoryEnhancedMetricStoreServiceLayer = (
  capacity: number,
  config: StorageConfiguration
) =>
  Layer.effect(
    EnhancedMetricStoreService,
    Effect.succeed(
      createEnhancedMetricStore(
        StorageBackendFactory.createInMemory(capacity),
        config
      )
    )
  );

/**
 * Layer for enhanced metric store service with external backend.
 */
export const ExternalEnhancedMetricStoreServiceLayer = (
  externalConfig: ExternalStorageConfig,
  config: StorageConfiguration
) =>
  Layer.effect(
    EnhancedMetricStoreService,
    Effect.succeed(
      createEnhancedMetricStore(
        StorageBackendFactory.createExternal(externalConfig),
        config
      )
    )
  );

/**
 * Layer for enhanced metric store service with hybrid backend.
 */
export const HybridEnhancedMetricStoreServiceLayer = (
  inMemoryCapacity: number,
  externalConfig: ExternalStorageConfig,
  config: StorageConfiguration,
  syncInterval?: number
) =>
  Layer.effect(
    EnhancedMetricStoreService,
    Effect.succeed(
      createEnhancedMetricStore(
        StorageBackendFactory.createHybrid(
          inMemoryCapacity,
          externalConfig,
          syncInterval
        ),
        config
      )
    )
  );
