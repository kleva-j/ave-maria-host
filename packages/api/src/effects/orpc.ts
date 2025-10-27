/**
 * @fileoverview oRPC Effect.ts Integration
 *
 * This module provides utilities for integrating Effect.ts programs with oRPC routers.
 * It enables type-safe Effect-based API endpoints with automatic error handling,
 * service injection, and Promise-to-Effect conversion.
 *
 * ## Key Features:
 * - **Effect-Compatible Procedures**: Create oRPC procedures that run Effect programs
 * - **Automatic Error Handling**: Convert Effect errors to appropriate HTTP responses
 * - **Service Injection**: Seamless dependency injection for Effect services
 * - **Type Safety**: Full TypeScript support for Effect-based API endpoints
 * - **Backward Compatibility**: Maintain compatibility with existing Promise-based endpoints
 *
 * ## Quick Start:
 * ```typescript
 * import { createEffectRouter, effectProcedure } from "@host/api/effects/orpc";
 * import { DatabaseService } from "@host/db/effects";
 * import { z } from "zod";
 *
 * // Create Effect-based router
 * export const userRouter = createEffectRouter({
 *   getUser: effectProcedure
 *     .input(z.object({ id: z.string() }))
 *     .handler(({ input }) => Effect.gen(function* (_) {
 *       const db = yield* _(DatabaseService);
 *       const users = yield* _(db.query("SELECT * FROM users WHERE id = $1", [input.id]));
 *       if (users.length === 0) {
 *         yield* _(Effect.fail(new NotFoundError({
 *           message: "User not found",
 *           resource: "User",
 *           id: input.id
 *         })));
 *       }
 *       return users[0];
 *     }))
 * });
 * ```
 */

import type { Context as HonoContext } from "hono";
import type { z } from "zod";

import { ORPCError, type Context as ORPCContext } from "@orpc/server";
import { Effect, Context, Layer, Runtime, pipe, Exit } from "effect";

// Import error types
import type { ApplicationError } from "./errors";
import { NetworkError } from "./errors";

/**
 * Context tag for accessing oRPC context within Effect programs
 */
export const ORPCContextService =
  Context.GenericTag<ORPCContext>("ORPCContext");

/**
 * Context tag for accessing Hono context within Effect programs
 */
export const HonoContextService =
  Context.GenericTag<HonoContext>("HonoContext");

/**
 * Configuration for Effect-oRPC integration
 */
export interface EffectORPCConfig {
  /** Whether to include error stack traces in responses (default: false in production) */
  readonly includeStackTrace?: boolean;
  /** Timeout for Effect program execution in milliseconds (default: 30000) */
  readonly timeout?: number;
  /** Custom error mapper for converting Effect errors to oRPC errors */
  readonly errorMapper?: (
    error: ApplicationError
  ) => ORPCError<string, unknown>;
}

/**
 * Default error mapper that converts Effect errors to appropriate oRPC errors
 */
const defaultErrorMapper = (
  error: ApplicationError
): ORPCError<string, unknown> => {
  switch (error._tag) {
    case "ValidationError":
      return new ORPCError("BAD_REQUEST");

    case "NotFoundError":
      return new ORPCError("NOT_FOUND");

    case "UnauthorizedError":
      return new ORPCError("UNAUTHORIZED");

    case "ForbiddenError":
      return new ORPCError("FORBIDDEN");

    case "DatabaseError":
      return new ORPCError("INTERNAL_SERVER_ERROR");

    case "AuthError":
      return new ORPCError(
        error.type === "InvalidToken" || error.type === "SessionExpired"
          ? "UNAUTHORIZED"
          : "FORBIDDEN"
      );

    case "NetworkError":
      return new ORPCError("BAD_GATEWAY");

    case "BusinessLogicError":
      return new ORPCError("BAD_REQUEST");

    case "ConfigError":
      return new ORPCError("INTERNAL_SERVER_ERROR");

    default:
      return new ORPCError("INTERNAL_SERVER_ERROR");
  }
};

