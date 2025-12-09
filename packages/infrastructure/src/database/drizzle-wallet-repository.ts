import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { CurrencyCode } from "@host/shared";

import type {
  WalletTransactionSummary,
  WalletRepository,
  Wallet,
  UserId,
  Money,
} from "@host/domain";

import { TransactionStatusEnum, TransactionTypeEnum, DEFAULT_CURRENCY } from "@host/shared";
import { wallets, transactions, DatabaseService } from "@host/db";
import { Money as MoneyVO, RepositoryError } from "@host/domain";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { Effect, Context, Layer } from "effect";

/**
 * Map database row to Wallet domain entity
 */
function mapToDomainEntity(row: typeof wallets.$inferSelect): Wallet {
  return {
    id: row.id,
    userId: { value: row.userId } as UserId,
    balance: MoneyVO.fromNumber(
      Number(row.balance),
      row.currency as CurrencyCode
    ),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Drizzle implementation of WalletRepository
 */
export const DrizzleWalletRepository = Context.GenericTag<WalletRepository>(
  "@infrastructure/DrizzleWalletRepository"
);

export const DrizzleWalletRepositoryLive = Layer.effect(
  DrizzleWalletRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const getBalanceImpl = (
      userId: UserId
    ): Effect.Effect<Money, RepositoryError> =>
      Effect.gen(function* () {
        const result = yield* db.withDrizzle(
          async (drizzle: NodePgDatabase) => {
            const rows = await drizzle
              .select({
                balance: wallets.balance,
                currency: wallets.currency,
              })
              .from(wallets)
              .where(eq(wallets.userId, userId.value))
              .limit(1);

            return rows[0];
          }
        );

        if (!result) {
          return yield* Effect.fail(
            RepositoryError.create("getBalance", "Wallet", "Wallet not found")
          );
        }

        return MoneyVO.fromNumber(
          Number(result.balance),
          result.currency as CurrencyCode
        );
      }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(RepositoryError.create("getBalance", "Wallet", error))
        )
      );

    return DrizzleWalletRepository.of({
      create: (userId: UserId, initialBalance?: Money) =>
        Effect.gen(function* () {
          const balance = initialBalance || MoneyVO.zero(DEFAULT_CURRENCY);

          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const inserted = await drizzle
                .insert(wallets)
                .values({
                  userId: userId.value,
                  balance: balance.value.toString(),
                  currency: balance.currency,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .returning();

              return inserted[0];
            }
          );

          if (!result) {
            return yield* Effect.fail(
              RepositoryError.create(
                "create",
                "Wallet",
                "Failed to create wallet"
              )
            );
          }

          return mapToDomainEntity(result);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("create", "Wallet", error))
          )
        ),

      findByUserId: (userId: UserId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(wallets)
                .where(eq(wallets.userId, userId.value))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findByUserId", "Wallet", error))
          )
        ),

      getBalance: getBalanceImpl,

      credit: (userId: UserId, amount: Money) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const updated = await drizzle
                .update(wallets)
                .set({
                  balance: sql`${wallets.balance} + ${amount.value.toString()}`,
                  updatedAt: new Date(),
                })
                .where(eq(wallets.userId, userId.value))
                .returning({
                  balance: wallets.balance,
                  currency: wallets.currency,
                });

              return updated[0];
            }
          );

          if (!result) {
            return yield* Effect.fail(
              RepositoryError.create("credit", "Wallet", "Wallet not found")
            );
          }

          return MoneyVO.fromNumber(
            Number(result.balance),
            result.currency as CurrencyCode
          );
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("credit", "Wallet", error))
          )
        ),

      debit: (userId: UserId, amount: Money) =>
        Effect.gen(function* () {
          // First check if sufficient balance exists
          const currentBalance = yield* getBalanceImpl(userId);

          if (currentBalance.isLessThan(amount)) {
            return yield* Effect.fail(
              RepositoryError.create("debit", "Wallet", "Insufficient balance")
            );
          }

          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const updated = await drizzle
                .update(wallets)
                .set({
                  balance: sql`${wallets.balance} - ${amount.value.toString()}`,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(wallets.userId, userId.value),
                    sql`${wallets.balance} >= ${amount.value.toString()}`
                  )
                )
                .returning({
                  balance: wallets.balance,
                  currency: wallets.currency,
                });

              return updated[0];
            }
          );

          if (!result) {
            return yield* Effect.fail(
              RepositoryError.create(
                "debit",
                "Wallet",
                "Insufficient balance or wallet not found"
              )
            );
          }

          return MoneyVO.fromNumber(
            Number(result.balance),
            result.currency as CurrencyCode
          );
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("debit", "Wallet", error))
          )
        ),

      updateBalance: (userId: UserId, newBalance: Money) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(wallets)
              .set({
                balance: newBalance.value.toString(),
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, userId.value));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("updateBalance", "Wallet", error)
            )
          )
        ),

      hasSufficientBalance: (userId: UserId, amount: Money) =>
        Effect.gen(function* () {
          const balance = yield* getBalanceImpl(userId);
          return balance.isGreaterThanOrEqual(amount);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("hasSufficientBalance", "Wallet", error)
            )
          )
        ),

      setActive: (userId: UserId, isActive: boolean) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(wallets)
              .set({
                isActive,
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, userId.value));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("setActive", "Wallet", error))
          )
        ),

      getTransactionSummary: (userId: UserId, startDate: Date, endDate: Date) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              // Get credits (money coming in)
              const creditsResult = await drizzle
                .select({
                  total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
                  count: sql<number>`COUNT(*)::int`,
                  currency: transactions.currency,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    gte(transactions.createdAt, startDate),
                    lte(transactions.createdAt, endDate),
                    sql`${transactions.type} IN (${TransactionTypeEnum.WALLET_FUNDING}, ${TransactionTypeEnum.INTEREST})`
                  )
                );

              // Get debits (money going out)
              const debitsResult = await drizzle
                .select({
                  total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
                  count: sql<number>`COUNT(*)::int`,
                  currency: transactions.currency,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.userId, userId.value),
                    eq(transactions.status, TransactionStatusEnum.COMPLETED),
                    gte(transactions.createdAt, startDate),
                    lte(transactions.createdAt, endDate),
                    sql`${transactions.type} IN (${TransactionTypeEnum.CONTRIBUTION}, ${TransactionTypeEnum.WITHDRAWAL}, ${TransactionTypeEnum.PENALTY}, ${TransactionTypeEnum.AUTO_SAVE})`
                  )
                );

              const credits = creditsResult[0] || {
                total: "0",
                count: 0,
                currency: DEFAULT_CURRENCY,
              };
              const debits = debitsResult[0] || {
                total: "0",
                count: 0,
                currency: DEFAULT_CURRENCY,
              };

              return {
                totalCredits: Number(credits.total),
                totalDebits: Number(debits.total),
                transactionCount: credits.count + debits.count,
                currency:
                  credits.currency || debits.currency || DEFAULT_CURRENCY,
              };
            }
          );

          const totalCredits = MoneyVO.fromNumber(
            result.totalCredits,
            result.currency as CurrencyCode
          );
          const totalDebits = MoneyVO.fromNumber(
            result.totalDebits,
            result.currency as CurrencyCode
          );
          const netChange = totalCredits.subtract(totalDebits);

          return {
            totalCredits,
            totalDebits,
            transactionCount: result.transactionCount,
            netChange,
          } as WalletTransactionSummary;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("getTransactionSummary", "Wallet", error)
            )
          )
        ),
    });
  })
);
