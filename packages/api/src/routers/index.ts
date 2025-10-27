import type { RouterClient } from "@orpc/server";

// import { createTodoEffectRouterWithLayer } from "./todo-effect";
// import { createAuthEffectRouterWithLayer } from "./auth-effect";
import { protectedProcedure, publicProcedure } from "../index";
import { todoRouter } from "./todo";

// Effect-based routers are available but commented out due to missing service implementations
// Uncomment and import these once DatabaseService and AuthService are properly implemented:
// import { createEffectRouter } from "../effects/orpc";
// import { authEffectRouter } from "./auth-effect";
// import { todoEffectRouter } from "./todo-effect";
// import { Layer } from "effect";
// const AppLayer = Layer.empty; // This should be replaced with the actual AppLayer

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  // Original Promise-based todo router (maintained for backward compatibility)
  todo: todoRouter,

  // Effect-based routers will be available here once services are implemented:
//   todoEffect: createTodoEffectRouterWithLayer(AppLayer),
//   authEffect: createAuthEffectRouterWithLayer(AppLayer),
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
