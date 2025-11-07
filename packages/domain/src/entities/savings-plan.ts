import { Schema } from "@effect/schema";

import { type UserId, PlanId, Money, PlanProgress } from "../value-objects";

/**
 * Savings plan status values
 */
export const PlanStatusEnum = {
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

const DEFAULT_AUTO_SAVE_TIME = "09:00";
const DEFAULT_AUTO_SAVE_ENABLED = false;
const DEFAULT_INTEREST_RATE = 0.0;

/**
 * Savings plan status type
 */
export const PlanStatus = Schema.Literal(
  PlanStatusEnum.ACTIVE,
  PlanStatusEnum.PAUSED,
  PlanStatusEnum.COMPLETED,
  PlanStatusEnum.CANCELLED
);

/**
 * Plan name schema
 */
export const PlanNameSchema = Schema.Trimmed.pipe(
  Schema.minLength(1, {
    message: () => "Plan name must be at least 1 character long",
  }),
  Schema.maxLength(100, {
    message: () => "Plan name must be at most 100 characters long",
  })
).annotations({ description: "Plan name" });

/**
 * Interest rate schema
 */
export const InterestRateSchema = Schema.Number.pipe(
  Schema.between(0, 1)
).annotations({
  description: "Interest rate in percentage",
  message: () => "Interest rate must be between 0 and 1",
});

/**
 * Cycle duration schema
 */
export const CycleDurationSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(7, 365)
).annotations({
  description: "Cycle duration in days",
  message: () => "Cycle duration must be between 7 and 365 days",
});

/**
 * Auto-save time schema
 */
export const AutoSaveTimeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
).annotations({
  description: "Auto-save time in HH:mm format",
  message: () => "Invalid auto-save time format",
  default: DEFAULT_AUTO_SAVE_TIME,
});

/**
 * Contribution streak schema
 */
export const ContributionStreakSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 365)
).annotations({
  description: "Contribution streak in days",
  message: () => "Contribution streak must be between 0 and 365 days",
});

/**
 * Total contributions schema
 */
export const TotalContributionsSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 365)
).annotations({
  description: "Total contributions in days",
  message: () => "Total contributions must be between 0 and 365 days",
});

/**
 * Schema types
 */
export type PlanStatus = typeof PlanStatus.Type;
export type PlanName = typeof PlanNameSchema.Type;
export type InterestRate = typeof InterestRateSchema.Type;
export type AutoSaveTime = typeof AutoSaveTimeSchema.Type;
export type CycleDuration = typeof CycleDurationSchema.Type;
export type ContributionStreak = typeof ContributionStreakSchema.Type;
export type TotalContributions = typeof TotalContributionsSchema.Type;

/**
 * SavingsPlan entity representing a user's savings plan with business rules
 */
export class SavingsPlan {
  constructor(
    public readonly id: PlanId,
    public readonly userId: UserId,
    public readonly planName: PlanName,
    public readonly dailyAmount: Money,
    public readonly cycleDuration: CycleDuration,
    public readonly targetAmount: Money | null,
    public readonly currentAmount: Money,
    public readonly autoSaveEnabled: boolean,
    public readonly autoSaveTime: AutoSaveTime,
    public readonly status: PlanStatus,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly interestRate: InterestRate,
    public readonly contributionStreak: ContributionStreak,
    public readonly totalContributions: TotalContributions,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Basic validation
    if (planName.trim().length === 0 || planName.length > 100) {
      throw new Error("Plan name must be between 1 and 100 characters");
    }
    if (cycleDuration < 7 || cycleDuration > 365) {
      throw new Error("Cycle duration must be between 7 and 365 days");
    }
    if (interestRate < 0 || interestRate > 1) {
      throw new Error("Interest rate must be between 0 and 1");
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(autoSaveTime)) {
      throw new Error("Invalid auto-save time format");
    }
  }
  /**
   * Create a new SavingsPlan
   */
  static create(
    userId: UserId,
    planName: PlanName,
    dailyAmount: Money,
    cycleDuration: CycleDuration,
    targetAmount?: Money,
    autoSaveEnabled: boolean = DEFAULT_AUTO_SAVE_ENABLED,
    autoSaveTime: AutoSaveTime = DEFAULT_AUTO_SAVE_TIME,
    interestRate: InterestRate = DEFAULT_INTEREST_RATE
  ): SavingsPlan {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + cycleDuration);

    const calculatedTargetAmount =
      targetAmount ||
      Money.fromNumber(dailyAmount.value * cycleDuration, dailyAmount.currency);

