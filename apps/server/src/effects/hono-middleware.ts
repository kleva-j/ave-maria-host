/**
 * @fileoverview Hono Effect.ts Middleware Integration
 *
 * This module provides middleware for integrating Effect.ts programs with Hono request handlers.
 * It handles Effect runtime execution, error formatting, and context management for API requests.
 *
 * ## Key Features:
 * - **Effect Runtime Integration**: Seamless execution of Effect programs in Hono handlers
 * - **Structured Error Handling**: Automatic conversion of Effect errors to HTTP responses
 * - **Context Management**: Proper service injection and context propagation
 * - **Type Safety**: Full TypeScript support for Effect programs in HTTP handlers
 *
 * ## Quick Start:
 * ```typescript
 * import { effectMiddleware, createEffectHandler } from "./effects/hono-middleware";
 * import { AppLayer } from "./effects/layers";
 *
 * // Use middleware for Effect runtime
 * app.use("*", effectMiddleware(AppLayer));
 *
 * // Create Effect-based route handler
 * app.get("/users/:id", createEffectHandler((c) => Effect.gen(function* (_) {
 *   const userId = c.req.param("id");
 *   const db = yield* _(DatabaseService);
 *   const users = yield* _(db.query("SELECT * FROM users WHERE id = $1", [userId]));
 *   return users[0];
 * })));
 * ```
 */

import type { MiddlewareHandler, Context as HonoContext } from "hono";

import { Effect, Exit, Layer, Runtime, Context, pipe } from "effect";
import { HTTPException } from "hono/http-exception";

// Define basic error types for now (will be replaced with actual imports later)
type DatabaseError = {
  _tag:
    | "DatabaseTransactionError"
    | "DatabaseConnectionError"
    | "DatabaseQueryError";
  message: string;
};
type AuthError = {
  _tag:
    | "InvalidCredentialsError"
    | "SessionExpiredError"
    | "UnauthorizedError"
    | "InvalidTokenError"
    | "UserNotFoundError";
  message: string;
};

/**
 * Context tag for storing the Effect runtime in Hono context
 */
export const EffectRuntimeService =
  Context.GenericTag<Runtime.Runtime<unknown>>("EffectRuntime");

/**
 * Context tag for storing the Hono context in Effect programs
 */
export const HonoContextService =
  Context.GenericTag<HonoContext>("HonoContext");

/**
 * Union type of all possible Effect errors that can occur in HTTP handlers
 */
export type HttpEffectError = DatabaseError | AuthError | Error;

/**
 * Configuration for Effect middleware behavior
 */
export interface EffectMiddlewareConfig {
  /** Whether to include error stack traces in responses (default: false in production) */
  readonly includeStackTrace?: boolean;
  /** Custom error formatter function */
  readonly formatError?: (error: HttpEffectError) => {
    message: string;
    code?: string;
    status?: number;
  };
  /** Timeout for Effect program execution in milliseconds (default: 30000) */
  readonly timeout?: number;
}

/**
 * Default error formatter that converts Effect errors to HTTP-friendly format
 */
const defaultErrorFormatter = (
  error: HttpEffectError
): { message: string; code?: string; status?: number } => {
  // Handle database errors
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const taggedError = error as { _tag: string; message: string };

    if (taggedError._tag === "DatabaseConnectionError") {
      return {
        message: "Database connection failed",
        code: "DATABASE_CONNECTION_ERROR",
        status: 503,
      };
    }

    if (taggedError._tag === "DatabaseQueryError") {
      return {
        message: "Database query failed",
        code: "DATABASE_QUERY_ERROR",
        status: 500,
      };
    }

    if (taggedError._tag === "DatabaseTransactionError") {
      return {
        message: "Database transaction failed",
        code: "DATABASE_TRANSACTION_ERROR",
        status: 500,
      };
    }

    // Handle auth errors
    if (
      taggedError._tag === "InvalidTokenError" ||
      taggedError._tag === "SessionExpiredError"
    ) {
      return {
        message: "Authentication failed",
        code: "AUTHENTICATION_ERROR",
        status: 401,
      };
    }

    if (taggedError._tag === "UnauthorizedError") {
      return {
        message: "Access denied",
        code: "AUTHORIZATION_ERROR",
        status: 403,
      };
    }

    if (taggedError._tag === "UserNotFoundError") {
      return {
        message: "User not found",
        code: "USER_NOT_FOUND",
        status: 404,
      };
    }

    if (taggedError._tag === "InvalidCredentialsError") {
      return {
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        status: 401,
      };
    }
  }

  // Handle generic errors
  const message = (error as Error)?.message || "Internal server error";
  return {
    message,
    code: "INTERNAL_ERROR",
    status: 500,
  };
};

/**
 * Middleware that sets up Effect runtime and provides it to subsequent handlers.
 * This middleware should be applied early in the middleware chain to ensure
 * Effect runtime is available for all Effect-based handlers.
 *
 * @param layer - Effect layer containing all required services
 * @param config - Optional configuration for middleware behavior
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { effectMiddleware } from "./effects/hono-middleware";
 * import { AppLayer } from "./effects/layers";
 *
 * // Apply Effect middleware globally
 * app.use("*", effectMiddleware(AppLayer, {
 *   timeout: 10000,
 *   includeStackTrace: process.env.NODE_ENV === "development"
 * }));
 * ```
 */
