/**
 * @fileoverview @effect/rpc Client Integration for Web Application
 *
 * This module provides the @effect/rpc client implementation for the web application.
 * It includes Promise-based adapters for easier integration with existing React Query code.
 */

import { FetchHttpClient, Headers } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { AuthMiddleware } from "@host/api/rpc/auth-rpc";
import { AppRpcs } from "@host/api/rpc/server";
import { Effect, Layer } from "effect";

import { logMigrationUsage } from "./feature-flags";

/**
 * Authentication middleware implementation for the web client
 */
export const AuthMiddlewareWebLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of(({ headers }) => {
    // Get token from localStorage
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      return Effect.succeed(headers);
    }

    return Effect.succeed(
      Headers.set(headers, "authorization", `Bearer ${token}`)
    );
  })
);

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
  Layer.mergeAll(createRpcProtocolLayer(baseUrl), AuthMiddlewareWebLive);

/**
 * RPC client service for dependency injection
 */
export class AppRpcClient extends Effect.Service<AppRpcClient>()(
  "AppRpcClient",
  {
    scoped: RpcClient.make(AppRpcs),
    dependencies: [AuthMiddlewareWebLive],
  }
) {}

/**
 * Create a configured RPC client
 */
export const createEffectRpcClient = (baseUrl: string) =>
  Effect.gen(function* (_) {
    const client = yield* _(AppRpcClient);
    return client;
  }).pipe(Effect.provide(createRpcClientLayer(baseUrl)));

/**
 * Promise-based client adapter for easier integration with existing code
 */
export class PromiseRpcClient {
  private clientEffect: Effect.Effect<AppRpcClient, never, AppRpcClient>;

  constructor(baseUrl: string) {
    this.clientEffect = createEffectRpcClient(baseUrl);
  }

  /**
   * Todo operations
   */
  async getAllTodos() {
    logMigrationUsage("getAllTodos", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.GetAllTodos({}));
      })
    );
  }

  async getTodoById(id: number) {
    logMigrationUsage("getTodoById", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.GetTodoById({ id }));
      })
    );
  }

  async createTodo(text: string) {
    logMigrationUsage("createTodo", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.CreateTodo({ text }));
      })
    );
  }

  async updateTodo(id: number, completed: boolean) {
    logMigrationUsage("updateTodo", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.UpdateTodo({ id, completed }));
      })
    );
  }

  async deleteTodo(id: number) {
    logMigrationUsage("deleteTodo", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.DeleteTodo({ id }));
      })
    );
  }

  async getTodoStats() {
    logMigrationUsage("getTodoStats", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.GetTodoStats({}));
      })
    );
  }

  /**
   * Authentication operations
   */
  async login(email: string, password: string) {
    logMigrationUsage("login", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.Login({ email, password }));
      })
    );
  }

  async register(email: string, password: string, name: string) {
    logMigrationUsage("register", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.Register({ email, password, name }));
      })
    );
  }

  async getProfile() {
    logMigrationUsage("getProfile", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.GetProfile({}));
      })
    );
  }

  async updateProfile(updates: { name?: string; email?: string }) {
    logMigrationUsage("updateProfile", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.UpdateProfile(updates));
      })
    );
  }

  async logout() {
    logMigrationUsage("logout", "effect-rpc");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const client = yield* _(
          createEffectRpcClient(import.meta.env.VITE_SERVER_URL)
        );
        return yield* _(client.Logout({}));
      })
    );
  }

  /**
   * Health check operation
   */
  async healthCheck() {
    logMigrationUsage("healthCheck", "effect-rpc");
    // For health check, we'll create a simple implementation
    // since it's not part of the @effect/rpc endpoints yet
    return Promise.resolve("OK");
  }

  /**
   * Private data operation (for backward compatibility)
   */
  async getPrivateData() {
    logMigrationUsage("getPrivateData", "effect-rpc");
    // This would need to be implemented as part of the auth endpoints
    // For now, return a placeholder
    return Promise.resolve({
      message: "This is private data from @effect/rpc",
      user: null, // Would be populated from auth context
    });
  }
}

/**
 * Create a Promise-based RPC client instance
 */
export const createPromiseRpcClient = (baseUrl: string) => {
  return new PromiseRpcClient(baseUrl);
};

/**
 * Default client instance for the web application
 */
export const effectRpcClient = createPromiseRpcClient(
  import.meta.env.VITE_SERVER_URL || "http://localhost:3000"
);
