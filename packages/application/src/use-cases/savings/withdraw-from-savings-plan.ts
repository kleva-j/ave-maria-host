import type { FinancialError } from "@host/shared";

import type {
  TransactionRepository,
  WithdrawalRepository,
  SavingsRepository,
  RepositoryError,
} from "@host/domain";

import { Transaction, PlanId, Money } from "@host/domain";
import { Effect, Context, Schema, Layer } from "effect";

import {
  MinimumBalanceViolationError,
  ConcurrentWithdrawalError,
  WithdrawalNotAllowedError,
  InsufficientFundsError,
  ValidationError,
  DatabaseError,
  // Enums
  PaymentDestinationEnum,
  TransactionTypeEnum,
  PaymentSourceEnum,
  // Schemas
  WithdrawFromPlanSchema,
  TransactionTypeSchema,
  PaymentSourceSchema,
  UserIdSchema,
} from "@host/shared";

import {
  ComplianceService,
  SavingsService,
  WalletService,
  FeeService,
} from "../../services";

/**
 * Input for withdrawing from a savings plan
 */
// ... (omitted for brevity)
// The schema is defined in shared, we just need the type, but since we want to validate,
// we might want to extend or wrap it. The RPC layer already validates the payload,
// but the Use Case should ideally validate its own input or trust the caller.
// Following CreateSavingsPlan pattern, we define a use-case specific input if needed,
// or reuse the shared schema.
// However, the shared schema `WithdrawFromPlanSchema` doesn't include `userId`,
// as that usually comes from context. The Use Case needs `userId` to verify ownership.

export const WithdrawFromSavingsPlanInput = Schema.Struct({
  ...WithdrawFromPlanSchema.fields,
  userId: UserIdSchema, // Re-declare or import UserIdSchema
});

// Better to use the types from shared/domain

export const WithdrawFromSavingsPlanInputSchema = WithdrawFromPlanSchema.pipe(
  Schema.extend(Schema.Struct({ userId: UserIdSchema }))
);

export type WithdrawFromSavingsPlanInput =
  typeof WithdrawFromSavingsPlanInputSchema.Type;

/**
 * Output from withdrawing from a savings plan
 */
export interface WithdrawFromSavingsPlanOutput {
  readonly transactionId: string;
  readonly status: "success" | "pending" | "failed";
  readonly message: string;
}

/**
 * Use case for withdrawing from a savings plan
 */
export interface WithdrawFromSavingsPlanUseCase {
  readonly execute: (
    input: WithdrawFromSavingsPlanInput
  ) => Effect.Effect<
    WithdrawFromSavingsPlanOutput,
    FinancialError | ValidationError
  >;
}

export const WithdrawFromSavingsPlanUseCase =
  Context.GenericTag<WithdrawFromSavingsPlanUseCase>(
    "@app/WithdrawFromSavingsPlanUseCase"
  );

/**
 * Live implementation of WithdrawFromSavingsPlanUseCase
 */
