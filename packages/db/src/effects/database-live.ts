import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

import { drizzle } from "drizzle-orm/node-postgres";
import { SqlClient } from "@effect/sql";
import { Effect, Layer } from "effect";

import { PgLive } from "../database";

import {
  type DatabaseError,
  DatabaseTransactionError,
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseService,
} from "./database";

/**
 * Live implementation of the DatabaseService using Drizzle ORM and Effect.ts.
 * This implementation provides concrete database operations with proper error handling,
 * resource management, and transaction support.
 */
class DatabaseServiceImpl implements DatabaseService {
  constructor(
    private readonly sqlClient: SqlClient.SqlClient,
    private readonly drizzleInstance: NodePgDatabase
  ) {}

  /**
   * Execute a raw SQL query with optional parameters.
   * Converts database errors to structured DatabaseError types.
   */
  readonly query = <T = unknown>(
    sql: string,
    params?: readonly unknown[]
  ): Effect.Effect<T[], DatabaseError> => {
    const self = this;

    return Effect.gen(function* () {
      const statement = self.sqlClient.unsafe(
        sql,
        (params ?? []) as readonly (string | number | boolean | null)[]
      );
      const result = yield* statement.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new DatabaseQueryError({
              message:
                error instanceof Error ? error.message : "Unknown query error",
              operation: "query",
              query: sql,
              cause: error,
            })
          )
        )
      );

      return result as T[];
    });
  };

  /**
   * Execute multiple queries within a database transaction.
   * Automatically handles transaction commit/rollback based on Effect success/failure.
   */
  readonly transaction = <A, E>(
    operation: Effect.Effect<A, E>
  ): Effect.Effect<A, DatabaseError | E> => {
    const self = this;
    return Effect.gen(function* () {
      return yield* self.sqlClient.withTransaction(operation).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new DatabaseTransactionError({
              message:
                error instanceof Error ? error.message : "Transaction failed",
              operation: "transaction",
              cause: error,
            })
          )
        )
      );
    });
  };

  /**
   * Get the underlying Drizzle database instance for advanced operations.
   */
  readonly getDrizzleInstance = (): Effect.Effect<
    NodePgDatabase,
    DatabaseError
  > => Effect.succeed(this.drizzleInstance);

  /**
   * Execute a function with a Drizzle database instance.
   * Provides a convenient way to use Drizzle operations within Effect computations.
   */
  readonly withDrizzle = <T>(
    operation: (drizzle: NodePgDatabase) => Promise<T>
  ): Effect.Effect<T, DatabaseError> =>
    Effect.tryPromise({
      try: () => operation(this.drizzleInstance),
      catch: (error) =>
        new DatabaseQueryError({
          message:
            error instanceof Error ? error.message : "Drizzle operation failed",
          operation: "withDrizzle",
          cause: error,
        }),
    });

  /**
   * Check database connection health.
   * Executes a simple query to verify database connectivity.
   */
  readonly healthCheck = (): Effect.Effect<boolean, DatabaseError> => {
    const self = this;
    return Effect.gen(function* () {
      return yield* self.sqlClient.unsafe("SELECT 1").pipe(
        Effect.map(() => true),
        Effect.catchAll((error) =>
          Effect.fail(
            new DatabaseConnectionError({
              message: "Database health check failed",
              cause: error,
            })
          )
        )
      );
    });
  };
}

/**
 * Create a DatabaseService layer that depends on SqlClient.
 * This layer provides the live implementation of DatabaseService.
 *
 * @example
 * ```typescript
 * import { DatabaseServiceLive, PgLive } from "@host/db/effects";
 * import { Effect, Layer } from "effect";
 *
 * // Create the complete database layer
 * const AppLayer = Layer.provide(DatabaseServiceLive, PgLive);
 *
 * // Use in an Effect program
 * const program = Effect.gen(function* () {
 *   const db = yield* DatabaseService;
 *   return yield* db.healthCheck();
 * });
 *
 * const result = Effect.runPromise(Effect.provide(program, AppLayer));
 * ```
 */
const makeDatabaseService = Effect.gen(function* () {
  // Get the SqlClient from context
  const sqlClient = yield* SqlClient.SqlClient;

  // Create Drizzle instance using the same connection
  const drizzleInstance = yield* Effect.tryPromise({
    try: async () => {
      // Get the underlying Pool from SqlClient
      const pool = (sqlClient as unknown as { pool: Pool }).pool;
      return drizzle(pool);
    },
    catch: (error) =>
      new DatabaseConnectionError({
        message: "Failed to create Drizzle instance",
        cause: error,
      }),
  });

  return new DatabaseServiceImpl(sqlClient, drizzleInstance);
});

export const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  makeDatabaseService
).pipe(Layer.provide(PgLive), Layer.orDie);

/**
 * Complete database layer that includes both PgClient and DatabaseService.
 * This is a convenience layer that combines PgLive and DatabaseServiceLive.
 *
 * @example
 * ```typescript
 * import { DatabaseLayer } from "@host/db/effects";
 * import { Effect } from "effect";
 *
 * // Use the complete database layer
 * const program = Effect.gen(function* () {
 *   const db = yield* DatabaseService;
 *   const users = yield* db.query("SELECT * FROM users LIMIT 10");
 *   return users;
 * });
 *
 * const result = Effect.runPromise(Effect.provide(program, DatabaseLayer));
 * ```
 */
export const DatabaseLayer: Layer.Layer<DatabaseService> = DatabaseServiceLive;
