/**
 * @fileoverview Effect.ts Service Layer Composition (Server-Specific)
 *
 * This module re-exports layer composition utilities from the API package
 * and provides server-specific configuration. For the complete AV-Daily
 * application layer with all use cases and controllers, use the exports
 * from @host/api.
 *
 * ## Migration Note:
 * This file now delegates to the centralized layer composition in the API package.
 * All layer composition logic has been consolidated in packages/api/src/layers/
 *
 * @see {@link packages/api/src/layers/main-layer.ts} for the main implementation
 */

import { Layers } from "@host/api";

// Re-export the complete layer composition from API package
export const AppLayer = Layers.MainLayer;
export const DevAppLayer = Layers.DevMainLayer;
export const ProdAppLayer = Layers.ProdMainLayer;
export const TestAppLayer = Layers.TestMainLayer;

// Re-export runtime utilities
export const createAppRuntime = Layers.createAppRuntime;
export const gracefulShutdown = Layers.gracefulShutdown;
export const setupGracefulShutdownHandlers = Layers.setupGracefulShutdownHandlers;
export const initializeApplication = Layers.initializeApplication;

// Re-export effects
export const healthCheck = Layers.healthCheck;
export const startup = Layers.startup;
export const shutdown = Layers.shutdown;

// Re-export types
export type AppRuntime = Layers.AppRuntime;
export type AppConfig = Layers.AppConfig;

// Re-export Layers namespace for direct access
export { Layers };

/**
 * Type helper for effects that require all app services
 * 
 * @deprecated Use the types from @host/api instead
 */
export type AppEffect<A, E = never> = import("effect").Effect.Effect<A, E, AppConfig>;
