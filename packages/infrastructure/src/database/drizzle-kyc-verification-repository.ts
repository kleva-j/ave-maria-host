import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { KycVerificationRepository } from "@host/domain";
import type { UserIdType } from "@host/shared";

import { DatabaseService, kycVerification } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { UserIdSchema } from "@host/shared";
import { eq, and } from "drizzle-orm";
import {
  KycVerificationId,
  KycVerification,
  RepositoryError,
} from "@host/domain";

/**
 * Map database row to KycVerification domain entity
 */
function mapToDomainEntity(
  row: typeof kycVerification.$inferSelect
): KycVerification {
  return new KycVerification({
    id: KycVerificationId.make(row.id),
    userId: UserIdSchema.make(row.userId),
    tier: row.tier,
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
    address: row.address,
    governmentIdType: row.governmentIdType,
    governmentIdNumber: row.governmentIdNumber,
    governmentIdImage: row.governmentIdImage,
    selfieImage: row.selfieImage,
    verificationData: row.verificationData,
    verifiedBy: row.verifiedBy,
    verifiedAt: row.verifiedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Drizzle implementation of KycVerificationRepository
 */
export const DrizzleKycVerificationRepository =
  Context.GenericTag<KycVerificationRepository>(
    "@infrastructure/DrizzleKycVerificationRepository"
  );

export const DrizzleKycVerificationRepositoryLive = Layer.effect(
  DrizzleKycVerificationRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleKycVerificationRepository.of({
      create: (entity: KycVerification) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(kycVerification).values({
              id: entity.id,
              userId: entity.userId,
              tier: entity.tier,
              status: entity.status,
              firstName: entity.firstName,
              lastName: entity.lastName,
              dateOfBirth: entity.dateOfBirth
                ? entity.dateOfBirth.toISOString().split("T")[0]
                : null,
              address: entity.address,
              governmentIdType: entity.governmentIdType,
              governmentIdNumber: entity.governmentIdNumber,
              governmentIdImage: entity.governmentIdImage,
              selfieImage: entity.selfieImage,
              verificationData: entity.verificationData,
              verifiedBy: entity.verifiedBy,
              verifiedAt: entity.verifiedAt,
              rejectionReason: entity.rejectionReason,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
            });
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("create", "KycVerification", error)
            )
          )
        ),

      findById: (id: KycVerificationId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(kycVerification)
                .where(eq(kycVerification.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findById", "KycVerification", error)
            )
          )
        ),

      findByUserId: (userId: UserIdType) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(kycVerification)
                .where(eq(kycVerification.userId, userId))
                .orderBy(kycVerification.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByUserId", "KycVerification", error)
            )
          )
        ),

      findByUserIdAndTier: (userId: UserIdType, tier: number) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(kycVerification)
                .where(
                  and(
                    eq(kycVerification.userId, userId),
                    eq(kycVerification.tier, tier)
                  )
                )
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "findByUserIdAndTier",
                "KycVerification",
                error
              )
            )
          )
        ),

      update: (entity: KycVerification) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(kycVerification)
              .set({
                status: entity.status,
                firstName: entity.firstName,
                lastName: entity.lastName,
                dateOfBirth: entity.dateOfBirth
                  ? entity.dateOfBirth.toISOString().split("T")[0]
                  : null,
                address: entity.address,
                governmentIdType: entity.governmentIdType,
                governmentIdNumber: entity.governmentIdNumber,
                governmentIdImage: entity.governmentIdImage,
                selfieImage: entity.selfieImage,
                verificationData: entity.verificationData,
                verifiedBy: entity.verifiedBy,
                verifiedAt: entity.verifiedAt,
                rejectionReason: entity.rejectionReason,
                updatedAt: new Date(),
              })
              .where(eq(kycVerification.id, entity.id));
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("update", "KycVerification", error)
            )
          )
        ),

      delete: (id: KycVerificationId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .delete(kycVerification)
              .where(eq(kycVerification.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("delete", "KycVerification", error)
            )
          )
        ),
    } as unknown as KycVerificationRepository);
  })
);
