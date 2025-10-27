/**
 * @fileoverview Effect.ts Migration Utilities
 *
 * This module provides utilities to help migrate existing Promise-based oRPC endpoints
 * to Effect.ts patterns. It includes conversion helpers, compatibility layers, and
 * migration examples.
 *
 * ## Key Features:
 * - **Promise-to-Effect Conversion**: Utilities to convert existing Promise handlers
 * - **Backward Compatibility**: Maintain existing API contracts during migration
 * - **Error Mapping**: Convert Promise errors to Effect error types
 * - **Migration Examples**: Practical examples of common migration patterns
 *
 * ## Migration Strategy:
 * 1. Start with new endpoints using Effect patterns
 * 2. Gradually migrate existing endpoints using these utilities
 * 3. Maintain backward compatibility throughout the process
 * 4. Remove Promise-based endpoints once migration is complete
 */

import type { Context as ORPCContext } from "@orpc/server";

import { Effect, type Layer } from "effect";

// Import error types and utilities
import {
  type ApplicationError,
  promiseToEffectHandler,
  effectToPromiseHandler,
  ValidationError,
  DatabaseError,
  NetworkError,
} from "./index";

/**
 * Configuration for migration utilities
 */
export interface MigrationConfig {
  /** Whether to log migration warnings and information */
  readonly enableLogging?: boolean;
  /** Custom error mapper for Promise-to-Effect conversion */
  readonly errorMapper?: (error: unknown) => ApplicationError;
  /** Timeout for converted operations in milliseconds */
  readonly timeout?: number;
}

/**
 * Default error mapper for Promise-to-Effect migration
 */
const defaultMigrationErrorMapper = (error: unknown): ApplicationError => {
  if (error instanceof Error) {
    // Map common database errors
    if (
      error.message.includes("UNIQUE constraint") ||
      error.message.includes("duplicate key")
    ) {
      return new ValidationError({
        message: "Duplicate entry",
        field: "unknown",
        value: "unknown",
      });
    }

    if (
      error.message.includes("NOT NULL constraint") ||
      error.message.includes("null value")
    ) {
      return new ValidationError({
        message: "Required field missing",
        field: "unknown",
        value: null,
      });
    }

    if (error.message.includes("foreign key constraint")) {
      return new ValidationError({
        message: "Invalid reference",
        field: "unknown",
        value: "unknown",
      });
    }

    // Map network/connection errors
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("timeout")
    ) {
      return new NetworkError({
        message: error.message,
        url: "unknown",
        cause: error,
      });
    }

    // Default to database error for unknown errors
    return new DatabaseError({
      message: error.message,
      operation: "unknown",
      cause: error,
    });
  }

  return new DatabaseError({
    message: "Unknown error occurred",
    operation: "unknown",
    cause: error,
  });
};

/**
 * Wraps an existing Promise-based oRPC handler to use Effect patterns.
 * This is useful for gradual migration of existing endpoints.
 *
 * @param promiseHandler - Existing Promise-based oRPC handler
 * @param config - Optional migration configuration
 * @returns Effect-based handler that can be used with effectProcedure
 *
 * @example
 * ```typescript
 * // Original Promise-based handler
 * const originalHandler = async ({ input }) => {
 *   return await db.user.findUnique({ where: { id: input.id } });
 * };
 *
 * // Wrap with Effect patterns
 * const effectHandler = wrapPromiseHandler(originalHandler, {
 *   errorMapper: (error) => new DatabaseError({
 *     message: error.message,
 *     operation: "findUser",
 *     cause: error
 *   })
 * });
 *
 * // Use in Effect procedure
 * const getUserProcedure = effectProcedure
 *   .input(z.object({ id: z.string() }))
 *   .handler(effectHandler);
 * ```
 */
