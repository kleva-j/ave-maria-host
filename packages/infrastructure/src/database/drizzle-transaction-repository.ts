import type { TransactionRepository, UserId, PlanId } from "@host/domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  TransactionStatus,
  TransactionType,
  PaymentSource,
  CurrencyCode,
} from "@host/shared";

import { DEFAULT_CURRENCY, TransactionStatusEnum } from "@host/shared";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";
import { DatabaseService, transactions } from "@host/db";
import { Effect, Context, Layer } from "effect";
import {
  Money as MoneyVO,
  RepositoryError,
  TransactionId,
  Transaction,
} from "@host/domain";

/**
 * Map database row to Transaction domain entity
 */
function mapToDomainEntity(row: typeof transactions.$inferSelect): Transaction {
  return new Transaction(
    TransactionId.fromString(row.id),
    { value: row.userId } as UserId,
    row.planId ? ({ value: row.planId } as PlanId) : null,
    MoneyVO.fromNumber(Number(row.amount), row.currency as CurrencyCode),
    row.type as TransactionType,
    row.status as TransactionStatus,
    row.paymentSource as PaymentSource,
    row.reference,
    row.description || null,
    row.metadata ? JSON.parse(row.metadata) : null,
    row.createdAt,
    row.completedAt,
    row.failedAt,
    row.failureReason
  );
}

/**
 * Drizzle implementation of TransactionRepository
 */
export const DrizzleTransactionRepository =
  Context.GenericTag<TransactionRepository>(
    "@infrastructure/DrizzleTransactionRepository"
  );

export const DrizzleTransactionRepositoryLive = Layer.effect(
  DrizzleTransactionRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleTransactionRepository.of({
      save: (transaction: Transaction) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(transactions).values({
              id: transaction.id.value,
              userId: transaction.userId.value,
              planId: transaction.planId?.value || null,
              amount: transaction.amount.value.toString(),
              currency: transaction.amount.currency,
              type: transaction.type,
              status: transaction.status,
              paymentSource: transaction.source as PaymentSource,
              reference: transaction.reference,
              description: transaction.description || null,
              metadata: transaction.metadata
                ? JSON.stringify(transaction.metadata)
                : null,
              createdAt: transaction.createdAt,
              completedAt: transaction.completedAt,
              updatedAt: new Date(),
              failedAt: transaction.failedAt,
              failureReason: transaction.failureReason,
            });
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("save", "Transaction", error))
          )
        ),

      findById: (id: TransactionId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(eq(transactions.id, id.value))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findById", "Transaction", error)
            )
          )
        ),

      findByUserId: (userId: UserId, limit = 50, offset = 0) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(eq(transactions.userId, userId.value))
                .orderBy(desc(transactions.createdAt))
                .limit(limit)
                .offset(offset);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByUserId", "Transaction", error)
            )
          )
        ),

      findByPlanId: (planId: PlanId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(eq(transactions.planId, planId.value))
                .orderBy(desc(transactions.createdAt));
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByPlanId", "Transaction", error)
            )
          )
        ),

      findByReference: (reference: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(eq(transactions.reference, reference))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByReference", "Transaction", error)
            )
          )
        ),

      update: (transaction: Transaction) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(transactions)
              .set({
                status: transaction.status,
                completedAt: transaction.completedAt,
                updatedAt: new Date(),
              })
              .where(eq(transactions.id, transaction.id.value));
          });
          return null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("update", "Transaction", error))
          )
        ),

      findByStatus: (status: TransactionStatus) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(eq(transactions.status, status))
                .orderBy(desc(transactions.createdAt));
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByStatus", "Transaction", error)
            )
          )
        ),

      findByTypeAndUser: (type: TransactionType, userId: UserId, limit = 50) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(
                  and(
                    eq(transactions.type, type),
                    eq(transactions.userId, userId.value)
                  )
                )
                .orderBy(desc(transactions.createdAt))
                .limit(limit);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByTypeAndUser", "Transaction", error)
            )
          )
        ),

      findBySource: (source: PaymentSource) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(eq(transactions.paymentSource, source));
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findBySource", "Transaction", error)
            )
          )
        ),

      getTransactionHistory: (
        userId: UserId,
        startDate: Date,
        endDate: Date,
        limit = 100,
        offset = 0
      ) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    gte(transactions.createdAt, startDate),
                    lte(transactions.createdAt, endDate)
                  )
                )
                .orderBy(desc(transactions.createdAt))
                .limit(limit)
                .offset(offset);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getTransactionHistory",
                "Transaction",
                error
              )
            )
          )
        ),

      getDailyTransactionTotal: (
        userId: UserId,
        date: Date,
        types?: TransactionType[]
      ) =>
        Effect.gen(function* () {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const query = drizzle
                .select({
                  total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
                  currency: transactions.currency,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    gte(transactions.createdAt, startOfDay),
                    lte(transactions.createdAt, endOfDay),
                    types && types.length > 0
                      ? inArray(transactions.type, types)
                      : undefined
                  )
                );

              const rows = await query;
              return rows[0] || { total: "0", currency: DEFAULT_CURRENCY };
            }
          );

          return MoneyVO.fromNumber(
            Number(result.total),
            result.currency as CurrencyCode
          );
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getDailyTransactionTotal",
                "Transaction",
                error
              )
            )
          )
        ),

      getMonthlyTransactionTotal: (
        userId: UserId,
        year: number,
        month: number,
        types?: TransactionType[]
      ) =>
        Effect.gen(function* () {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59, 999);

          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const query = drizzle
                .select({
                  total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
                  currency: transactions.currency,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    gte(transactions.createdAt, startDate),
                    lte(transactions.createdAt, endDate),
                    types && types.length > 0
                      ? inArray(transactions.type, types)
                      : undefined
                  )
                );

              const rows = await query;
              return rows[0] || { total: "0", currency: DEFAULT_CURRENCY };
            }
          );

          return MoneyVO.fromNumber(
            Number(result.total),
            result.currency as CurrencyCode
          );
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getMonthlyTransactionTotal",
                "Transaction",
                error
              )
            )
          )
        ),

      findStaleTransactions: (olderThanMinutes: number) =>
        Effect.gen(function* () {
          const cutoffTime = new Date();
          cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);

          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(
                  and(
                    eq(transactions.status, TransactionStatusEnum.PENDING),
                    lte(transactions.createdAt, cutoffTime)
                  )
                );
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "findStaleTransactions",
                "Transaction",
                error
              )
            )
          )
        ),

      getTransactionCountByStatus: (
        userId: UserId,
        status: TransactionStatus
      ) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({
                  count: sql<number>`COUNT(*)::int`,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.status, status)
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
                "getTransactionCountByStatus",
                "Transaction",
                error
              )
            )
          )
        ),

      findTransactionsForProcessing: () =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(transactions)
                .where(eq(transactions.status, TransactionStatusEnum.PENDING))
                .orderBy(transactions.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "findTransactionsForProcessing",
                "Transaction",
                error
              )
            )
          )
        ),
    });
  })
);