/**
 * Type for Effect-based oRPC procedure handler
 */
export type EffectProcedureHandler<TInput, TOutput, TServices> = (args: {
  input: TInput;
  context: ORPCContext;
}) => Effect.Effect<TOutput, ApplicationError, TServices>;

/**
 * Type for Effect-based oRPC procedure with input validation
 */
export interface EffectProcedure<TServices = never> {
  input<TInput>(
    schema: z.ZodSchema<TInput>
  ): EffectProcedureWithInput<TInput, TServices>;
  handler<TOutput>(
    handler: EffectProcedureHandler<void, TOutput, TServices>
  ): EffectProcedureImplementation<void, TOutput, TServices>;
}

/**
 * Type for Effect-based oRPC procedure with input validation
 */
export interface EffectProcedureWithInput<TInput, TServices = never> {
  handler<TOutput>(
    handler: EffectProcedureHandler<TInput, TOutput, TServices>
  ): EffectProcedureImplementation<TInput, TOutput, TServices>;
}

/**
 * Type for implemented Effect-based oRPC procedure
 */
export interface EffectProcedureImplementation<TInput, TOutput, TServices> {
  _input?: z.ZodSchema<TInput>;
  _handler: EffectProcedureHandler<TInput, TOutput, TServices>;
  _services: TServices;
}

/**
 * Creates an Effect-compatible oRPC procedure builder.
 * This procedure builder allows you to create type-safe API endpoints that run Effect programs.
 *
 * @param config - Optional configuration for Effect-oRPC integration
 * @returns Effect procedure builder
 *
 * @example
 * ```typescript
 * import { effectProcedure } from "@host/api/effects/orpc";
 * import { DatabaseService } from "@host/db/effects";
 * import { z } from "zod";
 *
 * const getUserProcedure = effectProcedure
 *   .input(z.object({ id: z.string() }))
 *   .handler(({ input }) => Effect.gen(function* (_) {
 *     const db = yield* _(DatabaseService);
 *     const users = yield* _(db.query("SELECT * FROM users WHERE id = $1", [input.id]));
 *     return users[0];
 *   }));
 * ```
 */
export const effectProcedure = <TServices = never>(
  _config: EffectORPCConfig = {}
): EffectProcedure<TServices> => {
  return {
    input<TInput>(schema: z.ZodSchema<TInput>) {
      return {
        handler<TOutput>(
          handler: EffectProcedureHandler<TInput, TOutput, TServices>
        ): EffectProcedureImplementation<TInput, TOutput, TServices> {
          return {
            _input: schema,
            _handler: handler,
            _services: undefined as TServices,
          };
        },
      };
    },

    handler<TOutput>(
      handler: EffectProcedureHandler<void, TOutput, TServices>
    ): EffectProcedureImplementation<void, TOutput, TServices> {
      return {
        _handler: handler,
        _services: undefined as TServices,
      };
    },
  };
};

/**
 * Converts an Effect-based procedure implementation to a standard oRPC handler.
 * This function handles Effect execution, error conversion, and context management.
 *
 * @param procedure - Effect procedure implementation
 * @param layer - Effect layer providing required services
 * @param config - Optional configuration
 * @returns Standard oRPC handler function
 *
 * @example
 * ```typescript
 * import { convertEffectProcedure } from "@host/api/effects/orpc";
 * import { AppLayer } from "@host/server/effects/layers";
 *
 * const handler = convertEffectProcedure(getUserProcedure, AppLayer);
 * ```
 */
