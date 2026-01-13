import type { UserAuthorizationRepository } from "@host/domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { UserId } from "@host/shared";

import { Effect, Context, Layer } from "effect";
import { eq, and } from "drizzle-orm";
import {
  DatabaseService,
  userPermissions,
  permissions,
  userRoles,
  roles,
} from "@host/db";

/**
 * Drizzle implementation of UserAuthorizationRepository
 */
export const DrizzleUserAuthorizationRepository =
  Context.GenericTag<UserAuthorizationRepository>(
    "@infrastructure/DrizzleUserAuthorizationRepository"
  );

export const DrizzleUserAuthorizationRepositoryLive = Layer.effect(
  DrizzleUserAuthorizationRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleUserAuthorizationRepository.of({
      getUserRoles: (userId: UserId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select({ roleName: roles.name })
                .from(userRoles)
                .innerJoin(roles, eq(userRoles.roleId, roles.id))
                .where(eq(userRoles.userId, userId));
            }
          );

          return result.map((r) => r.roleName);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new Error(`Failed to get user roles: ${error}`))
          )
        ),

      getUserPermissions: (userId: UserId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select({ permissionName: permissions.name })
                .from(userPermissions)
                .innerJoin(
                  permissions,
                  eq(userPermissions.permissionId, permissions.id)
                )
                .where(eq(userPermissions.userId, userId));
            }
          );

          return result.map((p) => p.permissionName);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new Error(`Failed to get user permissions: ${error}`))
          )
        ),

      assignRole: (userId: UserId, roleId: string, assignedBy: UserId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .insert(userRoles)
              .values({ userId, roleId, assignedBy })
              .onConflictDoNothing();
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new Error(`Failed to assign role: ${error}`))
          )
        ),

      removeRole: (userId: UserId, roleId: string) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .delete(userRoles)
              .where(
                and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId))
              );
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new Error(`Failed to remove role: ${error}`))
          )
        ),

      grantPermission: (
        userId: UserId,
        permissionId: string,
        grantedBy: UserId
      ) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .insert(userPermissions)
              .values({ userId, permissionId, assignedBy: grantedBy })
              .onConflictDoNothing();
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new Error(`Failed to grant permission: ${error}`))
          )
        ),

      revokePermission: (userId: UserId, permissionId: string) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .delete(userPermissions)
              .where(
                and(
                  eq(userPermissions.userId, userId),
                  eq(userPermissions.permissionId, permissionId)
                )
              );
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new Error(`Failed to revoke permission: ${error}`))
          )
        ),
    } as unknown as UserAuthorizationRepository);
  })
);
