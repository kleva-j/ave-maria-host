/**
 * @fileoverview Effect-based Todo Router
 *
 * This module demonstrates migrating existing Promise-based oRPC endpoints to Effect.ts patterns.
 * It provides type-safe, composable API endpoints with structured error handling and service injection.
 *
 * ## Key Features:
 * - **Effect-Based Operations**: All database operations use Effect patterns
 * - **Structured Error Handling**: Proper error types and recovery strategies
 * - **Service Injection**: Database service dependency injection
 * - **Type Safety**: Full TypeScript support with Effect and oRPC integration
 *
 * ## Migration Notes:
 * This router serves as an example of migrating from Promise-based to Effect-based endpoints.
 * The original todo router remains unchanged for backward compatibility.
 */

import { z } from "zod";

import { Effect, type Layer } from "effect";

// Import Effect utilities and error types
import {
  createEffectRouter,
  ValidationError,
  effectProcedure,
  NotFoundError,
  DatabaseError,
  type EffectProcedureImplementation,
} from "../effects";

// Import database service (will be implemented in database effects)
import { DatabaseService } from "@host/db/effects/database";

/**
 * Input validation schemas for todo operations
 */
const CreateTodoSchema = z.object({
  text: z
    .string()
    .min(1, "Todo text cannot be empty")
    .max(500, "Todo text too long"),
});

const UpdateTodoSchema = z.object({
  id: z.number().int().positive("Todo ID must be a positive integer"),
  completed: z.boolean(),
});

const DeleteTodoSchema = z.object({
  id: z.number().int().positive("Todo ID must be a positive integer"),
});

const GetTodoSchema = z.object({
  id: z.number().int().positive("Todo ID must be a positive integer"),
});

/**
 * Effect-based todo operations using the database service
 */

/**
 * Get all todos from the database
 */
const getAllTodosEffect = Effect.gen(function* (_) {
  const db = yield* _(DatabaseService);

  return yield* _(
    db.query("SELECT * FROM todo ORDER BY id DESC"),
    Effect.mapError(
      (error) =>
        new DatabaseError({
          message: "Failed to fetch todos",
          operation: "getAllTodos",
          cause: error,
        })
    )
  );
});

/**
 * Get a specific todo by ID
 */
const getTodoByIdEffect = (id: number) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);

    const todos = yield* _(
      db.query("SELECT * FROM todo WHERE id = $1", [id]),
      Effect.mapError(
        (error) =>
          new DatabaseError({
            message: `Failed to fetch todo with ID ${id}`,
            operation: "getTodoById",
            cause: error,
          })
      )
    );

    if (todos.length === 0) {
      return yield* _(
        Effect.fail(
          new NotFoundError({
            message: `Todo with ID ${id} not found`,
            resource: "Todo",
            id: id.toString(),
          })
        )
      );
    }

    return todos[0];
  });

/**
 * Create a new todo
 */
const createTodoEffect = (text: string) =>
  Effect.gen(function* (_) {
    // Validate input
    if (!text || text.trim().length === 0) {
      return yield* _(
        Effect.fail(
          new ValidationError({
            message: "Todo text cannot be empty",
            field: "text",
            value: text,
          })
        )
      );
    }

    const db = yield* _(DatabaseService);

    const result = yield* _(
      db.query(
        "INSERT INTO todo (text, completed) VALUES ($1, $2) RETURNING *",
        [text.trim(), false]
      ),
      Effect.mapError(
        (error) =>
          new DatabaseError({
            message: "Failed to create todo",
            operation: "createTodo",
            cause: error,
          })
      )
    );

    return result[0];
  });

/**
 * Update todo completion status
 */
const updateTodoEffect = (id: number, completed: boolean) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);

    // First check if todo exists
    yield* _(getTodoByIdEffect(id));

    const result = yield* _(
      db.query("UPDATE todo SET completed = $1 WHERE id = $2 RETURNING *", [
        completed,
        id,
      ]),
      Effect.mapError(
        (error) =>
          new DatabaseError({
            message: `Failed to update todo with ID ${id}`,
            operation: "updateTodo",
            cause: error,
          })
      )
    );

    return result[0];
  });

