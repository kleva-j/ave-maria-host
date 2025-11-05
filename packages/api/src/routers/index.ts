// Legacy oRPC routers have been replaced with native @effect/rpc implementation
// See packages/api/src/rpc/ for the new RPC implementation

// This file is kept for backward compatibility during migration
// but will be removed once all applications are migrated to @effect/rpc

export const appRouter = {
  // Legacy endpoints - these will be removed once migration is complete
  healthCheck: () => "OK",
  privateData: () => ({ message: "This endpoint has been migrated to @effect/rpc" }),
  todo: {
    getAll: () => ({ message: "This endpoint has been migrated to @effect/rpc" }),
    create: () => ({ message: "This endpoint has been migrated to @effect/rpc" }),
    toggle: () => ({ message: "This endpoint has been migrated to @effect/rpc" }),
    delete: () => ({ message: "This endpoint has been migrated to @effect/rpc" }),
  },
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = any; // Simplified for migration period
