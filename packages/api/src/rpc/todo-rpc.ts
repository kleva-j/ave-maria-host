/**
 * @fileoverview Todo RPC Definitions (@effect/rpc)
 *
 * This module defines todo-related RPC endpoints using native @effect/rpc.
 * It replaces the previous oRPC + Effect adapter approach with native Effect patterns.
 *
 * ## Key Features:
 * - **Effect Schema**: Type-safe schema definitions using Effect Schema
 * - **Native Error Handling**: Direct Effect error propagation
 * - **Service Integration**: Seamless DatabaseService dependency injection
 * - **Type Safety**: End-to-end type safety from schema to client
 */

import type { Layer } from "effect";

import { DatabaseService } from "@host/db/effects/database";
import { Rpc, RpcGroup } from "@effect/rpc";
import { Effect, Schema } from "effect";

/**
 * Todo data model using Effect Schema
 */
export class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.Number.pipe(Schema.int(), Schema.positive()),
  text: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(500)),
  completed: Schema.Boolean,
  createdAt: Schema.optional(Schema.Date),
  updatedAt: Schema.optional(Schema.Date),
}) {}

/**
 * Todo statistics model
 */
export class TodoStats extends Schema.Class<TodoStats>("TodoStats")({
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  completed: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  pending: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  completionRate: Schema.Number.pipe(Schema.between(0, 100)),
}) {}

/**
 * Bulk operation result model
 */
export class BulkTodoResult extends Schema.Class<BulkTodoResult>(
  "BulkTodoResult"
)({
  success: Schema.Boolean,
  updated: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  todos: Schema.Array(Todo),
}) {}

/**
 * Delete operation result model
 */
export class DeleteTodoResult extends Schema.Class<DeleteTodoResult>(
  "DeleteTodoResult"
)({
  success: Schema.Boolean,
  id: Schema.Number.pipe(Schema.int(), Schema.positive()),
}) {}

/**
 * Custom error types for todo operations
 */
export class TodoNotFoundError extends Schema.TaggedError<TodoNotFoundError>()(
  "TodoNotFoundError",
  {
    id: Schema.Number.pipe(Schema.int(), Schema.positive()),
    message: Schema.String,
  }
) {}

export class TodoValidationError extends Schema.TaggedError<TodoValidationError>()(
  "TodoValidationError",
  {
    field: Schema.String,
    value: Schema.Unknown,
    message: Schema.String,
  }
) {}

export class TodoDatabaseError extends Schema.TaggedError<TodoDatabaseError>()(
  "TodoDatabaseError",
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Union of all todo-related errors
 */
export const TodoError = Schema.Union(
  TodoNotFoundError,
  TodoValidationError,
  TodoDatabaseError
);

/**
 * Todo Create Payload
 */
export class CreateTodoPayload extends Schema.Class<CreateTodoPayload>(
  "CreateTodoPayload"
)({
  text: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(500),
    Schema.trimmed()
  ),
}) {}

type CreateTodoPayloadType = typeof CreateTodoPayload.Type;

/**
 * Todo Update Payload
 */
export class UpdateTodoPayload extends Schema.Class<UpdateTodoPayload>(
  "UpdateTodoPayload"
)({
  id: Schema.Number.pipe(Schema.int(), Schema.positive()),
  completed: Schema.Boolean,
}) {}

type UpdateTodoPayloadType = typeof UpdateTodoPayload.Type;

/**
 * Todo Delete Payload
 */
export class DeleteTodoPayload extends Schema.Class<DeleteTodoPayload>(
  "DeleteTodoPayload"
)({
  id: Schema.Number.pipe(Schema.int(), Schema.positive()),
}) {}

type DeleteTodoPayloadType = typeof DeleteTodoPayload.Type;

/**
 * Todo Get By Id Payload
 */
export class GetTodoByIdPayload extends Schema.Class<GetTodoByIdPayload>(
  "GetTodoByIdPayload"
)({
  id: Schema.Number.pipe(Schema.int(), Schema.positive()),
}) {}

type GetTodoByIdPayloadType = typeof GetTodoByIdPayload.Type;

/**
 * Todo Bulk Toggle Payload
 */
