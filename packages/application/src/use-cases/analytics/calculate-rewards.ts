import type { TransactionRepository, SavingsRepository } from "@host/domain";

import { Effect, Context, Layer } from "effect";
import { UserId } from "@host/domain";
import { Schema } from "effect";

import {
  type FinancialError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for calculating rewards
 */
export const CalculateRewardsInput = Schema.Struct({
  userId: Schema.UUID,
});

export type CalculateRewardsInput = typeof CalculateRewardsInput.Type;

/**
 * Badge types for gamification
 */
export type BadgeType =
  | "first_contribution"
  | "week_streak"
  | "month_streak"
  | "quarter_streak"
  | "year_streak"
  | "first_plan_completed"
  | "five_plans_completed"
  | "ten_plans_completed"
  | "savings_champion"
  | "consistent_saver"
  | "goal_crusher"
  | "early_bird"
  | "night_owl";

/**
 * Badge definition
 */
export interface Badge {
  readonly type: BadgeType;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly earnedDate?: Date;
}

/**
 * Reward tier levels
 */
export const RewardTier = {
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Platinum: "platinum",
  Diamond: "diamond",
} as const;

export const RewardTierSchema = Schema.Literal(
  RewardTier.Bronze,
  RewardTier.Silver,
  RewardTier.Gold,
  RewardTier.Platinum,
  RewardTier.Diamond
);
export type RewardTier = typeof RewardTierSchema.Type;

/**
 * Output from calculating rewards
 */
export interface CalculateRewardsOutput {
  readonly totalPoints: number;
  readonly currentTier: RewardTier;
  readonly nextTier: RewardTier | null;
  readonly pointsToNextTier: number;
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
    const allBadges: Record<BadgeType, Omit<Badge, "earnedDate">> = {
      first_contribution: {
        type: "first_contribution",
        name: "First Step",
        description: "Made your first contribution",
        icon: "🎯",
      },
      week_streak: {
        type: "week_streak",
        name: "Week Warrior",
        description: "Maintained a 7-day saving streak",
        icon: "🔥",
      },
      month_streak: {
        type: "month_streak",
        name: "Monthly Master",
        description: "Maintained a 30-day saving streak",
        icon: "⭐",
      },
      quarter_streak: {
        type: "quarter_streak",
        name: "Quarterly Champion",
        description: "Maintained a 90-day saving streak",
        icon: "🏆",
      },
      year_streak: {
        type: "year_streak",
        name: "Annual Legend",
        description: "Maintained a 365-day saving streak",
        icon: "👑",
      },
      first_plan_completed: {
        type: "first_plan_completed",
        name: "Goal Achiever",
        description: "Completed your first savings plan",
        icon: "✅",
      },
      five_plans_completed: {
        type: "five_plans_completed",
        name: "Savings Pro",
        description: "Completed 5 savings plans",
        icon: "💪",
      },
      ten_plans_completed: {
        type: "ten_plans_completed",
        name: "Savings Master",
        description: "Completed 10 savings plans",
        icon: "🎖️",
      },
      savings_champion: {
        type: "savings_champion",
        name: "Savings Champion",
        description: "Saved over 100,000 in total",
        icon: "💎",
      },
      consistent_saver: {
        type: "consistent_saver",
        name: "Consistent Saver",
        description: "Made contributions for 30 consecutive days",
        icon: "📈",
      },
      goal_crusher: {
        type: "goal_crusher",
        name: "Goal Crusher",
        description: "Exceeded your savings target by 20%",
        icon: "🚀",
      },
      early_bird: {
        type: "early_bird",
        name: "Early Bird",
        description: "Made contributions before 9 AM for 7 days",
        icon: "🌅",
      },
      night_owl: {
        type: "night_owl",
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
            (tx) => tx.type === "contribution" && tx.isCompleted()
          ).length;

          // Points for completed plans (100 points per plan)
          const completedPlans = allPlans.filter(
            (p) => p.status === "completed"
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
          let currentTier: RewardTier = RewardTier.Bronze;
          let nextTier: RewardTier | null = RewardTier.Silver;
          let pointsToNextTier = 500;

          if (totalPoints >= 5000) {
            currentTier = RewardTier.Diamond;
            nextTier = null;
            pointsToNextTier = 0;
          } else if (totalPoints >= 2500) {
            currentTier = RewardTier.Platinum;
            nextTier = RewardTier.Diamond;
            pointsToNextTier = 5000 - totalPoints;
          } else if (totalPoints >= 1000) {
            currentTier = RewardTier.Gold;
            nextTier = RewardTier.Platinum;
            pointsToNextTier = 2500 - totalPoints;
          } else if (totalPoints >= 500) {
            currentTier = RewardTier.Silver;
            nextTier = RewardTier.Gold;
            pointsToNextTier = 1000 - totalPoints;
          }

          // Calculate earned badges
          const earnedBadges: Badge[] = [];
          const newBadges: Badge[] = [];

          // Check badge criteria
          if (allTransactions.length > 0 && allTransactions[0]) {
            earnedBadges.push({
              ...allBadges.first_contribution,
              earnedDate: allTransactions[0].createdAt,
            });
          }

          if (currentStreak >= 7) {
            earnedBadges.push({
              ...allBadges.week_streak,
              earnedDate: new Date(),
            });
          }

          if (currentStreak >= 30) {
            earnedBadges.push({
              ...allBadges.month_streak,
              earnedDate: new Date(),
            });
          }

          if (currentStreak >= 90) {
            earnedBadges.push({
              ...allBadges.quarter_streak,
              earnedDate: new Date(),
            });
          }

          if (currentStreak >= 365) {
            earnedBadges.push({
              ...allBadges.year_streak,
              earnedDate: new Date(),
            });
          }

          if (completedPlans.length >= 1 && completedPlans[0]) {
            earnedBadges.push({
              ...allBadges.first_plan_completed,
              earnedDate: completedPlans[0].updatedAt,
            });
          }

          if (completedPlans.length >= 5) {
            earnedBadges.push({
              ...allBadges.five_plans_completed,
              earnedDate: new Date(),
            });
          }

          if (completedPlans.length >= 10) {
            earnedBadges.push({
              ...allBadges.ten_plans_completed,
              earnedDate: new Date(),
            });
          }

          const totalSaved = allPlans.reduce(
            (sum, p) => sum + p.currentAmount.value,
            0
          );
          if (totalSaved >= 100000) {
            earnedBadges.push({
              ...allBadges.savings_champion,
              earnedDate: new Date(),
            });
          }

          if (currentStreak >= 30) {
            earnedBadges.push({
              ...allBadges.consistent_saver,
              earnedDate: new Date(),
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
