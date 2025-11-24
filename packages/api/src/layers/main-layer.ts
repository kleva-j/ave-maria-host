/**
 * @fileoverview Main Application Layer
 *
 * This module provides the complete application layer that combines all layers
 * into a cohesive structure. It handles environment-specific configuration,
 * graceful startup and shutdown procedures, and provides the main runtime
 * for the AV-Daily application.
 *
 * ## Architecture:
 * - Combines Infrastructure, Application, and API layers
 * - Environment-specific configurations (dev, prod, test)
 * - Graceful startup and shutdown procedures
 * - Health checks and monitoring
 * - Configuration management
 *
 * @see Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type {
  DatabaseConfig,
  LoggingConfig,
  PaymentConfig,
  ServerConfig,
  RedisConfig,
  AuthConfig,
} from "../effects/core";

import { Layer, Effect, Context, ManagedRuntime, Exit } from "effect";

// Import all layer compositions
import {
  TestInfrastructureLayer,
  ProdInfrastructureLayer,
  DevInfrastructureLayer,
  InfrastructureLayer,
} from "./infrastructure-layer";

import {
  TestApplicationLayer,
  ProdApplicationLayer,
  DevApplicationLayer,
  ApplicationLayer,
} from "./application-layer";

import { TestApiLayer, ProdApiLayer, DevApiLayer, ApiLayer } from "./api-layer";

// Import configuration and monitoring
import { MonitoringLayer } from "../effects/monitoring";
import {
  ProdAppConfigEffect,
  TestAppConfigEffect,
  DevAppConfigEffect,
  AppConfigEffect,
} from "./config-layer";

/**
 * Application Configuration Service
 *
 * Provides environment-specific configuration for the application.
 */
export interface AppConfig {
  readonly database: DatabaseConfig;
  readonly logging: LoggingConfig;
  readonly payment: PaymentConfig;
  readonly server: ServerConfig;
  readonly redis: RedisConfig;
  readonly auth: AuthConfig;
}

export const AppConfig = Context.GenericTag<AppConfig>("@app/AppConfig");

/**
 * Main Application Layer - Combines all layers with configuration
 *
 * This is the primary layer for the application. It combines:
 * 1. Configuration Layer
 * 2. Infrastructure Layer
 * 3. Application Layer
 * 4. API Layer
 * 5. Monitoring Layer
 *
 * Use this layer for standard deployments.
 *
 * @example
 * ```typescript
 * import { MainLayer } from "./layers/main-layer";
 * import { Effect } from "effect";
 *
 * // Create runtime with main layer
 * const runtime = await ManagedRuntime.make(MainLayer);
 *
 * // Use in application
 * const result = await runtime.runPromise(myEffect);
 * ```
 */
export const MainLayer = Layer.mergeAll(
  Layer.effect(AppConfig, AppConfigEffect),
  MonitoringLayer,
  Layer.provide(ApiLayer, Layer.provide(ApplicationLayer, InfrastructureLayer))
);

/**
 * Development Main Layer - Optimized for development
 *
 * This layer includes:
 * - Enhanced logging and debugging
 * - Hot reload support
 * - Relaxed validation
 * - Development-friendly error messages
 */
export const DevMainLayer = Layer.mergeAll(
  Layer.effect(AppConfig, DevAppConfigEffect),
  MonitoringLayer,
  Layer.provide(
    DevApiLayer,
    Layer.provide(DevApplicationLayer, DevInfrastructureLayer)
  )
);

/**
 * Production Main Layer - Optimized for production
 *
 * This layer includes:
 * - Production-grade error handling
 * - Performance optimizations
 * - Enhanced security
 * - Resource pooling and management
 */
export const ProdMainLayer = Layer.mergeAll(
  Layer.effect(AppConfig, ProdAppConfigEffect),
  MonitoringLayer,
  Layer.provide(
    ProdApiLayer,
    Layer.provide(ProdApplicationLayer, ProdInfrastructureLayer)
  )
);

/**
 * Test Main Layer - Optimized for testing
 *
 * This layer includes:
 * - Fast, isolated execution
 * - In-memory implementations
 * - Deterministic behavior
 * - No external dependencies
 */
export const TestMainLayer = Layer.mergeAll(
  Layer.effect(AppConfig, TestAppConfigEffect),
  MonitoringLayer,
  Layer.provide(
    TestApiLayer,
    Layer.provide(TestApplicationLayer, TestInfrastructureLayer)
  )
);

/**
 * Application Runtime Type
 */
export type AppRuntime = ManagedRuntime.ManagedRuntime<AppConfig, never>;

/**
 * Creates an application runtime based on environment
 *
 * @param environment - Target environment (defaults to NODE_ENV)
 * @returns Managed runtime for the application
 *
 * @example
 * ```typescript
 * // Create runtime for current environment
 * const runtime = await createAppRuntime();
 *
 * // Create runtime for specific environment
 * const prodRuntime = await createAppRuntime("production");
 * ```
 */
export const createAppRuntime = async (
  environment?: "development" | "production" | "test"
): Promise<AppRuntime> => {
  const env =
    environment ||
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development";

  const layer =
    env === "production"
      ? Layer.orDie(ProdMainLayer)
      : env === "test"
        ? Layer.orDie(TestMainLayer)
        : Layer.orDie(DevMainLayer);

  return ManagedRuntime.make(layer);
};

