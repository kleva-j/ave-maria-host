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

import {
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
    Effect.gen(function* () {
      const getSavingsAnalyticsUseCase = yield* GetSavingsAnalyticsUseCase;
      
      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* getSavingsAnalyticsUseCase
        .execute({
          userId,
          period: "all",
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new AnalyticsError({
                operation: "GetSavingsAnalytics",
                message: error._tag || "Failed to get savings analytics",
                cause: error,
              })
          )
        );

      return new GetSavingsAnalyticsResponse({
        totalSaved: result.totalSaved,
        averageDailyContribution: result.averageDailyContribution,
        contributionFrequency: result.totalContributions,
        savingsGrowthRate: result.savingsRate,
        trendData: [], // TODO: Implement trend data calculation
        topPerformingPlan: result.topPerformingPlan
          ? {
              planId: result.topPerformingPlan.planId,
              planName: result.topPerformingPlan.planName,
              totalSaved: result.totalSaved,
            }
          : null,
        insights: result.insights,
      });
    }),

  /**
   * Generate detailed progress report
   * Creates comprehensive report with projections and comparisons
   */
  GenerateProgressReport: (payload) =>
    Effect.gen(function* () {
      const generateProgressReportUseCase = yield* GenerateProgressReportUseCase;
      
      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      // Validate planId is provided
      if (!payload.planId) {
        return yield* Effect.fail(
          new AnalyticsError({
            operation: "GenerateProgressReport",
            message: "Plan ID is required for progress report",
          })
        );
      }

      const result = yield* generateProgressReportUseCase
        .execute({
          userId,
          planId: payload.planId,
          includeTransactionHistory: payload.includeProjections ?? false,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new AnalyticsError({
                operation: "GenerateProgressReport",
                message: error._tag || "Failed to generate progress report",
                cause: error,
              })
          )
        );

      return new GenerateProgressReportResponse({
        reportId: crypto.randomUUID(),
        generatedAt: DateTime.unsafeMake(new Date()),
        summary: new ReportSummary({
          totalPlans: 1,
          activePlans: result.status === "active" ? 1 : 0,
          completedPlans: result.status === "completed" ? 1 : 0,
          totalSaved: result.currentAmount,
          totalTarget: result.targetAmount,
          overallProgress: result.progressPercentage,
        }),
        achievements: result.milestones
          .filter((m) => m.achieved)
          .map((m) => ({
            title: `${m.percentage}% Milestone`,
            description: `Reached ${m.percentage}% of your savings goal`,
            earnedAt: DateTime.unsafeMake(m.achievedDate || new Date()),
          })),
      });
    }),

  /**
   * Calculate available rewards and points
   * Returns current points, available rewards, and next milestones
   */
  CalculateRewards: (_payload) =>
    Effect.gen(function* () {
      const calculateRewardsUseCase = yield* CalculateRewardsUseCase;
      
      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* calculateRewardsUseCase
        .execute({ userId })
        .pipe(
          Effect.mapError(
            (error) =>
              new AnalyticsError({
                operation: "CalculateRewards",
                message: error._tag || "Failed to calculate rewards",
                cause: error,
              })
          )
        );

      return new CalculateRewardsResponse({
        totalPoints: result.totalPoints,
        availableRewards: result.badges.map((badge) => ({
          id: crypto.randomUUID(),
          type: "badge" as const,
          title: badge.name,
          description: badge.description,
          value: 0,
          earnedAt: DateTime.unsafeMake(badge.earnedDate || new Date()),
          expiresAt: null,
          isRedeemed: false,
        })),
        nextMilestone: result.nextTier
          ? {
              title: `${result.nextTier} Tier`,
              requiredPoints: result.totalPoints + result.pointsToNextTier,
              currentPoints: result.totalPoints,
              progressPercentage: (result.totalPoints / (result.totalPoints + result.pointsToNextTier)) * 100,
            }
          : null,
        streakBonus: result.streakBonus,
        recommendations: result.recommendations,
      });
    }),

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
    Effect.gen(function* () {
      const calculateRewardsUseCase = yield* CalculateRewardsUseCase;
      
      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* calculateRewardsUseCase
        .execute({ userId })
        .pipe(
          Effect.mapError(
            (error) =>
              new AnalyticsError({
                operation: "GetAchievements",
                message: error._tag || "Failed to get achievements",
                cause: error,
              })
          )
        );

      return new GetAchievementsResponse({
        achievements: result.badges.map((badge) => ({
          id: crypto.randomUUID(),
          title: badge.name,
          description: badge.description,
          iconUrl: badge.icon,
          category: "savings" as const,
          earnedAt: badge.earnedDate ? DateTime.unsafeMake(badge.earnedDate) : null,
          progress: 100,
          isUnlocked: true,
        })),
        totalUnlocked: result.badges.length,
        totalAvailable: 13, // Total number of badge types
        recentlyEarned: result.newBadges.map((badge) => ({
          id: crypto.randomUUID(),
          title: badge.name,
          description: badge.description,
          iconUrl: badge.icon,
          category: "savings" as const,
          earnedAt: badge.earnedDate ? DateTime.unsafeMake(badge.earnedDate) : null,
          progress: 100,
          isUnlocked: true,
        })),
      });
    }),
});
