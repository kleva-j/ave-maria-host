import type { TransactionRepository, SavingsRepository } from "@host/domain";
import type { FinancialError, RewardTier, Badge } from "@host/shared";

import { Effect, Context, Layer, Schema } from "effect";
import { UserId } from "@host/domain";

import {
  RewardsTierThresholdEnum,
  RewardsBadgeTypeEnum,
  TransactionTypeEnum,
  RewardBadgeSchema,
  RewardTierSchema,
  ValidationError,
  RewardsTierEnum,
  PlanStatusEnum,
  DatabaseError,
} from "@host/shared";

/**
 * Input for calculating rewards
 */
export const CalculateRewardsInput = Schema.Struct({
  userId: UserId,
});

export type CalculateRewardsInput = typeof CalculateRewardsInput.Type;

/**
 * Output from calculating rewards
 */
export interface CalculateRewardsOutput {
  readonly totalPoints: number;
  readonly currentTier: RewardTier;
  readonly nextTier: RewardTier | null;
  readonly pointsToNextTier: number;
  readonly tierProgress: number; // Percentage progress within the current tier (0-100)
  readonly badges: Badge[];
  readonly newBadges: Badge[]; // Badges earned in this calculation
  readonly achievements: Array<{
    readonly title: string;
    readonly description: string;
    readonly points: number;
    readonly completedDate: Date;
  }>;
  readonly streakBonus: number;
  readonly completionBonus: number;
  readonly consistencyBonus: number;
  readonly recommendations: string[];
}

/**
 * Use case for calculating user rewards and gamification features
 * Awards badges, points, and provides motivation for continued saving
 */
export interface CalculateRewardsUseCase {
  readonly execute: (
    input: CalculateRewardsInput
  ) => Effect.Effect<CalculateRewardsOutput, FinancialError>;
}

export const CalculateRewardsUseCase =
  Context.GenericTag<CalculateRewardsUseCase>("@app/CalculateRewardsUseCase");

/**
 * Live implementation of CalculateRewardsUseCase
 */