    return new SavingsPlan(
      PlanId.generate(),
      userId,
      planName,
      dailyAmount,
      cycleDuration,
      calculatedTargetAmount,
      Money.zero(dailyAmount.currency),
      autoSaveEnabled,
      autoSaveTime,
      PlanStatusEnum.ACTIVE,
      now,
      endDate,
      interestRate,
      0,
      0,
      now,
      now
    );
  }

  /**
   * Validate if a contribution amount is allowed for this plan
   */
  canMakeContribution(amount: Money): boolean {
    if (this.status !== PlanStatusEnum.ACTIVE) {
      return false;
    }

    if (!amount.equals(this.dailyAmount)) {
      return false;
    }

    if (
      this.targetAmount &&
      this.currentAmount.add(amount).isGreaterThan(this.targetAmount)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Process a contribution to this plan
   */
  makeContribution(amount: Money): SavingsPlan {
    if (!this.canMakeContribution(amount)) {
      throw new Error("Invalid contribution amount or plan status");
    }

    const newCurrentAmount = this.currentAmount.add(amount);
    const newContributionStreak = this.contributionStreak + 1;
    const newTotalContributions = this.totalContributions + 1;

    // Check if plan should be completed
    const shouldComplete =
      this.targetAmount &&
      newCurrentAmount.isGreaterThanOrEqual(this.targetAmount);

    return new SavingsPlan(
      this.id,
      this.userId,
      this.planName,
      this.dailyAmount,
      this.cycleDuration,
      this.targetAmount,
      newCurrentAmount,
      this.autoSaveEnabled,
      this.autoSaveTime,
      shouldComplete ? PlanStatusEnum.COMPLETED : this.status,
      this.startDate,
      this.endDate,
      this.interestRate,
      newContributionStreak,
      newTotalContributions,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Calculate current progress of the plan
   */
  calculateProgress(): PlanProgress {
    const target =
      this.targetAmount ||
      Money.fromNumber(
        this.dailyAmount.value * this.cycleDuration,
        this.dailyAmount.currency
      );

    return PlanProgress.calculate(
      this.currentAmount,
      target,
      this.cycleDuration,
      this.contributionStreak,
      this.totalContributions
    );
  }

  /**
   * Check if the plan can be withdrawn from (completed or matured)
   */
  canWithdraw(): boolean {
    return (
      this.status === PlanStatusEnum.COMPLETED || this.hasReachedMaturity()
    );
  }

  /**
   * Check if the plan has reached its maturity date
   */
  hasReachedMaturity(): boolean {
    return new Date() >= this.endDate;
  }

  /**
   * Check if the plan is eligible for early withdrawal (with penalties)
   */
  canEarlyWithdraw(): boolean {
    return (
      this.status === PlanStatusEnum.ACTIVE && !this.currentAmount.isZero()
    );
  }

  /**
   * Calculate early withdrawal penalty
   */
  calculateEarlyWithdrawalPenalty(): Money {
    if (!this.canEarlyWithdraw()) {
      return Money.zero(this.currentAmount.currency);
    }

    // 5% penalty for early withdrawal
    const penaltyRate = 0.05;
    const penaltyAmount = this.currentAmount.value * penaltyRate;

    return Money.fromNumber(penaltyAmount, this.currentAmount.currency);
  }

  /**
   * Calculate interest earned on the plan
   */
  calculateInterestEarned(): Money {
    if (this.interestRate === 0 || this.currentAmount.isZero()) {
      return Money.zero(this.currentAmount.currency);
    }

    // Simple interest calculation based on current amount and time elapsed
    const daysElapsed = Math.floor(
      (new Date().getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const yearlyInterest = this.currentAmount.value * this.interestRate;
    const dailyInterest = yearlyInterest / 365;
    const totalInterest = dailyInterest * daysElapsed;

    return Money.fromNumber(totalInterest, this.currentAmount.currency);
  }

  /**
   * Pause the savings plan
   */
  pause(): SavingsPlan {
    if (this.status !== PlanStatusEnum.ACTIVE) {
      throw new Error("Can only pause active plans");
    }

    return new SavingsPlan(
      this.id,
      this.userId,
      this.planName,
      this.dailyAmount,
      this.cycleDuration,
      this.targetAmount,
      this.currentAmount,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusEnum.PAUSED,
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Resume a paused savings plan
   */
  resume(): SavingsPlan {
    if (this.status !== PlanStatusEnum.PAUSED) {
      throw new Error("Can only resume paused plans");
    }

    return new SavingsPlan(
      this.id,
      this.userId,
      this.planName,
      this.dailyAmount,
      this.cycleDuration,
      this.targetAmount,
      this.currentAmount,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusEnum.ACTIVE,
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Complete the savings plan
   */
  complete(): SavingsPlan {
    if (this.status !== PlanStatusEnum.ACTIVE) {
      throw new Error("Can only complete active plans");
    }

    return new SavingsPlan(
      this.id,
      this.userId,
      this.planName,
      this.dailyAmount,
      this.cycleDuration,
      this.targetAmount,
      this.currentAmount,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusEnum.COMPLETED,
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Cancel the savings plan
   */
  cancel(): SavingsPlan {
    if (
      this.status === PlanStatusEnum.COMPLETED ||
      this.status === PlanStatusEnum.CANCELLED
    ) {
      throw new Error("Cannot cancel completed or already cancelled plans");
    }

    return new SavingsPlan(
      this.id,
      this.userId,
      this.planName,
      this.dailyAmount,
      this.cycleDuration,
      this.targetAmount,
      this.currentAmount,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusEnum.CANCELLED,
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update auto-save settings
   */
  updateAutoSave(enabled: boolean, time?: string): SavingsPlan {
    if (
      this.status !== PlanStatusEnum.ACTIVE &&
      this.status !== PlanStatusEnum.PAUSED
    ) {
      throw new Error(
        "Cannot update auto-save settings for completed or cancelled plans"
      );
    }

    return new SavingsPlan(
      this.id,
      this.userId,
      this.planName,
      this.dailyAmount,
      this.cycleDuration,
      this.targetAmount,
      this.currentAmount,
      enabled,
      time || this.autoSaveTime,
      this.status,
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Check if it's time for auto-save (based on current time and auto-save time)
   */
  isAutoSaveTime(): boolean {
    if (!this.autoSaveEnabled || this.status !== PlanStatusEnum.ACTIVE) {
      return false;
    }

    const now = new Date();
    const timeParts = this.autoSaveTime.split(":");
    const hours = Number.parseInt(timeParts[0] || "0", 10);
    const minutes = Number.parseInt(timeParts[1] || "0", 10);
    const autoSaveTime = new Date();
    autoSaveTime.setHours(hours, minutes, 0, 0);

    // Check if current time is within 5 minutes of auto-save time
    const timeDiff = Math.abs(now.getTime() - autoSaveTime.getTime());
    return timeDiff <= 5 * 60 * 1000; // 5 minutes in milliseconds
  }
}
