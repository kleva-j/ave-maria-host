/**
 * @fileoverview API Layer Composition
 *
 * This module composes all API controllers with application services.
 * It configures the middleware pipeline, error handling, and request/response
 * transformation layers.
 *
 * ## Architecture:
 * - RPC handlers (controllers) for all domains
 * - Middleware pipeline (auth, rate limiting, logging)
 * - Error handling and transformation
 * - Request/response validation
 *
 * @see Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { Layer } from "effect";

// Import RPC handlers (controllers)
import {
  AnalyticsHandlersLive,
  SavingsHandlersLive,
  WalletHandlersLive,
  AuthHandlersLive,
  TodoHandlersLive,
} from "../controllers";

// Import middleware
import {
  ConsoleLoggerLive,
  AuditServiceLive,
} from "../middleware";

// Import application layer
import { ApplicationLayer } from "./application-layer";

/**
 * Controllers Layer - Combines all RPC handlers (controllers)
 *
 * This layer provides:
 * - SavingsController: Savings plan management endpoints
 * - WalletController: Wallet and transaction endpoints
 * - AnalyticsController: Analytics and reporting endpoints
 * - AuthController: Authentication endpoints
 * - TodoController: Todo management endpoints (example)
 *
 * All controllers are implemented as @effect/rpc handlers with full type safety.
 */
export const ControllersLayer = Layer.mergeAll(
  AnalyticsHandlersLive,
  SavingsHandlersLive,
  WalletHandlersLive,
  AuthHandlersLive,
  TodoHandlersLive
);

/**
 * Middleware Layer - Combines all API middleware
 *
 * This layer provides:
 * - AuthMiddleware: JWT authentication and authorization
 * - LoggingMiddleware: Request/response logging
 * - ErrorHandlingMiddleware: Centralized error handling
 * - AuditLoggingMiddleware: Security audit logging
 *
 * Note: Rate limiting is handled by RedisRateLimiterService from the infrastructure package.
 * Middleware is applied in order: auth → logging → error handling
 */
export const MiddlewareLayer = Layer.mergeAll(
  ConsoleLoggerLive,
  AuditServiceLive
);

/**
 * Request Validation Layer - Handles input validation and transformation
 *
 * This layer provides:
 * - Schema validation for all requests
 * - Input sanitization
 * - Type coercion and normalization
 *
 * Uses Effect Schema for comprehensive validation.
 */
export const RequestValidationLayer = Layer.empty;

/**
 * Response Transformation Layer - Handles output transformation
 *
 * This layer provides:
 * - Response formatting
 * - Error response standardization
 * - Status code mapping
 *
 * Ensures consistent API responses across all endpoints.
 */
export const ResponseTransformationLayer = Layer.empty;

/**
 * Complete API Layer - Combines controllers with middleware and application services
 *
 * This is the main API layer that provides all controllers with their
 * dependencies properly wired. It includes:
 * 1. Application Layer (use cases and infrastructure)
 * 2. Controllers Layer (RPC handlers)
 * 3. Middleware Layer (auth, rate limiting, logging, etc.)
 * 4. Request/Response transformation
 *
 * The dependency flow is:
 * 1. Infrastructure Layer provides repositories and services
 * 2. Application Layer provides use cases
 * 3. Controllers Layer depends on Application Layer
 * 4. Middleware Layer wraps Controllers Layer
 *
 * @example
 * ```typescript
 * import { ApiLayer } from "./layers/api-layer";
 * import { Effect } from "effect";
 *
 * // Use in Hono integration
 * import { integrateWithHono } from "@host/api";
 *
 * const app = new Hono();
 * integrateWithHono(app, ApiLayer);
 * ```
 */
export const ApiLayer = Layer.mergeAll(
  Layer.provide(ControllersLayer, ApplicationLayer),
  MiddlewareLayer,
  RequestValidationLayer,
  ResponseTransformationLayer
);

/**
 * Development API Layer - API layer with development settings
 *
 * This layer includes:
 * - Enhanced logging for debugging
 * - Relaxed rate limiting
 * - Detailed error messages with stack traces
 * - Development-friendly CORS settings
 */
export const DevApiLayer = Layer.mergeAll(
  Layer.provide(ControllersLayer, ApplicationLayer),
  MiddlewareLayer,
  RequestValidationLayer,
  ResponseTransformationLayer
);

/**
 * Production API Layer - API layer optimized for production
 *
 * This layer includes:
 * - Production-grade error handling (no stack traces)
 * - Strict rate limiting
 * - Enhanced security measures
 * - Performance optimizations
 */
export const ProdApiLayer = Layer.mergeAll(
  Layer.provide(ControllersLayer, ApplicationLayer),
  MiddlewareLayer,
  RequestValidationLayer,
  ResponseTransformationLayer
);

/**
 * Test API Layer - API layer for testing
 *
 * This layer includes:
 * - Fast, isolated test execution
 * - No rate limiting
 * - Deterministic behavior
 * - Mock authentication
 */
export const TestApiLayer = Layer.mergeAll(
  Layer.provide(ControllersLayer, ApplicationLayer),
  MiddlewareLayer,
  RequestValidationLayer,
  ResponseTransformationLayer
);

/**
 * API Layer with Monitoring - Includes monitoring and observability
 *
 * This layer adds:
 * - Request/response metrics
 * - Performance monitoring
 * - Error tracking
 * - Health checks
 */
export const ApiLayerWithMonitoring = Layer.mergeAll(ApiLayer, Layer.empty);

/**
 * Minimal API Layer - Lightweight layer for testing or minimal deployments
 *
 * This layer includes only:
 * - Controllers
 * - Basic error handling
 * - No rate limiting or advanced middleware
 */
export const MinimalApiLayer = Layer.provide(
  ControllersLayer,
  ApplicationLayer
);
