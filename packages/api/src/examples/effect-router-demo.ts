/**
 * @fileoverview Effect Router Integration Demo
 *
 * This file demonstrates how to properly integrate Effect-based routers with oRPC
 * once the required services (DatabaseService, AuthService) are implemented.
 *
 * ## Usage Instructions:
 * 1. Implement DatabaseService and AuthService
 * 2. Create proper Effect layers
 * 3. Use the patterns shown below to integrate Effect routers
 */

import { Layer } from "effect";
import { publicProcedure } from "../index";
import { effectToPromiseHandler } from "../effects/orpc";

// This is how you would integrate Effect-based endpoints once services are ready:

/**
 * Example of converting an Effect handler to work with existing oRPC infrastructure
 */
export const createEffectBasedTodoRouter = (appLayer: Layer.Layer<unknown>) => {
  // Import the Effect-based handlers
  // import { getAllTodosEffect, createTodoEffect } from "./todo-effect-handlers";

  return {
    // Convert Effect handlers to Promise-based handlers for oRPC compatibility
    getAll: publicProcedure.handler(
      // effectToPromiseHandler(
      //   () => getAllTodosEffect,
      //   appLayer
      // )
      async () => {
        // Placeholder implementation
        return [{ id: 1, text: "Example todo", completed: false }];
      }
    ),

    create: publicProcedure
      .input({ text: "string" } as any) // Simplified for demo
      .handler(
        // effectToPromiseHandler(
        //   ({ input }) => createTodoEffect(input.text),
        //   appLayer
        // )
        async ({ input }) => {
          // Placeholder implementation
          return { id: 2, text: input.text, completed: false };
        }
      ),
  };
};

/**
 * Example of how to integrate Effect routers in the main app router
 */
export const createAppRouterWithEffects = () => {
  // This would be your actual app layer with all services
  // const AppLayer = Layer.mergeAll(
  //   DatabaseServiceLive,
  //   AuthServiceLive,
  //   ConfigServiceLive
  // );

  const AppLayer = Layer.empty; // Placeholder

  return {
    healthCheck: publicProcedure.handler(() => "OK"),
    
    // Original Promise-based router
    todo: {
      getAll: publicProcedure.handler(async () => []),
      // ... other endpoints
    },

    // Effect-based router (converted to Promise for oRPC compatibility)
    todoEffect: createEffectBasedTodoRouter(AppLayer),

    // You could also create hybrid routers that mix Promise and Effect endpoints
    hybrid: {
      // Promise-based endpoint
      simpleEndpoint: publicProcedure.handler(async () => "simple"),
      
      // Effect-based endpoint converted to Promise
      effectEndpoint: publicProcedure.handler(
        // effectToPromiseHandler(
        //   () => someEffectProgram,
        //   AppLayer
        // )
        async () => "effect-based"
      ),
    },
  };
};

/**
 * Type-safe client usage example
 */
export const clientUsageExample = async () => {
  // This is how you would use the Effect-based endpoints from the client:
  
  // const client = createClient<AppRouter>({ baseURL: "http://localhost:3000" });
  
  // // Use Effect-based endpoints (they appear as normal async functions to the client)
  // const todos = await client.todoEffect.getAll();
  // const newTodo = await client.todoEffect.create({ text: "Learn Effect.ts" });
  
  // // Error handling works the same way
  // try {
  //   const todo = await client.todoEffect.getById({ id: 999 });
  // } catch (error) {
  //   // Effect errors are automatically converted to appropriate HTTP errors
  //   console.error("Todo not found:", error);
  // }

  console.log("Effect router demo - see comments for actual usage");
};

/**
 * Migration strategy from Promise to Effect
 */
export const migrationStrategy = {
  /**
   * Step 1: Keep existing Promise-based endpoints
   * Step 2: Add new Effect-based endpoints alongside (e.g., todoEffect)
   * Step 3: Gradually migrate clients to use Effect endpoints
   * Step 4: Remove old Promise endpoints once migration is complete
   */
  
  // Example of gradual migration:
  todoRouterV1: {
    // Old Promise-based endpoints
    getAll: publicProcedure.handler(async () => []),
  },
  
  todoRouterV2: {
    // New Effect-based endpoints (converted to Promise for oRPC)
    getAll: publicProcedure.handler(async () => []),
    // Additional Effect-based features like retry, fallback, etc.
  },
};

/**
 * Benefits of Effect-based endpoints:
 * 
 * 1. **Structured Error Handling**: Proper error types instead of thrown exceptions
 * 2. **Service Composition**: Clean dependency injection with Effect layers
 * 3. **Retry & Recovery**: Built-in retry mechanisms and fallback strategies
 * 4. **Type Safety**: Full TypeScript support with Effect's type system
 * 5. **Testability**: Easy to test with Effect's testing utilities
 * 6. **Observability**: Built-in logging, metrics, and tracing capabilities
 */

export default {
  createEffectBasedTodoRouter,
  createAppRouterWithEffects,
  clientUsageExample,
  migrationStrategy,
};
