import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PermissionRepository } from "@host/domain";
import type { PermissionIdType } from "@host/shared";

import { RepositoryError, Permission } from "@host/domain";
import { DatabaseService, permissions } from "@host/db";
import { PermissionIdSchema } from "@host/shared";
import { Effect, Context, Layer } from "effect";
import { eq } from "drizzle-orm";

/**
 * Map database row to Permission domain entity
 */
function mapToDomainEntity(row: typeof permissions.$inferSelect): Permission {
  return new Permission({
    id: PermissionIdSchema.make(row.id),
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    resource: row.resource,
    action: row.action,
    isSystem: row.isSystem,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Drizzle implementation of PermissionRepository
 */
export const DrizzlePermissionRepository =
  Context.GenericTag<PermissionRepository>(
    "@infrastructure/DrizzlePermissionRepository"
  );

export const DrizzlePermissionRepositoryLive = Layer.effect(
  DrizzlePermissionRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzlePermissionRepository.of({
      create: (permission: Permission) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(permissions).values({
              id: permission.id,
              name: permission.name,
              displayName: permission.displayName,
              description: permission.description,
              resource: permission.resource,
              action: permission.action,
              isSystem: permission.isSystem,
              createdAt: permission.createdAt,
              updatedAt: permission.updatedAt,
            });
          });
          return permission;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("create", "Permission", error))
          )
        ),

      findById: (id: PermissionIdType) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(permissions)
                .where(eq(permissions.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findById", "Permission", error))
          )
        ),

      findByName: (name: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(permissions)
                .where(eq(permissions.name, name))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByName", "Permission", error)
            )
          )
        ),

      findAll: () =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(permissions)
                .orderBy(permissions.resource, permissions.action);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findAll", "Permission", error))
          )
        ),

      update: (permission: Permission) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(permissions)
              .set({
                name: permission.name,
                displayName: permission.displayName,
                description: permission.description,
                resource: permission.resource,
                action: permission.action,
                isSystem: permission.isSystem,
                updatedAt: new Date(),
              })
              .where(eq(permissions.id, permission.id));
          });
          return permission;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("update", "Permission", error))
          )
        ),

      delete: (id: PermissionIdType) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.delete(permissions).where(eq(permissions.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("delete", "Permission", error))
          )
        ),
    } as unknown as PermissionRepository);
  })
);
