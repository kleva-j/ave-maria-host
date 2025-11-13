// Analytics and Reporting Validation Schemas using Effect Schema
// Input/output schemas for analytics and insights operations

import { Schema } from "effect";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for getting savings analytics
 */
export class GetSavingsAnalyticsSchema extends Schema.Class<GetSavingsAnalyticsSchema>(
  "GetSavingsAnalyticsSchema"
)({
  startDate: Schema.optional(Schema.DateTimeUtc),
  endDate: Schema.optional(Schema.DateTimeUtc),
  granularity: Schema.optional(
    Schema.Literal("daily", "weekly", "monthly", "yearly")
  ),
}) {}

export type GetSavingsAnalyticsInput = typeof GetSavingsAnalyticsSchema.Type;

/**
 * Schema for generating progress report
 */
export class GenerateProgressReportSchema extends Schema.Class<GenerateProgressReportSchema>(
  "GenerateProgressReportSchema"
)({
  planId: Schema.optional(
    Schema.UUID.annotations({ message: () => "Invalid plan ID format" })
  ),
  reportType: Schema.Literal("summary", "detailed", "comparison").pipe(
    Schema.annotations({
      description: "Type of progress report to generate",
    })
  ),
  includeProjections: Schema.optional(Schema.Boolean),
}) {}

export type GenerateProgressReportInput =
  typeof GenerateProgressReportSchema.Type;

/**
 * Schema for calculating rewards
 */
export class CalculateRewardsSchema extends Schema.Class<CalculateRewardsSchema>(
  "CalculateRewardsSchema"
)({
  period: Schema.optional(
    Schema.Literal("current_month", "last_month", "all_time")
  ),
}) {}

export type CalculateRewardsInput = typeof CalculateRewardsSchema.Type;

/**
 * Schema for getting spending insights
 */
export class GetSpendingInsightsSchema extends Schema.Class<GetSpendingInsightsSchema>(
  "GetSpendingInsightsSchema"
)({
  startDate: Schema.DateTimeUtc,
  endDate: Schema.DateTimeUtc,
  categories: Schema.optional(Schema.Array(Schema.String)),
}) {}

export type GetSpendingInsightsInput = typeof GetSpendingInsightsSchema.Type;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for savings trend data point
 */
export class SavingsTrendDataPointSchema extends Schema.Class<SavingsTrendDataPointSchema>(
  "SavingsTrendDataPointSchema"
)({
  date: Schema.DateTimeUtc,
  amount: Schema.Number,
  contributionCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
}) {}

export type SavingsTrendDataPoint = typeof SavingsTrendDataPointSchema.Type;

/**
 * Schema for top performing plan
 */
export class TopPerformingPlanSchema extends Schema.Class<TopPerformingPlanSchema>(
  "TopPerformingPlanSchema"
)({
  planId: Schema.UUID,
  planName: Schema.String,
  totalSaved: Schema.Number,
}) {}

export type TopPerformingPlan = typeof TopPerformingPlanSchema.Type;

/**
 * Schema for savings analytics response
 */
export class GetSavingsAnalyticsOutputSchema extends Schema.Class<GetSavingsAnalyticsOutputSchema>(
  "GetSavingsAnalyticsOutputSchema"
)({
  totalSaved: Schema.Number,
  averageDailyContribution: Schema.Number,
  contributionFrequency: Schema.Number,
  savingsGrowthRate: Schema.Number,
  trendData: Schema.Array(SavingsTrendDataPointSchema),
  topPerformingPlan: Schema.NullOr(TopPerformingPlanSchema),
  insights: Schema.Array(Schema.String),
}) {}

export type GetSavingsAnalyticsOutput =
  typeof GetSavingsAnalyticsOutputSchema.Type;

/**
 * Schema for plan comparison data
 */
export class PlanComparisonSchema extends Schema.Class<PlanComparisonSchema>(
  "PlanComparisonSchema"
)({
  planId: Schema.UUID,
  planName: Schema.String,
  targetAmount: Schema.Number,
  currentAmount: Schema.Number,
  progressPercentage: Schema.Number.pipe(Schema.between(0, 100)),
  daysActive: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  averageDailyContribution: Schema.Number,
}) {}

export type PlanComparison = typeof PlanComparisonSchema.Type;

/**
 * Schema for Report Summary
 */
export class ReportSummarySchema extends Schema.Class<ReportSummarySchema>(
  "ReportSummarySchema"
)({
  totalPlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  activePlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  completedPlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  totalSaved: Schema.Number.pipe(Schema.nonNegative()),
  totalTarget: Schema.Number.pipe(Schema.nonNegative()),
  overallProgress: Schema.Number.pipe(Schema.between(0, 100)),
}) {}

export type ReportSummary = typeof ReportSummarySchema.Type;

/**
 * Schema for Report Projections
 */
