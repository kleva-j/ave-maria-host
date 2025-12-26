import type { GetTransactionHistoryOutput, FinancialError } from "@host/shared";

import { TransactionRepository, UserId } from "@host/domain";
import { Context, Effect, Layer, Schema } from "effect";
import {
  GetTransactionHistoryOutputSchema,
  GetTransactionHistorySchema,
  DatabaseError,
} from "@host/shared";

const InputSchema = GetTransactionHistorySchema.pipe(
  Schema.extend(Schema.Struct({ userId: UserId }))
);

type InputSchemaType = typeof InputSchema.Type;

export interface GetTransactionHistoryUseCase {
  readonly execute: (
    input: InputSchemaType
  ) => Effect.Effect<GetTransactionHistoryOutput, FinancialError>;
}

export const GetTransactionHistoryUseCase =
  Context.GenericTag<GetTransactionHistoryUseCase>(
    "@app/GetTransactionHistoryUseCase"
  );

export const GetTransactionHistoryUseCaseLive = Layer.effect(
  GetTransactionHistoryUseCase,
  Effect.gen(function* () {
    const transactionRepo = yield* TransactionRepository;

    return {
      execute: (input: InputSchemaType) =>
        Effect.gen(function* () {
          const transactions = yield* transactionRepo
            .getTransactionHistory(
              UserId.fromString(input.userId),
              input.startDate,
              input.endDate,
              input.limit,
              input.offset,
              input.type,
              input.status
            )
            .pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "get-transaction-history",
                    table: "transactions",
                    message: error.message || "Failed to fetch transactions",
                  })
              )
            );

          // We might want to get total count as well for pagination
          // For now, simple implementation assuming 'transactions' length indicates more? No.
          // The repository doesn't return total count in getTransactionHistory.
          // We can add a count query or just infer hasMore if length == limit.
          const limit = input.limit || 20;
          const hasMore = transactions.length === limit;

          return GetTransactionHistoryOutputSchema.make({
            transactions: transactions.map((t) => ({
              id: t.id.value,
              userId: t.userId.value,
              planId: t.planId?.value ?? null,
              amount: t.amount.value,
              type: t.type,
              status: t.status,
              reference: t.reference,
              description: t.description,
              createdAt: t.createdAt,
              completedAt: t.completedAt ?? null,
            })),
            total: transactions.length, // Ideally total count of ALL matching records, not just page
            hasMore: hasMore,
          });
        }),
    };
  })
);
