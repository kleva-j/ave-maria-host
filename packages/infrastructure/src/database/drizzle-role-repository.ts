import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PermissionId, RoleId } from "@host/shared";
import type { RoleRepository } from "@host/domain";

import { DatabaseService, rolePermissions, permissions, roles } from "@host/db";
import { RepositoryError, Permission, Role } from "@host/domain";
import { PermissionIdSchema, RoleIdSchema } from "@host/shared";
import { Effect, Context, Layer } from "effect";
import { eq, and } from "drizzle-orm";

/**
 * Map database row to Role domain entity
 */
function mapToDomainEntity(row: typeof roles.$inferSelect): Role {
  return new Role({
    id: RoleIdSchema.make(row.id),
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    isSystem: row.isSystem,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Map database row to Permission domain entity
 */
function mapPermissionToDomainEntity(
  row: typeof permissions.$inferSelect
): Permission {
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
 * Drizzle implementation of RoleRepository
 */
export const DrizzleRoleRepository = Context.GenericTag<RoleRepository>(
  "@infrastructure/DrizzleRoleRepository"
);

export const DrizzleRoleRepositoryLive = Layer.effect(
  DrizzleRoleRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleRoleRepository.of({
      create: (role: Role) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(roles).values({
              id: role.id,
              name: role.name,
              displayName: role.displayName,
              description: role.description,
              isSystem: role.isSystem,
              createdAt: role.createdAt,
              updatedAt: role.updatedAt,
            });
          });
          return role;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("create", "Role", error))
          )
        ),

      findById: (id: RoleId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(roles)
                .where(eq(roles.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findById", "Role", error))
          )
        ),

      findByName: (name: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(roles)
                .where(eq(roles.name, name))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findByName", "Role", error))
          )
        ),

      findAll: () =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle.select().from(roles).orderBy(roles.name);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findAll", "Role", error))
          )
        ),

      update: (role: Role) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(roles)
              .set({
                name: role.name,
                displayName: role.displayName,
                description: role.description,
                isSystem: role.isSystem,
                updatedAt: new Date(),
              })
              .where(eq(roles.id, role.id));
          });
          return role;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("update", "Role", error))
          )
        ),

      delete: (id: RoleId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.delete(roles).where(eq(roles.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("delete", "Role", error))
          )
        ),

      addPermission: (roleId: RoleId, permissionId: PermissionId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .insert(rolePermissions)
              .values({ roleId, permissionId })
              // Handle potential duplicate assignment gracefully?
              // The schema has a unique constraint. If it fails, RepositoryError will wrap it.
              .onConflictDoNothing();
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("addPermission", "Role", error))
          )
        ),

      removePermission: (roleId: RoleId, permissionId: PermissionId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .delete(rolePermissions)
              .where(
                and(
                  eq(rolePermissions.roleId, roleId),
                  eq(rolePermissions.permissionId, permissionId)
                )
              );
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("removePermission", "Role", error)
            )
          )
        ),

      getPermissions: (roleId: RoleId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select({ permissions })
                .from(rolePermissions)
                .innerJoin(
                  permissions,
                  eq(rolePermissions.permissionId, permissions.id)
                )
                .where(eq(rolePermissions.roleId, roleId));
            }
          );

          return result.map((r) => mapPermissionToDomainEntity(r.permissions));
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("getPermissions", "Role", error))
          )
        ),
    } as unknown as RoleRepository);
  })
);