/**
 * Delete a todo by ID
 */
const deleteTodoEffect = (id: number) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);

    // First check if todo exists
    yield* _(getTodoByIdEffect(id));

    yield* _(
      db.query("DELETE FROM todo WHERE id = $1", [id]),
      Effect.mapError(
        (error) =>
          new DatabaseError({
            message: `Failed to delete todo with ID ${id}`,
            operation: "deleteTodo",
            cause: error,
          })
      )
    );

    return { success: true, id };
  });

/**
 * Effect-based todo router using the new oRPC Effect utilities
 */
export const todoEffectRouter = {
  /**
   * Get all todos
   *
   * @example
   * ```typescript
   * const todos = await client.todo.getAll();
   * ```
   */
  getAll: effectProcedure<DatabaseService>().handler(() => getAllTodosEffect),

  /**
   * Get a specific todo by ID
   *
   * @example
   * ```typescript
   * const todo = await client.todo.getById({ id: 1 });
   * ```
   */
  getById: effectProcedure<DatabaseService>()
    .input(GetTodoSchema)
    .handler(({ input }) => getTodoByIdEffect(input.id)),

  /**
   * Create a new todo
   *
   * @example
   * ```typescript
   * const newTodo = await client.todo.create({ text: "Learn Effect.ts" });
   * ```
   */
  create: effectProcedure<DatabaseService>()
    .input(CreateTodoSchema)
    .handler(({ input }) => createTodoEffect(input.text)),

  /**
   * Update todo completion status
   *
   * @example
   * ```typescript
   * const updatedTodo = await client.todo.toggle({ id: 1, completed: true });
   * ```
   */
  toggle: effectProcedure<DatabaseService>()
    .input(UpdateTodoSchema)
    .handler(({ input }) => updateTodoEffect(input.id, input.completed)),

  /**
   * Delete a todo
   *
   * @example
   * ```typescript
   * const result = await client.todo.delete({ id: 1 });
   * ```
   */
  delete: effectProcedure<DatabaseService>()
    .input(DeleteTodoSchema)
    .handler(({ input }) => deleteTodoEffect(input.id)),

  /**
   * Bulk operations for multiple todos
   */
  bulkToggle: effectProcedure<DatabaseService>()
    .input(
      z.object({
        ids: z.array(z.number().int().positive()),
        completed: z.boolean(),
      })
    )
    .handler(({ input }) =>
      Effect.gen(function* (_) {
        // Use Effect.all to run operations in parallel
        const results = yield* _(
          Effect.all(
            input.ids.map((id) => updateTodoEffect(id, input.completed)),
            { concurrency: 5 } // Limit concurrency to avoid overwhelming the database
          )
        );

        return {
          success: true,
          updated: results.length,
          todos: results,
        };
      })
    ),

  /**
   * Get todo statistics
   */
  getStats: effectProcedure<DatabaseService>().handler(() =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);

      const [totalResult, completedResult] = yield* _(
        Effect.all([
          db.query("SELECT COUNT(*) as count FROM todo"),
          db.query("SELECT COUNT(*) as count FROM todo WHERE completed = true"),
        ]),
        Effect.mapError(
          (error) =>
            new DatabaseError({
              message: "Failed to fetch todo statistics",
              operation: "getTodoStats",
              cause: error,
            })
        )
      );

      const total = (totalResult[0] as { count: number })?.count || 0;
      const completed = (completedResult[0] as { count: number })?.count || 0;
      const pending = total - completed;

      return {
        total,
        completed,
        pending,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
      };
    })
  ),
};

/**
 * Type definitions for the Effect-based todo router
 */
export type TodoEffectRouter = typeof todoEffectRouter;

/**
 * Example of how to use the Effect router with the createEffectRouter utility
 * This would be used in the main router composition
 */
export const createTodoEffectRouterWithLayer = (
  layer: Layer.Layer<DatabaseService>
) =>
  createEffectRouter(
    todoEffectRouter as Record<
      string,
      EffectProcedureImplementation<unknown, unknown, unknown>
    >,
    layer as Layer.Layer<unknown>
  );
