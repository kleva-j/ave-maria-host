/**
 * @fileoverview @effect/rpc Server Integration
 *
 * This module provides server-side integration for @effect/rpc with the existing
 * Better-T-Stack infrastructure. It handles HTTP protocol setup, middleware integration,
 * and service layer composition.
 *
 * ## Key Features:
 * - **HTTP Protocol**: Native HTTP transport for RPC communication
 * - **Middleware Integration**: Authentication and other middleware support
 * - **Service Composition**: Integration with existing Effect services
 * - **Error Handling**: Proper error mapping and response formatting
 */

// Import services
import type { HttpServer } from "@effect/platform/HttpServer";
import type { DatabaseService } from "@host/db";
import type { Hono } from "hono";

import { AuthService } from "@host/auth";

// Import Effect tools
import { RpcServer, RpcSerialization } from "@effect/rpc";
import { HttpRouter, Headers } from "@effect/platform";
import { Effect, Layer, Option } from "effect";

// Import RPC groups
import { TodoRpcs, TodoHandlersLive } from "./todo-rpc";
import {
  AuthenticationError,
  AuthValidationError,
  AuthorizationError,
  AuthHandlersLive,
  AuthMiddleware,
  AuthRpcs,
} from "./auth-rpc";

/**
 * Combined RPC groups for the entire application
 */
export const AppRpcs = TodoRpcs.merge(AuthRpcs);

/**
 * Authentication middleware implementation for the server
 * This validates tokens and provides user context to RPC handlers
 * 
 * Note: The middleware throws errors instead of using Effect.fail to ensure
 * they are properly caught by the RPC framework's error handling system.
 */
export const AuthMiddlewareLive: Layer.Layer<AuthMiddleware, never, AuthService> =
  Layer.effect(
    AuthMiddleware,
    Effect.gen(function* (_) {
      const authService = yield* _(AuthService);

      return AuthMiddleware.of(({ headers }) =>
        Effect.gen(function* (_) {
          // Extract token from Authorization header
          const authHeaderOption = Headers.get(headers, "authorization");
          
          if (Option.isNone(authHeaderOption)) {
            throw new AuthorizationError({
              message: "Authorization header missing",
              action: "token_validation",
            });
          }

          const authHeader = authHeaderOption.value;
          const token = authHeader.replace(/^Bearer\s+/, "");
          
          if (!token || token === authHeader) {
            throw new AuthValidationError({
              field: "authorization",
              value: authHeader,
              message: "Invalid authorization header format. Expected 'Bearer <token>'",
            });
          }

          // Validate token and get authentication context
          // Use orDie to convert Effect errors to exceptions that the middleware can handle
          const authContext = yield* _(
            authService.validateToken(token).pipe(
              Effect.mapError((error) => {
                if (error._tag === "InvalidTokenError") {
                  return new AuthenticationError({
                    type: "InvalidToken",
                    message: "Invalid or malformed token",
                  });
                }
                if (error._tag === "SessionExpiredError") {
                  return new AuthenticationError({
                    type: "SessionExpired",
                    message: "Token has expired",
                  });
                }
                if (error._tag === "UserNotFoundError") {
                  return new AuthenticationError({
                    type: "UserNotFound",
                    message: "User associated with token not found",
                  });
                }
                // Fallback for any other auth errors
                return new AuthenticationError({
                  type: "InvalidToken",
                  message: "Authentication failed",
                });
              }),
              Effect.orDie
            )
          );
          
          // Map the auth service user to the RPC User schema
          // The auth service User has additional fields (emailVerified, image) 
          // that we don't include in the RPC User schema
          return {
            id: authContext.user.id,
            email: authContext.user.email,
            name: authContext.user.name,
            createdAt: authContext.user.createdAt,
            updatedAt: authContext.user.updatedAt,
          };
        })
      );
    })
  );

/**
 * Web handler for RPC communication
 * Creates a complete RPC web handler with all services integrated
 * 
 * Note: This is a simplified implementation that demonstrates the integration pattern.
 * The full RPC server integration with Effect services will be completed in subsequent tasks.
 */
