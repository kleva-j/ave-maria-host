/**
 * @fileoverview Effect.ts Integration Entry Point
 *
 * This module provides the main entry point for Effect.ts integration in the server application.
 * It re-exports all the key components needed for Effect-based development.
 *
 * ## Quick Start:
 * ```typescript
 * import {
 *   effectMiddleware,
 *   createEffectHandler,
 *   AppLayer,
 *   initializeRuntime
 * } from "./effects";
 *
 * // Set up Effect middleware
 * app.use("*", effectMiddleware(AppLayer));
 *
 * // Create Effect-based handlers
 * app.get("/users", createEffectHandler(() => getUsersEffect));
 * ```
 */

// Middleware and handler utilities
export * from "./hono-middleware";

// Service layer composition
export * from "./layers";

// Runtime configuration and management
export * from "./runtime";
