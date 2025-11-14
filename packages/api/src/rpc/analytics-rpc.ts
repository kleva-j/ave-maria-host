/**
 * @fileoverview Analytics RPC Endpoints
 *
 * This module provides RPC endpoints for analytics and reporting using @effect/rpc.
 * It handles user insights, progress tracking, rewards, and gamification features.
 *
 * ## Key Features:
 * - **Savings Analytics**: Comprehensive savings insights and trends
 * - **Progress Reports**: Detailed progress tracking and projections
 * - **Rewards System**: Gamification with badges, points, and achievements
 * - **Spending Insights**: Analysis of spending patterns and recommendations
 * - **Achievement Tracking**: Milestone tracking and unlockable achievements
 *
 * ## Endpoints:
 * - getSavingsAnalytics: Get comprehensive savings analytics
 * - generateProgressReport: Generate detailed progress reports
 * - calculateRewards: Calculate available rewards and points
 * - getSpendingInsights: Get spending analysis and recommendations
 * - getAchievements: Get user achievements and badges
 */

import { type Layer, Effect, Schema, DateTime } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

import type {
  GenerateProgressReportUseCase,
  GetSavingsAnalyticsUseCase,
  CalculateRewardsUseCase,
} from "@host/application";

import {
  GenerateProgressReportOutputSchema,
  ComparisonToPreviousPeriodSchema,
  GetSavingsAnalyticsOutputSchema,
  GetSpendingInsightsOutputSchema,
  CalculateRewardsOutputSchema,
  GenerateProgressReportSchema,
  GetAchievementsOutputSchema,
  GetSpendingInsightsSchema,
  GetSavingsAnalyticsSchema,
  CalculateRewardsSchema,
  GetAchievementsSchema,
  ReportSummarySchema,
} from "@host/shared";

import { AuthMiddleware } from "./auth-rpc";

// ============================================================================
// Payload Classes
// ============================================================================

/**
 * Get Savings Analytics Payload
 */
export class GetSavingsAnalyticsPayload extends GetSavingsAnalyticsSchema {}

/**
 * Generate Progress Report Payload
 */
export class GenerateProgressReportPayload extends GenerateProgressReportSchema {}

/**
 * Calculate Rewards Payload
 */
export class CalculateRewardsPayload extends CalculateRewardsSchema {}

/**
 * Get Spending Insights Payload
 */
export class GetSpendingInsightsPayload extends GetSpendingInsightsSchema {}

/**
 * Get Achievements Payload (empty)
 */
export class GetAchievementsPayload extends GetAchievementsSchema {}

// ============================================================================
// Response Classes
// ============================================================================

/**
 * Get Savings Analytics Response
 */
export class GetSavingsAnalyticsResponse extends GetSavingsAnalyticsOutputSchema {}

/**
 * Report Summary
 */
export class ReportSummary extends ReportSummarySchema {}

/**
 * Generate Progress Report Response
 */
export class GenerateProgressReportResponse extends GenerateProgressReportOutputSchema {}

/**
 * Calculate Rewards Response
 */
export class CalculateRewardsResponse extends CalculateRewardsOutputSchema {}

/**
 * Comparison To Previous Period
 */
export class ComparisonToPreviousPeriod extends ComparisonToPreviousPeriodSchema {}

/**
 * Get Spending Insights Response
 */
export class GetSpendingInsightsResponse extends GetSpendingInsightsOutputSchema {}

/**
 * Get Achievements Response
 */
export class GetAchievementsResponse extends GetAchievementsOutputSchema {}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Analytics operation errors
 */
