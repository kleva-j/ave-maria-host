/**
 * @fileoverview Savings RPC Endpoints
 *
 * This module provides RPC endpoints for savings plan management using @effect/rpc.
 * It handles all CRUD operations for savings plans with proper validation and error handling.
 *
 * ## Key Features:
 * - **Type-Safe Operations**: Full type safety with Effect Schema
 * - **Business Logic Integration**: Direct integration with application use cases
 * - **Error Handling**: Comprehensive error handling with tagged errors
 * - **Authentication**: Requires authenticated user context
 *
 * ## Endpoints:
 * - createPlan: Create a new savings plan
 * - getPlan: Retrieve a specific savings plan
 * - listPlans: List all user's savings plans with filters
 * - updatePlan: Update an existing savings plan
 * - changePlanStatus: Pause, resume, or cancel a plan
 * - makeContribution: Make a contribution to a plan
 * - getPlanProgress: Get detailed progress information
 * - withdrawFromPlan: Withdraw funds from a completed plan
 */

import { type Layer, Effect, Schema, DateTime } from "effect";

import { Rpc, RpcGroup } from "@effect/rpc";

import {
  type ValidateContributionUseCase,
  ProcessContributionUseCase,
  CreateSavingsPlanUseCase,
  UpdateSavingsPlanUseCase,
  GetSavingsPlanUseCase,
} from "@host/application";

import {
  MakeContributionOutputSchema,
  WithdrawFromPlanOutputSchema,
  GetPlanProgressOutputSchema,
  ChangePlanStatusSchema,
  MakeContributionSchema,
  WithdrawFromPlanSchema,
  CreatePlanOutputSchema,
  UpdatePlanOutputSchema,
  GetPlanProgressSchema,
  ListPlansOutputSchema,
  SavingsPlanSchema,
  UpdatePlanSchema,
  CreatePlanSchema,
  ListPlansSchema,
  GetPlanSchema,
  DEFAULT_CURRENCY,
} from "@host/shared";

import { AuthMiddleware } from "./auth-rpc";

// ============================================================================
// Payload Classes
// ============================================================================

/**
 * Create Plan Payload
 */
export class CreatePlanPayload extends CreatePlanSchema {}

/**
 * Get Plan Payload
 */
export class GetPlanPayload extends GetPlanSchema {}

/**
 * List Plans Payload
 */
export class ListPlansPayload extends ListPlansSchema {}

/**
 * Update Plan Payload
 */
export class UpdatePlanPayload extends UpdatePlanSchema {}

/**
 * Change Plan Status Payload
 */
export class ChangePlanStatusPayload extends ChangePlanStatusSchema {}

/**
 * Make Contribution Payload
 */
export class MakeContributionPayload extends MakeContributionSchema {}

/**
 * Get Plan Progress Payload
 */
export class GetPlanProgressPayload extends GetPlanProgressSchema {}

/**
 * Withdraw From Plan Payload
 */
export class WithdrawFromPlanPayload extends WithdrawFromPlanSchema {}

// ============================================================================
// Response Classes
// ============================================================================

/**
 * Create Plan Response
 */
export class CreatePlanResponse extends CreatePlanOutputSchema {}

/**
 * Savings Plan
 */
export class SavingsPlan extends SavingsPlanSchema {}

/**
 * List Plans Response
 */
export class ListPlansResponse extends ListPlansOutputSchema {}

/**
 * Update Plan Response
 */
export class UpdatePlanResponse extends UpdatePlanOutputSchema {}

/**
 * Make Contribution Response
 */
export class MakeContributionResponse extends MakeContributionOutputSchema {}

/**
 * Get Plan Progress Response
 */
export class GetPlanProgressResponse extends GetPlanProgressOutputSchema {}

/**
 * Withdraw From Plan Response
 */
export class WithdrawFromPlanResponse extends WithdrawFromPlanOutputSchema {}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Savings operation errors
 */
