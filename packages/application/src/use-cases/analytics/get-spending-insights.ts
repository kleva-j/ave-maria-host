import type { TransactionRepository } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import { Schema } from "@effect/schema";
import { UserId } from "@host/domain";

import {
  type FinancialError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for getting spending insights
 */
export const GetSpendingInsightsInput = Schema.Struct({
  userId: Schema.UUID,
  startDate: Schema.Date,
  endDate: Schema.Date,
  categories: Schema.optional(Schema.Array(Schema.String)),
});

export type GetSpendingInsightsInput = typeof GetSpendingInsightsInput.Type;

/**
 * Output from getting spending insights
 */
export interface GetSpendingInsightsOutput {
  readonly totalSpent: number;
  readonly categoryBreakdown: Array<{
    readonly category: string;
    readonly amount: number;
    readonly percentage: number;
    readonly transactionCount: number;
  }>;
  readonly averageDailySpending: number;
  readonly comparisonToPreviousPeriod: {
    readonly percentageChange: number;
    readonly trend: "increasing" | "decreasing" | "stable";
  };
  readonly insights: string[];
  readonly recommendations: string[];
}

/**
 * Use case for retrieving user spending insights
 * Analyzes spending patterns and provides actionable feedback
 */
export interface GetSpendingInsightsUseCase {
  readonly execute: (
    input: GetSpendingInsightsInput
  ) => Effect.Effect<GetSpendingInsightsOutput, FinancialError>;
}

export const GetSpendingInsightsUseCase =
  Context.GenericTag<GetSpendingInsightsUseCase>(
    "@app/GetSpendingInsightsUseCase"
  );

/**
 * Live implementation of GetSpendingInsightsUseCase
 */
export const GetSpendingInsightsUseCaseLive = Layer.effect(
  GetSpendingInsightsUseCase,
  Effect.gen(function* () {
    const transactionRepo = yield* Effect.serviceOption(
      Context.GenericTag<TransactionRepository>("@domain/TransactionRepository")
    );

    if (transactionRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Transaction repository not available",
        })
      );
    }

    const transactionRepository = transactionRepo.value;

    return {
      execute: (input: GetSpendingInsightsInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            GetSpendingInsightsInput
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

          const userId = UserId.fromString(validatedInput.userId);
          const startDate = validatedInput.startDate;
          const endDate = validatedInput.endDate;

          // Fetch transactions for the requested period
          const currentPeriodTransactions = yield* transactionRepository
            .getTransactionHistory(userId, startDate, endDate)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "getTransactionHistory",
                    table: "transactions",
                    message:
                      (error as any).message || "Failed to fetch transactions",
                  })
              )
            );

          // Calculate previous period for comparison
          const duration = endDate.getTime() - startDate.getTime();
          const prevEndDate = new Date(startDate.getTime());
          const prevStartDate = new Date(startDate.getTime() - duration);

          const previousPeriodTransactions = yield* transactionRepository
            .getTransactionHistory(userId, prevStartDate, prevEndDate)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "getTransactionHistory",
                    table: "transactions",
                    message:
                      (error as any).message ||
                      "Failed to fetch previous period transactions",
                  })
              )
            );

          // Helper to process transactions
          const processSpending = (
            transactions: typeof currentPeriodTransactions
          ) => {
            const spendingTxs = transactions.filter((tx) => tx.isDebit());
            const total = spendingTxs.reduce(
              (sum, tx) => sum + tx.amount.value,
              0
            );
            return { total, transactions: spendingTxs };
          };

          const current = processSpending(currentPeriodTransactions);
          const previous = processSpending(previousPeriodTransactions);

          // Calculate Category Breakdown
          const categoryMap = new Map<
            string,
            { amount: number; count: number }
          >();

          for (const tx of current.transactions) {
            // Using transaction type as category since we don't have granular categories yet
            const category = tx.type;
            const currentData = categoryMap.get(category) || {
              amount: 0,
              count: 0,
            };
            categoryMap.set(category, {
              amount: currentData.amount + tx.amount.value,
              count: currentData.count + 1,
            });
          }

          const categoryBreakdown = Array.from(categoryMap.entries()).map(
            ([category, data]) => ({
              category: category.replace("_", " ").toUpperCase(), // Format: "WALLET_WITHDRAWAL" -> "WALLET WITHDRAWAL"
              amount: data.amount,
              percentage:
                current.total > 0 ? (data.amount / current.total) * 100 : 0,
              transactionCount: data.count,
            })
          );

          // Calculate Average Daily Spending
          const daysDiff = Math.max(
            1,
            Math.ceil(duration / (1000 * 60 * 60 * 24))
          );
          const averageDailySpending = current.total / daysDiff;

          // Comparison
          let percentageChange = 0;
          let trend: "increasing" | "decreasing" | "stable" = "stable";

          if (previous.total > 0) {
            percentageChange =
              ((current.total - previous.total) / previous.total) * 100;
          } else if (current.total > 0) {
            percentageChange = 100; // 100% increase from 0
          }

          if (percentageChange > 5) trend = "increasing";
          else if (percentageChange < -5) trend = "decreasing";

          // Insights generation
          const insights: string[] = [];

          if (current.total > previous.total) {
            insights.push(
              `Spending increased by ${Math.abs(percentageChange).toFixed(
                1
              )}% compared to last period.`
            );
          } else if (current.total < previous.total) {
            insights.push(
              `Great job! You cut spending by ${Math.abs(
                percentageChange
              ).toFixed(1)}%.`
            );
          } else {
            insights.push("Spending remained stable compared to last period.");
          }

          if (categoryBreakdown.length > 0) {
            const topCategory = categoryBreakdown.sort(
              (a, b) => b.amount - a.amount
            )[0];
            if (topCategory) {
              insights.push(
                `Your highest spending was on ${topCategory.category} (${topCategory.percentage.toFixed(
                  1
                )}%).`
              );
            }
          }

          // Recommendations
          const recommendations: string[] = [];
          if (trend === "increasing") {
            recommendations.push(
              "Review your recent withdrawals to identify areas to cut back."
            );
          }
          if (current.total === 0) {
            recommendations.push(
              "No spending recorded this period. Keep saving!"
            );
          }

          return {
            totalSpent: current.total,
            categoryBreakdown,
            averageDailySpending,
            comparisonToPreviousPeriod: {
              percentageChange,
              trend,
            },
            insights,
            recommendations,
          };
        }),
    };
  })
);