export const convertEffectProcedure = <TInput, TOutput, TServices>(
  procedure: EffectProcedureImplementation<TInput, TOutput, TServices>,
  layer: Layer.Layer<TServices>,
  config: EffectORPCConfig = {}
) => {
  const runtime = Runtime.defaultRuntime;
  const errorMapper = config.errorMapper ?? defaultErrorMapper;
  const includeStackTrace =
    config.includeStackTrace ?? process.env.NODE_ENV === "development";
  const timeout = config.timeout ?? 30000;

  return async (args: { input: TInput; context: ORPCContext }) => {
    try {
      // Create the Effect program with context injection
      const program = pipe(
        procedure._handler(args),
        Effect.provide(Layer.succeed(ORPCContextService, args.context)),
        Effect.provide(layer),
        Effect.timeout(`${timeout} millis`)
      );

      // Run the Effect program
      const exit = await Runtime.runPromiseExit(runtime)(program);

      // Handle the result
      return Exit.match(exit, {
        onFailure: (cause) => {
          if (cause._tag === "Fail") {
            const orpcError = errorMapper(cause.error as ApplicationError);

            // Log the error for debugging
            console.error("Effect procedure error:", {
              error: cause.error,
              stack: includeStackTrace
                ? (cause.error as Error)?.stack
                : undefined,
              procedure: procedure._handler.name || "anonymous",
            });

            throw orpcError;
          }

          // Handle other types of failures (interruption, defects)
          const error = new ORPCError("INTERNAL_SERVER_ERROR");

          console.error("Effect procedure failure:", {
            cause,
            procedure: procedure._handler.name || "anonymous",
          });

          throw error;
        },
        onSuccess: (value) => value,
      });
    } catch (error) {
      // Handle unexpected errors outside of Effect
      if (error instanceof ORPCError) {
        throw error;
      }

      console.error("Unexpected error in Effect procedure:", {
        error,
        stack: includeStackTrace ? (error as Error)?.stack : undefined,
        procedure: procedure._handler.name || "anonymous",
      });

      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }
  };
};

/**
 * Creates an Effect-compatible oRPC router that automatically converts Effect procedures.
 * This router factory simplifies the creation of routers with Effect-based endpoints.
 *
 * @param procedures - Object containing Effect procedure implementations
 * @param layer - Effect layer providing required services
 * @param config - Optional configuration
 * @returns oRPC router with converted handlers
 *
 * @example
 * ```typescript
 * import { createEffectRouter } from "@host/api/effects/orpc";
 * import { AppLayer } from "@host/server/effects/layers";
 *
 * export const userRouter = createEffectRouter({
 *   getUser: effectProcedure
 *     .input(z.object({ id: z.string() }))
 *     .handler(({ input }) => getUserEffect(input.id)),
 *
 *   createUser: effectProcedure
 *     .input(z.object({ name: z.string(), email: z.string() }))
 *     .handler(({ input }) => createUserEffect(input))
 * }, AppLayer);
 * ```
 */
export const createEffectRouter = <
  TProcedures extends Record<string, EffectProcedureImplementation<any, any, any>>
>(
  procedures: TProcedures,
  layer: Layer.Layer<any>,
  config: EffectORPCConfig = {}
): Record<keyof TProcedures, unknown> => {
  const router: Record<string, unknown> = {};

  for (const [key, procedure] of Object.entries(procedures)) {
    // Convert Effect procedure to standard oRPC handler
    const handler = convertEffectProcedure(procedure, layer, config);

    // Create oRPC procedure with input validation if present
    if (procedure._input) {
      router[key] = {
        input: procedure._input,
        handler,
      };
    } else {
      router[key] = {
        handler,
      };
    }
  }

  return router as Record<keyof TProcedures, unknown>;
};

/**
 * Utility function to convert a Promise-based oRPC handler to an Effect-based handler.
 * This helps with gradual migration from Promise-based to Effect-based endpoints.
 *
 * @param promiseHandler - Existing Promise-based oRPC handler
 * @param errorMapper - Optional function to map Promise errors to Effect errors
 * @returns Effect-based handler
 *
 * @example
 * ```typescript
 * import { promiseToEffectHandler } from "@host/api/effects/orpc";
 *
 * // Convert existing Promise handler
 * const legacyHandler = async ({ input }) => {
 *   return await db.user.findUnique({ where: { id: input.id } });
 * };
 *
 * const effectHandler = promiseToEffectHandler(
 *   legacyHandler,
 *   (error) => new DatabaseError({
 *     message: error.message,
 *     operation: "findUser",
 *     cause: error
 *   })
 * );
 * ```
 */