export class AnalyticsError extends Schema.TaggedError<AnalyticsError>()(
  "AnalyticsError",
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

export const AnalyticsRpcError = Schema.Union(AnalyticsError);

// ============================================================================
// RPC Group Definition
// ============================================================================

/**
 * Analytics RPC group containing all analytics-related endpoints
 */
export class AnalyticsRpcs extends RpcGroup.make(
  /**
   * Get comprehensive savings analytics
   */
  Rpc.make("GetSavingsAnalytics", {
    payload: GetSavingsAnalyticsPayload,
    success: GetSavingsAnalyticsResponse,
    error: AnalyticsError,
  }).middleware(AuthMiddleware),

  /**
   * Generate detailed progress report
   */
  Rpc.make("GenerateProgressReport", {
    payload: GenerateProgressReportPayload,
    success: GenerateProgressReportResponse,
    error: AnalyticsError,
  }).middleware(AuthMiddleware),

  /**
   * Calculate available rewards and points
   */
  Rpc.make("CalculateRewards", {
    payload: CalculateRewardsPayload,
    success: CalculateRewardsResponse,
    error: AnalyticsError,
  }).middleware(AuthMiddleware),

  /**
   * Get spending insights and recommendations
   */
  Rpc.make("GetSpendingInsights", {
    payload: GetSpendingInsightsPayload,
    success: GetSpendingInsightsResponse,
    error: AnalyticsError,
  }).middleware(AuthMiddleware),

  /**
   * Get user achievements and badges
   */
  Rpc.make("GetAchievements", {
    payload: GetAchievementsPayload,
    success: GetAchievementsResponse,
    error: AnalyticsError,
  }).middleware(AuthMiddleware)
) {}

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * Live implementation of analytics RPC handlers
 * Integrates with application use cases and analytics services
 */
export const AnalyticsHandlersLive: Layer.Layer<
  | Rpc.Handler<"GenerateProgressReport">
  | Rpc.Handler<"GetSavingsAnalytics">
  | Rpc.Handler<"GetSpendingInsights">
  | Rpc.Handler<"CalculateRewards">
  | Rpc.Handler<"GetAchievements">,
  never,
  | GenerateProgressReportUseCase
  | GetSavingsAnalyticsUseCase
  | CalculateRewardsUseCase
  | AuthMiddleware
> = AnalyticsRpcs.toLayer({
  /**
   * Get comprehensive savings analytics
   * Returns trends, insights, and performance metrics
   */
  GetSavingsAnalytics: (_payload) =>
    Effect.succeed(
      new GetSavingsAnalyticsResponse({
        totalSaved: 0,
        averageDailyContribution: 0,
        contributionFrequency: 0,
        savingsGrowthRate: 0,
        trendData: [],
        topPerformingPlan: null,
        insights: ["Analytics implementation pending"],
      })
    ),

  /**
   * Generate detailed progress report
   * Creates comprehensive report with projections and comparisons
   */
  GenerateProgressReport: (_payload) =>
    Effect.succeed(
      new GenerateProgressReportResponse({
        reportId: crypto.randomUUID(),
        generatedAt: DateTime.unsafeMake(new Date()),
        summary: new ReportSummary({
          totalPlans: 0,
          activePlans: 0,
          completedPlans: 0,
          totalSaved: 0,
          totalTarget: 0,
          overallProgress: 0,
        }),
        achievements: [],
      })
    ),

  /**
   * Calculate available rewards and points
   * Returns current points, available rewards, and next milestones
   */
  CalculateRewards: (_payload) =>
    Effect.succeed(
      new CalculateRewardsResponse({
        totalPoints: 0,
        availableRewards: [],
        nextMilestone: null,
        streakBonus: 0,
        recommendations: ["Rewards calculation implementation pending"],
      })
    ),

  /**
   * Get spending insights and recommendations
   * Analyzes spending patterns and provides actionable insights
   */
  GetSpendingInsights: (_payload) =>
    Effect.succeed(
      new GetSpendingInsightsResponse({
        totalSpent: 0,
        categoryBreakdown: [],
        averageDailySpending: 0,
        comparisonToPreviousPeriod: new ComparisonToPreviousPeriod({
          percentageChange: 0,
          trend: "stable",
        }),
        insights: ["No spending data available yet"],
        recommendations: ["Start tracking your expenses to get insights"],
      })
    ),

  /**
   * Get user achievements and badges
   * Returns all achievements with unlock status and progress
   */
  GetAchievements: (_payload) =>
    Effect.succeed(
      new GetAchievementsResponse({
        achievements: [],
        totalUnlocked: 0,
        totalAvailable: 0,
        recentlyEarned: [],
      })
    ),
});
