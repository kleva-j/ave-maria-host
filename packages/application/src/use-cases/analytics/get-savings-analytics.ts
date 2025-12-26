import type { SavingsRepository, TransactionRepository } from "@host/domain";

import { Effect, Context, Layer, Schema } from "effect";
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
  userId: UserId,
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
    readonly totalSaved: number;
  } | null;
  readonly trendData: Array<{
    readonly date: Date;
    readonly amount: number;
    readonly contributionCount: number;
  }>;
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
    const transactionRepo = yield* Effect.serviceOption(
      Context.GenericTag<TransactionRepository>("@domain/TransactionRepository")
    );

    if (savingsRepo._tag === "None" || transactionRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Required repositories not available",
        })
      );
    }

    const savingsRepository = savingsRepo.value;
    const transactionRepository = transactionRepo.value;

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
                totalSaved: topPlan.currentAmount.value,
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

          // Calculate trend data
          const transactions = yield* transactionRepository
            .findByUserId(userId)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "findByUserId",
                    table: "transactions",
                    message: error.message || "Failed to fetch transactions",
                  })
              )
            );

          // Group transactions by date for trend data
          const trendMap = new Map<
            string,
            { amount: number; count: number; date: Date }
          >();
          const sortedTransactions = [...transactions].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          );

          for (const tx of sortedTransactions) {
            // Only consider successful contributions and auto-saves
            const { createdAt, amount, type, status } = tx;
            if (
              status === "completed" &&
              (type === "contribution" || type === "auto_save")
            ) {
              const dateKey = createdAt.toISOString().split("T")[0] || ""; // YYYY-MM-DD
              const current = trendMap.get(dateKey) || {
                amount: 0,
                count: 0,
                date: createdAt,
              };

              trendMap.set(dateKey, {
                amount: current.amount + amount.value,
                count: current.count + 1,
                date: createdAt,
              });
            }
          }

          const trendData = Array.from(trendMap.values()).map((data) => ({
            date: data.date,
            amount: data.amount,
            contributionCount: data.count,
          }));

          // Generate insights
          const insights: string[] = [];

          if (currentStreak > 7) {
            insights.push(
              `Great job! You've maintained a ${currentStreak}-day streak!`
            );
          } else if (currentStreak === 0 && activePlans.length > 0) {
            insights.push("Start a streak by making a contribution today!");
          }

          // Generate completion insight
          if (
            topPerformingPlan &&
            topPerformingPlan.progress > 0 &&
            topPerformingPlan.progress < 100
          ) {
            const plan = activePlans.find(
              (p) => p.id.value === topPerformingPlan.planId
            );
            if (plan) {
              const remaining = plan.targetAmount
                ? plan.targetAmount.subtract(plan.currentAmount).value
                : 0;
              insights.push(
                `You're ${topPerformingPlan.progress.toFixed(
                  1
                )}% of the way to your ${
                  topPerformingPlan.planName
                } goal. Only ₦${remaining} to go!`
              );
            }
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
            trendData,
            insights,
          };
        }),
    };
  })
);