export const promiseToEffectHandler = <TInput, TOutput>(
  promiseHandler: (args: {
    input: TInput;
    context: ORPCContext;
  }) => Promise<TOutput>,
  errorMapper?: (error: unknown) => ApplicationError
): EffectProcedureHandler<TInput, TOutput, never> => {
  return (args) => {
    return Effect.tryPromise({
      try: () => promiseHandler(args),
      catch: (error) => {
        if (errorMapper) {
          return errorMapper(error);
        }

        // Default error mapping
        if (error instanceof Error) {
          return new NetworkError({
            message: error.message,
            url: "unknown",
            cause: error,
          });
        }

        return new NetworkError({
          message: "Unknown error occurred",
          url: "unknown",
          cause: error,
        });
      },
    });
  };
};

/**
 * Utility function to convert an Effect-based handler to a Promise-based oRPC handler.
 * This enables backward compatibility when migrating to Effect-based endpoints.
 *
 * @param effectHandler - Effect-based handler
 * @param layer - Effect layer providing required services
 * @param config - Optional configuration
 * @returns Promise-based oRPC handler
 *
 * @example
 * ```typescript
 * import { effectToPromiseHandler } from "@host/api/effects/orpc";
 * import { AppLayer } from "@host/server/effects/layers";
 *
 * const promiseHandler = effectToPromiseHandler(
 *   ({ input }) => getUserEffect(input.id),
 *   AppLayer
 * );
 * ```
 */
export const effectToPromiseHandler = <TInput, TOutput, TServices>(
  effectHandler: EffectProcedureHandler<TInput, TOutput, TServices>,
  layer: Layer.Layer<TServices>,
  config: EffectORPCConfig = {}
) => {
  const runtime = Runtime.defaultRuntime;
  const procedureConfig = {
    errorMapper: config.errorMapper ?? defaultErrorMapper,
    timeout: config.timeout ?? 30000,
  };

  return async (args: {
    input: TInput;
    context: ORPCContext;
  }): Promise<TOutput> => {
    const program = pipe(
      effectHandler(args),
      Effect.provide(Layer.succeed(ORPCContextService, args.context)),
      Effect.provide(layer),
      Effect.timeout(`${procedureConfig.timeout} millis`)
    );

    try {
      return await Runtime.runPromise(runtime)(program);
    } catch (error) {
      if (error && typeof error === "object" && "_tag" in error) {
        const orpcError = procedureConfig.errorMapper(
          error as ApplicationError
        );
        throw orpcError;
      }
      throw error;
    }
  };
};

/**
 * Type helpers for extracting types from Effect procedures
 */
export type ExtractProcedureInput<T> =
  T extends EffectProcedureImplementation<infer I, any, any>
    ? I
    : never;
export type ExtractProcedureOutput<T> =
  T extends EffectProcedureImplementation<any, infer O, any>
    ? O
    : never;
export type ExtractProcedureServices<T> =
  T extends EffectProcedureImplementation<any, any, infer S>
    ? S
    : never;

/**
 * Type for a complete Effect-based oRPC router
 */
export type EffectRouter<
  T extends Record<
    string,
    EffectProcedureImplementation<any, any, any>
  >,
> = {
  [K in keyof T]: T[K] extends EffectProcedureImplementation<
    infer I,
    infer O,
    any
  >
    ? I extends void
      ? { handler: () => Promise<O> }
      : {
          input: z.ZodSchema<I>;
          handler: (args: { input: I; context: ORPCContext }) => Promise<O>;
        }
    : never;
};