export const wrapPromiseHandler = <TInput, TOutput>(
  promiseHandler: (args: {
    input: TInput;
    context: ORPCContext;
  }) => Promise<TOutput>,
  config: MigrationConfig = {}
) => {
  const migrationConfig = {
    enableLogging:
      config.enableLogging ?? process.env.NODE_ENV === "development",
    errorMapper: config.errorMapper ?? defaultMigrationErrorMapper,
    timeout: config.timeout ?? 30000,
  };

  if (migrationConfig.enableLogging) {
    console.log("Wrapping Promise handler for Effect migration");
  }

  return promiseToEffectHandler(promiseHandler, migrationConfig.errorMapper);
};

/**
 * Converts an Effect-based handler back to Promise for backward compatibility.
 * This allows Effect handlers to be used in existing Promise-based systems.
 *
 * @param effectHandler - Effect-based handler
 * @param layer - Effect layer providing required services
 * @param config - Optional migration configuration
 * @returns Promise-based handler compatible with existing systems
 *
 * @example
 * ```typescript
 * // Effect-based handler
 * const effectHandler = ({ input }) => Effect.gen(function* (_) {
 *   const db = yield* _(DatabaseService);
 *   return yield* _(db.query("SELECT * FROM users WHERE id = $1", [input.id]));
 * });
 *
 * // Convert to Promise for backward compatibility
 * const promiseHandler = unwrapEffectHandler(effectHandler, AppLayer);
 *
 * // Use in existing Promise-based router
 * const legacyRouter = {
 *   getUser: {
 *     input: z.object({ id: z.string() }),
 *     handler: promiseHandler
 *   }
 * };
 * ```
 */
export const unwrapEffectHandler = <TInput, TOutput, TServices>(
  effectHandler: (args: {
    input: TInput;
    context: ORPCContext;
  }) => Effect.Effect<TOutput, ApplicationError, TServices>,
  layer: Layer.Layer<TServices>,
  config: MigrationConfig = {}
) => {
  const migrationConfig = {
    enableLogging:
      config.enableLogging ?? process.env.NODE_ENV === "development",
    timeout: config.timeout ?? 30000,
  };

  if (migrationConfig.enableLogging) {
    console.log("Unwrapping Effect handler for Promise compatibility");
  }

  return effectToPromiseHandler(effectHandler, layer, {
    timeout: migrationConfig.timeout,
  });
};

/**
 * Migration helper that creates both Effect and Promise versions of a handler.
 * This is useful during transition periods when you need both versions.
 *
 * @param effectHandler - Effect-based handler implementation
 * @param layer - Effect layer providing required services
 * @param config - Optional migration configuration
 * @returns Object with both Effect and Promise versions
 *
 * @example
 * ```typescript
 * const getUserHandlers = createDualHandlers(
 *   ({ input }) => getUserEffect(input.id),
 *   AppLayer
 * );
 *
 * // Use Effect version in new router
 * const newRouter = {
 *   getUser: effectProcedure
 *     .input(z.object({ id: z.string() }))
 *     .handler(getUserHandlers.effect)
 * };
 *
 * // Use Promise version in legacy router
 * const legacyRouter = {
 *   getUser: {
 *     input: z.object({ id: z.string() }),
 *     handler: getUserHandlers.promise
 *   }
 * };
 * ```
 */
export const createDualHandlers = <TInput, TOutput, TServices>(
  effectHandler: (args: {
    input: TInput;
    context: ORPCContext;
  }) => Effect.Effect<TOutput, ApplicationError, TServices>,
  layer: Layer.Layer<TServices>,
  config: MigrationConfig = {}
) => {
  return {
    effect: effectHandler,
    promise: unwrapEffectHandler(effectHandler, layer, config),
  };
};

/**
 * Utility to migrate a complete router from Promise-based to Effect-based.
 * This function converts all handlers in a router object.
 *
 * @param promiseRouter - Existing Promise-based router
 * @param config - Optional migration configuration
 * @returns Effect-based router with converted handlers
 *
 * @example
 * ```typescript
 * // Original Promise-based router
 * const originalTodoRouter = {
 *   getAll: {
 *     handler: async () => await db.select().from(todo)
 *   },
 *   create: {
 *     input: z.object({ text: z.string() }),
 *     handler: async ({ input }) => await db.insert(todo).values(input)
 *   }
 * };
 *
 * // Migrate to Effect-based router
 * const effectTodoRouter = migrateRouter(originalTodoRouter, {
 *   errorMapper: (error) => new DatabaseError({
 *     message: error.message,
 *     operation: "todoOperation",
 *     cause: error
 *   })
 * });
 * ```
 */
