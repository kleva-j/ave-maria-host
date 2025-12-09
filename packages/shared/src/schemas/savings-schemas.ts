// Savings Plan Validation Schemas using Effect Schema
// Input/output schemas for all savings-related API operations

import {
  DEFAULT_AUTO_SAVE_TIME,
  PlanActionEnum,
  PlanStatusEnum,
} from "../constant";

import { Schema } from "effect";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * PlanId value object representing a unique identifier for savings plans
 */
export const PlanIdSchema = Schema.UUID.pipe(Schema.brand("PlanId"));
export type PlanIdType = typeof PlanIdSchema.Type;

/**
 * Schema for creating a new savings plan
 * Validates all required fields and business rules for plan creation
 */
export class CreatePlanSchema extends Schema.Class<CreatePlanSchema>(
  "CreatePlanSchema"
)({
  planName: Schema.Trimmed.pipe(
    Schema.minLength(1, { message: () => "Plan name is required" }),
    Schema.maxLength(100, {
      message: () => "Plan name must not exceed 100 characters",
    })
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
      Schema.int(),
      Schema.positive({ message: () => "Target amount must be positive" })
    )
  ),
  autoSaveEnabled: Schema.optional(Schema.Boolean),
  autoSaveTime: Schema.optional(
    Schema.Trimmed.pipe(
      Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: () => "Invalid time format. Use HH:MM (e.g., 09:00)",
      })
    )
  ),
}) {}

export type CreatePlanInput = typeof CreatePlanSchema.Type;

/**
 * Schema for making a contribution to a savings plan
 * Validates contribution amount and source
 */
export class MakeContributionSchema extends Schema.Class<MakeContributionSchema>(
  "MakeContributionSchema"
)({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Contribution amount must be positive" })
  ),
  source: Schema.Literal("wallet", "bank").pipe(
    Schema.annotations({
      description: "Source of funds for the contribution",
    })
  ),
}) {}

export type MakeContributionInput = typeof MakeContributionSchema.Type;

/**
 * Schema for retrieving plan progress information
 */
export class GetPlanProgressSchema extends Schema.Class<GetPlanProgressSchema>(
  "GetPlanProgressSchema"
)({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
}) {}

export type GetPlanProgressInput = typeof GetPlanProgressSchema.Type;

/**
 * Schema for retrieving a savings plan
 */
export class GetPlanSchema extends Schema.Class<GetPlanSchema>("GetPlanSchema")(
  {
    planId: Schema.UUID.annotations({
      message: () => "Invalid plan ID format",
    }),
  }
) {}

export type GetPlanInput = typeof GetPlanSchema.Type;

/**
 * Schema for updating a savings plan
 */
export class UpdatePlanSchema extends Schema.Class<UpdatePlanSchema>(
  "UpdatePlanSchema"
)({
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
}) {}

export type UpdatePlanInput = typeof UpdatePlanSchema.Type;

export class UpdatePlanOutputSchema extends Schema.Class<UpdatePlanOutputSchema>(
  "UpdatePlanOutputSchema"
)({
  status: Schema.Literal("success", "error"),
  message: Schema.String,
}) {}

export type UpdatePlanOutput = typeof UpdatePlanOutputSchema.Type;

/**
 * Schema for pausing or resuming a savings plan
 */
export class ChangePlanStatusSchema extends Schema.Class<ChangePlanStatusSchema>(
  "ChangePlanStatusSchema"
)({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
  action: Schema.Literal("pause", "resume", "cancel").pipe(
    Schema.annotations({
      description: "Action to perform on the plan",
    })
  ),
}) {}

export type ChangePlanStatusInput = typeof ChangePlanStatusSchema.Type;

/**
 * Schema for withdrawing from a completed savings plan
 */
