/**
 * @fileoverview @effect/rpc Client Integration
 *
 * This module provides client-side integration for @effect/rpc.
 * It creates type-safe RPC clients for web and native applications.
 *
 * ## Key Features:
 * - **Type Safety**: End-to-end type safety from server to client
 * - **Effect Integration**: Native Effect patterns on the client side
 * - **Error Handling**: Proper error propagation and handling
 * - **Middleware Support**: Client-side middleware for authentication
 */

import { RpcClient, RpcSerialization, RpcMiddleware } from "@effect/rpc";
import { FetchHttpClient, Headers } from "@effect/platform";
import { Effect, Layer } from "effect";

// Import RPC groups
import { AuthMiddleware } from "./auth-rpc";
import { AppRpcs } from "./server";

/**
 * Authentication middleware implementation for the client
 * This adds authentication headers to RPC requests
 */
export const AuthMiddlewareClientLive: Layer.Layer<
  RpcMiddleware.ForClient<AuthMiddleware>
> = RpcMiddleware.layerClient(AuthMiddleware, ({ request }) => {
  // Get token from localStorage or other storage mechanism
  // This is a simplified example - in practice, you'd get this from your auth state
  const token =
    typeof globalThis !== "undefined" && 
    typeof globalThis.localStorage !== "undefined"
      ? globalThis.localStorage.getItem("auth_token")
      : null;

  if (!token) {
    return Effect.succeed(request);
  }

  return Effect.succeed({
    ...request,
    headers: Headers.set(request.headers, "authorization", `Bearer ${token}`),
  });
});

/**
 * HTTP protocol layer for RPC client communication
 */
export const createRpcProtocolLayer = (baseUrl: string) =>
  RpcClient.layerProtocolHttp({
    url: `${baseUrl}/rpc`,
  }).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]));

/**
 * Complete RPC client layer with authentication middleware
 */
export const createRpcClientLayer = (baseUrl: string) =>
  Layer.mergeAll(createRpcProtocolLayer(baseUrl), AuthMiddlewareClientLive);

/**
 * RPC client service for dependency injection
 */
export class AppRpcClient extends Effect.Service<AppRpcClient>()(
  "AppRpcClient",
  {
    scoped: RpcClient.make(AppRpcs),
    dependencies: [AuthMiddlewareClientLive],
  }
) {}

/**
 * Create a configured RPC client for use in applications
 *
 * This is a conceptual implementation showing how @effect/rpc client integration
 * would work. The actual implementation would be completed during the migration phase.
 *
 * @param baseUrl - The base URL of the RPC server
 * @returns Effect program that provides the RPC client
 *
 * @example
 * ```typescript
 * // In a web application (conceptual)
 * const program = Effect.gen(function* (_) {
 *   const client = yield* _(createRpcClient("http://localhost:3000"));
 *   const todos = yield* _(client.GetAllTodos({}));
 *   return todos;
 * });
 *
 * Effect.runPromise(program).then(console.log);
 * ```
 */
export const createRpcClient = (_baseUrl: string) => {
  // This is a conceptual implementation
  // The actual @effect/rpc client integration would be implemented
  // during the migration phase with proper service layer integration
  
  return Effect.succeed({
    // Placeholder client interface
    GetAllTodos: () => Effect.succeed([]),
    CreateTodo: () => Effect.succeed({ id: 1, text: "example", completed: false }),
    // ... other methods would be implemented during migration
    // Configuration would use baseUrl: ${baseUrl}
  });
};

/**
 * Utility function to create a Promise-based client for easier integration
 * with existing Promise-based code during migration
 *
 * @param baseUrl - The base URL of the RPC server
 * @returns Promise that resolves to the RPC client
 *
 * @example
 * ```typescript
 * // For easier migration from Promise-based code (conceptual)
 * const client = await createPromiseRpcClient("http://localhost:3000");
 * const todos = await Effect.runPromise(client.GetAllTodos({}));
 * ```
 */
export const createPromiseRpcClient = (baseUrl: string) =>
  Effect.runPromise(createRpcClient(baseUrl));

/**
 * React hook for using RPC client in React applications
 * This is a placeholder for React integration
 */
export const useRpcClient = (baseUrl: string) => {
  // This would be implemented as a React hook
  // For now, it's just a placeholder showing the pattern
  throw new Error("React integration not implemented yet");
};
