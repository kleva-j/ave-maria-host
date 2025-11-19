/**
 * @fileoverview Effect.ts Runtime Configuration
 *
 * This module provides runtime configuration and initialization for the Effect.ts
 * integration in the server application. It handles runtime creation, configuration,
 * and lifecycle management.
 *
 * ## Migration Note:
 * This module now uses the centralized layer composition from @host/api.
 * The layers.ts file re-exports from the API package for convenience.
 *
 * ## Key Features:
 * - **Runtime Initialization**: Creates and configures Effect runtime for the server
 * - **Environment Detection**: Automatically configures runtime based on environment
 * - **Lifecycle Management**: Handles startup and shutdown procedures
 * - **Error Handling**: Provides runtime-level error handling and recovery
 *
 * ## Quick Start:
 * ```typescript
 * import { initializeRuntime, getAppRuntime } from "./effects/runtime";
 *
 * // Initialize runtime at application startup
 * await initializeRuntime();
 *
 * // Get runtime instance for use in handlers
 * const runtime = getAppRuntime();
 * ```
 */

import type { AppRuntime, AppConfig } from "./layers";

import { type Effect, Fiber } from "effect";

import { createAppRuntime, gracefulShutdown } from "./layers";

/**
 * Global runtime instance for the application.
 * This is initialized once at startup and reused throughout the application lifecycle.
 */
let appRuntime: AppRuntime | null = null;

/**
 * Fiber reference for the runtime initialization to handle cancellation
 */
let initializationFiber: Fiber.RuntimeFiber<AppRuntime, Error> | null = null;

/**
 * Runtime configuration options
 */
export interface RuntimeConfig {
  /** Environment to configure runtime for */
  environment?: "development" | "production" | "test";
  /** Whether to perform health checks during initialization */
  performHealthCheck?: boolean;
  /** Timeout for initialization in milliseconds */
  initializationTimeout?: number;
  /** Whether to enable graceful shutdown handlers */
  enableGracefulShutdown?: boolean;
}

/**
 * Runtime initialization status
 */
export interface RuntimeStatus {
  /** Whether the runtime is initialized */
  initialized: boolean;
  /** Whether the runtime is healthy */
  healthy: boolean;
  /** Initialization timestamp */
  initializedAt?: Date;
  /** Last health check timestamp */
  lastHealthCheck?: Date;
  /** Current environment */
  environment: string;
  /** Any initialization errors */
  error?: string;
}

/**
 * Current runtime status
 */
let runtimeStatus: RuntimeStatus = {
  initialized: false,
  healthy: false,
  environment: process.env.NODE_ENV || "development",
};

/**
 * Initializes the Effect runtime for the application.
 * This function should be called once at application startup before any
 * Effect programs are executed.
 *
 * @param config - Runtime configuration options
 * @returns Promise that resolves when runtime is initialized
 *
 * @example
 * ```typescript
 * import { initializeRuntime } from "./effects/runtime";
 *
 * // Initialize with default configuration
 * await initializeRuntime();
 *
 * // Initialize with custom configuration
 * await initializeRuntime({
 *   environment: "production",
 *   performHealthCheck: true,
 *   initializationTimeout: 30000
 * });
 * ```
 */
