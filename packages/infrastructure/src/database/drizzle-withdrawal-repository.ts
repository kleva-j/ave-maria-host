import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  WithdrawalHistoryEntry,
  WithdrawalRepository,
  UserId,
  PlanId,
} from "@host/domain";

import { TransactionStatusEnum, TransactionTypeEnum } from "@host/shared";
import { DatabaseService, transactions } from "@host/db";
import { Money, RepositoryError } from "@host/domain";
import { eq, and, gte, sql } from "drizzle-orm";
import { Effect, Context, Layer } from "effect";

/**
 * Drizzle implementation of WithdrawalRepository
 * Provides withdrawal history and limit checking capabilities
 */
export const DrizzleWithdrawalRepository =
  Context.GenericTag<WithdrawalRepository>(
    "@infrastructure/DrizzleWithdrawalRepository"
  );

export const DrizzleWithdrawalRepositoryLive = Layer.effect(
  DrizzleWithdrawalRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleWithdrawalRepository.of({
      /**
       * Get count of withdrawals for a user since a specific date
       */
      getWithdrawalCountSince: (userId: UserId, since: Date) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({ count: sql<number>`COUNT(*)::int` })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.type, TransactionTypeEnum.WITHDRAWAL),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    gte(transactions.createdAt, since)
                  )
                );

              return rows[0]?.count || 0;
            }
          );

          return result;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getWithdrawalCountSince",
                "Transaction",
                error
              )
            )
          )
        ),

      /**
       * Get total amount withdrawn by a user since a specific date
       */
      getWithdrawalAmountSince: (
        userId: UserId,
        since: Date,
        currency: string
      ) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({
                  total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.type, TransactionTypeEnum.WITHDRAWAL),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    eq(transactions.currency, currency),
                    gte(transactions.createdAt, since)
                  )
                );

              return rows[0]?.total || "0";
            }
          );

          return Money.fromNumber(Number(result));
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getWithdrawalAmountSince",
                "Transaction",
                error
              )
            )
          )
        ),

      /**
       * Get count of withdrawals for a specific plan since a date
       */
      getPlanWithdrawalCountSince: (planId: PlanId, since: Date) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({ count: sql<number>`COUNT(*)::int` })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.planId, planId.value),
                    eq(transactions.type, TransactionTypeEnum.WITHDRAWAL),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    gte(transactions.createdAt, since)
                  )
                );

              return rows[0]?.count || 0;
            }
          );

          return result;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getPlanWithdrawalCountSince",
                "Transactions",
                error
              )
            )
          )
        ),

      /**
       * Get total amount withdrawn from a plan since a date
       */
      getPlanWithdrawalAmountSince: (
        planId: PlanId,
        since: Date,
        currency: string
      ) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({
                  total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.planId, planId.value),
                    eq(transactions.type, TransactionTypeEnum.WITHDRAWAL),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    eq(transactions.currency, currency),
                    gte(transactions.createdAt, since)
                  )
                );

              return rows[0]?.total || "0";
            }
          );

          return Money.fromNumber(Number(result));
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getPlanWithdrawalAmountSince",
                "Transactions",
                error
              )
            )
          )
        ),

      /**
       * Get withdrawal history for a user
       */
      getWithdrawalHistory: (userId: UserId, limit = 50, offset = 0) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({
                  transactionId: transactions.id,
                  planId: transactions.planId,
                  userId: transactions.userId,
                  amount: transactions.amount,
                  currency: transactions.currency,
                  withdrawnAt: transactions.completedAt,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.type, TransactionTypeEnum.WITHDRAWAL),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED)
                  )
                )
                .orderBy(sql`${transactions.completedAt} DESC`)
                .limit(limit)
                .offset(offset);

              return rows.map(
                (row): WithdrawalHistoryEntry => ({
                  transactionId: row.transactionId,
                  planId: row.planId || "",
                  userId: row.userId,
                  amount: Number(row.amount),
                  currency: row.currency,
                  withdrawnAt: row.withdrawnAt || new Date(),
                })
              );
            }
          );

          return result;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getWithdrawalHistory",
                "Transactions",
                error
              )
            )
          )
        ),

      /**
       * Check if a plan has any pending withdrawals
       */
      hasPendingWithdrawals: (planId: PlanId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({ count: sql<number>`COUNT(*)::int` })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.planId, planId.value),
                    eq(transactions.type, TransactionTypeEnum.WITHDRAWAL),
                    eq(transactions.status, TransactionStatusEnum.PENDING)
                  )
                );

              return rows[0]?.count || 0;
            }
          );

          return result > 0;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "hasPendingWithdrawals",
                "Transactions",
                error
              )
            )
          )
        ),
    });
  })
);
