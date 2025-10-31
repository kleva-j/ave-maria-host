/**
 * @fileoverview Tests for Enhanced Storage Implementation
 */

import type {
  StorageConfiguration,
  RetentionPolicy,
  Metric,
} from "../enhanced-types";

import { createNumericValue, createMetricName } from "../enhanced-types";
import { RetentionPolicyServiceImpl } from "../retention";
import { describe, it, expect, beforeEach } from "vitest";
import { Effect, pipe, Duration } from "effect";
import {
  InMemoryStorageBackend,
  EnhancedMetricStoreImpl,
  ExternalStorageBackend,
  StorageBackendFactory,
  HybridStorageBackend,
  CircularBuffer,
} from "../storage";

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

describe("CircularBuffer Performance Tests", () => {
  it("should handle large capacities efficiently", () => {
    const largeCapacity = 100000;
    const buffer = new CircularBuffer<number>(largeCapacity);

    // Test performance with large capacity
    const startTime = Date.now();

    // Fill buffer completely
    for (let i = 0; i < largeCapacity; i++) {
      buffer.enqueue(i);
    }

    const fillTime = Date.now() - startTime;
    expect(fillTime).toBeLessThan(1000); // Should complete within 1 second
    expect(buffer.getSize()).toBe(largeCapacity);
    expect(buffer.isFull()).toBe(true);
  });

  it("should optimize power-of-2 capacities vs non-power-of-2", () => {
    const powerOf2Buffer = new CircularBuffer<number>(1024); // 2^10
    const nonPowerOf2Buffer = new CircularBuffer<number>(1000);

    const iterations = 10000;

    // Test power-of-2 performance
    const start1 = Date.now();
    for (let i = 0; i < iterations; i++) {
      powerOf2Buffer.enqueue(i);
      powerOf2Buffer.dequeue();
    }
    const powerOf2Time = Date.now() - start1;

    // Test non-power-of-2 performance
    const start2 = Date.now();
    for (let i = 0; i < iterations; i++) {
      nonPowerOf2Buffer.enqueue(i);
      nonPowerOf2Buffer.dequeue();
    }
    const nonPowerOf2Time = Date.now() - start2;

    // Power-of-2 should be faster due to bit masking optimization
    expect(powerOf2Time).toBeLessThanOrEqual(nonPowerOf2Time);
    expect(powerOf2Buffer.getStats().isPowerOfTwo).toBe(true);
    expect(nonPowerOf2Buffer.getStats().isPowerOfTwo).toBe(false);
  });

  it("should maintain correctness with various capacities", () => {
    const capacities = [1, 2, 3, 4, 8, 16, 31, 32, 63, 64, 100, 1000];

    for (const capacity of capacities) {
      const buffer = new CircularBuffer<number>(capacity);

      // Fill beyond capacity to test overflow
      const itemsToAdd = capacity * 2;
      for (let i = 0; i < itemsToAdd; i++) {
        buffer.enqueue(i);
      }

      // Should only contain the last 'capacity' items
      expect(buffer.getSize()).toBe(capacity);
      const items = buffer.toArray();
      expect(items).toHaveLength(capacity);

      // Items should be the last ones added (overflow behavior)
      const expectedStart = itemsToAdd - capacity;
      for (let i = 0; i < capacity; i++) {
        expect(items[i]).toBe(expectedStart + i);
      }
    }
  });

  it("should handle edge cases correctly", () => {
    // Test capacity of 1
    const singleBuffer = new CircularBuffer<string>(1);
    singleBuffer.enqueue("first");
    singleBuffer.enqueue("second"); // Should overwrite first
    expect(singleBuffer.toArray()).toEqual(["second"]);

    // Test empty operations
    const emptyBuffer = new CircularBuffer<number>(5);
    expect(emptyBuffer.dequeue()).toBeUndefined();
    expect(emptyBuffer.peek()).toBeUndefined();
    expect(emptyBuffer.peekLast()).toBeUndefined();
    expect(emptyBuffer.toArray()).toEqual([]);
    expect(emptyBuffer.isEmpty()).toBe(true);

    // Test batch operations on empty buffer
    expect(emptyBuffer.dequeueBatch(5)).toEqual([]);
  });
});

