import type { TransactionRepository, SavingsRepository } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import { PlanId, UserId } from "@host/domain";
import { Schema } from "@effect/schema";
import {
  type FinancialError,
  AuthorizationError,
  PlanNotFoundError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for generating progress report
 */
export const GenerateProgressReportInput = Schema.Struct({
  userId: Schema.UUID,
  planId: Schema.UUID,
  includeTransactionHistory: Schema.optional(Schema.Boolean),
});

export type GenerateProgressReportInput =
  typeof GenerateProgressReportInput.Type;

/**
 * Output from generating progress report
 */
export interface GenerateProgressReportOutput {
  readonly planId: string;
  readonly planName: string;
  readonly status: string;
  readonly currentAmount: number;
  readonly targetAmount: number;
  readonly dailyAmount: number;
  readonly progressPercentage: number;
  readonly daysElapsed: number;
  readonly daysRemaining: number;
  readonly contributionStreak: number;
  readonly totalContributions: number;
  readonly averageContributionPerDay: number;
  readonly interestEarned: number;
  readonly projectedCompletionDate: Date;
  readonly isOnTrack: boolean;
  readonly performanceScore: number; // 0-100 score based on consistency
  readonly milestones: Array<{
    readonly percentage: number;
    readonly achieved: boolean;
    readonly achievedDate?: Date;
  }>;
  readonly transactionHistory?: Array<{
    readonly date: Date;
    readonly amount: number;
    readonly type: string;
    readonly status: string;
  }>;
  readonly recommendations: string[];
}

/**
 * Use case for generating detailed progress report for a savings plan
 * Provides comprehensive analysis of plan performance and recommendations
 */
export interface GenerateProgressReportUseCase {
  readonly execute: (
    input: GenerateProgressReportInput
  ) => Effect.Effect<GenerateProgressReportOutput, FinancialError>;
}

export const GenerateProgressReportUseCase =
  Context.GenericTag<GenerateProgressReportUseCase>(
    "@app/GenerateProgressReportUseCase"
  );

/**
 * Live implementation of GenerateProgressReportUseCase
 */
export const GenerateProgressReportUseCaseLive = Layer.effect(
  GenerateProgressReportUseCase,
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
      execute: (input: GenerateProgressReportInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            GenerateProgressReportInput
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
          const planId = PlanId.fromString(validatedInput.planId);

          // Retrieve the plan
          const plan = yield* savingsRepository.findById(planId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findById",
                  table: "savings_plans",
                  message: error.message || "Failed to fetch savings plan",
                })
            )
          );

          if (!plan) {
            return yield* Effect.fail(
              new PlanNotFoundError({
                planId: validatedInput.planId,
              })
            );
          }

          // Verify user owns the plan
          if (plan.userId.value !== userId.value) {
            return yield* Effect.fail(
              new AuthorizationError({
                userId: validatedInput.userId,
                resource: "savings_plan",
                action: "read",
              })
            );
          }

          // Calculate progress
          const progress = plan.calculateProgress();

          // Calculate days elapsed
          const daysElapsed = Math.floor(
            (new Date().getTime() - plan.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // Calculate average contribution per day
          const averageContributionPerDay =
            daysElapsed > 0 ? plan.currentAmount.value / daysElapsed : 0;

          // Calculate interest earned
          const interestEarned = plan.calculateInterestEarned().value;

          // Calculate projected completion date
          const projectedCompletionDate = new Date();
          projectedCompletionDate.setDate(
            projectedCompletionDate.getDate() + progress.daysRemaining
          );

          // Determine if plan is on track
          const expectedProgress =
            daysElapsed > 0 ? (daysElapsed / plan.cycleDuration) * 100 : 0;
          const isOnTrack = progress.progressPercentage >= expectedProgress;

          // Calculate performance score (0-100)
          let performanceScore = 0;
          if (plan.cycleDuration > 0) {
            const consistencyScore =
              (plan.contributionStreak / plan.cycleDuration) * 50;
            const progressScore = (progress.progressPercentage / 100) * 50;
            performanceScore = Math.min(100, consistencyScore + progressScore);
          }

          // Define milestones
          const milestones = [
            { percentage: 25, achieved: progress.progressPercentage >= 25 },
            { percentage: 50, achieved: progress.progressPercentage >= 50 },
            { percentage: 75, achieved: progress.progressPercentage >= 75 },
            { percentage: 100, achieved: progress.progressPercentage >= 100 },
          ];

          // Get transaction history if requested
          let transactionHistory:
            | GenerateProgressReportOutput["transactionHistory"]
            | undefined;
          if (validatedInput.includeTransactionHistory) {
            const transactions = yield* transactionRepository
              .findByPlanId(planId)
              .pipe(
                Effect.mapError(
                  (error) =>
                    new DatabaseError({
                      operation: "findByPlanId",
                      table: "transactions",
                      message: error.message || "Failed to fetch transactions",
                    })
                )
              );

            transactionHistory = transactions.map((tx) => ({
              date: tx.createdAt,
              amount: tx.amount.value,
              type: tx.type,
              status: tx.status,
            }));
          }

          // Generate recommendations
          const recommendations: string[] = [];

          if (!isOnTrack) {
            recommendations.push(
              "You're behind schedule. Consider making additional contributions to catch up."
            );
          }

          if (plan.contributionStreak < 7 && plan.status === "active") {
            recommendations.push(
              "Enable auto-save to maintain a consistent contribution streak."
            );
          }

          if (progress.progressPercentage >= 90) {
            recommendations.push(
              "You're almost there! Just a few more contributions to reach your goal."
            );
          }

          if (
            averageContributionPerDay < plan.dailyAmount.value &&
            plan.status === "active"
          ) {
            recommendations.push(
              "Your average daily contribution is below your target. Try to contribute more regularly."
            );
          }

          if (plan.interestRate > 0 && interestEarned > 0) {
            recommendations.push(
              `You've earned ${interestEarned.toFixed(2)} in interest. Keep saving to earn more!`
            );
          }

          if (performanceScore >= 80) {
            recommendations.push(
              "Excellent performance! You're doing a great job with your savings."
            );
          }

          const baseReport = {
            planId: plan.id.value,
            planName: plan.planName,
            status: plan.status,
            currentAmount: plan.currentAmount.value,
            targetAmount:
              plan.targetAmount?.value ||
              plan.dailyAmount.value * plan.cycleDuration,
            dailyAmount: plan.dailyAmount.value,
            progressPercentage: progress.progressPercentage,
            daysElapsed,
            daysRemaining: progress.daysRemaining,
            contributionStreak: plan.contributionStreak,
            totalContributions: plan.totalContributions,
            averageContributionPerDay,
            interestEarned,
            projectedCompletionDate,
            isOnTrack,
            performanceScore,
            milestones,
            recommendations,
          };

          return transactionHistory
            ? { ...baseReport, transactionHistory }
            : baseReport;
        }),
    };
  })
);
