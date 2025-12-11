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

import type { Badge } from "@host/shared";
import type { Layer } from "effect";

import { Rpc, RpcGroup } from "@effect/rpc";
import { TotalRewards } from "@host/shared";
import { Effect, Schema } from "effect";

import {
  GenerateProgressReportUseCase,
  GetSavingsAnalyticsUseCase,
  GetSpendingInsightsUseCase,
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

import { AuthMiddleware, CurrentUser } from "./auth-rpc";
import {
  safeDateTimeFromDate,
  mapToAnalyticsError,
  safeDateTimeOrNull,
} from "./analytics-helpers";

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
  | GetSpendingInsightsUseCase
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

      // Get authenticated user from context
      const currentUser = yield* CurrentUser;

      yield* Schema.decodeUnknown(GetSavingsAnalyticsSchema)(_payload).pipe(
        Effect.mapError(
          mapToAnalyticsError("GetSavingsAnalytics", "Error decoding payload")
        )
      );

      const result = yield* getSavingsAnalyticsUseCase
        .execute({ userId: currentUser.id, period: "all" })
        .pipe(
          Effect.mapError(
            mapToAnalyticsError(
              "GetSavingsAnalytics",
              "Failed to get savings analytics"
            )
          )
        );

      const contributionFrequency =
        result.activePlansCount > 0
          ? result.totalContributions / result.activePlansCount
          : result.totalContributions;

      const trendData = yield* Effect.all(
        result.trendData.map(({ date, amount, contributionCount }) =>
          Effect.gen(function* () {
            const safeDate = yield* safeDateTimeFromDate(date);
            return { date: safeDate, amount, contributionCount };
          })
        )
      );

      return new GetSavingsAnalyticsResponse({
        totalSaved: result.totalSaved,
        averageDailyContribution: result.averageDailyContribution,
        contributionFrequency,
        savingsGrowthRate: result.savingsRate,
        trendData,
        topPerformingPlan: result.topPerformingPlan
          ? {
              planId: result.topPerformingPlan.planId,
              planName: result.topPerformingPlan.planName,
              totalSaved: result.topPerformingPlan.totalSaved,
            }
          : null,
        insights: result.insights,
      });
    }),

  /**
   * Generate detailed progress report
   * Creates comprehensive report with projections and comparisons
   */
  GenerateProgressReport: (_payload) =>
    Effect.gen(function* () {
      const generateProgressReportUseCase =
        yield* GenerateProgressReportUseCase;

      // Get authenticated user from context
      const currentUser = yield* CurrentUser;

      const payload = yield* Schema.decodeUnknown(GenerateProgressReportSchema)(
        _payload
      ).pipe(
        Effect.mapError(
          mapToAnalyticsError(
            "GenerateProgressReport",
            "Error decoding payload"
          )
        )
      );

      // Validate planId is provided (schema has it optional but RPC requires it logically here)
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
          userId: currentUser.id,
          planId: payload.planId,
          // Map includeProjections (RPC) to includeTransactionHistory (Use Case) as per schema definition mismatch
          includeTransactionHistory: payload.includeProjections ?? false,
        })
        .pipe(
          Effect.mapError(
            mapToAnalyticsError(
              "GenerateProgressReport",
              "Failed to generate progress report"
            )
          )
        );

      const generatedAt = yield* safeDateTimeFromDate(new Date());

      return new GenerateProgressReportResponse({
        reportId: crypto.randomUUID(),
        generatedAt,
        summary: new ReportSummary({
          totalPlans: 1,
          activePlans: result.status === "active" ? 1 : 0,
          completedPlans: result.status === "completed" ? 1 : 0,
          totalSaved: result.currentAmount,
          totalTarget: result.targetAmount,
          overallProgress: result.progressPercentage,
        }),
        achievements: yield* Effect.all(
          result.milestones
            .filter((m) => m.achieved)
            .map((m) =>
              Effect.gen(function* () {
                const earnedAt = yield* safeDateTimeFromDate(m.achievedDate);
                return {
                  title: `${m.percentage}% Milestone`,
                  description: `Reached ${m.percentage}% of your savings goal`,
                  earnedAt,
                };
              })
            )
        ),
      });
    }),

  /**
   * Calculate available rewards and points
   * Returns current points, available rewards, and next milestones
   */
  CalculateRewards: (_payload) =>
    Effect.gen(function* () {
      const calculateRewardsUseCase = yield* CalculateRewardsUseCase;

      // Get authenticated user from context
      const currentUser = yield* CurrentUser;

      yield* Schema.decodeUnknown(CalculateRewardsSchema)(_payload).pipe(
        Effect.mapError(
          mapToAnalyticsError("calculateRewards", "Error decoding payload")
        )
      );

      const result = yield* calculateRewardsUseCase
        .execute({ userId: currentUser.id })
        .pipe(
          Effect.mapError(
            mapToAnalyticsError(
              "CalculateRewards",
              "Failed to calculate rewards"
            )
          )
        );

      // Map badges to rewards with safe DateTime
      const availableRewards = yield* Effect.all(
        result.badges.map((badge) =>
          Effect.gen(function* () {
            const earnedAt = yield* safeDateTimeFromDate(badge.earnedDate);
            return {
              id: crypto.randomUUID(),
              type: "badge" as const,
              title: badge.name,
              description: badge.description,
              value: 0,
              earnedAt,
              expiresAt: null,
              isRedeemed: false,
            };
          })
        )
      );

      const nextTierGoal =
        result.nextTier !== null
          ? result.totalPoints + result.pointsToNextTier
          : 0;

      return new CalculateRewardsResponse({
        totalPoints: result.totalPoints,
        availableRewards,
        nextMilestone: result.nextTier
          ? {
              title: `${result.nextTier} Tier`,
              requiredPoints: nextTierGoal,
              currentPoints: result.totalPoints,
              progressPercentage: result.tierProgress,
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
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const getSpendingInsightsUseCase = yield* GetSpendingInsightsUseCase;

      // Validate payload
      const payload = yield* Schema.decodeUnknown(GetSpendingInsightsSchema)(
        _payload
      ).pipe(
        Effect.mapError(
          mapToAnalyticsError("GetSpendingInsights", "Invalid request payload")
        )
      );

      const result = yield* getSpendingInsightsUseCase
        .execute({
          userId: currentUser.id,
          startDate: new Date(
            payload.startDate as unknown as string | number | Date
          ),
          endDate: new Date(
            payload.endDate as unknown as string | number | Date
          ),
          categories: payload.categories,
        })
        .pipe(
          Effect.mapError(
            mapToAnalyticsError(
              "GetSpendingInsights",
              "Failed to get spending insights"
            )
          )
        );

      return new GetSpendingInsightsResponse({
        totalSpent: result.totalSpent,
        categoryBreakdown: result.categoryBreakdown,
        averageDailySpending: result.averageDailySpending,
        comparisonToPreviousPeriod: new ComparisonToPreviousPeriod({
          percentageChange: result.comparisonToPreviousPeriod.percentageChange,
          trend: result.comparisonToPreviousPeriod.trend,
        }),
        insights: result.insights,
        recommendations: result.recommendations,
      });
    }),

  /**
   * Get user achievements and badges
   * Returns all achievements with unlock status and progress
   */
  GetAchievements: (_payload) =>
    Effect.gen(function* () {
      const calculateRewardsUseCase = yield* CalculateRewardsUseCase;

      // Get authenticated user from context
      const currentUser = yield* CurrentUser;

      yield* Schema.decodeUnknown(GetAchievementsSchema)(_payload).pipe(
        Effect.mapError(
          mapToAnalyticsError("GetAchievements", "Error decoding payload")
        )
      );

      const result = yield* calculateRewardsUseCase
        .execute({ userId: currentUser.id })
        .pipe(
          Effect.mapError(
            mapToAnalyticsError("GetAchievements", "Failed to get achievements")
          )
        );

      // Map badges to achievements with safe DateTime
      const mapBadgeToAchievement = (badge: Badge) =>
        Effect.gen(function* () {
          const earnedAt = yield* safeDateTimeOrNull(badge.earnedDate);
          return {
            id: crypto.randomUUID(),
            title: badge.name,
            description: badge.description,
            iconUrl: badge.icon,
            category: "savings" as const,
            earnedAt,
            progress: 100,
            isUnlocked: true,
          };
        });

      const achievements = yield* Effect.all(
        result.badges.map(mapBadgeToAchievement)
      );

      const recentlyEarned = yield* Effect.all(
        result.newBadges.map(mapBadgeToAchievement)
      );

      return new GetAchievementsResponse({
        achievements,
        totalUnlocked: result.badges.length,
        totalAvailable: TotalRewards, // Total number of badge types
        recentlyEarned,
      });
    }),
});
