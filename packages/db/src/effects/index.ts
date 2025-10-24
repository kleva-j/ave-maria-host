/**
 * @fileoverview Database Effect.ts Integration
 * 
 * This module provides Effect.ts integration for database operations using Drizzle ORM.
 * It includes structured error handling, transaction support, and resource management
 * for PostgreSQL database operations.
 * 
 * ## Key Features:
 * - **Type-safe Database Operations**: Effect-based database queries with proper error handling
 * - **Transaction Support**: Automatic transaction management with rollback on failures
 * - **Resource Management**: Proper connection pooling and cleanup
 * - **Drizzle Integration**: Seamless integration with existing Drizzle ORM setup
 * - **Health Monitoring**: Database connection health checks
 * 
 * ## Quick Start:
 * ```typescript
 * import { DatabaseService, DatabaseLayer } from "@host/db/effects";
 * import { Effect } from "effect";
 * 
 * // Use database service in an Effect
 * const findUser = (id: string) => Effect.gen(function* (_) {
 *   const db = yield* _(DatabaseService);
 *   const users = yield* _(db.query("SELECT * FROM users WHERE id = $1", [id]));
 *   return users[0];
 * });
 * 
 * // Run with database layer
 * const program = Effect.provide(findUser("user-123"), DatabaseLayer);
 * ```
 * 
 * @see {@link ./database.ts} for service interface and error types
 * @see {@link ./database-live.ts} for live implementation and layers
 */

// Database service interface and error types
export * from "./database";

// Live implementation and layers
export * from "./database-live";
