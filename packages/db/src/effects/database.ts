import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { type Effect, Context, Data } from "effect";

/**
 * Database-specific error types for Effect.ts error handling.
 * These errors provide structured information about database operation failures.
 */

/**
 * Error class for database connection failures.
 * Used when database connection cannot be established or is lost.
 *
 * @example
 * ```typescript
 * throw new DatabaseConnectionError({
 *   message: "Failed to connect to database",
 *   cause: connectionError
 * });
 * ```
 */
export class DatabaseConnectionError extends Data.TaggedError(
  "DatabaseConnectionError"
)<{
  /** Human-readable error message */
  readonly message: string;
  /** Optional underlying cause of the connection error */
  readonly cause?: unknown;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: { message: string; cause?: unknown }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for database query execution failures.
 * Used when SQL queries fail due to syntax errors, constraint violations, etc.
 *
 * @example
 * ```typescript
 * throw new DatabaseQueryError({
 *   message: "Foreign key constraint violation",
 *   operation: "insertUser",
 *   query: "INSERT INTO users...",
 *   cause: sqlError
 * });
 * ```
 */
export class DatabaseQueryError extends Data.TaggedError("DatabaseQueryError")<{
  /** Human-readable error message */
  readonly message: string;
  /** The database operation that failed */
  readonly operation: string;
  /** Optional SQL query that caused the error */
  readonly query?: string;
  /** Optional underlying cause of the query error */
  readonly cause?: unknown;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: {
    message: string;
    operation: string;
    query?: string;
    cause?: unknown;
  }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Error class for database transaction failures.
 * Used when transaction operations fail, including rollback scenarios.
 *
 * @example
 * ```typescript
 * throw new DatabaseTransactionError({
 *   message: "Transaction deadlock detected",
 *   operation: "transferFunds",
 *   transactionId: "tx-123",
 *   cause: deadlockError
 * });
 * ```
 */
export class DatabaseTransactionError extends Data.TaggedError(
  "DatabaseTransactionError"
)<{
  /** Human-readable error message */
  readonly message: string;
  /** The transaction operation that failed */
  readonly operation: string;
  /** Optional transaction identifier */
  readonly transactionId?: string;
  /** Optional underlying cause of the transaction error */
  readonly cause?: unknown;
  /** Timestamp when the error was created */
  readonly timestamp: Date;
}> {
  constructor(args: {
    message: string;
    operation: string;
    transactionId?: string;
    cause?: unknown;
  }) {
    super({ ...args, timestamp: new Date() });
  }
}

/**
 * Union type of all database-specific errors for comprehensive error handling.
 */
export type DatabaseError =
  | DatabaseConnectionError
  | DatabaseQueryError
  | DatabaseTransactionError;

/**
 * Database service interface providing Effect-based database operations.
 * This interface abstracts database operations using Effect.ts patterns for
 * type-safe error handling, resource management, and composability.
 *
 * @example
 * ```typescript
 * // Using the database service
 * const findUser = (id: string) => Effect.gen(function* (_) {
 *   const db = yield* _(DatabaseService);
 *   const users = yield* _(db.query(
 *     "SELECT * FROM users WHERE id = $1",
 *     [id]
 *   ));
 *   return users[0];
 * });
 * ```
 */
export interface DatabaseService {
  /**
   * Execute a raw SQL query with optional parameters.
   * Returns an Effect that resolves to query results or fails with DatabaseError.
   *
   * @param sql - The SQL query string
   * @param params - Optional query parameters
   * @returns Effect that resolves to query results
   *
   * @example
   * ```typescript
   * const users = yield* _(db.query(
   *   "SELECT * FROM users WHERE active = $1",
   *   [true]
   * ));
   * ```
   */
  readonly query: <T = unknown>(
    sql: string,
    params?: readonly unknown[]
  ) => Effect.Effect<T[], DatabaseError>;

  /**
   * Execute multiple queries within a database transaction.
   * Automatically handles transaction commit/rollback based on Effect success/failure.
   *
   * @param operation - Effect computation to run within transaction
   * @returns Effect that resolves to operation result
   *
   * @example
   * ```typescript
   * const transferFunds = yield* _(db.transaction(
   *   Effect.gen(function* (_) {
   *     yield* _(db.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [100, fromId]));
   *     yield* _(db.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [100, toId]));
   *     return { success: true };
   *   })
   * ));
   * ```
   */
  readonly transaction: <A, E>(
    operation: Effect.Effect<A, E>
  ) => Effect.Effect<A, DatabaseError | E>;

  /**
   * Get the underlying Drizzle database instance for advanced operations.
   * Use this when you need direct access to Drizzle's query builder or schema operations.
   *
   * @returns Effect that resolves to Drizzle database instance
   *
   * @example
   * ```typescript
   * const drizzle = yield* _(db.getDrizzleInstance());
   * const users = yield* _(Effect.tryPromise({
   *   try: () => drizzle.select().from(userTable).where(eq(userTable.active, true)),
   *   catch: (error) => new DatabaseQueryError({
   *     message: "Failed to query users",
   *     operation: "selectActiveUsers",
   *     cause: error
   *   })
   * }));
   * ```
   */
  readonly getDrizzleInstance: () => Effect.Effect<
    NodePgDatabase,
    DatabaseError
  >;

  /**
   * Execute a function with a Drizzle database instance.
   * Provides a convenient way to use Drizzle operations within Effect computations.
   *
   * @param operation - Function that receives Drizzle instance and returns a Promise
   * @returns Effect that resolves to operation result
   *
   * @example
   * ```typescript
   * const user = yield* _(db.withDrizzle(async (drizzle) => {
   *   return await drizzle.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
   * }));
   * ```
   */
  readonly withDrizzle: <T>(
    operation: (drizzle: NodePgDatabase) => Promise<T>
  ) => Effect.Effect<T, DatabaseError>;

  /**
   * Check database connection health.
   * Useful for health checks and monitoring database connectivity.
   *
   * @returns Effect that resolves to connection status
   *
   * @example
   * ```typescript
   * const isHealthy = yield* _(db.healthCheck());
   * if (!isHealthy) {
   *   console.warn("Database connection is unhealthy");
   * }
   * ```
   */
  readonly healthCheck: () => Effect.Effect<boolean, DatabaseError>;
}

/**
 * Effect.ts service context tag for database service dependency injection.
 * Use this tag to access the database service in Effect computations.
 *
 * @example
 * ```typescript
 * // Access database service in an Effect
 * const getUserById = (id: string) => Effect.gen(function* (_) {
 *   const db = yield* _(DatabaseService);
 *   const users = yield* _(db.query("SELECT * FROM users WHERE id = $1", [id]));
 *   return users[0];
 * });
 *
 * // Provide database service to an Effect
 * const program = Effect.provide(
 *   getUserById("user-123"),
 *   DatabaseServiceLive
 * );
 * ```
 */
export const DatabaseService =
  Context.GenericTag<DatabaseService>("DatabaseService");