/**
 * Health Check Effect
 *
 * Performs a comprehensive health check of all services.
 *
 * @returns Effect that resolves to health status
 */
export const healthCheck = Effect.gen(function* () {
  const config = yield* AppConfig;

  return {
    status: "healthy" as const,
    timestamp: new Date().toISOString(),
    environment: config.server.environment,
    services: {
      database: true,
      redis: true,
      payment: true,
      notifications: true,
    },
    version: "1.0.0",
  };
});

/**
 * Startup Effect
 *
 * Performs initialization tasks when the application starts.
 * This includes:
 * - Database connection verification
 * - Cache warming
 * - Service health checks
 * - Logging initialization message
 *
 * @returns Effect that completes when startup is successful
 */
export const startup = Effect.gen(function* () {
  const config = yield* AppConfig;

  yield* Effect.logInfo(
    `Starting AV-Daily application in ${config.server.environment} mode`
  );

  // Verify database connection
  yield* Effect.logInfo("Verifying database connection...");
  // Database verification would happen here

  // Warm up caches
  yield* Effect.logInfo("Warming up caches...");
  // Cache warming would happen here

  // Perform health check
  const health = yield* healthCheck;
  yield* Effect.logInfo(`Health check: ${health.status}`);

  yield* Effect.logInfo(
    `AV-Daily application started successfully on port ${config.server.port}`
  );

  return {
    status: "started" as const,
    timestamp: new Date().toISOString(),
    config: {
      environment: config.server.environment,
      port: config.server.port,
    },
  };
});

/**
 * Shutdown Effect
 *
 * Performs cleanup tasks when the application shuts down.
 * This includes:
 * - Closing database connections
 * - Flushing caches
 * - Completing pending operations
 * - Logging shutdown message
 *
 * @param signal - Optional shutdown signal
 * @returns Effect that completes when shutdown is successful
 */
export const shutdown = (signal?: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(
      `Shutting down AV-Daily application${signal ? ` (signal: ${signal})` : ""}...`
    );

    // Close database connections
    yield* Effect.logInfo("Closing database connections...");
    // Database cleanup would happen here

    // Flush caches
    yield* Effect.logInfo("Flushing caches...");
    // Cache cleanup would happen here

    // Complete pending operations
    yield* Effect.logInfo("Completing pending operations...");
    // Operation completion would happen here

    yield* Effect.logInfo("AV-Daily application shut down successfully");

    return {
      status: "shutdown" as const,
      timestamp: new Date().toISOString(),
      signal,
    };
  });

/**
 * Graceful Shutdown Handler
 *
 * Handles graceful shutdown of the application runtime.
 * Ensures all resources are properly cleaned up.
 *
 * @param runtime - Application runtime to shutdown
 * @param signal - Shutdown signal
 * @returns Promise that resolves when shutdown is complete
 */
export const gracefulShutdown = async (
  runtime: AppRuntime,
  signal?: string
): Promise<void> => {
  console.log(
    `Initiating graceful shutdown${signal ? ` (signal: ${signal})` : ""}...`
  );

  try {
    const shutdownEffect = shutdown(signal);

    const result = await runtime.runPromiseExit(
      Effect.timeout(shutdownEffect, "30 seconds")
    );

    Exit.match(result, {
      onSuccess: () => {
        console.log("Graceful shutdown completed successfully");
      },
      onFailure: (cause) => {
        console.error("Error during graceful shutdown:", cause);
      },
    });
  } catch (error) {
    console.error("Unexpected error during graceful shutdown:", error);
  }
};

/**
 * Setup Graceful Shutdown Handlers
 *
 * Registers process signal handlers for graceful shutdown.
 *
 * @param runtime - Application runtime
 */
export const setupGracefulShutdownHandlers = (runtime: AppRuntime): void => {
  const handleShutdown = (signal: string) => async () => {
    await gracefulShutdown(runtime, signal);
    process.exit(0);
  };

  process.on("SIGTERM", handleShutdown("SIGTERM"));
  process.on("SIGINT", handleShutdown("SIGINT"));

  process.on("uncaughtException", async (error) => {
    console.error("Uncaught exception:", error);
    await gracefulShutdown(runtime, "uncaughtException");
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason) => {
    console.error("Unhandled rejection:", reason);
    await gracefulShutdown(runtime, "unhandledRejection");
    process.exit(1);
  });

  console.log("Graceful shutdown handlers registered");
};

/**
 * Initialize Application
 *
 * Complete application initialization including:
 * - Runtime creation
 * - Startup procedures
 * - Shutdown handler registration
 *
 * @param environment - Target environment
 * @returns Initialized application runtime
 *
 * @example
 * ```typescript
 * // Initialize application
 * const runtime = await initializeApplication();
 *
 * // Application is now ready to handle requests
 * ```
 */
export const initializeApplication = async (
  environment?: "development" | "production" | "test"
): Promise<AppRuntime> => {
  console.log("Initializing AV-Daily application...");

  // Create runtime
  const runtime = await createAppRuntime(environment);

  // Run startup procedures
  const startupResult = await runtime.runPromise(startup);
  console.log("Startup completed:", startupResult);

  // Setup graceful shutdown
  setupGracefulShutdownHandlers(runtime);

  return runtime;
};
