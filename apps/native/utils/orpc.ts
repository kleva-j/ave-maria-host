import type { AppRouterClient } from "@host/api/routers/index";

import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createORPCClient } from "@orpc/client";
import { authClient } from "@/lib/auth-client";
import { RPCLink } from "@orpc/client/fetch";

import { unifiedClient, createUnifiedQueryOptions } from "./unified-client";
import { FEATURE_FLAGS, shouldUseEffectRpc } from "./feature-flags";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.log(error);
    },
  }),
});

export const link = new RPCLink({
  url: `${process.env.EXPO_PUBLIC_SERVER_URL}/rpc`,
  headers() {
    const headers = new Map<string, string>();
    const cookies = authClient.getCookie();
    if (cookies) {
      headers.set("Cookie", cookies);
    }
    return Object.fromEntries(headers);
  },
});

export const client: AppRouterClient = createORPCClient(link);

// Original oRPC utilities
const originalOrpc = createTanstackQueryUtils(client);

// Unified query options for migration
const unifiedQueryOptions = createUnifiedQueryOptions();

/**
 * Migration-aware oRPC utilities
 * This provides backward compatibility while enabling gradual migration to @effect/rpc
 */
export const orpc = {
  // Health check endpoint
  healthCheck: {
    queryOptions: () => {
      if (shouldUseEffectRpc("HEALTH_CHECK")) {
        return unifiedQueryOptions.healthCheck;
      }
      return originalOrpc.healthCheck.queryOptions();
    },
  },

  // Private data endpoint
  privateData: {
    queryOptions: () => {
      if (shouldUseEffectRpc("AUTH")) {
        return unifiedQueryOptions.privateData;
      }
      return originalOrpc.privateData.queryOptions();
    },
  },

  // Todo endpoints
  todo: {
    getAll: {
      queryOptions: () => {
        if (shouldUseEffectRpc("TODOS")) {
          return unifiedQueryOptions.todo.getAll;
        }
        return originalOrpc.todo.getAll.queryOptions();
      },
    },
    create: {
      mutationOptions: (options?: any) => {
        if (shouldUseEffectRpc("TODOS")) {
          return {
            ...unifiedQueryOptions.todo.create,
            ...options,
          };
        }
        return originalOrpc.todo.create.mutationOptions(options);
      },
    },
    toggle: {
      mutationOptions: (options?: any) => {
        if (shouldUseEffectRpc("TODOS")) {
          return {
            ...unifiedQueryOptions.todo.toggle,
            ...options,
          };
        }
        return originalOrpc.todo.toggle.mutationOptions(options);
      },
    },
    delete: {
      mutationOptions: (options?: any) => {
        if (shouldUseEffectRpc("TODOS")) {
          return {
            ...unifiedQueryOptions.todo.delete,
            ...options,
          };
        }
        return originalOrpc.todo.delete.mutationOptions(options);
      },
    },
  },
};

// Export the unified client for direct usage
export { unifiedClient };

// Log current migration status
if (FEATURE_FLAGS.LOG_MIGRATION_USAGE) {
  console.log("[Migration] oRPC utilities initialized with feature flags:", {
    USE_EFFECT_RPC: FEATURE_FLAGS.USE_EFFECT_RPC,
    EFFECT_RPC_ENDPOINTS: FEATURE_FLAGS.EFFECT_RPC_ENDPOINTS,
  });
}