export const CalculateRewardsUseCaseLive = Layer.effect(
  CalculateRewardsUseCase,
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

    // Badge definitions
    const allBadges: Record<string, Omit<Badge, "earnedDate">> = {
      [RewardsBadgeTypeEnum.FIRST_CONTRIBUTION]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.FIRST_CONTRIBUTION),
        name: "First Step",
        description: "Made your first contribution",
        icon: "🎯",
      },
      [RewardsBadgeTypeEnum.WEEK_STREAK]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.WEEK_STREAK),
        name: "Week Warrior",
        description: "Maintained a 7-day saving streak",
        icon: "🔥",
      },
      [RewardsBadgeTypeEnum.MONTH_STREAK]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.MONTH_STREAK),
        name: "Monthly Master",
        description: "Maintained a 30-day saving streak",
        icon: "⭐",
      },
      [RewardsBadgeTypeEnum.QUARTER_STREAK]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.QUARTER_STREAK),
        name: "Quarterly Champion",
        description: "Maintained a 90-day saving streak",
        icon: "🏆",
      },
      [RewardsBadgeTypeEnum.YEAR_STREAK]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.YEAR_STREAK),
        name: "Annual Legend",
        description: "Maintained a 365-day saving streak",
        icon: "👑",
      },
      [RewardsBadgeTypeEnum.FIRST_PLAN_COMPLETED]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.FIRST_PLAN_COMPLETED),
        name: "Goal Achiever",
        description: "Completed your first savings plan",
        icon: "✅",
      },
      [RewardsBadgeTypeEnum.FIVE_PLANS_COMPLETED]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.FIVE_PLANS_COMPLETED),
        name: "Savings Pro",
        description: "Completed 5 savings plans",
        icon: "💪",
      },
      [RewardsBadgeTypeEnum.TEN_PLANS_COMPLETED]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.TEN_PLANS_COMPLETED),
        name: "Savings Master",
        description: "Completed 10 savings plans",
        icon: "🎖️",
      },
      [RewardsBadgeTypeEnum.SAVINGS_CHAMPION]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.SAVINGS_CHAMPION),
        name: "Savings Champion",
        description: "Saved over 100,000 in total",
        icon: "💎",
      },
      [RewardsBadgeTypeEnum.CONSISTENT_SAVER]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.CONSISTENT_SAVER),
        name: "Consistent Saver",
        description: "Made contributions for 30 consecutive days",
        icon: "📈",
      },
      [RewardsBadgeTypeEnum.GOAL_CRUSHER]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.GOAL_CRUSHER),
        name: "Goal Crusher",
        description: "Exceeded your savings target by 20%",
        icon: "🚀",
      },
      [RewardsBadgeTypeEnum.EARLY_BIRD]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.EARLY_BIRD),
        name: "Early Bird",
        description: "Made contributions before 9 AM for 7 days",
        icon: "🌅",
      },
      [RewardsBadgeTypeEnum.NIGHT_OWL]: {
        type: RewardBadgeSchema.make(RewardsBadgeTypeEnum.NIGHT_OWL),
        name: "Night Owl",
        description: "Made contributions after 9 PM for 7 days",
        icon: "🌙",
      },
    };

    return {
      execute: (input: CalculateRewardsInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            CalculateRewardsInput
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

          // Get all user's transactions
          const allTransactions = yield* transactionRepository
            .findByUserId(userId)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "findByUserId",
                    table: "transactions",
                    message:
                      error.message || "Failed to fetch user transactions",
                  })
              )
            );

          // Calculate total points
          let totalPoints = 0;

          // Points for contributions (1 point per contribution)
          totalPoints += allTransactions.filter(
            (tx) =>
              tx.type === TransactionTypeEnum.CONTRIBUTION && tx.isCompleted()
          ).length;

          // Points for completed plans (100 points per plan)
          const completedPlans = allPlans.filter(
            (p) => p.status === PlanStatusEnum.COMPLETED
          );
          totalPoints += completedPlans.length * 100;

          // Calculate streak bonus
          const currentStreak = Math.max(
            ...allPlans.map((p) => p.contributionStreak),
            0
          );
          const streakBonus = Math.floor(currentStreak / 7) * 50; // 50 points per week
          totalPoints += streakBonus;

          // Calculate completion bonus
          const completionBonus = completedPlans.length * 100;

          // Calculate consistency bonus (based on average streak)
          const avgStreak =
            allPlans.length > 0
              ? allPlans.reduce((sum, p) => sum + p.contributionStreak, 0) /
                allPlans.length
              : 0;
          const consistencyBonus = Math.floor(avgStreak / 10) * 25; // 25 points per 10-day average
          totalPoints += consistencyBonus;

          // Determine tier
          let currentTier: RewardTier = RewardTierSchema.make(
            RewardsTierEnum.BRONZE
          );
          let nextTier: RewardTier | null = RewardTierSchema.make(
            RewardsTierEnum.SILVER
          );
          let pointsToNextTier = 500;
          let tierProgress = 0;

          if (
            totalPoints >= RewardsTierThresholdEnum[RewardsTierEnum.DIAMOND]
          ) {
            currentTier = RewardTierSchema.make(RewardsTierEnum.DIAMOND);
            nextTier = null;
            pointsToNextTier = 0;
            tierProgress = 100;
          } else if (
            totalPoints >= RewardsTierThresholdEnum[RewardsTierEnum.PLATINUM]
          ) {
            currentTier = RewardTierSchema.make(RewardsTierEnum.PLATINUM);
            nextTier = RewardTierSchema.make(RewardsTierEnum.DIAMOND);
            pointsToNextTier =
              RewardsTierThresholdEnum[RewardsTierEnum.DIAMOND] - totalPoints;
            tierProgress =
              ((totalPoints -
                RewardsTierThresholdEnum[RewardsTierEnum.PLATINUM]) /
                (RewardsTierThresholdEnum[RewardsTierEnum.DIAMOND] -
                  RewardsTierThresholdEnum[RewardsTierEnum.PLATINUM])) *
              100;
          } else if (
            totalPoints >= RewardsTierThresholdEnum[RewardsTierEnum.GOLD]
          ) {
            currentTier = RewardTierSchema.make(RewardsTierEnum.GOLD);
            nextTier = RewardTierSchema.make(RewardsTierEnum.PLATINUM);
            pointsToNextTier =
              RewardsTierThresholdEnum[RewardsTierEnum.PLATINUM] - totalPoints;
            tierProgress =
              ((totalPoints - RewardsTierThresholdEnum[RewardsTierEnum.GOLD]) /
                (RewardsTierThresholdEnum[RewardsTierEnum.PLATINUM] -
                  RewardsTierThresholdEnum[RewardsTierEnum.GOLD])) *
              100;
          } else if (
            totalPoints >= RewardsTierThresholdEnum[RewardsTierEnum.SILVER]
          ) {
            currentTier = RewardTierSchema.make(RewardsTierEnum.SILVER);
            nextTier = RewardTierSchema.make(RewardsTierEnum.GOLD);
            pointsToNextTier =
              RewardsTierThresholdEnum[RewardsTierEnum.GOLD] - totalPoints;
            tierProgress =
              ((totalPoints -
                RewardsTierThresholdEnum[RewardsTierEnum.SILVER]) /
                (RewardsTierThresholdEnum[RewardsTierEnum.GOLD] -
                  RewardsTierThresholdEnum[RewardsTierEnum.SILVER])) *
              100;
          } else {
            // Bronze Tier
            currentTier = RewardTierSchema.make(RewardsTierEnum.BRONZE);
            nextTier = RewardTierSchema.make(RewardsTierEnum.SILVER);
            pointsToNextTier =
              RewardsTierThresholdEnum[RewardsTierEnum.SILVER] - totalPoints;
            tierProgress =
              (totalPoints / RewardsTierThresholdEnum[RewardsTierEnum.SILVER]) *
              100;
          }

          // Calculate earned badges
          const earnedBadges: Badge[] = [];
          const newBadges: Badge[] = [];
          const earnedDate = new Date();

          // Check badge criteria
          if (allTransactions.length > 0 && allTransactions[0]) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.FIRST_CONTRIBUTION]!,
              earnedDate: allTransactions[0].createdAt,
            });
          }

          if (currentStreak >= 7) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.WEEK_STREAK]!,
              earnedDate,
            });
          }

          if (currentStreak >= 30) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.MONTH_STREAK]!,
              earnedDate,
            });
          }

          if (currentStreak >= 90) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.QUARTER_STREAK]!,
              earnedDate,
            });
          }

          if (currentStreak >= 365) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.YEAR_STREAK]!,
              earnedDate,
            });
          }

          if (completedPlans.length >= 1 && completedPlans[0]) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.FIRST_PLAN_COMPLETED]!,
              earnedDate: completedPlans[0].updatedAt,
            });
          }

          if (completedPlans.length >= 5) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.FIVE_PLANS_COMPLETED]!,
              earnedDate,
            });
          }

          if (completedPlans.length >= 10) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.TEN_PLANS_COMPLETED]!,
              earnedDate,
            });
          }

          const totalSaved = allPlans.reduce(
            (sum, p) => sum + p.currentAmount.value,
            0
          );
          if (totalSaved >= 100000) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.SAVINGS_CHAMPION]!,
              earnedDate,
            });
          }

          if (currentStreak >= 30) {
            earnedBadges.push({
              ...allBadges[RewardsBadgeTypeEnum.CONSISTENT_SAVER]!,
              earnedDate,
            });
          }

          // Build achievements list
          const achievements = completedPlans.map((plan) => ({
            title: `Completed: ${plan.planName}`,
            description: `Successfully saved ${plan.currentAmount.value} ${plan.currentAmount.currency}`,
            points: 100,
            completedDate: plan.updatedAt,
          }));

          // Generate recommendations
          const recommendations: string[] = [];

          if (currentStreak < 7) {
            recommendations.push(
              "Build a 7-day streak to earn the Week Warrior badge!"
            );
          }

          if (completedPlans.length === 0 && allPlans.length > 0) {
            recommendations.push(
              "Complete your first plan to earn 100 bonus points!"
            );
          }

          if (nextTier) {
            recommendations.push(
              `You're ${pointsToNextTier} points away from ${nextTier} tier!`
            );
          }

          if (totalSaved < 100000 && totalSaved > 50000) {
            recommendations.push(
              "You're halfway to the Savings Champion badge. Keep going!"
            );
          }

          return {
            totalPoints,
            currentTier,
            nextTier,
            pointsToNextTier,
            tierProgress,
            badges: earnedBadges,
            newBadges, // In a real implementation, this would track newly earned badges
            achievements,
            streakBonus,
            completionBonus,
            consistencyBonus,
            recommendations,
          };
        }),
    };
  })
);
