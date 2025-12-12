import type {
  TotalContributions,
  ContributionStreak,
  AutoSaveEnabled,
  CycleDuration,
  InterestRate,
  AutoSaveTime,
  PlanStatus,
  PlanName,
} from "@host/shared";

import { type UserId, PlanId, Money, PlanProgress } from "../value-objects";

import {
  DEFAULT_AUTO_SAVE_ENABLED,
  DEFAULT_AUTO_SAVE_TIME,
  DEFAULT_INTEREST_RATE,
  PlanStatusSchema,
  PlanStatusEnum,
} from "@host/shared";

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
    public readonly minimumBalance: Money,
    public readonly autoSaveEnabled: AutoSaveEnabled,
    public readonly autoSaveTime: AutoSaveTime,
    public readonly status: PlanStatus,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly interestRate: InterestRate,
    public readonly contributionStreak: ContributionStreak,
    public readonly totalContributions: TotalContributions,
    public readonly version: number,
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
    minimumBalance?: Money,
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
      minimumBalance || Money.zero(dailyAmount.currency),
      autoSaveEnabled,
      autoSaveTime,
      PlanStatusSchema.make(PlanStatusEnum.ACTIVE),
      now,
      endDate,
      interestRate,
      0,
      0,
      1,
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
      this.minimumBalance,
      this.autoSaveEnabled,
      this.autoSaveTime,
      shouldComplete
        ? PlanStatusSchema.make(PlanStatusEnum.COMPLETED)
        : this.status,
      this.startDate,
      this.endDate,
      this.interestRate,
      newContributionStreak,
      newTotalContributions,
      this.version + 1,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Process a withdrawal from this plan
   */
  withdraw(amount: Money): SavingsPlan {
    if (this.currentAmount.isLessThan(amount)) {
      throw new Error("Insufficient funds for withdrawal");
    }

    const newCurrentAmount = this.currentAmount.subtract(amount);

    return new SavingsPlan(
      this.id,
      this.userId,
      this.planName,
      this.dailyAmount,
      this.cycleDuration,
      this.targetAmount,
      newCurrentAmount,
      this.minimumBalance,
      this.autoSaveEnabled,
      this.autoSaveTime,
      this.status,
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.version + 1,
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
    // Check for locked/frozen status
    if (this.status === PlanStatusEnum.CANCELLED) {
      return false;
    }
    
    return (
      this.status === PlanStatusEnum.COMPLETED || this.hasReachedMaturity()
    );
  }

  /**
   * Check if a specific withdrawal amount is allowed
   * @param amount - The amount to withdraw
   * @returns true if the withdrawal would not violate minimum balance
   */
  canWithdrawAmount(amount: Money): boolean {
    const remainingBalance = this.currentAmount.subtract(amount);
    return remainingBalance.isGreaterThanOrEqual(this.minimumBalance);
  }

  /**
   * Get the maximum withdrawable amount (respecting minimum balance)
   * @returns The amount that can be withdrawn
   */
  getWithdrawableAmount(): Money {
    const withdrawable = this.currentAmount.subtract(this.minimumBalance);
    return withdrawable.value < 0 
      ? Money.zero(this.currentAmount.currency) 
      : withdrawable;
  }

  /**
   * Check if a withdrawal is a full withdrawal
   * @param amount - The amount to withdraw
   * @returns true if this would withdraw all available funds
   */
  isFullWithdrawal(amount: Money): boolean {
    const remaining = this.currentAmount.subtract(amount);
    // Full withdrawal if remaining is zero or only minimum balance remains
    return remaining.isLessThanOrEqual(this.minimumBalance);
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
      this.minimumBalance,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusSchema.make(PlanStatusEnum.PAUSED),
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.version + 1,
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
      this.minimumBalance,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusSchema.make(PlanStatusEnum.ACTIVE),
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.version + 1,
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
      this.minimumBalance,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusSchema.make(PlanStatusEnum.COMPLETED),
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.version + 1,
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
      this.minimumBalance,
      this.autoSaveEnabled,
      this.autoSaveTime,
      PlanStatusSchema.make(PlanStatusEnum.CANCELLED),
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.version + 1,
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
      this.minimumBalance,
      enabled,
      time || this.autoSaveTime,
      this.status,
      this.startDate,
      this.endDate,
      this.interestRate,
      this.contributionStreak,
      this.totalContributions,
      this.version + 1,
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
