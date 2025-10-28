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
import { HttpRouter, Headers, HttpApp } from "@effect/platform";
import { RpcServer, RpcSerialization } from "@effect/rpc";
import { Effect, Layer } from "effect";

// Import RPC groups
import { AuthMiddleware, AuthRpcs, AuthHandlersLive } from "./auth-rpc";
import { TodoRpcs, TodoHandlersLive } from "./todo-rpc";

/**
 * Combined RPC groups for the entire application
 */
export const AppRpcs = TodoRpcs.merge(AuthRpcs);

/**
 * Authentication middleware implementation for the server
 * This validates tokens and provides user context to RPC handlers
 */
export const AuthMiddlewareLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of(({ headers, payload, rpc }) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);

      // Extract token from Authorization header
      const authHeader = Headers.get(headers, "authorization");
      if (!authHeader) {
        return yield* _(Effect.fail(new Error("Authorization header missing")));
      }

      const token = authHeader.replace(/^Bearer\s+/, "");
      if (!token) {
        return yield* _(
          Effect.fail(new Error("Invalid authorization header format"))
        );
      }

      // Validate token and get user
      const authContext = yield* _(
        auth.validateToken(token),
        Effect.mapError(() => new Error("Invalid or expired token"))
      );

      return authContext.user;
    })
  )
);

// Web handler for RPC communication
export const RpcWebHandler = RpcServer.toHttpApp(AppRpcs).pipe(
  Effect.map(HttpApp.toWebHandler),
  Effect.provide([
    AuthHandlersLive,
    TodoHandlersLive,
    RpcSerialization.layerNdjson,
  ])
);

/**
 * Combined RPC server layer with all handlers
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
 * Integration helper for Hono applications
 * This allows mounting the RPC server on an existing Hono app
 */
export const integrateWithHono = (app: Hono) => {
  // This would need to be implemented based on how @effect/rpc
  // integrates with existing HTTP frameworks
  // For now, this is a placeholder for the integration pattern

  return app;
};
