import type { SavingsRepository, PlanId, UserId } from "@host/domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { CurrencyCode, PlanStatus } from "@host/shared";

import { RepositoryError, SavingsPlan, Money } from "@host/domain";
import { DatabaseService, savingsPlans } from "@host/db";
import { Effect, Context, Layer } from "effect";
import { PlanStatusEnum } from "@host/shared";
import { eq, and, sql } from "drizzle-orm";

/**
 * Map database row to SavingsPlan domain entity
 */
function mapToDomainEntity(row: typeof savingsPlans.$inferSelect): SavingsPlan {
  return new SavingsPlan(
    { value: row.id } as PlanId,
    { value: row.userId } as UserId,
    row.planName,
    Money.fromNumber(Number(row.dailyAmount), row.currency as CurrencyCode),
    row.cycleDuration,
    row.targetAmount
      ? Money.fromNumber(Number(row.targetAmount), row.currency as CurrencyCode)
      : null,
    Money.fromNumber(Number(row.currentAmount), row.currency as CurrencyCode),
    row.autoSaveEnabled,
    row.autoSaveTime,
    row.status as PlanStatus,
    new Date(row.startDate),
    new Date(row.endDate),
    Number(row.interestRate),
    row.contributionStreak,
    row.totalContributions,
    row.createdAt,
    row.updatedAt
  );
}

/**
 * Drizzle implementation of SavingsRepository
 */
export const DrizzleSavingsRepository = Context.GenericTag<SavingsRepository>(
  "@infrastructure/DrizzleSavingsRepository"
);

export const DrizzleSavingsRepositoryLive = Layer.effect(
  DrizzleSavingsRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return DrizzleSavingsRepository.of({
      save: (plan: SavingsPlan) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle.insert(savingsPlans).values({
              id: plan.id.value,
              userId: plan.userId.value,
              planName: plan.planName,
              dailyAmount: plan.dailyAmount.value.toString(),
              cycleDuration: plan.cycleDuration,
              targetAmount: plan.targetAmount?.value.toString() || null,
              currentAmount: plan.currentAmount.value.toString(),
              autoSaveEnabled: plan.autoSaveEnabled,
              autoSaveTime: plan.autoSaveTime,
              status: plan.status,
              startDate: plan.startDate.toISOString().split("T")[0] || "",
              endDate: plan.endDate.toISOString().split("T")[0] || "",
              interestRate: plan.interestRate.toString(),
              contributionStreak: plan.contributionStreak,
              totalContributions: plan.totalContributions,
              currency: plan.dailyAmount.currency,
              createdAt: plan.createdAt,
              updatedAt: plan.updatedAt,
            });
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("save", "SavingsPlan", error))
          )
        ),

      findById: (id: PlanId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(savingsPlans)
                .where(eq(savingsPlans.id, id.value))
                .limit(1);
            }
          );

          return result[0] ? mapToDomainEntity(result[0]) : null;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findById", "SavingsPlan", error)
            )
          )
        ),

      findByUserId: (userId: UserId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(savingsPlans)
                .where(eq(savingsPlans.userId, userId.value))
                .orderBy(savingsPlans.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByUserId", "SavingsPlan", error)
            )
          )
        ),

      findActiveByUserId: (userId: UserId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(savingsPlans)
                .where(
                  and(
                    eq(savingsPlans.userId, userId.value),
                    eq(savingsPlans.status, PlanStatusEnum.ACTIVE)
                  )
                )
                .orderBy(savingsPlans.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findActiveByUserId", "SavingsPlan", error)
            )
          )
        ),

      update: (plan: SavingsPlan) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(savingsPlans)
              .set({
                planName: plan.planName,
                dailyAmount: plan.dailyAmount.value.toString(),
                cycleDuration: plan.cycleDuration,
                targetAmount: plan.targetAmount?.value.toString() || null,
                currentAmount: plan.currentAmount.value.toString(),
                autoSaveEnabled: plan.autoSaveEnabled,
                autoSaveTime: plan.autoSaveTime,
                status: plan.status,
                startDate: plan.startDate.toISOString().split("T")[0] || "",
                endDate: plan.endDate.toISOString().split("T")[0] || "",
                interestRate: plan.interestRate.toString(),
                contributionStreak: plan.contributionStreak,
                totalContributions: plan.totalContributions,
                updatedAt: new Date(),
              })
              .where(eq(savingsPlans.id, plan.id.value));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("update", "SavingsPlan", error))
          )
        ),

      delete: (id: PlanId) =>
        Effect.gen(function* () {
          yield* db.withDrizzle(async (drizzle: NodePgDatabase) => {
            await drizzle
              .update(savingsPlans)
              .set({
                status: PlanStatusEnum.CANCELLED,
                updatedAt: new Date(),
              })
              .where(eq(savingsPlans.id, id.value));
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(RepositoryError.create("delete", "SavingsPlan", error))
          )
        ),

      findPlansForAutoSave: () =>
        Effect.gen(function* () {
          const now = new Date();
          const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`;

          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(savingsPlans)
                .where(
                  and(
                    eq(savingsPlans.autoSaveEnabled, true),
                    eq(savingsPlans.status, PlanStatusEnum.ACTIVE),
                    eq(savingsPlans.autoSaveTime, currentTime)
                  )
                );
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "findPlansForAutoSave",
                "SavingsPlan",
                error
              )
            )
          )
        ),

      findCompletedPlansForInterest: () =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(savingsPlans)
                .where(eq(savingsPlans.status, PlanStatusEnum.COMPLETED));
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "findCompletedPlansForInterest",
                "SavingsPlan",
                error
              )
            )
          )
        ),

      getTotalSavingsForUser: (userId: UserId) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              const rows = await drizzle
                .select({
                  total: sql<string>`COALESCE(SUM(${savingsPlans.currentAmount}), 0)`,
                })
                .from(savingsPlans)
                .where(
                  and(
                    eq(savingsPlans.userId, userId.value),
                    eq(savingsPlans.status, PlanStatusEnum.ACTIVE)
                  )
                );

              return rows[0]?.total || "0";
            }
          );

          return Number(result);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create(
                "getTotalSavingsForUser",
                "SavingsPlan",
                error
              )
            )
          )
        ),

      findByStatus: (status: PlanStatus) =>
        Effect.gen(function* () {
          const result = yield* db.withDrizzle(
            async (drizzle: NodePgDatabase) => {
              return await drizzle
                .select()
                .from(savingsPlans)
                .where(eq(savingsPlans.status, status))
                .orderBy(savingsPlans.createdAt);
            }
          );

          return result.map(mapToDomainEntity);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              RepositoryError.create("findByStatus", "SavingsPlan", error)
            )
          )
        ),
    });
  })
);
