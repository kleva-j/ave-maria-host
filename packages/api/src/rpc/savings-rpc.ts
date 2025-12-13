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

import type { ValidateContributionUseCase } from "@host/application";
import type { Layer } from "effect";

import { Effect, Schema, DateTime } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";
import { PlanId } from "@host/domain";

import { AuthMiddleware, CurrentUser } from "./auth-rpc";

import {
  WithdrawFromSavingsPlanUseCase,
  GetSavingsPlanProgressUseCase,
  ProcessContributionUseCase,
  CreateSavingsPlanUseCase,
  UpdateSavingsPlanUseCase,
  ListSavingsPlanUseCase,
  GetSavingsPlanUseCase,
} from "@host/application";

import {
  MakeContributionOutputSchema,
  WithdrawFromPlanOutputSchema,
  GetPlanProgressOutputSchema,
  UpdatePlansActionSchema,
  ChangePlanStatusSchema,
  MakeContributionSchema,
  WithdrawFromPlanSchema,
  CreatePlanOutputSchema,
  UpdatePlanOutputSchema,
  GetPlanProgressSchema,
  TransactionStatusEnum,
  ListPlansOutputSchema,
  PaymentSourceSchema,
  PaymentSourceEnum,
  SavingsPlanSchema,
  UpdatePlanSchema,
  CreatePlanSchema,
  ListPlansSchema,
  PlanActionEnum,
  GetPlanSchema,
  DEFAULT_CURRENCY,
} from "@host/shared";

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

/**
 * Withdrawal limit exceeded error
 */
export class WithdrawalLimitError extends Schema.TaggedError<WithdrawalLimitError>()(
  "WithdrawalLimitError",
  {
    period: Schema.Literal("daily", "weekly", "monthly"),
    limit: Schema.Number,
    current: Schema.Number,
    limitType: Schema.Literal("count", "amount"),
  }
) {}

/**
 * Minimum balance violation error
 */
export class MinimumBalanceError extends Schema.TaggedError<MinimumBalanceError>()(
  "MinimumBalanceError",
  {
    planId: Schema.String,
    requestedAmount: Schema.Number,
    currentBalance: Schema.Number,
    minimumBalance: Schema.Number,
    currency: Schema.String,
  }
) {}

/**
 * Concurrent withdrawal error
 */
export class ConcurrentWithdrawalRpcError extends Schema.TaggedError<ConcurrentWithdrawalRpcError>()(
  "ConcurrentWithdrawalError",
  {
    planId: Schema.String,
    message: Schema.String,
  }
) {}

export const SavingRpcError = Schema.Union(
  SavingsError,
  WithdrawalLimitError,
  MinimumBalanceError,
  ConcurrentWithdrawalRpcError
);

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
    error: SavingRpcError,
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
  | WithdrawFromSavingsPlanUseCase
  | GetSavingsPlanProgressUseCase
  | ValidateContributionUseCase
  | ProcessContributionUseCase
  | CreateSavingsPlanUseCase
  | UpdateSavingsPlanUseCase
  | ListSavingsPlanUseCase
  | GetSavingsPlanUseCase
  | AuthMiddleware