export const migrateRouter = <T extends Record<string, unknown>>(
  promiseRouter: T,
  config: MigrationConfig = {}
): Record<keyof T, unknown> => {
  const migrationConfig = {
    enableLogging:
      config.enableLogging ?? process.env.NODE_ENV === "development",
    errorMapper: config.errorMapper ?? defaultMigrationErrorMapper,
  };

  if (migrationConfig.enableLogging) {
    console.log(
      `Migrating router with ${Object.keys(promiseRouter).length} endpoints`
    );
  }

  const migratedRouter: Record<string, unknown> = {};

  for (const [key, procedure] of Object.entries(promiseRouter)) {
    if (procedure && typeof procedure === "object" && "handler" in procedure) {
      // Type assertion for the handler - in migration context we know it's a Promise handler
      const handler = procedure.handler as (args: {
        input: unknown;
        context: ORPCContext;
      }) => Promise<unknown>;

      const wrappedHandler = wrapPromiseHandler(handler, migrationConfig);

      migratedRouter[key] = {
        ...procedure,
        handler: wrappedHandler,
      };

      if (migrationConfig.enableLogging) {
        console.log(`Migrated endpoint: ${key}`);
      }
    } else {
      // Copy non-procedure properties as-is
      migratedRouter[key] = procedure;
    }
  }

  return migratedRouter as Record<keyof T, unknown>;
};

/**
 * Validation helper to ensure migrated handlers work correctly.
 * This function can be used in tests to verify migration correctness.
 *
 * @param originalHandler - Original Promise-based handler
 * @param migratedHandler - Migrated Effect-based handler
 * @param testInput - Test input to validate with
 * @param layer - Effect layer for running the migrated handler
 * @returns Promise that resolves if validation passes
 *
 * @example
 * ```typescript
 * // In tests
 * await validateMigration(
 *   originalGetUserHandler,
 *   migratedGetUserHandler,
 *   { id: "test-user-id" },
 *   TestAppLayer
 * );
 * ```
 */
export const validateMigration = async <TInput, TOutput, TServices>(
  originalHandler: (args: {
    input: TInput;
    context: ORPCContext;
  }) => Promise<TOutput>,
  migratedHandler: (args: {
    input: TInput;
    context: ORPCContext;
  }) => Effect.Effect<TOutput, ApplicationError, TServices>,
  testInput: TInput,
  layer: Layer.Layer<TServices>,
  mockContext: ORPCContext = {} as ORPCContext
): Promise<void> => {
  try {
    // Run original handler
    const originalResult = await originalHandler({
      input: testInput,
      context: mockContext,
    });

    // Run migrated handler
    const migratedPromiseHandler = unwrapEffectHandler(migratedHandler, layer);
    const migratedResult = await migratedPromiseHandler({
      input: testInput,
      context: mockContext,
    });

    // Compare results (basic equality check)
    if (JSON.stringify(originalResult) !== JSON.stringify(migratedResult)) {
      throw new Error("Migration validation failed: Results do not match");
    }

    console.log("Migration validation passed");
  } catch (error) {
    console.error("Migration validation failed:", error);
    throw error;
  }
};

/**
 * Migration progress tracker to help monitor migration status
 */
export class MigrationTracker {
  private migratedEndpoints: Set<string> = new Set();
  private totalEndpoints = 0;

  constructor(totalEndpoints: number) {
    this.totalEndpoints = totalEndpoints;
  }

  markMigrated(endpoint: string): void {
    this.migratedEndpoints.add(endpoint);
    console.log(
      `Migrated endpoint: ${endpoint} (${this.getProgress()}% complete)`
    );
  }