describe("InMemoryStorageBackend", () => {
  const createTestMetric = (
    name: string,
    value: number,
    timestamp?: Date
  ): Metric => ({
    id: `test-${Date.now()}-${Math.random()}`,
    name: createMetricName(name),
    value: createNumericValue(value),
    type: "gauge",
    labels: {},
    timestamp: timestamp || new Date(),
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

  it("should handle cleanup operations correctly", async () => {
    const backend = new InMemoryStorageBackend(10);
    const now = new Date();
    const oldTime = new Date(now.getTime() - 60000); // 1 minute ago

    const metrics = [
      createTestMetric("old.metric", 1, oldTime),
      createTestMetric("new.metric", 2, now),
    ];

    pipe(backend.store(metrics), Effect.runSync);

    // Cleanup metrics older than 30 seconds
    const cleanupTime = new Date(now.getTime() - 30000);
    const cleanupResult = pipe(
      backend.cleanup(cleanupTime, 10),
      Effect.either,
      Effect.runSync
    );

    expect(cleanupResult._tag).toBe("Right");
    if (cleanupResult._tag === "Right") {
      expect(cleanupResult.right).toBe(1); // Should remove 1 old metric
    }

    // Verify only new metric remains
    const remainingResult = pipe(
      backend.retrieve({}),
      Effect.either,
      Effect.runSync
    );

    if (remainingResult._tag === "Right") {
      expect(remainingResult.right).toHaveLength(1);
      expect(remainingResult.right[0]?.name).toBe("new.metric");
    }
  });
});

describe("Retention Policy Enforcement", () => {
  let mockMetricStore: EnhancedMetricStoreImpl;
  let retentionService: RetentionPolicyServiceImpl;

  const createTestMetric = (
    name: string,
    value: number,
    timestamp?: Date
  ): Metric => ({
    id: `test-${Date.now()}-${Math.random()}`,
    name: createMetricName(name),
    value: createNumericValue(value),
    type: "gauge",
    labels: {},
    timestamp: timestamp || new Date(),
  });

  const createTestConfig = (): StorageConfiguration => ({
    maxMetrics: 100,
    retentionPolicy: {
      maxAge: Duration.minutes(5),
      maxCount: 50,
      cleanupInterval: Duration.seconds(1), // Fast for testing
    },
    storageBackend: "in-memory" as const,
    enableCircularBuffer: true,
  });

  beforeEach(() => {
    const config = createTestConfig();
    const backend = new InMemoryStorageBackend(config.maxMetrics);
    mockMetricStore = new EnhancedMetricStoreImpl(backend, config);
    retentionService = new RetentionPolicyServiceImpl(
      config.retentionPolicy,
      mockMetricStore
    );
  });

  it("should enforce time-based retention policy", async () => {
    const now = new Date();
    const oldTime = new Date(
      now.getTime() - Duration.toMillis(Duration.minutes(10))
    ); // 10 minutes ago

    // Add old and new metrics
    const oldMetrics = Array.from({ length: 10 }, (_, i) =>
      createTestMetric(`old.metric.${i}`, i, oldTime)
    );
    const newMetrics = Array.from({ length: 10 }, (_, i) =>
      createTestMetric(`new.metric.${i}`, i, now)
    );

    await pipe(
      mockMetricStore.recordMetrics([...oldMetrics, ...newMetrics]),
      Effect.runPromise
    );

    // Run cleanup
    const cleanupResult = await pipe(
      retentionService.runCleanupOnce(),
      Effect.runPromise
    );

    expect(cleanupResult).toBe(10); // Should remove 10 old metrics

    // Verify only new metrics remain
    const remainingMetrics = await pipe(
      mockMetricStore.getMetrics({}),
      Effect.runPromise
    );

    expect(remainingMetrics).toHaveLength(10);
    for (const metric of remainingMetrics) {
      expect(metric.name.startsWith("new.metric")).toBe(true);
    }
  });

  it("should enforce count-based retention policy", async () => {
    // Add more metrics than the count limit
    const metrics = Array.from({ length: 80 }, (_, i) =>
      createTestMetric(`metric.${i}`, i)
    );

    await pipe(mockMetricStore.recordMetrics(metrics), Effect.runPromise);

    // Run cleanup
    const cleanupResult = await pipe(
      retentionService.runCleanupOnce(),
      Effect.runPromise
    );

    expect(cleanupResult).toBe(30); // Should remove 30 metrics (80 - 50)

    // Verify count limit is enforced
    const remainingMetrics = await pipe(
      mockMetricStore.getMetrics({}),
      Effect.runPromise
    );

    expect(remainingMetrics).toHaveLength(50);
  });

  it("should track cleanup statistics", async () => {
    // Add some metrics to clean up
    const metrics = Array.from({ length: 60 }, (_, i) =>
      createTestMetric(`metric.${i}`, i)
    );

    await pipe(mockMetricStore.recordMetrics(metrics), Effect.runPromise);

    // Run cleanup multiple times
    await pipe(retentionService.runCleanupOnce(), Effect.runPromise);
    await pipe(retentionService.runCleanupOnce(), Effect.runPromise);

    const stats = await pipe(retentionService.getStats(), Effect.runPromise);

    expect(stats.totalCleanupRuns).toBe(2);
    expect(stats.totalMetricsRemoved).toBeGreaterThan(0);
    expect(stats.lastCleanupTime).toBeInstanceOf(Date);
    expect(stats.lastCleanupDuration).toBeGreaterThan(0);
  });

  it("should handle cleanup scheduling", async () => {
    // Start cleanup schedule
    await pipe(retentionService.startCleanupSchedule(), Effect.runPromise);

    const stats = await pipe(retentionService.getStats(), Effect.runPromise);

    expect(stats.isRunning).toBe(true);

    // Stop cleanup schedule
    await pipe(retentionService.stopCleanupSchedule(), Effect.runPromise);

    const stoppedStats = await pipe(
      retentionService.getStats(),
      Effect.runPromise
    );

    expect(stoppedStats.isRunning).toBe(false);
  });

  it("should update retention policy dynamically", async () => {
    const newPolicy: RetentionPolicy = {
      maxAge: Duration.minutes(10),
      maxCount: 25,
      cleanupInterval: Duration.seconds(2),
    };

    await pipe(retentionService.updatePolicy(newPolicy), Effect.runPromise);

    // Add metrics to test new policy
    const metrics = Array.from({ length: 40 }, (_, i) =>
      createTestMetric(`metric.${i}`, i)
    );

    await pipe(mockMetricStore.recordMetrics(metrics), Effect.runPromise);

    const cleanupResult = await pipe(
      retentionService.runCleanupOnce(),
      Effect.runPromise
    );

    expect(cleanupResult).toBe(15); // Should remove 15 metrics (40 - 25)
  });
});

describe("Storage Backend Switching", () => {
  const createTestMetric = (name: string, value: number): Metric => ({
    id: `test-${Date.now()}-${Math.random()}`,
    name: createMetricName(name),
    value: createNumericValue(value),
    type: "gauge",
    labels: {},
    timestamp: new Date(),
  });

  it("should maintain data consistency when switching backends", async () => {
    const config: StorageConfiguration = {
      maxMetrics: 100,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: 50,
        cleanupInterval: Duration.minutes(5),
      },
      storageBackend: "in-memory" as const,
      enableCircularBuffer: true,
    };

    // Create initial store with in-memory backend
    const inMemoryBackend = StorageBackendFactory.createInMemory(100);
    const store1 = new EnhancedMetricStoreImpl(inMemoryBackend, config);

    // Add some metrics
    const metrics = [
      createTestMetric("test.metric.1", 100),
      createTestMetric("test.metric.2", 200),
    ];

    await pipe(store1.recordMetrics(metrics), Effect.runPromise);

    // Retrieve metrics from first store
    const originalMetrics = await pipe(
      store1.getMetrics({}),
      Effect.runPromise
    );

    expect(originalMetrics).toHaveLength(2);

    // Create new store with different backend (simulating backend switch)
    const newInMemoryBackend = StorageBackendFactory.createInMemory(100);
    const store2 = new EnhancedMetricStoreImpl(newInMemoryBackend, config);

    // Migrate data (in real scenario, this would be handled by migration logic)
    await pipe(store2.recordMetrics(originalMetrics), Effect.runPromise);

    // Verify data consistency
    const migratedMetrics = await pipe(
      store2.getMetrics({}),
      Effect.runPromise
    );

    expect(migratedMetrics).toHaveLength(2);
    expect(migratedMetrics[0]?.name).toBe(originalMetrics[0]?.name);
    expect(migratedMetrics[1]?.name).toBe(originalMetrics[1]?.name);
  });

  it("should handle external storage backend configuration", () => {
    const externalConfig = {
      url: "http://localhost:8080/metrics",
      timeout: 5000,
      retryAttempts: 3,
      batchSize: 100,
    };

    const externalBackend =
      StorageBackendFactory.createExternal(externalConfig);
    expect(externalBackend).toBeInstanceOf(ExternalStorageBackend);
  });

  it("should support hybrid storage backend", () => {
    const externalConfig = {
      url: "http://localhost:8080/metrics",
      timeout: 5000,
      retryAttempts: 3,
      batchSize: 100,
    };

    const hybridBackend = StorageBackendFactory.createHybrid(
      100, // in-memory capacity
      externalConfig,
      30000 // sync interval
    );

    expect(hybridBackend).toBeInstanceOf(HybridStorageBackend);
  });

  it("should create backend from configuration", () => {
    const inMemoryConfig: StorageConfiguration = {
      maxMetrics: 1000,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: 500,
        cleanupInterval: Duration.minutes(10),
      },
      storageBackend: "in-memory" as const,
      enableCircularBuffer: true,
    };

    const backend = StorageBackendFactory.fromConfiguration(inMemoryConfig);
    expect(backend).toBeInstanceOf(InMemoryStorageBackend);

    const externalConfig: StorageConfiguration = {
      maxMetrics: 1000,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: 500,
        cleanupInterval: Duration.minutes(10),
      },
      storageBackend: "external" as const,
      enableCircularBuffer: true,
      externalStorageUrl: "http://localhost:8080/metrics",
    };

    const externalBackend =
      StorageBackendFactory.fromConfiguration(externalConfig);
    expect(externalBackend).toBeInstanceOf(ExternalStorageBackend);
  });

  it("should handle backend switching errors gracefully", () => {
    const invalidConfig: StorageConfiguration = {
      maxMetrics: 1000,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: 500,
        cleanupInterval: Duration.minutes(10),
      },
      storageBackend: "external" as const,
      enableCircularBuffer: true,
      // Missing externalStorageUrl
    };

    expect(() => {
      StorageBackendFactory.fromConfiguration(invalidConfig);
    }).toThrow("External storage URL is required for external backend");
  });
});

