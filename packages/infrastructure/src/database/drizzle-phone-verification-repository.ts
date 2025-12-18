import type { PhoneVerificationRepository } from "@host/domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { DatabaseService, phoneVerification } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { eq } from "drizzle-orm";
import {
  PhoneVerificationId,
  PhoneVerification,
  RepositoryError,
} from "@host/domain";

/**
 * Map database row to PhoneVerification domain entity
 */
function mapToDomainEntity(
  row: typeof phoneVerification.$inferSelect
): PhoneVerification {
  return new PhoneVerification({
    id: PhoneVerificationId.make(row.id),
    phoneNumber: row.phoneNumber,
    otp: row.otp,
    expiresAt: row.expiresAt,
    verified: row.verified,
    attempts: row.attempts,
    createdAt: row.createdAt,
  });
}

/**
 * Drizzle implementation of PhoneVerificationRepository
 */
export const DrizzlePhoneVerificationRepository =
  Context.GenericTag<PhoneVerificationRepository>(
    "@infrastructure/DrizzlePhoneVerificationRepository"
  );

export const DrizzlePhoneVerificationRepositoryLive = Layer.effect(
  DrizzlePhoneVerificationRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzlePhoneVerificationRepository.of({
      create: (entity: PhoneVerification) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(phoneVerification).values({
              id: entity.id,
              phoneNumber: entity.phoneNumber,
              otp: entity.otp,
              expiresAt: entity.expiresAt,
              verified: entity.verified,
              attempts: entity.attempts,
              createdAt: entity.createdAt,
            });
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("create", "PhoneVerification", error)
            )
          )
        ),

      findById: (id: PhoneVerificationId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(phoneVerification)
                .where(eq(phoneVerification.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findById", "PhoneVerification", error)
            )
          )
        ),

      findByPhoneNumber: (phoneNumber: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(phoneVerification)
                .where(eq(phoneVerification.phoneNumber, phoneNumber))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "findByPhoneNumber",
                "PhoneVerification",
                error
              )
            )
          )
        ),

      update: (entity: PhoneVerification) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(phoneVerification)
              .set({
                otp: entity.otp,
                expiresAt: entity.expiresAt,
                verified: entity.verified,
                attempts: entity.attempts,
              })
              .where(eq(phoneVerification.id, entity.id));
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("update", "PhoneVerification", error)
            )
          )
        ),

      delete: (id: PhoneVerificationId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .delete(phoneVerification)
              .where(eq(phoneVerification.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("delete", "PhoneVerification", error)
            )
          )
        ),
    } as unknown as PhoneVerificationRepository);
  })
);
