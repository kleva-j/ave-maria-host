import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SessionRepository } from "@host/domain";
import type { SessionId } from "@host/shared";

import { UserIdSchema, SessionIdSchema, DeviceIdSchema } from "@host/shared";
import { Session, RepositoryError } from "@host/domain";
import { DatabaseService, session } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { eq } from "drizzle-orm";

/**
 * Map database row to Session domain entity
 */
function mapToDomainEntity(row: typeof session.$inferSelect): Session {
  return new Session({
    id: SessionIdSchema.make(row.id),
    expiresAt: row.expiresAt,
    token: row.token,
    refreshToken: row.refreshToken,
    refreshTokenExpiresAt: row.refreshTokenExpiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    deviceId: row.deviceId ? DeviceIdSchema.make(row.deviceId) : null,
    lastActivityAt: row.lastActivityAt,
    userId: UserIdSchema.make(row.userId),
  });
}

/**
 * Drizzle implementation of SessionRepository
 */
export const DrizzleSessionRepository = Context.GenericTag<SessionRepository>(
  "@infrastructure/DrizzleSessionRepository"
);

export const DrizzleSessionRepositoryLive = Layer.effect(
  DrizzleSessionRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleSessionRepository.of({
      create: (entity: Session) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(session).values({
              id: entity.id,
              expiresAt: entity.expiresAt,
              token: entity.token,
              refreshToken: entity.refreshToken,
              refreshTokenExpiresAt: entity.refreshTokenExpiresAt,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
              ipAddress: entity.ipAddress,
              userAgent: entity.userAgent,
              deviceId: entity.deviceId,
              lastActivityAt: entity.lastActivityAt,
              userId: entity.userId,
            });
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("create", "Session", error))
          )
        ),

      findById: (id: SessionId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(session)
                .where(eq(session.id, id))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findById", "Session", error))
          )
        ),

      findByToken: (token: string) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(session)
                .where(eq(session.token, token))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("findByToken", "Session", error))
          )
        ),

      delete: (id: SessionId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.delete(session).where(eq(session.id, id));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("delete", "Session", error))
          )
        ),

      update: (entity: Session) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(session)
              .set({
                expiresAt: entity.expiresAt,
                token: entity.token,
                refreshToken: entity.refreshToken,
                refreshTokenExpiresAt: entity.refreshTokenExpiresAt,
                updatedAt: new Date(),
                ipAddress: entity.ipAddress,
                userAgent: entity.userAgent,
                deviceId: entity.deviceId,
                lastActivityAt: entity.lastActivityAt,
                userId: entity.userId,
              })
              .where(eq(session.id, entity.id));
          });
          return entity;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("update", "Session", error))
          )
        ),
    } as unknown as SessionRepository);
  })
);