describe("Data Consistency Tests", () => {
  const createTestMetric = (
    name: string,
    value: number,
    timestamp?: Date
  ): Metric => ({
    id: `test-${Date.now()}-${Math.random()}`,
    name: createMetricName(name),
    value: createNumericValue(value),
    type: "gauge",
    labels: {},
    timestamp: timestamp || new Date(),
  });

  it("should maintain data integrity during concurrent operations", async () => {
    const backend = new InMemoryStorageBackend(1000);
    const config: StorageConfiguration = {
      maxMetrics: 1000,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: 500,
        cleanupInterval: Duration.minutes(10),
      },
      storageBackend: "in-memory" as const,
      enableCircularBuffer: true,
    };

    const store = new EnhancedMetricStoreImpl(backend, config);

    // Simulate concurrent writes
    const concurrentWrites = Array.from({ length: 10 }, (_, i) =>
      pipe(
        store.recordMetrics([
          createTestMetric(`concurrent.metric.${i}.1`, i * 10),
          createTestMetric(`concurrent.metric.${i}.2`, i * 10 + 1),
        ]),
        Effect.runPromise
      )
    );

    await Promise.all(concurrentWrites);

    // Verify all metrics were stored
    const allMetrics = await pipe(store.getMetrics({}), Effect.runPromise);

    expect(allMetrics).toHaveLength(20); // 10 * 2 metrics
  });

  it("should handle storage overflow correctly", async () => {
    const smallCapacity = 5;
    const backend = new InMemoryStorageBackend(smallCapacity);
    const config: StorageConfiguration = {
      maxMetrics: smallCapacity,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: smallCapacity,
        cleanupInterval: Duration.minutes(10),
      },
      storageBackend: "in-memory" as const,
      enableCircularBuffer: true,
    };

    const store = new EnhancedMetricStoreImpl(backend, config);

    // Add more metrics than capacity
    const metrics = Array.from({ length: 10 }, (_, i) =>
      createTestMetric(`overflow.metric.${i}`, i)
    );

    await pipe(store.recordMetrics(metrics), Effect.runPromise);

    // Should only contain the last 'capacity' metrics due to circular buffer
    const storedMetrics = await pipe(store.getMetrics({}), Effect.runPromise);

    expect(storedMetrics).toHaveLength(smallCapacity);

    // Verify it contains the last metrics added
    const metricNames = storedMetrics.map((m) => m.name);
    expect(metricNames).toContain("overflow.metric.5");
    expect(metricNames).toContain("overflow.metric.9");
  });

  it("should preserve metric ordering", async () => {
    const backend = new InMemoryStorageBackend(100);
    const config: StorageConfiguration = {
      maxMetrics: 100,
      retentionPolicy: {
        maxAge: Duration.hours(1),
        maxCount: 50,
        cleanupInterval: Duration.minutes(10),
      },
      storageBackend: "in-memory" as const,
      enableCircularBuffer: true,
    };

    const store = new EnhancedMetricStoreImpl(backend, config);

    // Add metrics with specific timestamps
    const baseTime = new Date();
    const metrics = Array.from({ length: 5 }, (_, i) =>
      createTestMetric(
        `ordered.metric.${i}`,
        i,
        new Date(baseTime.getTime() + i * 1000)
      )
    );

    await pipe(store.recordMetrics(metrics), Effect.runPromise);

    const retrievedMetrics = await pipe(
      store.getMetrics({}),
      Effect.runPromise
    );

    // Verify chronological order is maintained
    for (let i = 1; i < retrievedMetrics.length; i++) {
      const prev = retrievedMetrics[i - 1];
      const curr = retrievedMetrics[i];
      if (prev && curr) {
        expect(prev.timestamp.getTime()).toBeLessThanOrEqual(
          curr.timestamp.getTime()
        );
      }
    }
  });
});