export class WithdrawFromPlanSchema extends Schema.Class<WithdrawFromPlanSchema>(
  "WithdrawFromPlanSchema"
)({
  planId: Schema.UUID.annotations({ message: () => "Invalid plan ID format" }),
  amount: Schema.Number.pipe(
    Schema.positive({ message: () => "Withdrawal amount must be positive" })
  ),
  destination: Schema.Literal("wallet", "bank"),
  bankAccountId: Schema.optional(
    Schema.UUID.annotations({ message: () => "Invalid bank account ID" })
  ),
}) {}

export type WithdrawFromPlanInput = typeof WithdrawFromPlanSchema.Type;

export class WithdrawFromPlanOutputSchema extends Schema.Class<WithdrawFromPlanOutputSchema>(
  "WithdrawFromPlanOutputSchema"
)({
  transactionId: Schema.UUID,
  status: Schema.Literal("success", "pending", "failed"),
  message: Schema.String,
}) {}

export type WithdrawFromPlanOutput = typeof WithdrawFromPlanOutputSchema.Type;

/**
 * Schema for listing user's savings plans with filters
 */
export class ListPlansSchema extends Schema.Class<ListPlansSchema>(
  "ListPlansSchema"
)({
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
}) {}

export type ListPlansInput = typeof ListPlansSchema.Type;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for create plan response
 */
export class CreatePlanOutputSchema extends Schema.Class<CreatePlanOutputSchema>(
  "CreatePlanOutputSchema"
)({
  planId: Schema.UUID,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
}) {}

export type CreatePlanOutput = typeof CreatePlanOutputSchema.Type;

/**
 * Schema for contribution response
 */
export class MakeContributionOutputSchema extends Schema.Class<MakeContributionOutputSchema>(
  "MakeContributionOutputSchema"
)({
  transactionId: Schema.UUID,
  newBalance: Schema.Number,
  status: Schema.Literal("success", "failed", "pending"),
  message: Schema.optional(Schema.String),
}) {}

export type MakeContributionOutput = typeof MakeContributionOutputSchema.Type;

/**
 * Schema for plan progress response
 */
export class GetPlanProgressOutputSchema extends Schema.Class<GetPlanProgressOutputSchema>(
  "GetPlanProgressOutputSchema"
)({
  currentAmount: Schema.Number,
  targetAmount: Schema.Number,
  daysRemaining: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  contributionStreak: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  progressPercentage: Schema.Number.pipe(Schema.between(0, 100)),
  totalContributions: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  lastContributionDate: Schema.NullOr(Schema.DateTimeUtc),
}) {}

export type GetPlanProgressOutput = typeof GetPlanProgressOutputSchema.Type;

/**
 * Schema for savings plan details
 */
export class SavingsPlanSchema extends Schema.Class<SavingsPlanSchema>(
  "SavingsPlanSchema"
)({
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
}) {}

export type SavingsPlan = typeof SavingsPlanSchema.Type;

/**
 * Schema for list plans response
 */
export class ListPlansOutputSchema extends Schema.Class<ListPlansOutputSchema>(
  "ListPlansOutputSchema"
)({
  plans: Schema.Array(SavingsPlanSchema),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  hasMore: Schema.Boolean,
}) {}

export type ListPlansOutput = typeof ListPlansOutputSchema.Type;

/**
 * Schema for plan status
 */
export const PlanStatusSchema = Schema.Literal(...Object.values(PlanStatusEnum))
  .pipe(Schema.brand("PlanStatus"))
  .annotations({
    message: () => "Invalid plan status",
    description: "Status of a plan",
  });

export type PlanStatus = typeof PlanStatusSchema.Type;

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

export type PlanName = typeof PlanNameSchema.Type;

export const UpdatePlansActionSchema = Schema.Literal(
  ...Object.values(PlanActionEnum)
)
  .pipe(Schema.brand("UpdatePlansAction"))
  .annotations({
    message: () => "Invalid plan action",
    description: "Update action to perform on the plan",
  });
export type UpdatePlansAction = typeof UpdatePlansActionSchema.Type;

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

export type AutoSaveTime = typeof AutoSaveTimeSchema.Type;
export type AutoSaveEnabled = boolean;
