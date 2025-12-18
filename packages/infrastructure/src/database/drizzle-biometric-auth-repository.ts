import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { DeviceIdType, UserIdType } from "@host/shared";
import type { BiometricAuthRepository } from "@host/domain";

import { BiometricAuth, BiometricAuthId, RepositoryError } from "@host/domain";
import { DeviceIdSchema, UserIdSchema } from "@host/shared";
import { DatabaseService, biometricAuth } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { eq } from "drizzle-orm";

/**
 * Map database row to BiometricAuth domain entity
 */
function mapToDomainEntity(
  row: typeof biometricAuth.$inferSelect
): BiometricAuth {
  return new BiometricAuth({
    id: BiometricAuthId.make(row.id),
    userId: UserIdSchema.make(row.userId),
    deviceId: DeviceIdSchema.make(row.deviceId),
    deviceName: row.deviceName,
    publicKey: row.publicKey,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Drizzle implementation of BiometricAuthRepository
 */
export const DrizzleBiometricAuthRepository =
  Context.GenericTag<BiometricAuthRepository>(
    "@infrastructure/DrizzleBiometricAuthRepository"
  );

export const DrizzleBiometricAuthRepositoryLive = Layer.effect(
  DrizzleBiometricAuthRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleBiometricAuthRepository.of({
      create: (entity: BiometricAuth) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(biometricAuth).values({
              id: entity.id,
              userId: entity.userId,
              deviceId: entity.deviceId,
              deviceName: entity.deviceName,
              publicKey: entity.publicKey,
              isActive: entity.isActive,
              lastUsedAt: entity.lastUsedAt,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
            });
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("create", "BiometricAuth", error)
            )
          )
        ),

      findById: (id: BiometricAuthId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(biometricAuth)
                .where(eq(biometricAuth.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findById", "BiometricAuth", error)
            )
          )
        ),

      findByUserId: (userId: UserIdType) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(biometricAuth)
                .where(eq(biometricAuth.userId, userId));
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByUserId", "BiometricAuth", error)
            )
          )
        ),

      findByDeviceId: (deviceId: DeviceIdType) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(biometricAuth)
                .where(eq(biometricAuth.deviceId, deviceId))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByDeviceId", "BiometricAuth", error)
            )
          )
        ),

      update: (entity: BiometricAuth) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(biometricAuth)
              .set({
                deviceName: entity.deviceName,
                isActive: entity.isActive,
                lastUsedAt: entity.lastUsedAt,
                updatedAt: new Date(),
              })
              .where(eq(biometricAuth.id, entity.id));
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("update", "BiometricAuth", error)
            )
          )
        ),

      delete: (id: BiometricAuthId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.delete(biometricAuth).where(eq(biometricAuth.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("delete", "BiometricAuth", error)
            )
          )
        ),
    } as unknown as BiometricAuthRepository);
  })
);