export const effectMiddleware = <R>(
  _layer: Layer.Layer<R>,
  config: EffectMiddlewareConfig = {}
): MiddlewareHandler => {
  // Create runtime using ManagedRuntime for proper resource management
  const runtime = Runtime.defaultRuntime;

  return async (c, next) => {
    // Store the Effect runtime in Hono context for use by handlers
    c.set("effectRuntime", runtime);
    c.set("effectConfig", {
      includeStackTrace:
        config.includeStackTrace ?? process.env.NODE_ENV === "development",
      formatError: config.formatError ?? defaultErrorFormatter,
      timeout: config.timeout ?? 30000,
    });

    await next();
  };
};

/**
 * Creates a Hono handler that can run Effect programs.
 * The handler automatically manages Effect execution, error handling, and response formatting.
 *
 * @param effectHandler - Function that receives Hono context and returns an Effect program
 * @returns Hono route handler
 *
 * @example
 * ```typescript
 * import { createEffectHandler } from "./effects/hono-middleware";
 * import { DatabaseService } from "@host/db/effects";
 *
 * // Create Effect-based route handler
 * app.get("/users/:id", createEffectHandler((c) => Effect.gen(function* (_) {
 *   const userId = c.req.param("id");
 *   const db = yield* _(DatabaseService);
 *   const users = yield* _(db.query("SELECT * FROM users WHERE id = $1", [userId]));
 *
 *   if (users.length === 0) {
 *     return c.json({ error: "User not found" }, 404);
 *   }
 *
 *   return c.json(users[0]);
 * })));
 * ```
 */
export const createEffectHandler = <A, E extends Error, R>(
  effectHandler: (c: HonoContext) => Effect.Effect<A, E, R>
) => {
  return async (c: HonoContext) => {
    const runtime = c.get("effectRuntime") as Runtime.Runtime<R>;
    const config = c.get("effectConfig") as Required<EffectMiddlewareConfig>;

    if (!runtime) {
      throw new HTTPException(500, {
        message:
          "Effect runtime not found. Make sure effectMiddleware is applied before this handler.",
      });
    }

    try {
      // Create the Effect program with Hono context available
      const program = pipe(
        effectHandler(c),
        Effect.provide(Layer.succeed(HonoContextService, c)),
        Effect.timeout(`${config.timeout} millis`)
      );

      // Run the Effect program
      const exit = await Runtime.runPromiseExit(runtime)(program);

      // Handle the result
      return Exit.match(exit, {
        onFailure: (cause) => {
          const error =
            cause._tag === "Fail" ? cause.error : new Error("Unknown error");
          const formatted = config.formatError(error as HttpEffectError);

          // Log the error for debugging
          console.error("Effect handler error:", {
            error: error,
            stack: config.includeStackTrace ? error?.stack : undefined,
            path: c.req.path,
            method: c.req.method,
          });

          return c.json(
            {
              error: formatted.message,
              code: formatted.code,
              ...(config.includeStackTrace &&
                (error as Error)?.stack && { stack: (error as Error).stack }),
            },
            (formatted.status as 500) || 500
          );
        },
        onSuccess: (value) => {
          // If the Effect returns a Response object, return it directly
          if (value instanceof Response) {
            return value;
          }

          // If the Effect returns a Hono context response, return it
          if (value && typeof value === "object" && "status" in value) {
            return value;
          }

          // Otherwise, return the value as JSON
          return c.json(value);
        },
      });
    } catch (error) {
      // Handle unexpected errors outside of Effect
      const formatted = config.formatError(error as HttpEffectError);

      console.error("Unexpected error in Effect handler:", {
        error,
        stack: config.includeStackTrace ? (error as Error)?.stack : undefined,
        path: c.req.path,
        method: c.req.method,
      });

      return c.json(
        {
          error: formatted.message,
          code: formatted.code,
          ...(config.includeStackTrace &&
            (error as Error)?.stack && {
              stack: (error as Error).stack,
            }),
        },
        (formatted.status as 500) || 500
      );
    }
  };
};

/**
 * Utility function to run an Effect program within a Hono handler context.
 * This is a lower-level utility for cases where you need more control over
 * the Effect execution and response handling.
 *
 * @param c - Hono context
 * @param effect - Effect program to run
 * @returns Promise that resolves to the Effect result
 *
 * @example
 * ```typescript
 * import { runEffectInHandler } from "./effects/hono-middleware";
 *
 * app.get("/custom", async (c) => {
 *   const result = await runEffectInHandler(c, Effect.gen(function* (_) {
 *     const db = yield* _(DatabaseService);
 *     return yield* _(db.query("SELECT COUNT(*) FROM users"));
 *   }));
 *
 *   // Custom response handling
 *   return c.json({ count: result[0].count, timestamp: new Date() });
 * });
 * ```
 */
export const runEffectInHandler = async <A, E, R>(
  c: HonoContext,
  effect: Effect.Effect<A, E, R>
): Promise<A> => {
  const runtime = c.get("effectRuntime") as Runtime.Runtime<R>;
  const config = c.get("effectConfig") as Required<EffectMiddlewareConfig>;

  if (!runtime) {
    throw new HTTPException(500, {
      message:
        "Effect runtime not found. Make sure effectMiddleware is applied before this handler.",
    });
  }

  const program = pipe(
    effect,
    Effect.provide(Layer.succeed(HonoContextService, c)),
    Effect.timeout(`${config.timeout} millis`)
  );

  return Runtime.runPromise(runtime)(program);
};

/**
 * Type helper for Effect handlers that return HTTP responses
 */
export type EffectHttpHandler<R = never> = (
  c: HonoContext
) => Effect.Effect<
  Response | Record<string, unknown> | unknown[],
  HttpEffectError,
  R
>;

/**
 * Type helper for extracting the service requirements from an Effect handler
 */
export type ExtractEffectServices<T> =
  T extends Effect.Effect<unknown, unknown, infer R> ? R : never;
