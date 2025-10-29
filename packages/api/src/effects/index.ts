/**
 * @fileoverview Effect.ts Integration Library
 *
 * This module provides a comprehensive foundation for using Effect.ts in the Better-T-Stack application.
 * It includes structured error handling, retry mechanisms, utility functions, and configuration management.
 *
 * ## Key Features:
 * - **Structured Error Handling**: Tagged errors with detailed context
 * - **Retry Mechanisms**: Configurable retry logic with exponential backoff
 * - **Fallback Strategies**: Graceful degradation patterns
 * - **Promise Integration**: Seamless migration from Promise-based code
 * - **Utility Functions**: Common patterns and helpers
 * - **Configuration Management**: Type-safe configuration interfaces
 *
 * ## Quick Start:
 * ```typescript
 * import { Effect, pipe, withRetry, withFallback, fromPromise } from "@host/api/effects";
 *
 * // Convert Promise to Effect with retry and fallback
 * const fetchUser = (id: string) => pipe(
 *   fromPromise(() => fetch(`/api/users/${id}`).then(r => r.json())),
 *   withRetry({ maxRetries: 3 }),
 *   withFallback({ id, name: "Unknown User" })
 * );
 * ```
 *
 * @see {@link ./README.md} for comprehensive documentation
 * @see {@link ./UTILITIES.md} for utility function reference
 * @see {@link ./ERROR_REFERENCE.md} for error types and handling
 * @see {@link ./SERVICES.md} for service interfaces and patterns
 * @see {@link ./INTEGRATION_PATTERNS.md} for Hono and oRPC integration
 * @see {@link ./BEST_PRACTICES.md} for best practices and troubleshooting
 */

// Core types and configuration
export * from "./core";

// Error types and hierarchy
export * from "./errors";

// Error recovery patterns
export * from "./recovery";

// Utility functions and helpers
export * from "./utils";

// The application now uses native @effect/rpc implementation

// Re-export commonly used Effect types for convenience
export { Effect, Context, Layer, Schedule, Duration, pipe } from "effect";
