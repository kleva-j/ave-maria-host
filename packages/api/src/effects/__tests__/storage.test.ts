/**
 * @fileoverview Tests for Enhanced Storage Implementation
 */

import type { Metric } from "../enhanced-types";

import { createNumericValue, createMetricName } from "../enhanced-types";
import { CircularBuffer, InMemoryStorageBackend } from "../storage";
import { describe, it, expect } from "vitest";
import { Effect, pipe } from "effect";

describe("CircularBuffer", () => {
  it("should enqueue and dequeue items correctly", () => {
    const buffer = new CircularBuffer<number>(3);

    buffer.enqueue(1);
    buffer.enqueue(2);
    buffer.enqueue(3);

    expect(buffer.getSize()).toBe(3);
    expect(buffer.dequeue()).toBe(1);
    expect(buffer.dequeue()).toBe(2);
    expect(buffer.dequeue()).toBe(3);
    expect(buffer.getSize()).toBe(0);
  });

  it("should handle overflow correctly", () => {
    const buffer = new CircularBuffer<number>(2);

    buffer.enqueue(1);
    buffer.enqueue(2);
    buffer.enqueue(3); // Should overwrite 1

    expect(buffer.getSize()).toBe(2);
    expect(buffer.dequeue()).toBe(2);
    expect(buffer.dequeue()).toBe(3);
  });

  it("should convert to array correctly", () => {
    const buffer = new CircularBuffer<number>(3);

    buffer.enqueue(1);
    buffer.enqueue(2);
    buffer.enqueue(3);

    const array = buffer.toArray();
    expect(array).toEqual([1, 2, 3]);
  });

  it("should handle batch operations", () => {
    const buffer = new CircularBuffer<number>(5);

    buffer.enqueueBatch([1, 2, 3]);
    expect(buffer.getSize()).toBe(3);

    const batch = buffer.dequeueBatch(2);
    expect(batch).toEqual([1, 2]);
    expect(buffer.getSize()).toBe(1);
  });

  it("should optimize for power of 2 capacities", () => {
    const buffer = new CircularBuffer<number>(4); // Power of 2
    const stats = buffer.getStats();

    expect(stats.isPowerOfTwo).toBe(true);
    expect(stats.capacity).toBe(4);
  });
});

describe("InMemoryStorageBackend", () => {
  const createTestMetric = (name: string, value: number): Metric => ({
    id: `test-${Date.now()}-${Math.random()}`,
    name: createMetricName(name),
    value: createNumericValue(value),
    type: "gauge",
    labels: {},
    timestamp: new Date(),
  });

  it("should store and retrieve metrics", async () => {
    const backend = new InMemoryStorageBackend(10);
    const metrics = [
      createTestMetric("test.metric.1", 100),
      createTestMetric("test.metric.2", 200),
    ];

    // Store metrics
    const storeResult = pipe(
      backend.store(metrics),
      Effect.either,
      Effect.runSync
    );
    expect(storeResult._tag).toBe("Right");

    // Retrieve all metrics
    const retrieveResult = pipe(
      backend.retrieve({}),
      Effect.either,
      Effect.runSync
    );
    expect(retrieveResult._tag).toBe("Right");

    if (retrieveResult._tag === "Right") {
      expect(retrieveResult.right).toHaveLength(2);
    }
  });

  it("should filter metrics correctly", async () => {
    const backend = new InMemoryStorageBackend(10);
    const metrics = [
      createTestMetric("test.counter", 1),
      createTestMetric("test.gauge", 2),
    ];

    pipe(backend.store(metrics), Effect.runSync);

    // Filter by name
    const filterResult = pipe(
      backend.retrieve({ names: [createMetricName("test.counter")] }),
      Effect.either,
      Effect.runSync
    );

    expect(filterResult._tag).toBe("Right");
    if (filterResult._tag === "Right") {
      expect(filterResult.right).toHaveLength(1);
      const result = filterResult.right;
      if (result[0]) {
        expect(result[0].name).toBe("test.counter");
      }
    }
  });

  it("should provide storage statistics", async () => {
    const backend = new InMemoryStorageBackend(10);
    const metrics = [createTestMetric("test.metric", 100)];

    pipe(backend.store(metrics), Effect.runSync);

    const statsResult = pipe(backend.getStats(), Effect.either, Effect.runSync);
    expect(statsResult._tag).toBe("Right");

    if (statsResult._tag === "Right") {
      expect(statsResult.right.totalMetrics).toBe(1);
      expect(statsResult.right.storageType).toBe("in-memory-circular-buffer");
    }
  });
});
