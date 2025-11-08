// Analytics and Reporting Validation Schemas using Effect Schema
// Input/output schemas for analytics and insights operations

import { Schema } from "@effect/schema";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for getting savings analytics
 */
export const GetSavingsAnalyticsSchema = Schema.Struct({
  startDate: Schema.optional(Schema.DateTimeUtc),
  endDate: Schema.optional(Schema.DateTimeUtc),
  granularity: Schema.optional(
    Schema.Literal("daily", "weekly", "monthly", "yearly")
  ),
});

export type GetSavingsAnalyticsInput = Schema.Schema.Type<
  typeof GetSavingsAnalyticsSchema
>;

/**
 * Schema for generating progress report
 */
export const GenerateProgressReportSchema = Schema.Struct({
  planId: Schema.optional(
    Schema.UUID.annotations({ message: () => "Invalid plan ID format" })
  ),
  reportType: Schema.Literal("summary", "detailed", "comparison").pipe(
    Schema.annotations({
      description: "Type of progress report to generate",
    })
  ),
  includeProjections: Schema.optional(Schema.Boolean),
});

export type GenerateProgressReportInput = Schema.Schema.Type<
  typeof GenerateProgressReportSchema
>;

/**
 * Schema for calculating rewards
 */
export const CalculateRewardsSchema = Schema.Struct({
  period: Schema.optional(
    Schema.Literal("current_month", "last_month", "all_time")
  ),
});

export type CalculateRewardsInput = Schema.Schema.Type<
  typeof CalculateRewardsSchema
>;

/**
 * Schema for getting spending insights
 */
export const GetSpendingInsightsSchema = Schema.Struct({
  startDate: Schema.DateTimeUtc,
  endDate: Schema.DateTimeUtc,
  categories: Schema.optional(Schema.Array(Schema.String)),
});

export type GetSpendingInsightsInput = Schema.Schema.Type<
  typeof GetSpendingInsightsSchema
>;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for savings trend data point
 */
export const SavingsTrendDataPointSchema = Schema.Struct({
  date: Schema.DateTimeUtc,
  amount: Schema.Number,
  contributionCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
});

export type SavingsTrendDataPoint = Schema.Schema.Type<
  typeof SavingsTrendDataPointSchema
>;

/**
 * Schema for savings analytics response
 */
export const GetSavingsAnalyticsOutputSchema = Schema.Struct({
  totalSaved: Schema.Number,
  averageDailyContribution: Schema.Number,
  contributionFrequency: Schema.Number,
  savingsGrowthRate: Schema.Number,
  trendData: Schema.Array(SavingsTrendDataPointSchema),
  topPerformingPlan: Schema.NullOr(
    Schema.Struct({
      planId: Schema.UUID,
      planName: Schema.String,
      totalSaved: Schema.Number,
    })
  ),
  insights: Schema.Array(Schema.String),
});

export type GetSavingsAnalyticsOutput = Schema.Schema.Type<
  typeof GetSavingsAnalyticsOutputSchema
>;

/**
 * Schema for plan comparison data
 */
export const PlanComparisonSchema = Schema.Struct({
  planId: Schema.UUID,
  planName: Schema.String,
  targetAmount: Schema.Number,
  currentAmount: Schema.Number,
  progressPercentage: Schema.Number.pipe(Schema.between(0, 100)),
  daysActive: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  averageDailyContribution: Schema.Number,
});

export type PlanComparison = Schema.Schema.Type<typeof PlanComparisonSchema>;

/**
 * Schema for progress report response
 */
