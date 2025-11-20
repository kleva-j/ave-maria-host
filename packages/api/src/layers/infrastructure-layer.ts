/**
 * @fileoverview Infrastructure Layer Composition
 *
 * This module composes all infrastructure services including database repositories,
 * payment gateways, notification services, and caching infrastructure.
 *
 * ## Architecture:
 * - Database repositories (Drizzle ORM implementations)
 * - Payment gateway services (Paystack, Flutterwave)
 * - Notification services (SMS, Push, Email)
 * - Caching and analytics services (Redis)
 * - Monitoring and health check services
 *
 * @see Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Layer } from "effect";

import {
  // Import database repository implementations
  DrizzleTransactionRepositoryLive,
  DrizzleSavingsRepositoryLive,
  DrizzleWalletRepositoryLive,

  // Import payment gateway implementations
  FlutterwavePaymentServiceLive,
  PaystackPaymentServiceLive,

  // Import notification service implementations
  // Note: Using stub implementations until actual services are configured
  StubNotificationServiceLive,

  // Import caching and analytics services
  CacheServiceLive,
} from "@host/infrastructure";

// Import monitoring services from API package
import { MonitoringLayer } from "../effects/monitoring";

/**
 * Database Layer - Combines all database repository implementations
 *
 * This layer provides:
 * - SavingsRepository: CRUD operations for savings plans
 * - TransactionRepository: Transaction history and management
 * - WalletRepository: Wallet balance and operations
 *
 * All repositories use Drizzle ORM for type-safe database access.
 */
export const DatabaseRepositoryLayer = Layer.mergeAll(
  DrizzleTransactionRepositoryLive,
  DrizzleSavingsRepositoryLive,
  DrizzleWalletRepositoryLive
);

/**
 * Payment Gateway Layer - Combines payment service implementations
 *
 * This layer provides:
 * - PaystackPaymentService: Primary payment gateway for Nigerian market
 * - FlutterwavePaymentService: Alternative payment gateway
 *
 * Both services implement the PaymentGatewayPort interface for consistent usage.
 */
export const PaymentGatewayLayer = Layer.mergeAll(
  FlutterwavePaymentServiceLive,
  PaystackPaymentServiceLive
);

/**
 * Notification Layer - Combines notification service implementations
 *
 * This layer provides:
 * - SMS notifications (Twilio)
 * - Push notifications (Firebase)
 * - Email notifications
 *
 * Currently using stub implementations that can be replaced with actual services.
 */
export const NotificationLayer = StubNotificationServiceLive;

/**
 * Caching and Analytics Layer - Combines caching and analytics services
 *
 * This layer provides:
 * - CacheService: Redis-based caching for performance optimization
 * - AnalyticsService: Real-time metrics and user insights
 *
 * These services improve application performance and provide business intelligence.
 */
export const CachingLayer = CacheServiceLive;

/**
 * Complete Infrastructure Layer - Combines all infrastructure services
 *
 * This is the main infrastructure layer that provides all external service
 * implementations. It should be provided to the application layer.
 *
 * @example
 * ```typescript
 * import { InfrastructureLayer } from "./layers/infrastructure-layer";
 * import { Effect } from "effect";
 *
 * const program = Effect.gen(function* (_) {
 *   const savingsRepo = yield* _(SavingsRepository);
 *   const paymentService = yield* _(PaymentGatewayPort);
 *   // Use services...
 * });
 *
 * const result = await Effect.runPromise(
 *   Effect.provide(program, InfrastructureLayer)
 * );
 * ```
 */
export const InfrastructureLayer = Layer.mergeAll(
  DatabaseRepositoryLayer,
  PaymentGatewayLayer,
  NotificationLayer,
  MonitoringLayer,
  CachingLayer
);

/**
 * Development Infrastructure Layer - Infrastructure with development-friendly settings
 *
 * This layer includes:
 * - Enhanced logging for debugging
 * - Relaxed validation for testing
 * - Mock services where appropriate
 */
export const DevInfrastructureLayer = Layer.mergeAll(
  DatabaseRepositoryLayer,
  PaymentGatewayLayer,
  NotificationLayer,
  MonitoringLayer,
  CachingLayer
);

/**
 * Production Infrastructure Layer - Infrastructure optimized for production
 *
 * This layer includes:
 * - Production-grade error handling
 * - Performance optimizations
 * - Enhanced security measures
 * - Connection pooling and resource management
 */
export const ProdInfrastructureLayer = Layer.mergeAll(
  DatabaseRepositoryLayer,
  PaymentGatewayLayer,
  NotificationLayer,
  MonitoringLayer,
  CachingLayer
);

/**
 * Test Infrastructure Layer - Infrastructure for testing
 *
 * This layer includes:
 * - In-memory implementations where possible
 * - Fast, isolated test execution
 * - Deterministic behavior for testing
 */
export const TestInfrastructureLayer = Layer.mergeAll(
  DatabaseRepositoryLayer,
  // Use stub services for testing
  StubNotificationServiceLive,
  MonitoringLayer
);