export class ReportProjectionsSchema extends Schema.Class<ReportProjectionsSchema>(
  "ReportProjectionsSchema"
)({
  estimatedCompletionDate: Schema.DateTimeUtc,
  projectedTotalSavings: Schema.Number,
  recommendedDailyAmount: Schema.Number,
}) {}

export type ReportProjections = typeof ReportProjectionsSchema.Type;

/**
 * Schema for progress report response
 */
export class GenerateProgressReportOutputSchema extends Schema.Class<GenerateProgressReportOutputSchema>(
  "GenerateProgressReportOutputSchema"
)({
  reportId: Schema.UUID,
  generatedAt: Schema.DateTimeUtc,
  summary: ReportSummarySchema,
  planComparisons: Schema.optional(Schema.Array(PlanComparisonSchema)),
  projections: Schema.optional(ReportProjectionsSchema),
  achievements: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      description: Schema.String,
      earnedAt: Schema.DateTimeUtc,
    })
  ),
}) {}

export type GenerateProgressReportOutput =
  typeof GenerateProgressReportOutputSchema.Type;

/**
 * Schema for reward details
 */
export class RewardSchema extends Schema.Class<RewardSchema>("RewardSchema")({
  id: Schema.UUID,
  type: Schema.Literal("badge", "points", "discount", "cashback"),
  title: Schema.String,
  description: Schema.String,
  value: Schema.Number,
  earnedAt: Schema.DateTimeUtc,
  expiresAt: Schema.NullOr(Schema.DateTimeUtc),
  isRedeemed: Schema.Boolean,
}) {}

export type Reward = typeof RewardSchema.Type;

/**
 * Next Milestone
 */
export class NextMilestoneSchema extends Schema.Class<NextMilestoneSchema>(
  "NextMilestoneSchema"
)({
  title: Schema.String,
  requiredPoints: Schema.Number.pipe(Schema.int()),
  currentPoints: Schema.Number.pipe(Schema.int()),
  progressPercentage: Schema.Number.pipe(Schema.between(0, 100)),
}) {}

export type NextMilestone = typeof NextMilestoneSchema.Type;

/**
 * Schema for calculate rewards response
 */
export class CalculateRewardsOutputSchema extends Schema.Class<CalculateRewardsOutputSchema>(
  "CalculateRewardsOutputSchema"
)({
  totalPoints: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  availableRewards: Schema.Array(RewardSchema),
  nextMilestone: Schema.NullOr(NextMilestoneSchema),
  streakBonus: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  recommendations: Schema.Array(Schema.String),
}) {}

export type CalculateRewardsOutput = typeof CalculateRewardsOutputSchema.Type;

/**
 * Schema for spending category breakdown
 */
export class SpendingCategorySchema extends Schema.Class<SpendingCategorySchema>(
  "SpendingCategorySchema"
)({
  category: Schema.String,
  amount: Schema.Number,
  percentage: Schema.Number.pipe(Schema.between(0, 100)),
  transactionCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
}) {}

export type SpendingCategory = typeof SpendingCategorySchema.Type;

/**
 * Comparison To Previous Period
 */
export class ComparisonToPreviousPeriodSchema extends Schema.Class<ComparisonToPreviousPeriodSchema>(
  "ComparisonToPreviousPeriodSchema"
)({
  percentageChange: Schema.Number,
  trend: Schema.Literal("increasing", "decreasing", "stable"),
}) {}

export type ComparisonToPreviousPeriod =
  typeof ComparisonToPreviousPeriodSchema.Type;

/**
 * Schema for spending insights response
 */
export class GetSpendingInsightsOutputSchema extends Schema.Class<GetSpendingInsightsOutputSchema>(
  "GetSpendingInsightsOutputSchema"
)({
  totalSpent: Schema.Number,
  categoryBreakdown: Schema.Array(SpendingCategorySchema),
  averageDailySpending: Schema.Number,
  comparisonToPreviousPeriod: ComparisonToPreviousPeriodSchema,
  insights: Schema.Array(Schema.String),
  recommendations: Schema.Array(Schema.String),
}) {}

export type GetSpendingInsightsOutput =
  typeof GetSpendingInsightsOutputSchema.Type;

/**
 * Schema for achievement/badge
 */
export class AchievementSchema extends Schema.Class<AchievementSchema>(
  "AchievementSchema"
)({
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
}) {}

export type Achievement = typeof AchievementSchema.Type;

/**
 * Schema for user achievements list
 */
export class GetAchievementsSchema extends Schema.Class<GetAchievementsSchema>(
  "GetAchievementsSchema"
)({}) {}

export type GetAchievementsInput = typeof GetAchievementsSchema.Type;

export class GetAchievementsOutputSchema extends Schema.Class<GetAchievementsOutputSchema>(
  "GetAchievementsOutputSchema"
)({
  achievements: Schema.Array(AchievementSchema),
  totalUnlocked: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  totalAvailable: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  recentlyEarned: Schema.Array(AchievementSchema),
}) {}

export type GetAchievementsOutput = typeof GetAchievementsOutputSchema.Type;