export class BulkToggleTodosPayload extends Schema.Class<BulkToggleTodosPayload>(
  "BulkToggleTodosPayload"
)({
  ids: Schema.Array(Schema.Number.pipe(Schema.int(), Schema.positive())).pipe(
    Schema.minItems(1),
    Schema.maxItems(100)
  ),
  completed: Schema.Boolean,
}) {}

type BulkToggleTodosPayloadType = typeof BulkToggleTodosPayload.Type;

/**
 * Todo RPC Group Definition
 *
 * This defines all todo-related RPC endpoints using @effect/rpc patterns.
 * Each RPC specifies its payload schema, success schema, and error schema.
 */
export class TodoRpcs extends RpcGroup.make(
  /**
   * Get all todos
   *
   * @example
   * ```typescript
   * const todos = yield* client.GetAllTodos({});
   * ```
   */
  Rpc.make("GetAllTodos", {
    payload: {},
    success: Schema.Array(Todo),
    error: TodoDatabaseError,
  }),

  /**
   * Get a specific todo by ID
   *
   * @example
   * ```typescript
   * const todo = yield* client.GetTodoById({ id: 1 });
   * ```
   */
  Rpc.make("GetTodoById", {
    payload: GetTodoByIdPayload,
    success: Todo,
    error: Schema.Union(TodoNotFoundError, TodoDatabaseError),
  }),

  /**
   * Create a new todo
   *
   * @example
   * ```typescript
   * const newTodo = yield* client.CreateTodo({
   *   text: "Learn @effect/rpc"
   * });
   * ```
   */
  Rpc.make("CreateTodo", {
    payload: CreateTodoPayload,
    success: Todo,
    error: Schema.Union(TodoValidationError, TodoDatabaseError),
  }),

  /**
   * Update todo completion status
   *
   * @example
   * ```typescript
   * const updatedTodo = yield* client.UpdateTodo({
   *   id: 1,
   *   completed: true
   * });
   * ```
   */
  Rpc.make("UpdateTodo", {
    payload: UpdateTodoPayload,
    success: Todo,
    error: Schema.Union(TodoNotFoundError, TodoDatabaseError),
  }),

  /**
   * Delete a todo
   *
   * @example
   * ```typescript
   * const result = yield* client.DeleteTodo({ id: 1 });
   * ```
   */
  Rpc.make("DeleteTodo", {
    payload: DeleteTodoPayload,
    success: DeleteTodoResult,
    error: Schema.Union(TodoNotFoundError, TodoDatabaseError),
  }),

  /**
   * Bulk toggle multiple todos
   *
   * @example
   * ```typescript
   * const result = yield* client.BulkToggleTodos({
   *   ids: [1, 2, 3],
   *   completed: true
   * });
   * ```
   */
  Rpc.make("BulkToggleTodos", {
    payload: BulkToggleTodosPayload,
    success: BulkTodoResult,
    error: Schema.Union(TodoValidationError, TodoDatabaseError),
  }),

  /**
   * Get todo statistics
   *
   * @example
   * ```typescript
   * const stats = yield* client.GetTodoStats({});
   * ```
   */
  Rpc.make("GetTodoStats", {
    payload: {},
    success: TodoStats,
    error: TodoDatabaseError,
  })
) {}

/**
 * Type helpers for extracting types from the RPC group
 */
export type TodoRpcGroup = typeof TodoRpcs;

/**
 * Todo RPC handlers implementation
 * This provides the actual business logic for todo operations
 */
export const TodoHandlersLive: Layer.Layer<
  | Rpc.Handler<"GetAllTodos">
  | Rpc.Handler<"GetTodoById">
  | Rpc.Handler<"CreateTodo">
  | Rpc.Handler<"UpdateTodo">
  | Rpc.Handler<"DeleteTodo">
  | Rpc.Handler<"BulkToggleTodos">
  | Rpc.Handler<"GetTodoStats">,
  never,
  DatabaseService