export const GenerateProgressReportOutputSchema = Schema.Struct({
  reportId: Schema.UUID,
  generatedAt: Schema.DateTimeUtc,
  summary: Schema.Struct({
    totalPlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    activePlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    completedPlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    totalSaved: Schema.Number,
    totalTarget: Schema.Number,
    overallProgress: Schema.Number.pipe(Schema.between(0, 100)),
  }),
  planComparisons: Schema.optional(Schema.Array(PlanComparisonSchema)),
  projections: Schema.optional(
    Schema.Struct({
      estimatedCompletionDate: Schema.DateTimeUtc,
      projectedTotalSavings: Schema.Number,
      recommendedDailyAmount: Schema.Number,
    })
  ),
  achievements: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      description: Schema.String,
      earnedAt: Schema.DateTimeUtc,
    })
  ),
});

export type GenerateProgressReportOutput = Schema.Schema.Type<
  typeof GenerateProgressReportOutputSchema
>;

/**
 * Schema for reward details
 */
export const RewardSchema = Schema.Struct({
  id: Schema.UUID,
  type: Schema.Literal("badge", "points", "discount", "cashback"),
  title: Schema.String,
  description: Schema.String,
  value: Schema.Number,
  earnedAt: Schema.DateTimeUtc,
  expiresAt: Schema.NullOr(Schema.DateTimeUtc),
  isRedeemed: Schema.Boolean,
});

export type Reward = Schema.Schema.Type<typeof RewardSchema>;

/**
 * Schema for calculate rewards response
 */
export const CalculateRewardsOutputSchema = Schema.Struct({
  totalPoints: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  availableRewards: Schema.Array(RewardSchema),
  nextMilestone: Schema.NullOr(
    Schema.Struct({
      title: Schema.String,
      requiredPoints: Schema.Number.pipe(Schema.int()),
      currentPoints: Schema.Number.pipe(Schema.int()),
      progressPercentage: Schema.Number.pipe(Schema.between(0, 100)),
    })
  ),
  streakBonus: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  recommendations: Schema.Array(Schema.String),
});

export type CalculateRewardsOutput = Schema.Schema.Type<
  typeof CalculateRewardsOutputSchema
>;

/**
 * Schema for spending category breakdown
 */
export const SpendingCategorySchema = Schema.Struct({
  category: Schema.String,
  amount: Schema.Number,
  percentage: Schema.Number.pipe(Schema.between(0, 100)),
  transactionCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
});

export type SpendingCategory = Schema.Schema.Type<
  typeof SpendingCategorySchema
>;

/**
 * Schema for spending insights response
 */
export const GetSpendingInsightsOutputSchema = Schema.Struct({
  totalSpent: Schema.Number,
  categoryBreakdown: Schema.Array(SpendingCategorySchema),
  averageDailySpending: Schema.Number,
  comparisonToPreviousPeriod: Schema.Struct({
    percentageChange: Schema.Number,
    trend: Schema.Literal("increasing", "decreasing", "stable"),
  }),
  insights: Schema.Array(Schema.String),
  recommendations: Schema.Array(Schema.String),
});

export type GetSpendingInsightsOutput = Schema.Schema.Type<
  typeof GetSpendingInsightsOutputSchema
>;

/**
 * Schema for achievement/badge
 */
export const AchievementSchema = Schema.Struct({
  id: Schema.UUID,
  title: Schema.String,
  description: Schema.String,
  iconUrl: Schema.String,
  category: Schema.Literal(
    "savings",
    "consistency",
    "milestone",
    "social",
    "special"
  ),
  earnedAt: Schema.NullOr(Schema.DateTimeUtc),
  progress: Schema.Number.pipe(Schema.between(0, 100)),
  isUnlocked: Schema.Boolean,
});

export type Achievement = Schema.Schema.Type<typeof AchievementSchema>;

/**
 * Schema for user achievements list
 */
export const GetAchievementsOutputSchema = Schema.Struct({
  achievements: Schema.Array(AchievementSchema),
  totalUnlocked: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  totalAvailable: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  recentlyEarned: Schema.Array(AchievementSchema),
});

export type GetAchievementsOutput = Schema.Schema.Type<
  typeof GetAchievementsOutputSchema
>;
