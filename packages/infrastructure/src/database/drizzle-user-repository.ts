import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { KycStatus, BrandedKycTier } from "@host/shared";
import type { UserRepository, UserId } from "@host/domain";

import { RepositoryError, User } from "@host/domain";
import { DatabaseService, user } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { UserIdSchema } from "@host/shared";
import { eq, and } from "drizzle-orm";

/**
 * Map database row to User domain entity
 */
function mapToDomainEntity(row: typeof user.$inferSelect): User {
  return new User({
    id: UserIdSchema.make(row.id),
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    phoneNumber: row.phoneNumber,
    phoneVerified: row.phoneVerified ?? false,
    dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
    kycTier: row.kycTier as BrandedKycTier,
    kycStatus: row.kycStatus as KycStatus,
    kycData: row.kycData,
    kycVerifiedAt: row.kycVerifiedAt,
    biometricEnabled: row.biometricEnabled ?? false,
    biometricPublicKey: row.biometricPublicKey,
    isActive: row.isActive,
    isSuspended: row.isSuspended ?? false,
    suspendedAt: row.suspendedAt,
    suspensionReason: row.suspensionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Drizzle implementation of UserRepository
 */
export const DrizzleUserRepository = Context.GenericTag<UserRepository>(
  "@infrastructure/DrizzleUserRepository"
);

export const DrizzleUserRepositoryLive = Layer.effect(
  DrizzleUserRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleUserRepository.of({
      save: (userEntity: User) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(user).values({
              id: userEntity.id,
              name: userEntity.name,
              email: userEntity.email,
              emailVerified: userEntity.emailVerified,
              image: userEntity.image,
              phoneNumber: userEntity.phoneNumber,
              phoneVerified: userEntity.phoneVerified,
              dateOfBirth: userEntity.dateOfBirth
                ? userEntity.dateOfBirth.toISOString().split("T")[0]
                : null,
              kycTier: userEntity.kycTier,
              kycStatus: userEntity.kycStatus,
              kycData: userEntity.kycData,
              kycVerifiedAt: userEntity.kycVerifiedAt,
              biometricEnabled: userEntity.biometricEnabled,
              biometricPublicKey: userEntity.biometricPublicKey,
              isActive: userEntity.isActive,
              isSuspended: userEntity.isSuspended,
              suspendedAt: userEntity.suspendedAt,
              suspensionReason: userEntity.suspensionReason,
              createdAt: userEntity.createdAt,
              updatedAt: userEntity.updatedAt,
            });
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("save", "User", error))
          )
        ),

      findById: (id: UserId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(user)
                .where(eq(user.id, id.value))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findById", "User", error))
          )
        ),

      findByEmail: (email: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(user)
                .where(eq(user.email, email))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findByEmail", "User", error))
          )
        ),

      findByPhoneNumber: (phoneNumber: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(user)
                .where(eq(user.phoneNumber, phoneNumber))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByPhoneNumber", "User", error)
            )
          )
        ),

      update: (userEntity: User) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(user)
              .set({
                name: userEntity.name,
                email: userEntity.email,
                emailVerified: userEntity.emailVerified,
                image: userEntity.image,
                phoneNumber: userEntity.phoneNumber,
                phoneVerified: userEntity.phoneVerified,
                dateOfBirth: userEntity.dateOfBirth
                  ? userEntity.dateOfBirth.toISOString().split("T")[0]
                  : null,
                kycTier: userEntity.kycTier,
                kycStatus: userEntity.kycStatus,
                kycData: userEntity.kycData,
                kycVerifiedAt: userEntity.kycVerifiedAt,
                biometricEnabled: userEntity.biometricEnabled,
                biometricPublicKey: userEntity.biometricPublicKey,
                isActive: userEntity.isActive,
                isSuspended: userEntity.isSuspended,
                suspendedAt: userEntity.suspendedAt,
                suspensionReason: userEntity.suspensionReason,
                updatedAt: new Date(),
              })
              .where(eq(user.id, userEntity.id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("update", "User", error))
          )
        ),

      delete: (id: UserId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(user)
              .set({
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(user.id, id.value));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("delete", "User", error))
          )
        ),

      findAllActive: () =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(user)
                .where(
                  and(eq(user.isActive, true), eq(user.isSuspended, false))
                )
                .orderBy(user.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findAllActive", "User", error))
          )
        ),

      findByKycTier: (tier: number) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(user)
                .where(eq(user.kycTier, tier))
                .orderBy(user.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findByKycTier", "User", error))
          )
        ),

      findByKycStatus: (status: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(user)
                .where(eq(user.kycStatus, status))
                .orderBy(user.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByKycStatus", "User", error)
            )
          )
        ),

      emailExists: (email: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select({ id: user.id })
                .from(user)
                .where(eq(user.email, email))
                .limit(1);
            }
          );

          return result.length > 0;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("emailExists", "User", error))
          )
        ),

      phoneNumberExists: (phoneNumber: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select({ id: user.id })
                .from(user)
                .where(eq(user.phoneNumber, phoneNumber))
                .limit(1);
            }
          );

          return result.length > 0;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("phoneNumberExists", "User", error)
            )
          )
        ),
    });
  })
);
