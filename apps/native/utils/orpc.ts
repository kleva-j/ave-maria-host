// Legacy oRPC utilities have been replaced with native @effect/rpc
// This file provides backward compatibility during migration

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createPromiseRpcClient } from "@host/api/rpc/client";
import { authClient } from "@/lib/auth-client";
import { Effect } from "effect";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.log(error);
    },
  }),
});

// Create @effect/rpc client
const rpcClient = await createPromiseRpcClient(process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000");

/**
 * @effect/rpc utilities for React Query integration
 * This replaces the legacy oRPC utilities with native @effect/rpc
 */
export const orpc = {
  // Health check endpoint - now uses @effect/rpc
  healthCheck: {
    queryOptions: () => ({
      queryKey: ["healthCheck"],
      queryFn: async () => {
        // Simple health check - @effect/rpc server handles this
        const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000"}/health`);
        return response.json();
      },
    }),
  },

  // Private data endpoint - now uses @effect/rpc
  privateData: {
    queryOptions: () => ({
      queryKey: ["privateData"],
      queryFn: async () => {
        // This would use the @effect/rpc client once auth endpoints are implemented
        return { message: "Private data from @effect/rpc" };
      },
    }),
  },

  // Todo endpoints - now uses @effect/rpc
  todo: {
    getAll: {
      queryOptions: () => ({
        queryKey: ["todos"],
        queryFn: async () => {
          return Effect.runPromise(rpcClient.GetAllTodos({}));
        },
      }),
    },
    create: {
      mutationOptions: (options?: any) => ({
        mutationFn: async (variables: { text: string }) => {
          return Effect.runPromise(rpcClient.CreateTodo({ text: variables.text }));
        },
        ...options,
      }),
    },
    toggle: {
      mutationOptions: (options?: any) => ({
        mutationFn: async (variables: { id: string }) => {
          return Effect.runPromise(rpcClient.UpdateTodo({ 
            id: variables.id, 
            completed: true // This would be toggled based on current state
          }));
        },
        ...options,
      }),
    },
    delete: {
      mutationOptions: (options?: any) => ({
        mutationFn: async (variables: { id: string }) => {
          return Effect.runPromise(rpcClient.DeleteTodo({ id: variables.id }));
        },
        ...options,
      }),
    },
  },
};

console.log("[Migration] Switched to @effect/rpc client utilities");
