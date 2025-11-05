/**
 * @fileoverview Histogram and Distribution Metrics Implementation
 *
 * This module provides histogram and distribution metric implementations using Effect-TS
 * for thread-safe state management and efficient percentile calculations.
 *
 * Features:
 * - HistogramMetric with configurable buckets and Effect Ref state management
 * - DistributionMetric for statistical analysis with percentile calculations
 * - Efficient algorithms for percentile computation (P50, P95, P99)
 * - Thread-safe operations using Effect Ref
 * - Utility functions for common histogram configurations
 * - Histogram merging and aggregation capabilities
 * - Distribution summary statistics and analysis utilities
 */

import type {
  HistogramSnapshot,
  DistributionData,
  MetricLabels,
} from "./enhanced-types";

import { Effect, Ref, Data, pipe } from "effect";

/**
 * Error types for histogram and distribution operations.
 */
export class HistogramError extends Data.TaggedError("HistogramError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class DistributionError extends Data.TaggedError("DistributionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Configuration for histogram buckets.
 */
export interface HistogramConfig {
  readonly boundaries: readonly number[];
  readonly name: string;
  readonly labels?: MetricLabels;
}

/**
 * Configuration for distribution metrics.
 */
export interface DistributionConfig {
  readonly name: string;
  readonly labels?: MetricLabels;
  readonly maxSamples?: number;
  readonly percentiles?: readonly number[];
}

/**
 * Histogram metric implementation using Effect Ref for thread-safe bucket management.
 */
export class HistogramMetric {
  constructor(
    private readonly config: HistogramConfig,
    private readonly countsRef: Ref.Ref<readonly number[]>,
    private readonly sumRef: Ref.Ref<number>,
    private readonly countRef: Ref.Ref<number>
  ) {}

  /**
   * Create a new histogram metric with the specified bucket boundaries.
   */
  static create(
    config: HistogramConfig
  ): Effect.Effect<HistogramMetric, HistogramError> {
    return Effect.gen(function* (_) {
      // Validate bucket boundaries
      if (config.boundaries.length === 0) {
        yield* _(
          Effect.fail(
            new HistogramError({
              message: "Histogram boundaries cannot be empty",
            })
          )
        );
      }

      // Ensure boundaries are sorted
      const sortedBoundaries = [...config.boundaries].sort((a, b) => a - b);
      if (
        !config.boundaries.every(
          (boundary, index) => boundary === sortedBoundaries[index]
        )
      ) {
        yield* _(
          Effect.fail(
            new HistogramError({
              message: "Histogram boundaries must be sorted in ascending order",
            })
          )
        );
      }

      // Initialize refs with zero counts for each bucket
      const initialCounts: readonly number[] = new Array(
        config.boundaries.length + 1
      ).fill(0);
      const countsRef = yield* _(Ref.make(initialCounts));
      const sumRef = yield* _(Ref.make(0));
      const countRef = yield* _(Ref.make(0));

      return new HistogramMetric(
        { ...config, boundaries: sortedBoundaries },
        countsRef,
        sumRef,
        countRef
      );
    });
  }

  /**
   * Observe a value and update the histogram buckets.
   */
  readonly observe = (value: number): Effect.Effect<void, HistogramError> => {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        // Update sum and count
        yield* _(Ref.update(self.sumRef, (sum) => sum + value));
        yield* _(Ref.update(self.countRef, (count) => count + 1));

        // Find the appropriate bucket for this value
        const bucketIndex = self.findBucketIndex(value);

        // Update bucket counts (cumulative)
        yield* _(
          Ref.update(
            self.countsRef,
            (counts) =>
              counts.map((count, index) =>
                index <= bucketIndex ? count + 1 : count
              ) as readonly number[]
          )
        );
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HistogramError({
            message: `Failed to observe value ${value} in histogram ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Get a snapshot of the current histogram state.
   */
  readonly getSnapshot = (): Effect.Effect<
    HistogramSnapshot,
    HistogramError
  > => {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const counts = yield* _(Ref.get(self.countsRef));
        const sum = yield* _(Ref.get(self.sumRef));
        const count = yield* _(Ref.get(self.countRef));

        // Calculate percentiles from histogram buckets
        const percentiles = self.calculatePercentiles(counts, count);

        return {
          buckets: self.config.boundaries,
          counts,
          sum,
          count,
          percentiles,
        };
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HistogramError({
            message: `Failed to get histogram snapshot for ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Reset the histogram to initial state.
   */
  readonly reset = (): Effect.Effect<void, HistogramError> => {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const initialCounts: readonly number[] = new Array(
          self.config.boundaries.length + 1
        ).fill(0);
        yield* _(Ref.set(self.countsRef, initialCounts));
        yield* _(Ref.set(self.sumRef, 0));
        yield* _(Ref.set(self.countRef, 0));
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HistogramError({
            message: `Failed to reset histogram ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Get the current bucket boundaries.
   */
  readonly getBoundaries = (): readonly number[] => this.config.boundaries;

  /**
   * Get the histogram name.
   */
  readonly getName = (): string => this.config.name;

  /**
   * Get the histogram labels.
   */
  readonly getLabels = (): MetricLabels => this.config.labels || {};

  /**
   * Find the bucket index for a given value.
   */
  private findBucketIndex(value: number): number {
    // Find the first boundary that is greater than or equal to the value
    for (let i = 0; i < this.config.boundaries.length; i++) {
      const boundary = this.config.boundaries[i];
      if (boundary !== undefined && value <= boundary) {
        return i;
      }
    }
    // If value is greater than all boundaries, it goes in the last bucket
    return this.config.boundaries.length;
  }

  /**
   * Calculate percentiles from histogram buckets using linear interpolation.
   */
  private calculatePercentiles(
    counts: readonly number[],
    totalCount: number
  ): Record<string, number> {
    if (totalCount === 0) {
      return { "50": 0, "95": 0, "99": 0 };
    }

    const percentiles = [50, 95, 99];
    const result: Record<string, number> = {};

    for (const percentile of percentiles) {
      const targetCount = (percentile / 100) * totalCount;
      let bucketIndex = 0;

      // Find the bucket containing the target percentile
      for (let i = 0; i < counts.length; i++) {
        const count = counts[i];
        if (count !== undefined && count >= targetCount) {
          bucketIndex = i;
          break;
        }
      }

      // Calculate the percentile value using linear interpolation
      let percentileValue: number;

      if (bucketIndex === 0) {
        // First bucket
        percentileValue =
          bucketIndex < this.config.boundaries.length
            ? (this.config.boundaries[bucketIndex] ?? 0)
            : (this.config.boundaries[this.config.boundaries.length - 1] ?? 0);
      } else if (bucketIndex >= this.config.boundaries.length) {
        // Last bucket (infinity bucket)
        percentileValue =
          this.config.boundaries[this.config.boundaries.length - 1] ?? 0;
      } else {
        // Interpolate between bucket boundaries
        const lowerBound =
          bucketIndex > 0 ? (this.config.boundaries[bucketIndex - 1] ?? 0) : 0;
        const upperBound = this.config.boundaries[bucketIndex] ?? 0;
        const lowerCount = bucketIndex > 0 ? (counts[bucketIndex - 1] ?? 0) : 0;
        const upperCount = counts[bucketIndex] ?? 0;

        if (upperCount > lowerCount) {
          const ratio = (targetCount - lowerCount) / (upperCount - lowerCount);
          percentileValue = lowerBound + ratio * (upperBound - lowerBound);
        } else {
          percentileValue = upperBound;
        }
      }

      result[percentile.toString()] = percentileValue;
    }

    return result;
  }
}

/**
 * Distribution metric implementation for statistical analysis.
 */
export class DistributionMetric {
  constructor(
    private readonly config: DistributionConfig,
    private readonly valuesRef: Ref.Ref<readonly number[]>,
    private readonly maxSamples: number = 10000
  ) {}

  /**
   * Create a new distribution metric.
   */
  static create(
    config: DistributionConfig
  ): Effect.Effect<DistributionMetric, DistributionError> {
    return Effect.gen(function* (_) {
      const valuesRef = yield* _(Ref.make<readonly number[]>([]));
      const maxSamples = config.maxSamples || 10000;

      return new DistributionMetric(config, valuesRef, maxSamples);
    });
  }

  /**
   * Record a value in the distribution.
   */
  readonly record = (value: number): Effect.Effect<void, DistributionError> => {
    const self = this;

    return pipe(
      Ref.update(self.valuesRef, (values) => {
        const newValues = [...values, value];
        // Keep only the most recent samples to prevent memory issues
        return newValues.length > self.maxSamples
          ? newValues.slice(-self.maxSamples)
          : newValues;
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new DistributionError({
            message: `Failed to record value ${value} in distribution ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Get distribution data with statistical analysis.
   */
  readonly getDistributionData = (): Effect.Effect<
    DistributionData,
    DistributionError
  > => {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const values = yield* _(Ref.get(self.valuesRef));

        if (values.length === 0) {
          return {
            values: [],
            count: 0,
            sum: 0,
            mean: 0,
            min: 0,
            max: 0,
            stddev: 0,
            percentiles: { "50": 0, "95": 0, "99": 0 },
          };
        }

        const sortedValues = [...values].sort((a, b) => a - b);
        const count = values.length;
        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / count;
        const min = sortedValues[0] ?? 0;
        const max = sortedValues[count - 1] ?? 0;

        // Calculate standard deviation
        const variance =
          values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / count;
        const stddev = Math.sqrt(variance);

        // Calculate percentiles
        const percentilesToCalculate = self.config.percentiles || [50, 95, 99];
        const percentiles = self.calculateExactPercentiles(
          sortedValues,
          percentilesToCalculate
        );

        return {
          values: sortedValues,
          count,
          sum,
          mean,
          min,
          max,
          stddev,
          percentiles,
        };
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new DistributionError({
            message: `Failed to get distribution data for ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Reset the distribution to initial state.
   */
  readonly reset = (): Effect.Effect<void, DistributionError> => {
    const self = this;

    return pipe(
      Ref.set(self.valuesRef, []),
      Effect.catchAll((error) =>
        Effect.fail(
          new DistributionError({
            message: `Failed to reset distribution ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Get the distribution name.
   */
  readonly getName = (): string => this.config.name;

  /**
   * Get the distribution labels.
   */
  readonly getLabels = (): MetricLabels => this.config.labels || {};

  /**
   * Get specific percentiles from the distribution.
   */
  readonly getPercentiles = (
    percentiles: readonly number[]
  ): Effect.Effect<Record<string, number>, DistributionError> => {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const values = yield* _(Ref.get(self.valuesRef));

        if (values.length === 0) {
          const result: Record<string, number> = {};
          for (const p of percentiles) {
            result[p.toString()] = 0;
          }
          return result;
        }

        const sortedValues = [...values].sort((a, b) => a - b);
        return self.calculateExactPercentiles(sortedValues, percentiles);
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new DistributionError({
            message: `Failed to calculate percentiles for distribution ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Get summary statistics without full distribution data.
   */
  readonly getSummaryStats = (): Effect.Effect<
    {
      count: number;
      sum: number;
      mean: number;
      min: number;
      max: number;
      stddev: number;
    },
    DistributionError
  > => {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const values = yield* _(Ref.get(self.valuesRef));

        if (values.length === 0) {
          return {
            count: 0,
            sum: 0,
            mean: 0,
            min: 0,
            max: 0,
            stddev: 0,
          };
        }

        const count = values.length;
        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / count;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Calculate standard deviation
        const variance =
          values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / count;
        const stddev = Math.sqrt(variance);

        return { count, sum, mean, min, max, stddev };
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new DistributionError({
            message: `Failed to get summary statistics for distribution ${self.config.name}`,
            cause: error,
          })
        )
      )
    );
  };

  /**
   * Calculate exact percentiles from sorted values using multiple algorithms.
   */
  private calculateExactPercentiles(
    sortedValues: readonly number[],
    percentiles: readonly number[]
  ): Record<string, number> {
    const result: Record<string, number> = {};
    const n = sortedValues.length;

    for (const percentile of percentiles) {
      if (n === 0) {
        result[percentile.toString()] = 0;
        continue;
      }

      if (n === 1) {
        result[percentile.toString()] = sortedValues[0] ?? 0;
        continue;
      }

      // Use the R-6 quantile method (used by Excel and R) for better accuracy
      const h = (n + 1) * (percentile / 100);
      const hFloor = Math.floor(h);
      const hCeil = Math.ceil(h);

      if (hFloor <= 0) {
        result[percentile.toString()] = sortedValues[0] ?? 0;
      } else if (hFloor >= n) {
        result[percentile.toString()] = sortedValues[n - 1] ?? 0;
      } else if (hFloor === hCeil) {
        result[percentile.toString()] = sortedValues[hFloor - 1] ?? 0;
      } else {
        // Linear interpolation
        const lower = sortedValues[hFloor - 1] ?? 0;
        const upper = sortedValues[hCeil - 1] ?? 0;
        const fraction = h - hFloor;
        result[percentile.toString()] = lower + fraction * (upper - lower);
      }
    }

    return result;
  }
}

/**
 * Utility functions for histogram and distribution metrics.
 */
export namespace HistogramUtils {
  /**
   * Create linear bucket boundaries.
   */
  export const createLinearBuckets = (
    start: number,
    width: number,
    count: number
  ): readonly number[] => {
    const buckets: number[] = [];
    for (let i = 0; i < count; i++) {
      buckets.push(start + i * width);
    }
    return buckets;
  };

  /**
   * Create exponential bucket boundaries.
   */
  export const createExponentialBuckets = (
    start: number,
    factor: number,
    count: number
  ): readonly number[] => {
    const buckets: number[] = [];
    let current = start;
    for (let i = 0; i < count; i++) {
      buckets.push(current);
      current *= factor;
    }
    return buckets;
  };

  /**
   * Create logarithmic bucket boundaries.
   */
  export const createLogarithmicBuckets = (
    start: number,
    end: number,
    count: number
  ): readonly number[] => {
    if (start <= 0 || end <= 0 || start >= end) {
      throw new Error("Invalid parameters for logarithmic buckets");
    }

    const buckets: number[] = [];
    const logStart = Math.log(start);
    const logEnd = Math.log(end);
    const step = (logEnd - logStart) / (count - 1);

    for (let i = 0; i < count; i++) {
      buckets.push(Math.exp(logStart + i * step));
    }
    return buckets;
  };

  /**
   * Create common HTTP response time buckets (in milliseconds).
   */
  export const createHttpResponseTimeBuckets = (): readonly number[] => [
    1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
  ];

  /**
   * Create common database query time buckets (in milliseconds).
   */
  export const createDatabaseQueryTimeBuckets = (): readonly number[] => [
    0.1, 0.5, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000,
  ];

  /**
   * Create memory usage buckets (in MB).
   */
  export const createMemoryUsageBuckets = (): readonly number[] => [
    1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 4000, 8000,
  ];

  /**
   * Create CPU usage percentage buckets.
   */
  export const createCpuUsageBuckets = (): readonly number[] => [
    1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99,
  ];

  /**
   * Merge multiple histogram snapshots into a single aggregated histogram.
   */
  export const mergeHistograms = (
    snapshots: readonly HistogramSnapshot[]
  ): Effect.Effect<HistogramSnapshot, HistogramError> => {
    return Effect.gen(function* (_) {
      if (snapshots.length === 0) {
        yield* _(
          Effect.fail(
            new HistogramError({
              message: "Cannot merge empty histogram snapshots array",
            })
          )
        );
      }

      const firstSnapshot = snapshots[0];
      if (!firstSnapshot) {
        return yield* _(
          Effect.fail(
            new HistogramError({
              message: "First snapshot is undefined",
            })
          )
        );
      }
      const buckets = firstSnapshot.buckets;

      // Verify all histograms have the same bucket boundaries
      for (const snapshot of snapshots) {
        if (
          snapshot.buckets.length !== buckets.length ||
          !snapshot.buckets.every((bucket, index) => bucket === buckets[index])
        ) {
          yield* _(
            Effect.fail(
              new HistogramError({
                message:
                  "Cannot merge histograms with different bucket boundaries",
              })
            )
          );
        }
      }

      // Aggregate counts, sum, and count
      const mergedCounts: number[] = new Array(buckets.length + 1).fill(0);
      let mergedSum = 0;
      let mergedCount = 0;

      for (const snapshot of snapshots) {
        mergedSum += snapshot.sum;
        mergedCount += snapshot.count;

        for (let i = 0; i < snapshot.counts.length; i++) {
          const currentCount = mergedCounts[i];
          const snapshotCount = snapshot.counts[i];
          if (currentCount !== undefined && snapshotCount !== undefined) {
            mergedCounts[i] = currentCount + snapshotCount;
          }
        }
      }

      // Calculate merged percentiles
      const percentiles = calculatePercentilesFromBuckets(
        buckets,
        mergedCounts,
        mergedCount
      );

      return {
        buckets,
        counts: mergedCounts,
        sum: mergedSum,
        count: mergedCount,
        percentiles,
      };
    });
  };

  /**
   * Create a histogram configuration for HTTP response times.
   */
  export const createHttpResponseTimeHistogram = (
    name: string,
    labels?: MetricLabels
  ): HistogramConfig => ({
    name,
    boundaries: createHttpResponseTimeBuckets(),
    ...(labels && { labels }),
  });

  /**
   * Create a histogram configuration for database query times.
   */
  export const createDatabaseQueryTimeHistogram = (
    name: string,
    labels?: MetricLabels
  ): HistogramConfig => ({
    name,
    boundaries: createDatabaseQueryTimeBuckets(),
    ...(labels && { labels }),
  });

  /**
   * Create a histogram configuration for memory usage.
   */
  export const createMemoryUsageHistogram = (
    name: string,
    labels?: MetricLabels
  ): HistogramConfig => ({
    name,
    boundaries: createMemoryUsageBuckets(),
    ...(labels && { labels }),
  });

  /**
   * Create a histogram configuration for CPU usage.
   */
  export const createCpuUsageHistogram = (
    name: string,
    labels?: MetricLabels
  ): HistogramConfig => ({
    name,
    boundaries: createCpuUsageBuckets(),
    ...(labels && { labels }),
  });
}

/**
 * Utility functions for distribution metrics.
 */
export namespace DistributionUtils {
  /**
   * Create a distribution configuration for response times.
   */
  export const createResponseTimeDistribution = (
    name: string,
    labels?: MetricLabels
  ): DistributionConfig => ({
    name,
    maxSamples: 10000,
    percentiles: [50, 90, 95, 99, 99.9],
    ...(labels && { labels }),
  });

  /**
   * Create a distribution configuration for request sizes.
   */
  export const createRequestSizeDistribution = (
    name: string,
    labels?: MetricLabels
  ): DistributionConfig => ({
    name,
    maxSamples: 5000,
    percentiles: [50, 90, 95, 99],
    ...(labels && { labels }),
  });

  /**
   * Create a distribution configuration for error rates.
   */
  export const createErrorRateDistribution = (
    name: string,
    labels?: MetricLabels
  ): DistributionConfig => ({
    name,
    maxSamples: 1000,
    percentiles: [50, 75, 90, 95, 99],
    ...(labels && { labels }),
  });

  /**
   * Merge multiple distribution data into aggregated statistics.
   */
  export const mergeDistributions = (
    distributions: readonly DistributionData[]
  ): Effect.Effect<DistributionData, DistributionError> => {
    return Effect.gen(function* (_) {
      if (distributions.length === 0) {
        yield* _(
          Effect.fail(
            new DistributionError({
              message: "Cannot merge empty distributions array",
            })
          )
        );
      }

      // Combine all values
      const allValues: number[] = [];
      let totalSum = 0;
      let totalCount = 0;

      for (const dist of distributions) {
        allValues.push(...dist.values);
        totalSum += dist.sum;
        totalCount += dist.count;
      }

      if (totalCount === 0) {
        return {
          values: [],
          count: 0,
          sum: 0,
          mean: 0,
          min: 0,
          max: 0,
          stddev: 0,
          percentiles: { "50": 0, "95": 0, "99": 0 },
        };
      }

      const sortedValues = allValues.sort((a, b) => a - b);
      const mean = totalSum / totalCount;
      const min = sortedValues[0] ?? 0;
      const max = sortedValues[sortedValues.length - 1] ?? 0;

      // Calculate standard deviation
      const variance =
        allValues.reduce((acc, val) => acc + (val - mean) ** 2, 0) / totalCount;
      const stddev = Math.sqrt(variance);

      // Calculate percentiles
      const percentiles = calculatePercentilesFromValues(
        sortedValues,
        [50, 95, 99]
      );

      return {
        values: sortedValues,
        count: totalCount,
        sum: totalSum,
        mean,
        min,
        max,
        stddev,
        percentiles,
      };
    });
  };

  /**
   * Calculate statistical significance between two distributions.
   */
  export const calculateStatisticalSignificance = (
    dist1: DistributionData,
    dist2: DistributionData
  ): Effect.Effect<
    {
      meanDifference: number;
      pValue: number;
      isSignificant: boolean;
    },
    DistributionError
  > => {
    return Effect.gen(function* (_) {
      if (dist1.count === 0 || dist2.count === 0) {
        yield* _(
          Effect.fail(
            new DistributionError({
              message:
                "Cannot calculate statistical significance for empty distributions",
            })
          )
        );
      }

      // Guard against insufficient sample sizes for t-test
      if (dist1.count < 2 || dist2.count < 2) {
        yield* _(
          Effect.fail(
            new DistributionError({
              message:
                "Cannot calculate statistical significance with sample size less than 2",
            })
          )
        );
      }

      const meanDifference = dist1.mean - dist2.mean;

      // Simplified t-test calculation (assuming equal variances)
      const pooledDenominator = dist1.count + dist2.count - 2;
      
      // Additional safety check for pooled denominator
      if (pooledDenominator <= 0) {
        yield* _(
          Effect.fail(
            new DistributionError({
              message:
                "Invalid degrees of freedom for pooled variance calculation",
            })
          )
        );
      }

      const pooledVariance = 
        ((dist1.count - 1) * dist1.stddev ** 2 +
          (dist2.count - 1) * dist2.stddev ** 2) /
          pooledDenominator;

      // Guard against negative pooled variance (should not happen with valid data)
      if (pooledVariance < 0) {
        yield* _(
          Effect.fail(
            new DistributionError({
              message:
                "Invalid negative pooled variance in statistical calculation",
            })
          )
        );
      }

      const pooledStddev = Math.sqrt(pooledVariance);

      const standardError =
        pooledStddev * Math.sqrt(1 / dist1.count + 1 / dist2.count);
      
      // Guard against zero standard error
      if (standardError === 0) {
        yield* _(
          Effect.fail(
            new DistributionError({
              message:
                "Cannot calculate t-statistic with zero standard error",
            })
          )
        );
      }

      const tStatistic = meanDifference / standardError;

      // Simplified p-value calculation (this is an approximation)
      const pValue = 2 * (1 - normalCDF(Math.abs(tStatistic)));

      return {
        meanDifference,
        pValue,
        isSignificant: pValue < 0.05,
      };
    });
  };
}

/**
 * Helper function to calculate percentiles from histogram buckets.
 */
function calculatePercentilesFromBuckets(
  buckets: readonly number[],
  counts: readonly number[],
  totalCount: number
): Record<string, number> {
  if (totalCount === 0) {
    return { "50": 0, "95": 0, "99": 0 };
  }

  const percentiles = [50, 95, 99];
  const result: Record<string, number> = {};

  for (const percentile of percentiles) {
    const targetCount = (percentile / 100) * totalCount;
    let bucketIndex = 0;

    // Find the bucket containing the target percentile
    for (let i = 0; i < counts.length; i++) {
      const count = counts[i];
      if (count !== undefined && count >= targetCount) {
        bucketIndex = i;
        break;
      }
    }

    // Calculate the percentile value using linear interpolation
    let percentileValue: number;

    if (bucketIndex === 0) {
      percentileValue =
        bucketIndex < buckets.length
          ? (buckets[bucketIndex] ?? 0)
          : (buckets[buckets.length - 1] ?? 0);
    } else if (bucketIndex >= buckets.length) {
      percentileValue = buckets[buckets.length - 1] ?? 0;
    } else {
      const lowerBound = bucketIndex > 0 ? (buckets[bucketIndex - 1] ?? 0) : 0;
      const upperBound = buckets[bucketIndex] ?? 0;
      const lowerCount = bucketIndex > 0 ? (counts[bucketIndex - 1] ?? 0) : 0;
      const upperCount = counts[bucketIndex] ?? 0;

      if (upperCount > lowerCount) {
        const ratio = (targetCount - lowerCount) / (upperCount - lowerCount);
        percentileValue = lowerBound + ratio * (upperBound - lowerBound);
      } else {
        percentileValue = upperBound;
      }
    }

    result[percentile.toString()] = percentileValue;
  }

  return result;
}

/**
 * Helper function to calculate percentiles from sorted values.
 */
function calculatePercentilesFromValues(
  sortedValues: readonly number[],
  percentiles: readonly number[]
): Record<string, number> {
  const result: Record<string, number> = {};
  const n = sortedValues.length;

  for (const percentile of percentiles) {
    if (n === 0) {
      result[percentile.toString()] = 0;
      continue;
    }

    if (n === 1) {
      result[percentile.toString()] = sortedValues[0] ?? 0;
      continue;
    }

    // Use the R-6 quantile method
    const h = (n + 1) * (percentile / 100);
    const hFloor = Math.floor(h);
    const hCeil = Math.ceil(h);

    if (hFloor <= 0) {
      result[percentile.toString()] = sortedValues[0] ?? 0;
    } else if (hFloor >= n) {
      result[percentile.toString()] = sortedValues[n - 1] ?? 0;
    } else if (hFloor === hCeil) {
      result[percentile.toString()] = sortedValues[hFloor - 1] ?? 0;
    } else {
      const lower = sortedValues[hFloor - 1];
      const upper = sortedValues[hCeil - 1];
      const fraction = h - hFloor;
      result[percentile.toString()] =
        (lower ?? 0) + fraction * ((upper ?? 0) - (lower ?? 0));
    }
  }

  return result;
}

/**
 * Simplified normal CDF approximation for statistical calculations.
 */
function normalCDF(value: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