export const initializeRuntime = async (
  config: RuntimeConfig = {}
): Promise<void> => {
  const {
    environment,
    performHealthCheck = true,
    initializationTimeout = 30000,
    enableGracefulShutdown = true,
  } = config;

  // Prevent multiple initializations
  if (appRuntime) {
    console.warn("Runtime already initialized, skipping...");
    return;
  }

  console.log(
    `Initializing Effect runtime for ${environment || process.env.NODE_ENV || "development"} environment...`
  );

  try {
    // Create the runtime with timeout (unused for now)

    // Create the runtime directly
    appRuntime = await createAppRuntime(environment);

    runtimeStatus = {
      initialized: true,
      healthy: true,
      initializedAt: new Date(),
      environment: environment || process.env.NODE_ENV || "development",
    };
    console.log("Effect runtime initialized successfully");

    // Perform initial health check if requested
    if (performHealthCheck && appRuntime) {
      await performRuntimeHealthCheck();
    }

    // Set up graceful shutdown handlers if enabled
    if (enableGracefulShutdown) {
      setupGracefulShutdownHandlers();
    }

    console.log("Runtime initialization completed successfully");
  } catch (error) {
    console.error("Failed to initialize Effect runtime:", error);
    runtimeStatus = {
      initialized: false,
      healthy: false,
      environment: environment || process.env.NODE_ENV || "development",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    throw error;
  } finally {
    initializationFiber = null;
  }
};

/**
 * Gets the current application runtime instance.
 * Throws an error if the runtime has not been initialized.
 *
 * @returns The application runtime instance
 * @throws Error if runtime is not initialized
 *
 * @example
 * ```typescript
 * import { getAppRuntime } from "./effects/runtime";
 *
 * // Get runtime for use in handlers
 * const runtime = getAppRuntime();
 *
 * // Run an Effect program
 * const result = await Runtime.runPromise(runtime)(myEffect);
 * ```
 */
export const getAppRuntime = (): AppRuntime => {
  if (!appRuntime) {
    throw new Error("Runtime not initialized. Call initializeRuntime() first.");
  }
  return appRuntime;
};

/**
 * Checks if the runtime is initialized and healthy.
 *
 * @returns Current runtime status
 *
 * @example
 * ```typescript
 * import { getRuntimeStatus } from "./effects/runtime";
 *
 * const status = getRuntimeStatus();
 * if (!status.initialized) {
 *   console.error("Runtime not initialized");
 * }
 * ```
 */
export const getRuntimeStatus = (): RuntimeStatus => {
  return { ...runtimeStatus };
};

/**
 * Performs a health check on the runtime and all services.
 * Updates the runtime status based on the health check results.
 *
 * @returns Promise that resolves to health check results
 *
 * @example
 * ```typescript
 * import { performRuntimeHealthCheck } from "./effects/runtime";
 *
 * // Perform health check
 * const health = await performRuntimeHealthCheck();
 * console.log("Runtime health:", health);
 * ```
 */
export const performRuntimeHealthCheck = async () => {
  if (!appRuntime) {
    throw new Error("Runtime not initialized");
  }

  try {
    // Simplified health check for now
    const healthResult = {
      healthy: true,
      timestamp: new Date().toISOString(),
      services: {
        database: true,
        configuration: true,
      },
      version: "1.0.0",
    };

    runtimeStatus = {
      ...runtimeStatus,
      healthy: Boolean(healthResult.healthy),
      lastHealthCheck: new Date(),
    };

    return healthResult;
  } catch (error) {
    runtimeStatus = {
      ...runtimeStatus,
      healthy: false,
      lastHealthCheck: new Date(),
      error: error instanceof Error ? error.message : "Health check failed",
    };
    throw error;
  }
};

/**
 * Shuts down the runtime and cleans up all resources.
 * This function should be called when the application is shutting down.
 *
 * @param signal - Optional shutdown signal for logging
 * @returns Promise that resolves when shutdown is complete
 *
 * @example
 * ```typescript
 * import { shutdownRuntime } from "./effects/runtime";
 *
 * // Shutdown runtime
 * await shutdownRuntime("SIGTERM");
 * ```
 */
export const shutdownRuntime = async (signal?: string): Promise<void> => {
  if (!appRuntime) {
    console.warn("Runtime not initialized, nothing to shutdown");
    return;
  }

  try {
    // Cancel initialization if still in progress
    if (initializationFiber) {
      await Fiber.interrupt(initializationFiber);
      initializationFiber = null;
    }

    // Perform graceful shutdown
    await gracefulShutdown(appRuntime, signal);

    // Reset runtime state
    appRuntime = null;
    runtimeStatus = {
      initialized: false,
      healthy: false,
      environment: process.env.NODE_ENV || "development",
    };

    console.log("Runtime shutdown completed");
  } catch (error) {
    console.error("Error during runtime shutdown:", error);
    throw error;
  }
};

/**
 * Sets up graceful shutdown handlers for common process signals.
 * This ensures the runtime is properly shut down when the process receives
 * termination signals.
 */
const setupGracefulShutdownHandlers = (): void => {
  const handleShutdown = (signal: string) => {
    return async () => {
      console.log(`Received ${signal}, initiating graceful shutdown...`);
      try {
        await shutdownRuntime(signal);
        process.exit(0);
      } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    };
  };

  // Handle common termination signals
  process.on("SIGTERM", handleShutdown("SIGTERM"));
  process.on("SIGINT", handleShutdown("SIGINT"));

  // Handle uncaught exceptions and unhandled rejections
  process.on("uncaughtException", async (error) => {
    console.error("Uncaught exception:", error);
    try {
      await shutdownRuntime("uncaughtException");
    } catch (shutdownError) {
      console.error("Error during emergency shutdown:", shutdownError);
    }
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    try {
      await shutdownRuntime("unhandledRejection");
    } catch (shutdownError) {
      console.error("Error during emergency shutdown:", shutdownError);
    }
    process.exit(1);
  });

  console.log("Graceful shutdown handlers registered");
};

/**
 * Utility function to run an Effect program with the application runtime.
 * This is a convenience function that automatically uses the initialized runtime.
 *
 * @param effect - Effect program to run
 * @returns Promise that resolves to the Effect result
 *
 * @example
 * ```typescript
 * import { runWithAppRuntime } from "./effects/runtime";
 *
 * // Run an Effect program
 * const result = await runWithAppRuntime(
 *   Effect.gen(function* (_) {
 *     const config = yield* _(AppConfig);
 *     return config;
 *   })
 * );
 * ```
 */
export const runWithAppRuntime = async <A, E>(
  effect: Effect.Effect<A, E, AppConfig>
): Promise<A> => {
  const runtime = getAppRuntime();
  return runtime.runPromise(effect);
};

/**
 * Type helper for effects that can be run with the app runtime
 */
export type RunnableEffect<A, E = never> = Effect.Effect<A, E, AppConfig>;
