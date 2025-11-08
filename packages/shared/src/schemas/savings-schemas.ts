// Savings Plan Validation Schemas using Effect Schema
// Input/output schemas for all savings-related API operations

import { Schema } from "@effect/schema";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for creating a new savings plan
 * Validates all required fields and business rules for plan creation
 */
export const CreatePlanSchema = Schema.Struct({
  planName: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Plan name is required" }),
    Schema.maxLength(100, {
      message: () => "Plan name must not exceed 100 characters",
    }),
    Schema.trimmed()
  ),
  dailyAmount: Schema.Number.pipe(
    Schema.positive({ message: () => "Daily amount must be positive" }),
    Schema.lessThanOrEqualTo(1000000, {
      message: () => "Daily amount cannot exceed 1,000,000",
    })
  ),
  cycleDuration: Schema.Number.pipe(
    Schema.int({ message: () => "Cycle duration must be a whole number" }),
    Schema.between(7, 365, {
      message: () => "Cycle duration must be between 7 and 365 days",
    })
  ),
  targetAmount: Schema.optional(
    Schema.Number.pipe(
      Schema.positive({ message: () => "Target amount must be positive" })
    )
  ),
  autoSaveEnabled: Schema.optional(Schema.Boolean),
  autoSaveTime: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: () => "Invalid time format. Use HH:MM (e.g., 09:00)",
      })
    )
  ),
});

export type CreatePlanInput = Schema.Schema.Type<typeof CreatePlanSchema>;

/**
 * Schema for making a contribution to a savings plan
 * Validates contribution amount and source
 */
export const MakeContributionSchema = Schema.Struct({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Contribution amount must be positive" })
  ),
  source: Schema.Literal("wallet", "bank").pipe(
    Schema.annotations({
      description: "Source of funds for the contribution",
    })
  ),
});

export type MakeContributionInput = Schema.Schema.Type<
  typeof MakeContributionSchema
>;

/**
 * Schema for retrieving plan progress information
 */
export const GetPlanProgressSchema = Schema.Struct({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
});

export type GetPlanProgressInput = Schema.Schema.Type<
  typeof GetPlanProgressSchema
>;

/**
 * Schema for updating a savings plan
 */
export const UpdatePlanSchema = Schema.Struct({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
  planName: Schema.optional(
    Schema.String.pipe(
      Schema.minLength(1),
      Schema.maxLength(100),
      Schema.trimmed()
    )
  ),
  autoSaveEnabled: Schema.optional(Schema.Boolean),
  autoSaveTime: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
  ),
});

export type UpdatePlanInput = Schema.Schema.Type<typeof UpdatePlanSchema>;

/**
 * Schema for pausing or resuming a savings plan
 */
export const ChangePlanStatusSchema = Schema.Struct({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
  action: Schema.Literal("pause", "resume", "cancel").pipe(
    Schema.annotations({
      description: "Action to perform on the plan",
    })
  ),
});

export type ChangePlanStatusInput = Schema.Schema.Type<
  typeof ChangePlanStatusSchema
>;

/**
 * Schema for withdrawing from a completed savings plan
 */
export const WithdrawFromPlanSchema = Schema.Struct({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Withdrawal amount must be positive" })
  ),
  destination: Schema.Literal("wallet", "bank"),
  bankAccountId: Schema.optional(
    Schema.UUID.annotations({ message: () => "Invalid bank account ID" })
  ),
});

export type WithdrawFromPlanInput = Schema.Schema.Type<
  typeof WithdrawFromPlanSchema
>;

/**
 * Schema for listing user's savings plans with filters
 */
export const ListPlansSchema = Schema.Struct({
  status: Schema.optional(
    Schema.Literal("active", "paused", "completed", "cancelled")
  ),
  limit: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.between(1, 100, {
        message: () => "Limit must be between 1 and 100",
      })
    )
  ),
  offset: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.nonNegative({ message: () => "Offset must be non-negative" })
    )
  ),
});

export type ListPlansInput = Schema.Schema.Type<typeof ListPlansSchema>;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for create plan response
 */
export const CreatePlanOutputSchema = Schema.Struct({
  planId: Schema.UUID,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
});

export type CreatePlanOutput = Schema.Schema.Type<
  typeof CreatePlanOutputSchema
>;

/**
 * Schema for contribution response
 */
export const MakeContributionOutputSchema = Schema.Struct({
  transactionId: Schema.UUID,
  newBalance: Schema.Number,
  status: Schema.Literal("success", "failed", "pending"),
  message: Schema.optional(Schema.String),
});

export type MakeContributionOutput = Schema.Schema.Type<
  typeof MakeContributionOutputSchema
>;

/**
 * Schema for plan progress response
 */
export const GetPlanProgressOutputSchema = Schema.Struct({
  currentAmount: Schema.Number,
  targetAmount: Schema.Number,
  daysRemaining: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  contributionStreak: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  progressPercentage: Schema.Number.pipe(Schema.between(0, 100)),
  totalContributions: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  lastContributionDate: Schema.NullOr(Schema.DateTimeUtc),
});

export type GetPlanProgressOutput = Schema.Schema.Type<
  typeof GetPlanProgressOutputSchema
>;

/**
 * Schema for savings plan details
 */
export const SavingsPlanSchema = Schema.Struct({
  id: Schema.UUID,
  userId: Schema.UUID,
  planName: Schema.String,
  dailyAmount: Schema.Number,
  cycleDuration: Schema.Number.pipe(Schema.int()),
  targetAmount: Schema.NullOr(Schema.Number),
  currentAmount: Schema.Number,
  autoSaveEnabled: Schema.Boolean,
  autoSaveTime: Schema.NullOr(Schema.String),
  status: Schema.Literal("active", "paused", "completed", "cancelled"),
  startDate: Schema.DateTimeUtc,
  endDate: Schema.DateTimeUtc,
  interestRate: Schema.Number,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
});

export type SavingsPlan = Schema.Schema.Type<typeof SavingsPlanSchema>;

/**
 * Schema for list plans response
 */
export const ListPlansOutputSchema = Schema.Struct({
  plans: Schema.Array(SavingsPlanSchema),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  hasMore: Schema.Boolean,
});

export type ListPlansOutput = Schema.Schema.Type<typeof ListPlansOutputSchema>;