export class SavingsError extends Schema.TaggedError<SavingsError>()(
  "SavingsError",
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

export const SavingRpcError = Schema.Union(SavingsError);

// ============================================================================
// RPC Group Definition
// ============================================================================

/**
 * Savings RPC group containing all savings-related endpoints
 */
export class SavingsRpcs extends RpcGroup.make(
  /**
   * Create a new savings plan
   */
  Rpc.make("CreatePlan", {
    payload: CreatePlanPayload,
    success: CreatePlanResponse,
    error: SavingsError,
  }).middleware(AuthMiddleware),

  /**
   * Get a specific savings plan by ID
   */
  Rpc.make("GetPlan", {
    payload: GetPlanPayload,
    success: SavingsPlan,
    error: SavingsError,
  }).middleware(AuthMiddleware),

  /**
   * List all user's savings plans with optional filters
   */
  Rpc.make("ListPlans", {
    payload: ListPlansPayload,
    success: ListPlansResponse,
    error: SavingsError,
  }).middleware(AuthMiddleware),

  /**
   * Update an existing savings plan
   */
  Rpc.make("UpdatePlan", {
    payload: UpdatePlanPayload,
    success: UpdatePlanResponse,
    error: SavingsError,
  }).middleware(AuthMiddleware),

  /**
   * Change plan status (pause, resume, cancel)
   */
  Rpc.make("ChangePlanStatus", {
    payload: ChangePlanStatusPayload,
    success: UpdatePlanResponse,
    error: SavingsError,
  }).middleware(AuthMiddleware),

  /**
   * Make a contribution to a savings plan
   */
  Rpc.make("MakeContribution", {
    payload: MakeContributionPayload,
    success: MakeContributionResponse,
    error: SavingsError,
  }).middleware(AuthMiddleware),

  /**
   * Get detailed progress information for a plan
   */
  Rpc.make("GetPlanProgress", {
    payload: GetPlanProgressPayload,
    success: GetPlanProgressResponse,
    error: SavingsError,
  }).middleware(AuthMiddleware),

  /**
   * Withdraw funds from a completed savings plan
   */
  Rpc.make("WithdrawFromPlan", {
    payload: WithdrawFromPlanPayload,
    success: WithdrawFromPlanResponse,
    error: SavingsError,
  }).middleware(AuthMiddleware)
) {}

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * Live implementation of savings RPC handlers
 * Integrates with application use cases and provides error handling
 */
export const SavingsHandlersLive: Layer.Layer<
  | Rpc.Handler<"ChangePlanStatus">
  | Rpc.Handler<"MakeContribution">
  | Rpc.Handler<"WithdrawFromPlan">
  | Rpc.Handler<"GetPlanProgress">
  | Rpc.Handler<"CreatePlan">
  | Rpc.Handler<"UpdatePlan">
  | Rpc.Handler<"ListPlans">
  | Rpc.Handler<"GetPlan">,
  never,
  | ValidateContributionUseCase
  | ProcessContributionUseCase
  | CreateSavingsPlanUseCase
  | UpdateSavingsPlanUseCase
  | GetSavingsPlanUseCase
> = SavingsRpcs.toLayer({
  /**
   * Create a new savings plan
   * Validates input, checks wallet balance, and creates the plan
   */
  CreatePlan: (payload) =>
    Effect.gen(function* () {
      const createPlanUseCase = yield* CreateSavingsPlanUseCase;

      // Get user ID from auth context (placeholder - will be replaced with actual auth)
      const userId = crypto.randomUUID();

      const result = yield* createPlanUseCase
        .execute({
          userId,
          planName: payload.planName,
          dailyAmount: payload.dailyAmount,
          currency: DEFAULT_CURRENCY,
          cycleDuration: payload.cycleDuration,
          targetAmount: payload.targetAmount,
          autoSaveEnabled: payload.autoSaveEnabled ?? false,
          autoSaveTime: payload.autoSaveTime,
          interestRate: 0.0,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "CreatePlan",
                message: error._tag || "Failed to create savings plan",
                cause: error,
              })
          )
        );

      return new CreatePlanResponse({
        planId: result.plan.id.value,
        status: "success",
        message: "Savings plan created successfully",
      });
    }),

  /**
   * Get a specific savings plan by ID
   * Validates user ownership and returns plan details
   */
  GetPlan: (payload) =>
    Effect.gen(function* () {
      const getPlanUseCase = yield* GetSavingsPlanUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* getPlanUseCase
        .execute({
          planId: payload.planId,
          userId,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "GetPlan",
                message: error._tag || "Failed to retrieve savings plan",
                cause: error,
              })
          )
        );

      const plan = result.plan;
      return new SavingsPlan({
        id: plan.id.value,
        userId: plan.userId.value,
        planName: plan.planName,
        dailyAmount: plan.dailyAmount.value,
        cycleDuration: plan.cycleDuration,
        targetAmount: plan.targetAmount?.value ?? null,
        currentAmount: plan.currentAmount.value,
        autoSaveEnabled: plan.autoSaveEnabled,
        autoSaveTime: plan.autoSaveTime ?? null,
        status: plan.status,
        startDate: DateTime.unsafeMake(plan.startDate),
        endDate: DateTime.unsafeMake(plan.endDate),
        interestRate: plan.interestRate,
        createdAt: DateTime.unsafeMake(plan.createdAt),
        updatedAt: DateTime.unsafeMake(plan.updatedAt),
      });
    }),

  /**
   * List all user's savings plans with optional filters
   * Supports pagination and status filtering
   */
  ListPlans: (payload) =>
    Effect.gen(function* () {
      const getPlanUseCase = yield* GetSavingsPlanUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      // TODO: Implement list functionality in use case
      // For now, return empty list
      return new ListPlansResponse({
        plans: [],
        total: 0,
        hasMore: false,
      });
    }),

  /**
   * Update an existing savings plan
   * Supports updating plan name and auto-save settings
   */
  UpdatePlan: (payload) =>
    Effect.gen(function* () {
      const updatePlanUseCase = yield* UpdateSavingsPlanUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      yield* updatePlanUseCase
        .execute({
          planId: payload.planId,
          userId,
          action: "update_autosave",
          autoSaveEnabled: payload.autoSaveEnabled,
          autoSaveTime: payload.autoSaveTime,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "UpdatePlan",
                message: error._tag || "Failed to update savings plan",
                cause: error,
              })
          )
        );

      return new UpdatePlanResponse({
        status: "success",
        message: "Plan updated successfully",
      });
    }),

  /**
   * Change plan status (pause, resume, cancel)
   * Validates state transitions and updates plan status
   */
  ChangePlanStatus: (payload) =>
    Effect.gen(function* () {
      const updatePlanUseCase = yield* UpdateSavingsPlanUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      yield* updatePlanUseCase
        .execute({
          planId: payload.planId,
          userId,
          action: payload.action,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "ChangePlanStatus",
                message: error._tag || "Failed to change plan status",
                cause: error,
              })
          )
        );

      return new UpdatePlanResponse({
        status: "success",
        message: `Plan ${payload.action}d successfully`,
      });
    }),

  /**
   * Make a contribution to a savings plan
   * Validates contribution, debits wallet, and updates plan balance
   */
  MakeContribution: (payload) =>
    Effect.gen(function* () {
      const processContributionUseCase = yield* ProcessContributionUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* processContributionUseCase
        .execute({
          userId,
          planId: payload.planId,
          amount: payload.amount,
          source: payload.source === "wallet" ? "wallet" : "bank_transfer",
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "MakeContribution",
                message: error._tag || "Failed to process contribution",
                cause: error,
              })
          )
        );

      // Map transaction status to response status
      const responseStatus =
        result.transaction.status === "completed"
          ? "success"
          : result.transaction.status === "failed"
            ? "failed"
            : "pending";

      return new MakeContributionResponse({
        transactionId: result.transaction.id.value,
        newBalance: result.newPlanBalance,
        status: responseStatus,
        message: "Contribution processed successfully",
      });
    }),

  /**
   * Get detailed progress information for a plan
   * Returns current progress, streak, and projections
   */
  GetPlanProgress: (payload) =>
    Effect.gen(function* () {
      const getPlanUseCase = yield* GetSavingsPlanUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* getPlanUseCase
        .execute({
          planId: payload.planId,
          userId,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "GetPlanProgress",
                message: error._tag || "Failed to get plan progress",
                cause: error,
              })
          )
        );

      const plan = result.plan;
      const progress = plan.calculateProgress();

      return new GetPlanProgressResponse({
        currentAmount: plan.currentAmount.value,
        targetAmount: progress.targetAmount.value,
        daysRemaining: progress.daysRemaining,
        contributionStreak: progress.contributionStreak,
        progressPercentage: progress.progressPercentage,
        totalContributions: plan.totalContributions,
        lastContributionDate: null, // TODO: Track last contribution date in domain
      });
    }),

  /**
   * Withdraw funds from a completed savings plan
   * Validates plan completion and processes withdrawal
   */
  WithdrawFromPlan: (payload) =>
    Effect.gen(function* () {
      const getPlanUseCase = yield* GetSavingsPlanUseCase;

      // Get user ID from auth context (placeholder)
      const userId = crypto.randomUUID();

      const result = yield* getPlanUseCase
        .execute({
          planId: payload.planId,
          userId,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "WithdrawFromPlan",
                message: error._tag || "Failed to retrieve plan for withdrawal",
                cause: error,
              })
          )
        );

      const plan = result.plan;

      // Validate plan can be withdrawn from
      if (!plan.canWithdraw()) {
        return yield* Effect.fail(
          new SavingsError({
            operation: "WithdrawFromPlan",
            message:
              "Plan is not eligible for withdrawal. Plan must be completed or matured.",
          })
        );
      }

      // Validate withdrawal amount
      if (payload.amount > plan.currentAmount.value) {
        return yield* Effect.fail(
          new SavingsError({
            operation: "WithdrawFromPlan",
            message: `Withdrawal amount exceeds plan balance. Available: ${plan.currentAmount.value}`,
          })
        );
      }

      // TODO: Implement actual withdrawal processing with wallet/bank transfer
      const transactionId = crypto.randomUUID();

      return new WithdrawFromPlanResponse({
        transactionId,
        status: "pending",
        message:
          "Withdrawal initiated successfully. Funds will be transferred shortly.",
      });
    }),
});
