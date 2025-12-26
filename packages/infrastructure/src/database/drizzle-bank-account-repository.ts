import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { DatabaseService, bankAccounts } from "@host/db";
import { Effect, Layer } from "effect";
import { eq, and } from "drizzle-orm";
import {
  BankAccountRepository,
  RepositoryError,
  BankAccount,
  UserId,
} from "@host/domain";

/**
 * Map database row to BankAccount domain entity
 */
function mapToDomainEntity(row: typeof bankAccounts.$inferSelect): BankAccount {
  // Use create factory which handles Schema construction
  return BankAccount.create({
    id: row.id,
    userId: UserId.fromString(row.userId),
    bankCode: row.bankCode,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    accountName: row.accountName,
    isVerified: row.isVerified,
    isPrimary: row.isPrimary,
  });
}

export const DrizzleBankAccountRepository = Layer.effect(
  BankAccountRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return BankAccountRepository.of({
      findById: (id: string) =>
        db
          .withDrizzle(async (drizzle: NodePgDatabase) => {
            const results = await drizzle
              .select()
              .from(bankAccounts)
              .where(eq(bankAccounts.id, id))
              .limit(1);

            return results[0] ? mapToDomainEntity(results[0]) : null;
          })
          .pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                RepositoryError.create("findById", "BankAccount", error)
              )
            )
          ),

      findByUserId: (userId: UserId) =>
        db
          .withDrizzle(async (drizzle: NodePgDatabase) => {
            const results = await drizzle
              .select()
              .from(bankAccounts)
              .where(eq(bankAccounts.userId, userId.value));
            return results.map(mapToDomainEntity);
          })
          .pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                RepositoryError.create("findByUserId", "BankAccount", error)
              )
            )
          ),

      findPrimaryByUserId: (userId: UserId) =>
        db
          .withDrizzle(async (drizzle: NodePgDatabase) => {
            const results = await drizzle
              .select()
              .from(bankAccounts)
              .where(
                and(
                  eq(bankAccounts.userId, userId.value),
                  eq(bankAccounts.isPrimary, true)
                )
              )
              .limit(1);
            // return results.length > 0 ? mapToDomainEntity(results[0]) : null;
            return results[0] ? mapToDomainEntity(results[0]) : null;
          })
          .pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                RepositoryError.create(
                  "findPrimaryByUserId",
                  "BankAccount",
                  error
                )
              )
            )
          ),

      save: (bankAccount: BankAccount) =>
        db
          .withDrizzle(async (drizzle: NodePgDatabase) => {
            const results = await drizzle
              .insert(bankAccounts)
              .values({
                id: bankAccount.id,
                userId: bankAccount.userId,
                bankCode: bankAccount.bankCode,
                bankName: bankAccount.bankName,
                accountNumber: bankAccount.accountNumber,
                accountName: bankAccount.accountName,
                isVerified: bankAccount.isVerified,
                isPrimary: bankAccount.isPrimary,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: bankAccounts.id,
                set: {
                  bankCode: bankAccount.bankCode,
                  bankName: bankAccount.bankName,
                  accountNumber: bankAccount.accountNumber,
                  accountName: bankAccount.accountName,
                  isVerified: bankAccount.isVerified,
                  isPrimary: bankAccount.isPrimary,
                  updatedAt: new Date(),
                },
              })
              .returning();

            if (!results[0]) {
              throw new Error(
                "Failed to save bank account: No result returned from database"
              );
            }

            return mapToDomainEntity(results[0]);
          })
          .pipe(
            Effect.catchAll((error) =>
              Effect.fail(RepositoryError.create("save", "BankAccount", error))
            )
          ),

      delete: (id: string) =>
        db
          .withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.delete(bankAccounts).where(eq(bankAccounts.id, id));
          })
          .pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                RepositoryError.create("delete", "BankAccount", error)
              )
            )
          ),

      setPrimary: (id: string, userId: UserId) =>
        db
          .withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.transaction(async (tx) => {
              // Unset existing primary
              await tx
                .update(bankAccounts)
                .set({ isPrimary: false, updatedAt: new Date() })
                .where(
                  and(
                    eq(bankAccounts.userId, userId.value),
                    eq(bankAccounts.isPrimary, true)
                  )
                );

              // Set new primary
              await tx
                .update(bankAccounts)
                .set({ isPrimary: true, updatedAt: new Date() })
                .where(
                  and(
                    eq(bankAccounts.id, id),
                    eq(bankAccounts.userId, userId.value)
                  )
                );
            });
          })
          .pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                RepositoryError.create("setPrimary", "BankAccount", error)
              )
            )
          ),
    });
  })
);
