/**
 * @fileoverview Layer Composition Exports
 *
 * This module exports all layer compositions for the AV-Daily application.
 * It provides a centralized location for accessing all layers needed for
 * dependency injection and runtime configuration.
 *
 * ## Layer Hierarchy:
 * 1. Infrastructure Layer - External services and repositories
 * 2. Application Layer - Use cases and business logic
 * 3. API Layer - Controllers and middleware
 * 4. Main Layer - Complete application composition
 *
 * ## Usage:
 * ```typescript
 * import { MainLayer, createAppRuntime } from "@host/api/layers";
 *
 * // Create runtime
 * const runtime = await createAppRuntime();
 *
 * // Use in application
 * const result = await runtime.runPromise(myEffect);
 * ```
 */

// Infrastructure Layer exports
export {
  ProdInfrastructureLayer,
  TestInfrastructureLayer,
  DatabaseRepositoryLayer,
  DevInfrastructureLayer,
  InfrastructureLayer,
  PaymentGatewayLayer,
  NotificationLayer,
  CachingLayer,
} from "./infrastructure-layer.js";

// Application Layer exports
export {
  ApplicationLayerWithCrossCutting,
  ContributionUseCasesLayer,
  AnalyticsUseCasesLayer,
  ProdApplicationLayer,
  TestApplicationLayer,
  SavingsUseCasesLayer,
  DevApplicationLayer,
  WalletUseCasesLayer,
  ApplicationLayer,
  AllUseCasesLayer,
  LoggingLayer,
  MetricsLayer,
} from "./application-layer.js";

// API Layer exports
export {
  ResponseTransformationLayer,
  RequestValidationLayer,
  ApiLayerWithMonitoring,
  ControllersLayer,
  MiddlewareLayer,
  MinimalApiLayer,
  ProdApiLayer,
  TestApiLayer,
  DevApiLayer,
  ApiLayer,
} from "./api-layer.js";

// Config Layer exports
export {
  ProdAppConfigEffect,
  TestAppConfigEffect,
  DevAppConfigEffect,
  AppConfigEffect,
} from "./config-layer.js";

// Main Layer exports
export {
  type AppRuntime,
  setupGracefulShutdownHandlers,
  initializeApplication,
  gracefulShutdown,
  createAppRuntime,
  ProdMainLayer,
  TestMainLayer,
  DevMainLayer,
  healthCheck,
  MainLayer,
  AppConfig,
  shutdown,
  startup,
} from "./main-layer.js";
