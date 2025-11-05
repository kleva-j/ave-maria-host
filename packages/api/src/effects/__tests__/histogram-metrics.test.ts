/**
 * @fileoverview Unit tests for Histogram and Distribution Metrics
 *
 * Tests histogram and distribution metric implementations with Effect state management,
 * percentile calculations, and utility functions.
 */

import { Effect } from "effect";
import { describe, it, expect } from "vitest";
import {
  type DistributionConfig,
  type HistogramConfig,
  DistributionMetric,
  DistributionUtils,
  HistogramMetric,
  HistogramUtils,
} from "../histogram-metrics";

describe("Histogram and Distribution Metrics", () => {
  describe("HistogramMetric", () => {
    it("should create a histogram with valid configuration", async () => {
      const config: HistogramConfig = {
        name: "test_histogram",
        boundaries: [1, 5, 10, 50, 100],
      };

      const program = Effect.gen(function* (_) {
        const histogram = yield* _(HistogramMetric.create(config));
        expect(histogram.getName()).toBe("test_histogram");
        expect(histogram.getBoundaries()).toEqual([1, 5, 10, 50, 100]);
      });

      await Effect.runPromise(program);
    });

    it("should observe values and update buckets correctly", async () => {
      const config: HistogramConfig = {
        name: "test_histogram",
        boundaries: [1, 5, 10],
      };

      const program = Effect.gen(function* (_) {
        const histogram = yield* _(HistogramMetric.create(config));

        // Observe some values
        yield* _(histogram.observe(0.5)); // bucket 0
        yield* _(histogram.observe(3)); // bucket 1
        yield* _(histogram.observe(7)); // bucket 2
        yield* _(histogram.observe(15)); // bucket 3 (overflow)

        const snapshot = yield* _(histogram.getSnapshot());

        expect(snapshot.count).toBe(4);
        expect(snapshot.sum).toBe(25.5);
        expect(snapshot.buckets).toEqual([1, 5, 10]);
        // Cumulative counts: [1, 2, 3, 4]
        expect(snapshot.counts).toEqual([1, 2, 3, 4]);
      });

      await Effect.runPromise(program);
    });

    it("should calculate percentiles correctly", async () => {
      const config: HistogramConfig = {
        name: "test_histogram",
        boundaries: [1, 5, 10, 50, 100],
      };

      const program = Effect.gen(function* (_) {
        const histogram = yield* _(HistogramMetric.create(config));

        // Add many values to get meaningful percentiles
        for (let i = 1; i <= 100; i++) {
          yield* _(histogram.observe(i));
        }

        const snapshot = yield* _(histogram.getSnapshot());

        expect(snapshot.count).toBe(100);
        expect(snapshot.percentiles).toHaveProperty("50");
        expect(snapshot.percentiles).toHaveProperty("95");
        expect(snapshot.percentiles).toHaveProperty("99");
      });

      await Effect.runPromise(program);
    });
  });

  describe("DistributionMetric", () => {
    it("should create a distribution with valid configuration", async () => {
      const config: DistributionConfig = {
        name: "test_distribution",
        maxSamples: 1000,
        percentiles: [50, 90, 95, 99],
      };

      const program = Effect.gen(function* (_) {
        const distribution = yield* _(DistributionMetric.create(config));
        expect(distribution.getName()).toBe("test_distribution");
      });

      await Effect.runPromise(program);
    });

    it("should record values and calculate statistics correctly", async () => {
      const config: DistributionConfig = {
        name: "test_distribution",
        percentiles: [50, 95, 99],
      };

      const program = Effect.gen(function* (_) {
        const distribution = yield* _(DistributionMetric.create(config));

        // Record some values
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        for (const value of values) {
          yield* _(distribution.record(value));
        }

        const data = yield* _(distribution.getDistributionData());

        expect(data.count).toBe(10);
        expect(data.sum).toBe(55);
        expect(data.mean).toBe(5.5);
        expect(data.min).toBe(1);
        expect(data.max).toBe(10);
        expect(data.percentiles).toHaveProperty("50");
        expect(data.percentiles).toHaveProperty("95");
        expect(data.percentiles).toHaveProperty("99");
      });

      await Effect.runPromise(program);
    });

    it("should calculate percentiles accurately", async () => {
      const config: DistributionConfig = {
        name: "test_distribution",
        percentiles: [50, 90, 95],
      };

      const program = Effect.gen(function* (_) {
        const distribution = yield* _(DistributionMetric.create(config));

        // Record values 1-100
        for (let i = 1; i <= 100; i++) {
          yield* _(distribution.record(i));
        }

        const percentiles = yield* _(distribution.getPercentiles([50, 90, 95]));

        // For values 1-100, P50 should be around 50.5, P90 around 90.5, P95 around 95.5
        expect(percentiles["50"]).toBeCloseTo(50.5, 1);
        expect(percentiles["90"]).toBeCloseTo(90.5, 1);
        expect(percentiles["95"]).toBeCloseTo(95.5, 1);
      });

      await Effect.runPromise(program);
    });
  });

  describe("HistogramUtils", () => {
    it("should create linear buckets correctly", () => {
      const buckets = HistogramUtils.createLinearBuckets(0, 10, 5);
      expect(buckets).toEqual([0, 10, 20, 30, 40]);
    });

    it("should create exponential buckets correctly", () => {
      const buckets = HistogramUtils.createExponentialBuckets(1, 2, 4);
      expect(buckets).toEqual([1, 2, 4, 8]);
    });

    it("should create HTTP response time buckets", () => {
      const buckets = HistogramUtils.createHttpResponseTimeBuckets();
      expect(buckets).toContain(100);
      expect(buckets).toContain(500);
      expect(buckets).toContain(1000);
    });

    it("should create histogram configurations", () => {
      const config =
        HistogramUtils.createHttpResponseTimeHistogram("http_duration");
      expect(config.name).toBe("http_duration");
      expect(config.boundaries.length).toBeGreaterThan(0);
    });
  });

  describe("DistributionUtils", () => {
    it("should create distribution configurations", () => {
      const config =
        DistributionUtils.createResponseTimeDistribution("response_time");
      expect(config.name).toBe("response_time");
      expect(config.maxSamples).toBe(10000);
      expect(config.percentiles).toContain(50);
      expect(config.percentiles).toContain(95);
      expect(config.percentiles).toContain(99);
    });

    it("should merge distributions correctly", async () => {
      const dist1 = {
        values: [1, 2, 3],
        count: 3,
        sum: 6,
        mean: 2,
        min: 1,
        max: 3,
        stddev: 1,
        percentiles: { "50": 2, "95": 3, "99": 3 },
      };

      const dist2 = {
        values: [4, 5, 6],
        count: 3,
        sum: 15,
        mean: 5,
        min: 4,
        max: 6,
        stddev: 1,
        percentiles: { "50": 5, "95": 6, "99": 6 },
      };

      const program = DistributionUtils.mergeDistributions([dist1, dist2]);
      const merged = await Effect.runPromise(program);

      expect(merged.count).toBe(6);
      expect(merged.sum).toBe(21);
      expect(merged.values).toEqual([1, 2, 3, 4, 5, 6]);
      expect(merged.min).toBe(1);
      expect(merged.max).toBe(6);
    });

    it("should handle statistical significance calculation edge cases", async () => {
      // Test with insufficient sample sizes
      const dist1 = {
        values: [1],
        count: 1,
        sum: 1,
        mean: 1,
        min: 1,
        max: 1,
        stddev: 0,
        percentiles: { "50": 1 },
      };

      const dist2 = {
        values: [2, 3],
        count: 2,
        sum: 5,
        mean: 2.5,
        min: 2,
        max: 3,
        stddev: 0.5,
        percentiles: { "50": 2.5 },
      };

      // Test insufficient sample size - should fail
      try {
        await Effect.runPromise(DistributionUtils.calculateStatisticalSignificance(dist1, dist2));
        expect.fail("Should have thrown an error for insufficient sample size");
      } catch (error) {
        expect((error as Error).message).toContain("sample size less than 2");
      }

      // Test with empty distributions - should fail
      const emptyDist = {
        values: [],
        count: 0,
        sum: 0,
        mean: 0,
        min: 0,
        max: 0,
        stddev: 0,
        percentiles: {},
      };

      try {
        await Effect.runPromise(DistributionUtils.calculateStatisticalSignificance(emptyDist, dist2));
        expect.fail("Should have thrown an error for empty distributions");
      } catch (error) {
        expect((error as Error).message).toContain("empty distributions");
      }

      // Test with valid distributions - should succeed
      const validDist1 = {
        values: [1, 2, 3],
        count: 3,
        sum: 6,
        mean: 2,
        min: 1,
        max: 3,
        stddev: 1,
        percentiles: { "50": 2 },
      };

      const validDist2 = {
        values: [4, 5, 6],
        count: 3,
        sum: 15,
        mean: 5,
        min: 4,
        max: 6,
        stddev: 1,
        percentiles: { "50": 5 },
      };

      const result = await Effect.runPromise(DistributionUtils.calculateStatisticalSignificance(validDist1, validDist2));
      
      expect(result).toHaveProperty("meanDifference");
      expect(result).toHaveProperty("pValue");
      expect(result).toHaveProperty("isSignificant");
      expect(result.meanDifference).toBe(-3); // 2 - 5 = -3
    });
  });
});