> = SavingsRpcs.toLayer({
  /**
   * Create a new savings plan
   * Validates input, checks wallet balance, and creates the plan
   */
  CreatePlan: (payload) =>
    Effect.gen(function* () {
      const createPlanUseCase = yield* CreateSavingsPlanUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* createPlanUseCase
        .execute({
          userId: currentUser.id,
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
                message: error.message || "Failed to create savings plan",
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
      const currentUser = yield* CurrentUser;

      const planId = PlanId.fromString(payload.planId);

      const result = yield* getPlanUseCase
        .execute({ planId: planId.value, userId: currentUser.id })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "GetPlan",
                message: error.message || "Failed to retrieve savings plan",
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
      const listPlanUseCase = yield* ListSavingsPlanUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* listPlanUseCase
        .execute({
          userId: currentUser.id,
          status: payload.status,
          limit: payload.limit,
          offset: payload.offset,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "ListPlans",
                message: error.message || "Failed to list savings plans",
                cause: error,
              })
          )
        );

      // Map domain entities to DTOs
      const plans = result.plans.map(
        (plan) =>
          new SavingsPlan({
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
          })
      );

      return new ListPlansResponse({
        plans,
        total: result.total,
        hasMore: result.hasMore,
      });
    }),

  /**
   * Update an existing savings plan
   * Supports updating plan name and auto-save settings
   */
  UpdatePlan: (payload) =>
    Effect.gen(function* () {
      const updatePlanUseCase = yield* UpdateSavingsPlanUseCase;
      const currentUser = yield* CurrentUser;

      yield* updatePlanUseCase
        .execute({
          planId: payload.planId,
          userId: currentUser.id,
          action: UpdatePlansActionSchema.make(PlanActionEnum.UPDATE_AUTOSAVE),
          autoSaveEnabled: payload.autoSaveEnabled,
          autoSaveTime: payload.autoSaveTime,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "UpdatePlan",
                message: error.message || "Failed to update savings plan",
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
      const currentUser = yield* CurrentUser;

      yield* updatePlanUseCase
        .execute({
          planId: payload.planId,
          userId: currentUser.id,
          action: payload.action,
        })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "ChangePlanStatus",
                message: error.message || "Failed to change plan status",
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
      const currentUser = yield* CurrentUser;

      const { amount } = payload;
      const source = PaymentSourceSchema.make(
        payload.source === PaymentSourceEnum.WALLET
          ? PaymentSourceEnum.WALLET
          : PaymentSourceEnum.BANK_TRANSFER
      );

      const planId = PlanId.fromString(payload.planId).value;

      const result = yield* processContributionUseCase
        .execute({ userId: currentUser.id, planId, amount, source })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "MakeContribution",
                message: error.message || "Failed to process contribution",
                cause: error,
              })
          )
        );

      // Map transaction status to response status
      const responseStatus =
        result.transaction.status === TransactionStatusEnum.COMPLETED
          ? "success"
          : result.transaction.status === TransactionStatusEnum.FAILED
            ? TransactionStatusEnum.FAILED
            : TransactionStatusEnum.PENDING;

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
      const getPlanProgressUseCase = yield* GetSavingsPlanProgressUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* getPlanProgressUseCase
        .execute({ planId: payload.planId, userId: currentUser.id })
        .pipe(
          Effect.mapError(
            (error) =>
              new SavingsError({
                operation: "GetPlanProgress",
                message: error.message || "Failed to get plan progress",
                cause: error,
              })
          )
        );

      return new GetPlanProgressResponse({
        currentAmount: result.currentAmount,
        targetAmount: result.targetAmount,
        daysRemaining: result.daysRemaining,
        contributionStreak: result.contributionStreak,
        progressPercentage: result.progressPercentage,
        totalContributions: result.totalContributions,
        lastContributionDate: result.lastContributionDate,
      });
    }),

  /**
   * Withdraw funds from a completed savings plan
   * Validates plan completion and processes withdrawal
   */
  WithdrawFromPlan: (payload) =>
    Effect.gen(function* () {
      const withdrawUseCase = yield* WithdrawFromSavingsPlanUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* withdrawUseCase
        .execute({
          planId: payload.planId,
          userId: currentUser.id,
          amount: payload.amount,
          destination: payload.destination,
          bankAccountId: payload.bankAccountId,
        })
        .pipe(
          Effect.mapError((error) => {
            // Map specific error types to RPC errors
            if (error._tag === "WithdrawalLimitExceededError") {
              return new WithdrawalLimitError({
                period: error.period,
                limit: error.limit,
                current: error.current,
                limitType: error.limitType,
              });
            }

            if (error._tag === "MinimumBalanceViolationError") {
              return new MinimumBalanceError({
                planId: error.planId,
                requestedAmount: error.requestedAmount,
                currentBalance: error.currentBalance,
                minimumBalance: error.minimumBalance,
                currency: error.currency,
              });
            }

            if (error._tag === "ConcurrentWithdrawalError") {
              return new ConcurrentWithdrawalRpcError({
                planId: error.planId,
                message: `Concurrent modification detected. Expected version ${error.expectedVersion}, but found ${error.actualVersion}. Please retry.`,
              });
            }

            // Default to generic SavingsError for other types
            return new SavingsError({
              operation: "WithdrawFromPlan",
              message: error.message || "Failed to withdraw from plan",
              cause: error,
            });
          })
        );

      return new WithdrawFromPlanResponse({
        transactionId: result.transactionId,
        status: result.status,
        message: result.message,
      });
    }),
});
