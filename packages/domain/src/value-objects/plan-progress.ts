import { Money } from "./money";

/**
 * PlanProgress value object for tracking savings plan progress
 */
export class PlanProgress {
  constructor(
    public readonly currentAmount: Money,
    public readonly targetAmount: Money,
    public readonly progressPercentage: number,
    public readonly daysRemaining: number,
    public readonly contributionStreak: number,
    public readonly totalContributions: number
  ) {
    // Basic validation
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new Error("Progress percentage must be between 0 and 100");
    }
    if (daysRemaining < 0) {
      throw new Error("Days remaining cannot be negative");
    }
    if (contributionStreak < 0) {
      throw new Error("Contribution streak cannot be negative");
    }
    if (totalContributions < 0) {
      throw new Error("Total contributions cannot be negative");
    }
  }
  /**
   * Calculate progress for a savings plan
   */
  static calculate(
    currentAmount: Money,
    targetAmount: Money,
    cycleDuration: number,
    contributionStreak: number,
    totalContributions: number
  ): PlanProgress {
    const progressPercentage = targetAmount.isZero()
      ? 0
      : Math.min((currentAmount.value / targetAmount.value) * 100, 100);

    const daysRemaining = Math.max(cycleDuration - contributionStreak, 0);

    return new PlanProgress(
      currentAmount,
      targetAmount,
      progressPercentage,
      daysRemaining,
      contributionStreak,
      totalContributions
    );
  }

  /**
   * Check if the plan has reached its target
   */
  isTargetReached(): boolean {
    return this.progressPercentage >= 100;
  }

  /**
   * Check if the plan cycle is complete (based on days)
   */
  isCycleComplete(): boolean {
    return this.daysRemaining === 0;
  }

  /**
   * Get remaining amount to reach target
   */
  getRemainingAmount(): Money {
    if (this.isTargetReached()) {
      return Money.zero(this.currentAmount.currency);
    }
    return this.targetAmount.subtract(this.currentAmount);
  }

  /**
   * Get average daily contribution needed to reach target
   */
  getRequiredDailyContribution(): Money {
    if (this.daysRemaining === 0 || this.isTargetReached()) {
      return Money.zero(this.currentAmount.currency);
    }

    const remainingAmount = this.getRemainingAmount();
    const dailyAmount = remainingAmount.value / this.daysRemaining;

    return Money.fromNumber(dailyAmount, this.currentAmount.currency);
  }
}
