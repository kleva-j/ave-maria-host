import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { VerificationRepository } from "@host/domain";

import { Verification, VerificationId, RepositoryError } from "@host/domain";
import { DatabaseService, verification } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { eq } from "drizzle-orm";

/**
 * Map database row to Verification domain entity
 */
function mapToDomainEntity(
  row: typeof verification.$inferSelect
): Verification {
  return new Verification({
    id: VerificationId.make(row.id),
    identifier: row.identifier,
    value: row.value,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Drizzle implementation of VerificationRepository
 */
export const DrizzleVerificationRepository =
  Context.GenericTag<VerificationRepository>(
    "@infrastructure/DrizzleVerificationRepository"
  );

export const DrizzleVerificationRepositoryLive = Layer.effect(
  DrizzleVerificationRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleVerificationRepository.of({
      create: (entity: Verification) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(verification).values({
              id: entity.id,
              identifier: entity.identifier,
              value: entity.value,
              expiresAt: entity.expiresAt,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
            });
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("create", "Verification", error))
          )
        ),

      findById: (id: VerificationId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(verification)
                .where(eq(verification.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findById", "Verification", error)
            )
          )
        ),

      findByIdentifier: (identifier: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(verification)
                .where(eq(verification.identifier, identifier))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByIdentifier", "Verification", error)
            )
          )
        ),

      delete: (id: VerificationId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.delete(verification).where(eq(verification.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("delete", "Verification", error))
          )
        ),

      deleteByIdentifier: (identifier: string) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .delete(verification)
              .where(eq(verification.identifier, identifier));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "deleteByIdentifier",
                "Verification",
                error
              )
            )
          )
        ),
    } as unknown as VerificationRepository);
  })
);
