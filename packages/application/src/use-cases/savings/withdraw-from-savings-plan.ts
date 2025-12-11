import type { FinancialError } from "@host/shared";

import type {
  TransactionRepository,
  SavingsRepository,
  WalletRepository,
} from "@host/domain";

import { Transaction, Money, PlanId } from "@host/domain";
import { Effect, Context, Schema, Layer } from "effect";

import {
  WithdrawalNotAllowedError,
  WithdrawFromPlanSchema,
  PaymentDestinationEnum,
  InsufficientFundsError,
  TransactionTypeSchema,
  PaymentSourceSchema,
  WalletNotFoundError,
  TransactionTypeEnum,
  PaymentSourceEnum,
  ValidationError,
  DatabaseError,
  UserIdSchema,
} from "@host/shared";

/**
 * Input for withdrawing from a savings plan
 */
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
    const walletRepo = yield* Effect.serviceOption(
      Context.GenericTag<WalletRepository>("@domain/WalletRepository")
    );
    const transactionRepo = yield* Effect.serviceOption(
      Context.GenericTag<TransactionRepository>("@domain/TransactionRepository")
    );

    if (
      savingsRepo._tag === "None" ||
      walletRepo._tag === "None" ||
      transactionRepo._tag === "None"
    ) {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message:
            "Required repositories (Savings, Wallet, Transaction) not available",
        })
      );
    }

    const savingsRepository = savingsRepo.value;
    const walletRepository = walletRepo.value;
    const transactionRepository = transactionRepo.value;

    return {
      execute: (input: WithdrawFromSavingsPlanInput) =>
        Effect.gen(function* () {
          // Validate input
          // (RPC validates schema, but good practice to re-validate or just use typed input)

          // 1. Fetch Plan
          const plan = yield* savingsRepository
            .findById(PlanId.fromString(input.planId))
            .pipe(
              Effect.mapError(
                (error) =>
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

          // 3. Validate Withdraw Eligibility
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

          // 4. Validate Balance
          if (plan.currentAmount.value < input.amount) {
            return yield* Effect.fail(
              new InsufficientFundsError({
                available: plan.currentAmount.value,
                required: input.amount,
                currency: plan.currentAmount.currency,
              })
            );
          }

          // 5. Calculate Penalty and Net Amount
          let penalty = Money.zero(plan.currentAmount.currency);
          if (isEarlyWithdrawal) {
            // Determine penalty
            // Note: Domain calculates penalty based on TOTAL current amount.
            // We assume this applies proportionally or as a fixed fee logic from domain.
            // However, strictly reusing the method provided:
            penalty = plan.calculateEarlyWithdrawalPenalty();
          }

          const netAmountValue = input.amount - penalty.value;
          if (netAmountValue <= 0) {
            return yield* Effect.fail(
              new WithdrawalNotAllowedError({
                planId: plan.id.value,
                reason: `Withdrawal amount ${input.amount} cannot cover penalty ${penalty.value}`,
              })
            );
          }

          const netAmount = Money.fromNumber(
            netAmountValue,
            plan.currentAmount.currency
          );

          // 5. Perform Withdrawal (Credit Wallet or External Bank)
          // For 'wallet' destination, we credit the internal wallet.
          // For 'bank', we might just record a pending transaction.

          // Debit the plan
          // 5.1. Update Plan Entity
          const updatedPlan = plan.withdraw(
            Money.fromNumber(input.amount, plan.currentAmount.currency)
          );

          // 6. Handle Wallet Credit (if applicable)
          if (input.destination === PaymentDestinationEnum.WALLET) {
            const wallet = yield* walletRepository
              .findByUserId(plan.userId)
              .pipe(
                Effect.mapError(
                  (error) =>
                    new DatabaseError({
                      operation: "findByUserId",
                      table: "wallets",
                      message: error.message,
                    })
                )
              );

            if (!wallet) {
              return yield* Effect.fail(
                new WalletNotFoundError({
                  userId: plan.userId.value,
                  operation: "WithdrawFromSavingsPlan",
                })
              );
            }

            if (wallet) {
              // Credit wallet with the net amount
              yield* walletRepository.credit(plan.userId, netAmount).pipe(
                Effect.mapError(
                  (error) =>
                    new DatabaseError({
                      operation: "credit",
                      table: "wallets",
                      message: error.message || "Failed to credit wallet",
                    })
                )
              );
            }
          }

          // 7. Create Transaction Record
          const reference = `WDR-${Date.now()}-${Math.floor(
            Math.random() * 1000
          )}`;

          const transaction = Transaction.create(
            plan.userId,
            netAmount, // Record the Net amount received by user
            TransactionTypeSchema.make(TransactionTypeEnum.WITHDRAWAL),
            reference,
            plan.id,
            input.destination === PaymentDestinationEnum.WALLET
              ? PaymentSourceSchema.make(PaymentSourceEnum.WALLET)
              : PaymentSourceSchema.make(PaymentSourceEnum.BANK_TRANSFER),
            JSON.stringify({
              grossAmount: input.amount,
              penalty: penalty.value,
              isEarlyWithdrawal,
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

          // 8. Save Updated Plan
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
            message: "Withdrawal processed successfully",
          };
        }),
    };
  })
);