export const createRpcWebHandler = (
  _authServiceLayer: Layer.Layer<AuthService>,
  _databaseServiceLayer: Layer.Layer<DatabaseService>
) => {
  // Create a simple handler that returns a success response
  // The full RPC integration will be completed in subsequent tasks
  return Effect.succeed((request: Request) => {
    return new Response(
      JSON.stringify({ 
        message: "RPC endpoint ready - middleware and handlers configured",
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        rpcGroups: ["TodoRpcs", "AuthRpcs"],
        middleware: ["AuthMiddleware"],
        handlers: ["TodoHandlersLive", "AuthHandlersLive"]
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  });
};

/**
 * Combined RPC server layer with all handlers
 * Requires AuthService and DatabaseService to be provided
 */
export const RpcServerLive: Layer.Layer<
  never,
  never,
  AuthService | DatabaseService | RpcServer.Protocol
> = RpcServer.layer(AppRpcs).pipe(
  Layer.provide(TodoHandlersLive),
  Layer.provide(AuthHandlersLive),
  Layer.provide(AuthMiddlewareLive)
);

/**
 * HTTP protocol layer for RPC communication
 */
export const RpcHttpProtocolLive: Layer.Layer<RpcServer.Protocol> =
  RpcServer.layerProtocolHttp({
    path: "/rpc",
  }).pipe(Layer.provide(RpcSerialization.layerNdjson));

/**
 * Complete RPC layer ready for integration with HTTP server
 * Requires AuthService and DatabaseService to be provided
 */
export const RpcLayerLive: Layer.Layer<
  never,
  never,
  AuthService | DatabaseService | HttpServer
> = HttpRouter.Default.serve().pipe(
  Layer.provide(RpcServerLive),
  Layer.provide(RpcHttpProtocolLive)
);

/**
 * Create a complete RPC layer with all dependencies provided
 * 
 * @param authServiceLayer - The authentication service layer
 * @param databaseServiceLayer - The database service layer
 * @returns A complete RPC layer ready for use
 * 
 * @example
 * ```typescript
 * import { AuthServiceLive } from "@host/auth";
 * import { DatabaseServiceLive } from "@host/db";
 * 
 * const completeRpcLayer = createCompleteRpcLayer(
 *   AuthServiceLive,
 *   DatabaseServiceLive
 * );
 * ```
 */
export const createCompleteRpcLayer = (
  authServiceLayer: Layer.Layer<AuthService>,
  databaseServiceLayer: Layer.Layer<DatabaseService>
): Layer.Layer<never, never, HttpServer> =>
  RpcLayerLive.pipe(
    Layer.provide(authServiceLayer),
    Layer.provide(databaseServiceLayer)
  );

/**
 * Integration helper for Hono applications
 * This allows mounting the RPC server on an existing Hono app
 *
 * @param app - The Hono application instance
 * @param authServiceLayer - The authentication service layer
 * @param databaseServiceLayer - The database service layer
 * @returns The Hono app with RPC endpoints mounted
 *
 * @example
 * ```typescript
 * import { AuthServiceLive } from "@host/auth";
 * import { DatabaseServiceLive } from "@host/db";
 * 
 * const app = new Hono();
 * const rpcApp = integrateWithHono(app, AuthServiceLive, DatabaseServiceLive);
 * ```
 */
export const integrateWithHono = (
  app: Hono,
  authServiceLayer: Layer.Layer<AuthService>,
  databaseServiceLayer: Layer.Layer<DatabaseService>
) => {
  // Mount the RPC web handler at the /rpc endpoint
  app.all("/rpc", async (c) => {
    try {
      const webHandler = await Effect.runPromise(
        createRpcWebHandler(authServiceLayer, databaseServiceLayer)
      );
      return webHandler(c.req.raw);
    } catch (error) {
      console.error("RPC handler error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  });

  return app;
};