  getProgress(): number {
    return Math.round(
      (this.migratedEndpoints.size / this.totalEndpoints) * 100
    );
  }

  getMigratedEndpoints(): string[] {
    return Array.from(this.migratedEndpoints);
  }

  getRemainingEndpoints(allEndpoints: string[]): string[] {
    return allEndpoints.filter(
      (endpoint) => !this.migratedEndpoints.has(endpoint)
    );
  }

  isComplete(): boolean {
    return this.migratedEndpoints.size >= this.totalEndpoints;
  }

  getReport(): {
    total: number;
    migrated: number;
    remaining: number;
    progress: number;
    isComplete: boolean;
  } {
    return {
      total: this.totalEndpoints,
      migrated: this.migratedEndpoints.size,
      remaining: this.totalEndpoints - this.migratedEndpoints.size,
      progress: this.getProgress(),
      isComplete: this.isComplete(),
    };
  }
}

/**
 * Example migration patterns for common scenarios
 */
export const migrationExamples = {
  /**
   * Example: Migrating a simple CRUD endpoint
   */
  simpleCrud: {
    // Original Promise-based handler
    original: async ({ input }: { input: { id: string } }) => {
      // return await db.user.findUnique({ where: { id: input.id } });
      return { id: input.id, name: "Example User" };
    },

    // Migrated Effect-based handler
    migrated: ({ input }: { input: { id: string } }) =>
      Effect.succeed({ id: input.id, name: "Example User" }),
    // In real implementation, you would use:
    // Effect.gen(function* (_) {
    //   const db = yield* _(DatabaseService);
    //   return yield* _(db.query("SELECT * FROM users WHERE id = $1", [input.id]));
    // }),
  },

  /**
   * Example: Migrating an endpoint with complex error handling
   */
  complexErrorHandling: {
    // Original Promise-based handler with try-catch
    original: async ({ input }: { input: { email: string } }) => {
      try {
        // const user = await db.user.findUnique({ where: { email: input.email } });
        // if (!user) throw new Error("User not found");
        // return user;
        return { email: input.email, name: "Example User" };
      } catch (error) {
        if ((error as Error).message === "User not found") {
          throw new Error("USER_NOT_FOUND");
        }
        throw new Error("DATABASE_ERROR");
      }
    },

    // Migrated Effect-based handler with structured errors
    migrated: ({ input }: { input: { email: string } }) =>
      Effect.succeed({ email: input.email, name: "Example User" }),
    // In real implementation, you would use:
    // Effect.gen(function* (_) {
    //   const db = yield* _(DatabaseService);
    //   const users = yield* _(db.query("SELECT * FROM users WHERE email = $1", [input.email]));
    //
    //   if (users.length === 0) {
    //     return yield* _(Effect.fail(new NotFoundError({
    //       message: "User not found",
    //       resource: "User",
    //       id: input.email
    //     })));
    //   }
    //
    //   return users[0];
    // }),
  },

  /**
   * Example: Migrating an endpoint with service dependencies
   */
  serviceComposition: {
    // Original Promise-based handler with manual dependency injection
    original: async ({ input }: { input: { userId: string } }) => {
      // In real implementation, you would inject services manually:
      // const user = await services.userService.getUser(input.userId);
      // const permissions = await services.authService.getUserPermissions(input.userId);
      // return { user, permissions };
      return { user: { id: input.userId }, permissions: ["read"] };
    },

    // Migrated Effect-based handler with Effect service injection
    migrated: ({ input }: { input: { userId: string } }) =>
      Effect.succeed({ user: { id: input.userId }, permissions: ["read"] }),
    // In real implementation, you would use:
    // Effect.gen(function* (_) {
    //   const userService = yield* _(UserService);
    //   const authService = yield* _(AuthService);
    //
    //   const user = yield* _(userService.getUser(input.userId));
    //   const permissions = yield* _(authService.getUserPermissions(input.userId));
    //
    //   return { user, permissions };
    // }),
  },
};