export const WithdrawFromSavingsPlanUseCaseLive = Layer.effect(
  WithdrawFromSavingsPlanUseCase,
  Effect.gen(function* () {
    const savingsRepo = yield* Effect.serviceOption(
      Context.GenericTag<SavingsRepository>("@domain/SavingsRepository")
    );
    const transactionRepo = yield* Effect.serviceOption(
      Context.GenericTag<TransactionRepository>("@domain/TransactionRepository")
    );
    const withdrawalRepo = yield* Effect.serviceOption(
      Context.GenericTag<WithdrawalRepository>("@domain/WithdrawalRepository")
    );
    const complianceService = yield* Effect.serviceOption(ComplianceService);
    const savingsService = yield* Effect.serviceOption(SavingsService);
    const walletService = yield* Effect.serviceOption(WalletService);
    const feeService = yield* Effect.serviceOption(FeeService);

    if (
      savingsRepo._tag === "None" ||
      transactionRepo._tag === "None" ||
      withdrawalRepo._tag === "None" ||
      walletService._tag === "None" ||
      savingsService._tag === "None" ||
      complianceService._tag === "None" ||
      feeService._tag === "None"
    ) {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message:
            "Required dependencies (SavingsRepo, TransactionRepo, WithdrawalRepo, WalletService, SavingsService, ComplianceService, FeeService) not available",
        })
      );
    }

    const savingsRepository = savingsRepo.value;
    const transactionRepository = transactionRepo.value;
    const withdrawalRepository = withdrawalRepo.value;
    const wallet = walletService.value;
    const savings = savingsService.value;
    const compliance = complianceService.value;
    const fees = feeService.value;

    return {
      execute: (input: WithdrawFromSavingsPlanInput) =>
        Effect.gen(function* () {
          // 1. Fetch Plan
          const plan = yield* savingsRepository
            .findById(PlanId.fromString(input.planId))
            .pipe(
              Effect.mapError(
                (error: RepositoryError) =>
                  new DatabaseError({
                    operation: "findById",
                    table: "savings_plans",
                    message: error.message || "Failed to find plan",
                  })
              )
            );

          if (!plan) {
            return yield* Effect.fail(
              new ValidationError({
                field: "planId",
                message: "Savings plan not found",
                value: input.planId,
              })
            );
          }

          // 2. Verify Ownership
          if (plan.userId.value !== input.userId) {
            return yield* Effect.fail(
              new ValidationError({
                field: "userId",
                message: "User is not authorized to withdraw from this plan",
              })
            );
          }

          // 3. Check for pending withdrawals
          const hasPending = yield* withdrawalRepository
            .hasPendingWithdrawals(plan.id)
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "hasPendingWithdrawals",
                    table: "withdrawals",
                    message:
                      error.message || "Failed to check pending withdrawals",
                  })
              )
            );
          if (hasPending) {
            return yield* Effect.fail(
              new WithdrawalNotAllowedError({
                planId: plan.id.value,
                reason: "Plan has pending withdrawal transactions",
              })
            );
          }

          // 4. Validate Withdraw Eligibility
          const isEarlyWithdrawal =
            !plan.canWithdraw() && plan.canEarlyWithdraw();

          if (!plan.canWithdraw() && !isEarlyWithdrawal) {
            return yield* Effect.fail(
              new ValidationError({
                field: "planId",
                message:
                  "Plan is not eligible for withdrawal (not completed/matured or status invalid)",
              })
            );
          }

          const withdrawalAmount = Money.fromNumber(
            input.amount,
            plan.currentAmount.currency
          );

          // 5. Check Withdrawal Limits (Phase 2)
          yield* savings.checkWithdrawalLimits(plan.userId, withdrawalAmount);

          // 6. Check Compliance Tier Limits (Phase 3)
          yield* compliance.checkCompliance(plan.userId, withdrawalAmount);

          // 7. Get Tax Warning (Phase 3)
          const taxWarning = yield* compliance.getTaxWarning(withdrawalAmount);
          if (taxWarning) {
            // In a real scenario, we might want to log this or return it as part of success message
            // or even require acknowledgement. For now, we'll include it in the audit trail.
          }

          // 8. Calculate Fees (Phase 3)
          const processingFeeAmount = yield* fees.calculateFees(
            input.amount,
            input.destination
          );
          const processingFee = Money.fromNumber(
            processingFeeAmount,
            plan.currentAmount.currency
          );

          // 9. Check minimum balance & Total Balance
          if (!plan.canWithdrawAmount(withdrawalAmount)) {
            return yield* Effect.fail(
              new MinimumBalanceViolationError({
                planId: plan.id.value,
                requestedAmount: input.amount,
                currentBalance: plan.currentAmount.value,
                minimumBalance: plan.minimumBalance.value,
                currency: plan.currentAmount.currency,
              })
            );
          }

          if (plan.currentAmount.value < input.amount) {
            return yield* Effect.fail(
              new InsufficientFundsError({
                available: plan.currentAmount.value,
                required: input.amount,
                currency: plan.currentAmount.currency,
              })
            );
          }

          // 10. Calculate Penalty and Net Amount
          let penalty = Money.zero(plan.currentAmount.currency);
          if (isEarlyWithdrawal) {
            penalty = plan.calculateEarlyWithdrawalPenalty();
          }

          const netAmountValue =
            input.amount - processingFee.value - penalty.value;

          if (netAmountValue <= 0) {
            return yield* Effect.fail(
              new WithdrawalNotAllowedError({
                planId: plan.id.value,
                reason: `Withdrawal amount ${input.amount} cannot cover fees ${processingFee.value} and penalty ${penalty.value}`,
              })
            );
          }

          const netAmount = Money.fromNumber(
            netAmountValue,
            plan.currentAmount.currency
          );

          // 11. Perform Withdrawal
          const originalVersion = plan.version;
          const updatedPlan = plan.withdraw(
            Money.fromNumber(input.amount, plan.currentAmount.currency)
          );

          // 12. Handle Wallet Credit (if applicable)
          if (input.destination === PaymentDestinationEnum.WALLET) {
            yield* wallet.credit(plan.userId, netAmount);
          }

          // 13. Create Transaction Record
          const reference = `WDR-${Date.now()}-${Math.floor(
            Math.random() * 1000
          )}`;

          const transaction = Transaction.create(
            plan.userId,
            netAmount,
            TransactionTypeSchema.make(TransactionTypeEnum.WITHDRAWAL),
            reference,
            plan.id,
            input.destination === PaymentDestinationEnum.WALLET
              ? PaymentSourceSchema.make(PaymentSourceEnum.WALLET)
              : PaymentSourceSchema.make(PaymentSourceEnum.BANK_TRANSFER),
            JSON.stringify({
              grossAmount: input.amount,
              fee: processingFee.value,
              penalty: penalty.value,
              isEarlyWithdrawal,
              taxWarning: taxWarning || undefined,
            })
          ).complete();

          yield* transactionRepository.save(transaction).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "save",
                  table: "transactions",
                  message: error.message,
                })
            )
          );

          // 14. Verify concurrency and Save Plan
          const currentPlan = yield* savingsRepository.findById(plan.id).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findById",
                  table: "savings_plans",
                  message: error.message || "Failed to verify plan state",
                })
            )
          );

          if (!currentPlan || currentPlan.version !== originalVersion) {
            return yield* Effect.fail(
              new ConcurrentWithdrawalError({
                planId: plan.id.value,
                expectedVersion: originalVersion,
                actualVersion: currentPlan?.version || -1,
              })
            );
          }

          yield* savingsRepository.update(updatedPlan).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "update",
                  table: "savings_plans",
                  message: error.message,
                })
            )
          );

          return {
            transactionId: transaction.id.value,
            status: "success",
            message: taxWarning
              ? `Withdrawal processed. ${taxWarning}`
              : "Withdrawal processed successfully",
          };
        }),
    };
  })
);
