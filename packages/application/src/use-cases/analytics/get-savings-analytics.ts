import type { SavingsRepository } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import { Schema } from "@effect/schema";
import { UserId } from "@host/domain";

import {
  type FinancialError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for getting savings analytics
 */
export const GetSavingsAnalyticsInput = Schema.Struct({
  userId: Schema.UUID,
  period: Schema.optional(
    Schema.Literal("week", "month", "quarter", "year", "all")
  ),
});

export type GetSavingsAnalyticsInput = typeof GetSavingsAnalyticsInput.Type;

/**
 * Output from getting savings analytics
 */
export interface GetSavingsAnalyticsOutput {
  readonly totalSaved: number;
  readonly activePlansCount: number;
  readonly completedPlansCount: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly averageDailyContribution: number;
  readonly totalContributions: number;
  readonly savingsRate: number; // Percentage of target achieved
  readonly projectedCompletion: Date | null;
  readonly topPerformingPlan: {
    readonly planId: string;
    readonly planName: string;
    readonly progress: number;
  } | null;
  readonly insights: string[];
}

/**
 * Use case for retrieving user savings analytics and insights
 * Provides comprehensive statistics about user's saving behavior
 */
export interface GetSavingsAnalyticsUseCase {
  readonly execute: (
    input: GetSavingsAnalyticsInput
  ) => Effect.Effect<GetSavingsAnalyticsOutput, FinancialError>;
}

export const GetSavingsAnalyticsUseCase =
  Context.GenericTag<GetSavingsAnalyticsUseCase>(
    "@app/GetSavingsAnalyticsUseCase"
  );

/**
 * Live implementation of GetSavingsAnalyticsUseCase
 */
export const GetSavingsAnalyticsUseCaseLive = Layer.effect(
  GetSavingsAnalyticsUseCase,
  Effect.gen(function* () {
    const savingsRepo = yield* Effect.serviceOption(
      Context.GenericTag<SavingsRepository>("@domain/SavingsRepository")
    );

    if (savingsRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Required repositories not available",
        })
      );
    }

    const savingsRepository = savingsRepo.value;

    return {
      execute: (input: GetSavingsAnalyticsInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            GetSavingsAnalyticsInput
          )(input).pipe(
            Effect.mapError(
              (error) =>
                new ValidationError({
                  field: "input",
                  message: `Invalid input: ${error}`,
                  value: input,
                })
            )
          );

          // Create value objects
          const userId = UserId.fromString(validatedInput.userId);

          // Get all user's plans
          const allPlans = yield* savingsRepository.findByUserId(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findByUserId",
                  table: "savings_plans",
                  message: error.message || "Failed to fetch user plans",
                })
            )
          );

          // Calculate active and completed plans
          const activePlans = allPlans.filter((p) => p.status === "active");
          const completedPlans = allPlans.filter(
            (p) => p.status === "completed"
          );

          // Calculate total saved
          const totalSaved = allPlans.reduce(
            (sum, plan) => sum + plan.currentAmount.value,
            0
          );

          // Calculate current and longest streak
          let currentStreak = 0;
          let longestStreak = 0;

          for (const plan of activePlans) {
            if (plan.contributionStreak > currentStreak) {
              currentStreak = plan.contributionStreak;
            }
          }

          for (const plan of allPlans) {
            if (plan.contributionStreak > longestStreak) {
              longestStreak = plan.contributionStreak;
            }
          }

          // Calculate total contributions count
          const totalContributions = allPlans.reduce(
            (sum, plan) => sum + plan.totalContributions,
            0
          );

          // Calculate average daily contribution
          const averageDailyContribution =
            totalContributions > 0 ? totalSaved / totalContributions : 0;

          // Calculate savings rate (average progress across active plans)
          let savingsRate = 0;
          if (activePlans.length > 0) {
            const totalProgress = activePlans.reduce((sum, plan) => {
              const progress = plan.calculateProgress();
              return sum + progress.progressPercentage;
            }, 0);
            savingsRate = totalProgress / activePlans.length;
          }

          // Find top performing plan
          let topPerformingPlan: GetSavingsAnalyticsOutput["topPerformingPlan"] =
            null;
          if (activePlans.length > 0) {
            const sortedPlans = [...activePlans].sort((a, b) => {
              const progressA = a.calculateProgress().progressPercentage;
              const progressB = b.calculateProgress().progressPercentage;
              return progressB - progressA;
            });

            const topPlan = sortedPlans[0];
            if (topPlan) {
              topPerformingPlan = {
                planId: topPlan.id.value,
                planName: topPlan.planName,
                progress: topPlan.calculateProgress().progressPercentage,
              };
            }
          }

          // Calculate projected completion date
          let projectedCompletion: Date | null = null;
          if (activePlans.length > 0 && currentStreak > 0) {
            // Find the plan closest to completion
            const nearestPlan = activePlans.reduce((nearest, plan) => {
              const progress = plan.calculateProgress();
              const nearestProgress = nearest.calculateProgress();
              return progress.daysRemaining < nearestProgress.daysRemaining
                ? plan
                : nearest;
            });

            const progress = nearestPlan.calculateProgress();
            projectedCompletion = new Date();
            projectedCompletion.setDate(
              projectedCompletion.getDate() + progress.daysRemaining
            );
          }

          // Generate insights
          const insights: string[] = [];

          if (currentStreak >= 7) {
            insights.push(
              `Great job! You've maintained a ${currentStreak}-day saving streak.`
            );
          }

          if (completedPlans.length > 0) {
            const planWord = completedPlans.length > 1 ? "plans" : "plan";
            insights.push(
              `You've successfully completed ${completedPlans.length} savings ${planWord}.`
            );
          }

          if (savingsRate >= 80) {
            insights.push(
              `You're on track! Your plans are ${savingsRate.toFixed(1)}% complete on average.`
            );
          } else if (savingsRate < 50 && activePlans.length > 0) {
            insights.push(
              "Consider increasing your contribution frequency to reach your goals faster."
            );
          }

          if (activePlans.length > 3) {
            insights.push(
              `You have ${activePlans.length} active plans. Consider focusing on fewer plans for better results.`
            );
          }

          if (totalSaved > 0 && averageDailyContribution > 0) {
            const projectedMonthly = averageDailyContribution * 30;
            insights.push(
              `At your current rate, you'll save approximately ${projectedMonthly.toFixed(2)} per month.`
            );
          }

          return {
            totalSaved,
            activePlansCount: activePlans.length,
            completedPlansCount: completedPlans.length,
            currentStreak,
            longestStreak,
            averageDailyContribution,
            totalContributions,
            savingsRate,
            projectedCompletion,
            topPerformingPlan,
            insights,
          };
        }),
    };
  })
);