> = TodoRpcs.toLayer({
  GetAllTodos: () =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);

      const todos = yield* _(
        db.query("SELECT * FROM todo ORDER BY id DESC").pipe(
          Effect.map((todos) => todos as Todo[]),
          Effect.mapError(
            (error) =>
              new TodoDatabaseError({
                operation: "GetAllTodos",
                message: "Failed to fetch todos",
                cause: error,
              })
          )
        )
      );

      return todos;
    }),
  GetTodoById: ({ id }: GetTodoByIdPayloadType) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);

      const todos = yield* _(
        db.query("SELECT * FROM todo WHERE id = $1", [id]).pipe(
          Effect.mapError(
            (error) =>
              new TodoDatabaseError({
                operation: "GetTodoById",
                message: `Failed to fetch todo with ID ${id}`,
                cause: error,
              })
          )
        )
      );

      if (todos.length === 0) {
        return yield* _(
          Effect.fail(
            new TodoNotFoundError({
              id,
              message: `Todo with ID ${id} not found`,
            })
          )
        );
      }

      const [todo] = todos;

      return todo as Todo;
    }),

  CreateTodo: ({ text }: CreateTodoPayloadType) =>
    Effect.gen(function* (_) {
      if (!text || text.trim().length === 0) {
        return yield* _(
          Effect.fail(
            new TodoValidationError({
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
          [text, false]
        ),
        Effect.mapError(
          (error) =>
            new TodoDatabaseError({
              operation: "CreateTodo",
              message: "Failed to create todo",
              cause: error,
            })
        )
      );

      const [todo] = result;

      return todo as Todo;
    }),

  UpdateTodo: ({ id, completed }: UpdateTodoPayloadType) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);

      yield* _(
        db.query("SELECT id FROM todo WHERE id = $1", [id]),
        Effect.flatMap((todos) =>
          todos.length === 0
            ? Effect.fail(
                new TodoNotFoundError({
                  id,
                  message: `Todo with ID ${id} not found`,
                })
              )
            : Effect.succeed(undefined)
        ),
        Effect.mapError((error) =>
          error instanceof TodoNotFoundError
            ? error
            : new TodoDatabaseError({
                operation: "UpdateTodo",
                message: `Failed to check todo existence for ID ${id}`,
                cause: error,
              })
        )
      );

      const result = yield* _(
        db.query("UPDATE todo SET completed = $1 WHERE id = $2 RETURNING *", [
          completed,
          id,
        ]),
        Effect.map((todos) => todos[0] as Todo),
        Effect.mapError(
          (error) =>
            new TodoDatabaseError({
              operation: "UpdateTodo",
              message: `Failed to update todo with ID ${id}`,
              cause: error,
            })
        )
      );

      return result;
    }),

  DeleteTodo: ({ id }: DeleteTodoPayloadType) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);

      const todos = yield* _(
        db.query("SELECT id FROM todo WHERE id = $1", [id]),
        Effect.mapError(
          (error) =>
            new TodoDatabaseError({
              operation: "DeleteTodo",
              message: `Failed to check todo existence for ID ${id}`,
              cause: error,
            })
        )
      );

      if (todos.length === 0) {
        return yield* _(
          Effect.fail(
            new TodoNotFoundError({
              id,
              message: `Todo with ID ${id} not found`,
            })
          )
        );
      }

      yield* _(
        db.query("DELETE FROM todo WHERE id = $1", [id]),
        Effect.mapError(
          (error) =>
            new TodoDatabaseError({
              operation: "DeleteTodo",
              message: `Failed to delete todo with ID ${id}`,
              cause: error,
            })
        )
      );

      return { success: true, id };
    }),

  BulkToggleTodos: ({ ids, completed }: BulkToggleTodosPayloadType) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);

      const results = yield* _(
        Effect.all(
          ids.map((id) =>
            db.query(
              "UPDATE todo SET completed = $1 WHERE id = $2 RETURNING *",
              [completed, id]
            )
          ),
          { concurrency: 5 }
        ),
        Effect.map((todos) => todos.flat() as Todo[]),
        Effect.mapError(
          (error) =>
            new TodoDatabaseError({
              operation: "BulkToggleTodos",
              message: "Failed to bulk toggle todos",
              cause: error,
            })
        )
      );

      return {
        success: true,
        updated: results.length,
        todos: results,
      };
    }),

  GetTodoStats: () =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);

      const [totalResult, completedResult] = yield* _(
        Effect.all([
          db.query("SELECT COUNT(*) as count FROM todo"),
          db.query("SELECT COUNT(*) as count FROM todo WHERE completed = true"),
        ]),
        Effect.mapError(
          (error) =>
            new TodoDatabaseError({
              operation: "GetTodoStats",
              message: "Failed to fetch todo statistics",
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
    }),
});
