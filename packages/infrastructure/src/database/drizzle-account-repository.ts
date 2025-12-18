import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AccountRepository } from "@host/domain";
import type { UserIdType } from "@host/shared";

import { Account, AccountId, RepositoryError } from "@host/domain";
import { DatabaseService, account } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { UserIdSchema } from "@host/shared";
import { eq, and } from "drizzle-orm";

/**
 * Map database row to Account domain entity
 */
function mapToDomainEntity(row: typeof account.$inferSelect): Account {
  return new Account({
    id: AccountId.make(row.id),
    accountId: row.accountId,
    providerId: row.providerId,
    userId: UserIdSchema.make(row.userId),
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    idToken: row.idToken,
    accessTokenExpiresAt: row.accessTokenExpiresAt,
    refreshTokenExpiresAt: row.refreshTokenExpiresAt,
    scope: row.scope,
    password: row.password,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Drizzle implementation of AccountRepository
 */
export const DrizzleAccountRepository = Context.GenericTag<AccountRepository>(
  "@infrastructure/DrizzleAccountRepository"
);

export const DrizzleAccountRepositoryLive = Layer.effect(
  DrizzleAccountRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleAccountRepository.of({
      create: (entity: Account) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(account).values({
              id: entity.id,
              accountId: entity.accountId,
              providerId: entity.providerId,
              userId: entity.userId,
              accessToken: entity.accessToken,
              refreshToken: entity.refreshToken,
              idToken: entity.idToken,
              accessTokenExpiresAt: entity.accessTokenExpiresAt,
              refreshTokenExpiresAt: entity.refreshTokenExpiresAt,
              scope: entity.scope,
              password: entity.password,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
            });
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("create", "Account", error))
          )
        ),

      findById: (id: AccountId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(account)
                .where(eq(account.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findById", "Account", error))
          )
        ),

      findByProvider: (providerId: string, accountId: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(account)
                .where(
                  and(
                    eq(account.providerId, providerId),
                    eq(account.accountId, accountId)
                  )
                )
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByProvider", "Account", error)
            )
          )
        ),

      findByUserId: (userId: UserIdType) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(account)
                .where(eq(account.userId, userId));
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByUserId", "Account", error)
            )
          )
        ),

      delete: (id: AccountId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.delete(account).where(eq(account.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("delete", "Account", error))
          )
        ),
    } as unknown as AccountRepository);
  })
);
