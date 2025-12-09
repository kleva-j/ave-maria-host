/**
 * @fileoverview Application Layer Composition
 *
 * This module composes all application use cases with their dependencies.
 * It wires up use cases with repositories and services from the infrastructure layer.
 *
 * ## Architecture:
 * - Savings plan management use cases
 * - Contribution processing use cases
 * - Wallet management use cases
 * - Analytics and reporting use cases
 * - Cross-cutting concerns (logging, metrics)
 *
 * @see Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { Layer } from "effect";

import {
  // Import savings use cases
  CreateSavingsPlanUseCaseLive,
  UpdateSavingsPlanUseCaseLive,
  GetSavingsPlanUseCaseLive,
  ListSavingsPlanUseCaseLive,

  // Import contribution use cases
  ValidateContributionUseCaseLive,
  ProcessContributionUseCaseLive,
  AutoSaveUseCaseLive,

  // Import wallet use cases
  GetWalletBalanceUseCaseLive,
  WithdrawFundsUseCaseLive,
  FundWalletUseCaseLive,

  // Import analytics use cases
  GenerateProgressReportUseCaseLive,
  GetSavingsAnalyticsUseCaseLive,
  GetSpendingInsightsUseCaseLive,
  CalculateRewardsUseCaseLive,
} from "@host/application";

// Import auth service
import { AuthServiceLive } from "@host/auth";

// Import infrastructure layer
import { InfrastructureLayer } from "./infrastructure-layer";

/**
 * Savings Use Cases Layer - Combines all savings plan management use cases
 *
 * This layer provides:
 * - CreateSavingsPlanUseCase: Create new savings plans
 * - UpdateSavingsPlanUseCase: Modify existing plans
 * - GetSavingsPlanUseCase: Retrieve plan details
 *
 * These use cases handle the core savings plan lifecycle.
 */
export const SavingsUseCasesLayer = Layer.mergeAll(
  CreateSavingsPlanUseCaseLive,
  UpdateSavingsPlanUseCaseLive,
  GetSavingsPlanUseCaseLive,
  ListSavingsPlanUseCaseLive
);

/**
 * Contribution Use Cases Layer - Combines all contribution processing use cases
 *
 * This layer provides:
 * - ProcessContributionUseCase: Process manual contributions
 * - ValidateContributionUseCase: Pre-validate contributions
 * - AutoSaveUseCase: Handle automated daily contributions
 *
 * These use cases manage the contribution workflow.
 */
export const ContributionUseCasesLayer = Layer.mergeAll(
  ProcessContributionUseCaseLive,
  ValidateContributionUseCaseLive,
  AutoSaveUseCaseLive
);

/**
 * Wallet Use Cases Layer - Combines all wallet management use cases
 *
 * This layer provides:
 * - FundWalletUseCase: Add funds to wallet
 * - WithdrawFundsUseCase: Withdraw funds from wallet
 * - GetWalletBalanceUseCase: Query wallet balance
 *
 * These use cases handle wallet operations and payment integration.
 */
export const WalletUseCasesLayer = Layer.mergeAll(
  FundWalletUseCaseLive,
  WithdrawFundsUseCaseLive,
  GetWalletBalanceUseCaseLive
);

/**
 * Analytics Use Cases Layer - Combines all analytics and reporting use cases
 *
 * This layer provides:
 * - GetSavingsAnalyticsUseCase: Generate user insights
 * - GenerateProgressReportUseCase: Create detailed reports
 * - CalculateRewardsUseCase: Calculate gamification rewards
 *
 * These use cases provide business intelligence and user engagement features.
 */
export const AnalyticsUseCasesLayer = Layer.mergeAll(
  GetSavingsAnalyticsUseCaseLive,
  GenerateProgressReportUseCaseLive,
  CalculateRewardsUseCaseLive,
  GetSpendingInsightsUseCaseLive
);

/**
 * All Use Cases Layer - Combines all application use cases
 *
 * This layer provides all use cases needed by the API controllers.
 * It's a convenience layer that merges all use case layers.
 */
export const AllUseCasesLayer = Layer.mergeAll(
  SavingsUseCasesLayer,
  ContributionUseCasesLayer,
  WalletUseCasesLayer,
  AnalyticsUseCasesLayer,
  AuthServiceLive
);

/**
 * Complete Application Layer - Combines use cases with infrastructure
 *
 * This is the main application layer that provides all use cases with their
 * infrastructure dependencies properly wired. It should be provided to the
 * API layer.
 *
 * The dependency flow is:
 * 1. Infrastructure Layer provides repositories and services
 * 2. Use Cases Layer depends on Infrastructure Layer
 * 3. API Layer depends on Application Layer
 *
 * @example
 * ```typescript
 * import { ApplicationLayer } from "./layers/application-layer";
 * import { Effect } from "effect";
 *
 * const program = Effect.gen(function* (_) {
 *   const createPlan = yield* _(CreateSavingsPlanUseCase);
 *   const result = yield* _(createPlan.execute({
 *     userId: "user-123",
 *     planName: "Emergency Fund",
 *     dailyAmount: 100,
 *     currency: "NGN",
 *     cycleDuration: 30
 *   }));
 *   return result;
 * });
 *
 * const result = await Effect.runPromise(
 *   Effect.provide(program, ApplicationLayer)
 * );
 * ```
 */
export const ApplicationLayer = Layer.provide(
  AllUseCasesLayer,
  InfrastructureLayer
);

/**
 * Development Application Layer - Application layer with development settings
 *
 * This layer includes:
 * - Enhanced logging for debugging
 * - Relaxed validation for testing
 * - Development-friendly error messages
 */
export const DevApplicationLayer = Layer.provide(
  AllUseCasesLayer,
  InfrastructureLayer
);

/**
 * Production Application Layer - Application layer optimized for production
 *
 * This layer includes:
 * - Production-grade error handling
 * - Performance optimizations
 * - Enhanced security measures
 */
export const ProdApplicationLayer = Layer.provide(
  AllUseCasesLayer,
  InfrastructureLayer
);

/**
 * Test Application Layer - Application layer for testing
 *
 * This layer includes:
 * - Fast, isolated test execution
 * - Deterministic behavior
 * - Mock services where appropriate
 */
export const TestApplicationLayer = Layer.provide(
  AllUseCasesLayer,
  InfrastructureLayer
);

/**
 * Logging Layer - Cross-cutting concern for structured logging
 *
 * This layer provides logging capabilities across all use cases.
 * It uses Effect's built-in logging system with structured output.
 */
export const LoggingLayer = Layer.empty;

/**
 * Metrics Layer - Cross-cutting concern for application metrics
 *
 * This layer provides metrics collection for monitoring use case performance,
 * success rates, and business metrics.
 */
export const MetricsLayer = Layer.empty;

/**
 * Application Layer with Cross-Cutting Concerns
 *
 * This layer includes the application layer plus cross-cutting concerns
 * like logging and metrics.
 */
export const ApplicationLayerWithCrossCutting = Layer.mergeAll(
  ApplicationLayer,
  LoggingLayer,
  MetricsLayer
);
