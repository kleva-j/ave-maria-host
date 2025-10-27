/**
 * @fileoverview Effect.ts oRPC Usage Examples
 *
 * This module provides practical examples of how to use oRPC endpoints, including
 * current Promise-based endpoints and future Effect-based endpoints.
 *
 * ## Current State:
 * - ✅ Promise-based endpoints are fully functional (e.g., `client.todo.*`)
 * - ⚠️  Effect-based endpoints are implemented but not yet enabled in the router
 * - ⚠️  `client.todoEffect.*` and `client.authEffect.*` are not available yet
 *
 * ## Examples Included:
 * - **`currentTodoExamples`**: Working examples using existing Promise-based endpoints
 * - **`futureEffectTodoExamples`**: How Effect-based todo endpoints will work (Future)
 * - **`futureEffectAuthExamples`**: How Effect-based auth endpoints will work (Future)
 * - **`advancedExamples`**: Advanced patterns for Effect-based workflows (Future)
 *
 * ## Enabling Effect Endpoints:
 * To make the "Future" examples work:
 * 1. Implement `DatabaseService` in `packages/db/src/effects/database.ts`
 * 2. Implement `AuthService` in `packages/auth/src/effects/auth.ts`  
 * 3. Create proper `AppLayer` with service implementations
 * 4. Uncomment Effect router imports in `packages/api/src/routers/index.ts`
 * 5. Update the `AppRouter` type to include `todoEffect` and `authEffect`
 *
 * ## Usage:
 * ```typescript
 * import { currentTodoExamples } from "@host/api/examples/effect-usage";
 * 
 * // Use current working examples
 * await currentTodoExamples.basicOperations(client);
 * 
 * // Future examples (when Effect routers are enabled)
 * // await futureEffectTodoExamples.basicOperations(client as EffectRouterClient);
 * ```
 */

import type { AppRouterClient } from "../routers";

// Types for future Effect-based router client (when Effect routers are enabled)
interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Session {
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}

interface UserSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

type EffectRouterClient = AppRouterClient & {
  todoEffect: {
    getAll: () => Promise<Array<{ id: number; text: string; completed: boolean; createdAt: Date }>>;
    create: (input: { text: string }) => Promise<{ id: number; text: string; completed: boolean; createdAt: Date }>;
    toggle: (input: { id: number; completed: boolean }) => Promise<{ id: number; text: string; completed: boolean; updatedAt: Date }>;
    getStats: () => Promise<{ total: number; completed: number; pending: number }>;
    bulkToggle: (input: { ids: number[]; completed: boolean }) => Promise<{ updated: number; failed: number }>;
    getById: (input: { id: number }) => Promise<{ id: number; text: string; completed: boolean; createdAt: Date }>;
  };
  authEffect: {
    login: (input: { email: string; password: string }) => Promise<{ user: User; session: Session }>;
    register: (input: { email: string; password: string; name: string }) => Promise<{ user: User; session: Session }>;
    validateToken: (input: { token: string }) => Promise<{ valid: boolean; user: User }>;
    refreshToken: (input: { refreshToken: string }) => Promise<{ session: Session }>;
    getProfile: (input: { token: string }) => Promise<User>;
    updateProfile: (input: { token: string; name?: string; email?: string }) => Promise<User>;
    logout: (input: { token: string }) => Promise<{ success: boolean; message: string }>;
    getSessions: (input: { token: string }) => Promise<{ sessions: UserSession[] }>;
    revokeSession: (input: { token: string; sessionId: string }) => Promise<{ success: boolean; message: string }>;
  };
};

/**
 * Current working examples using the existing Promise-based endpoints
 */
export const currentTodoExamples = {
  /**
   * Basic CRUD operations using current Promise-based endpoints
   */
  async basicOperations(client: AppRouterClient) {
    try {
      // Get all todos using current endpoint
      const todos = await client.todo.getAll();
      console.log("All todos:", todos);

      // Create a new todo
      const newTodo = await client.todo.create({
        text: "Learn Effect.ts with oRPC"
      });
      console.log("Created todo:", newTodo);

      // Update todo status (assuming newTodo has an id property)
      if ('id' in newTodo && typeof newTodo.id === 'number') {
        const updatedTodo = await client.todo.toggle({
          id: newTodo.id,
          completed: true
        });
        console.log("Updated todo:", updatedTodo);
      }

    } catch (error) {
      console.error("Todo operation failed:", error);
      
      // Handle specific error types
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'NOT_FOUND':
            console.log("Todo not found - it may have been deleted");
            break;
          case 'BAD_REQUEST':
            console.log("Invalid input provided");
            break;
          case 'INTERNAL_SERVER_ERROR':
            console.log("Server error - please try again later");
            break;
          default:
            console.log("Unknown error occurred");
        }
      }
    }
  },

  /**
   * Error handling examples using current endpoints
   */
  async errorHandlingExamples(client: AppRouterClient) {
    try {
      // This will fail with validation error
      await client.todo.create({ text: "" });
    } catch (error) {
      console.log("Validation error caught:", error);
    }

    try {
      // This will fail with validation error
      await client.todo.toggle({ id: -1, completed: true });
    } catch (error) {
      console.log("Invalid ID error caught:", error);
    }
  }
};

/**
 * Future Effect-based todo examples (available when Effect routers are enabled)
 */
export const futureEffectTodoExamples = {
  /**
   * Basic CRUD operations using Effect endpoints (Future)
   */
  async basicOperations(client: EffectRouterClient) {
    try {
      // Get all todos using Effect endpoint
      const todos = await client.todoEffect.getAll();
      console.log("All todos:", todos);

      // Create a new todo
      const newTodo = await client.todoEffect.create({
        text: "Learn Effect.ts with oRPC"
      });
      console.log("Created todo:", newTodo);

      // Update todo status
      const updatedTodo = await client.todoEffect.toggle({
        id: newTodo.id,
        completed: true
      });
      console.log("Updated todo:", updatedTodo);

      // Get todo statistics
      const stats = await client.todoEffect.getStats();
      console.log("Todo statistics:", stats);

      // Bulk operations
      const bulkResult = await client.todoEffect.bulkToggle({
        ids: [1, 2, 3],
        completed: false
      });
      console.log("Bulk update result:", bulkResult);

    } catch (error) {
      console.error("Todo operation failed:", error);
      
      // Handle specific error types
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'NOT_FOUND':
            console.log("Todo not found - it may have been deleted");
            break;
          case 'BAD_REQUEST':
            console.log("Invalid input provided");
            break;
          case 'INTERNAL_SERVER_ERROR':
            console.log("Server error - please try again later");
            break;
          default:
            console.log("Unknown error occurred");
        }
      }
    }
  },

  /**
   * Error handling examples using Effect endpoints (Future)
   */
  async errorHandlingExamples(client: EffectRouterClient) {
    try {
      // This will fail with validation error
      await client.todoEffect.create({ text: "" });
    } catch (error) {
      console.log("Validation error caught:", error);
    }

    try {
      // This will fail with not found error
      await client.todoEffect.getById({ id: 99999 });
    } catch (error) {
      console.log("Not found error caught:", error);
    }

    try {
      // This will fail with validation error
      await client.todoEffect.toggle({ id: -1, completed: true });
    } catch (error) {
      console.log("Invalid ID error caught:", error);
    }
  },

  /**
   * Comparison between Promise-based and Effect-based endpoints (Future)
   */
  async migrationComparison(client: EffectRouterClient) {
    // Original Promise-based endpoint
    const promiseTodos = await client.todo.getAll();
    console.log("Promise-based todos:", promiseTodos);

    // New Effect-based endpoint (same functionality, better error handling)
    const effectTodos = await client.todoEffect.getAll();
    console.log("Effect-based todos:", effectTodos);

    // The results should be the same, but Effect version provides:
    // - Better error types and handling
    // - Service composition capabilities
    // - Retry and recovery mechanisms
    // - Type-safe dependency injection
  }
};

/**
 * Future Effect-based authentication examples (available when Effect routers are enabled)
 */
export const futureEffectAuthExamples = {
  /**
   * Complete authentication flow using Effect endpoints (Future)
   */
  async authenticationFlow(client: EffectRouterClient) {
    try {
      // Register a new user
      const registerResult = await client.authEffect.register({
        email: "user@example.com",
        password: "securepassword123",
        name: "John Doe"
      });
      console.log("Registration successful:", registerResult);

      const { session } = registerResult;

      // Validate the token
      const validation = await client.authEffect.validateToken({
        token: session.token
      });
      console.log("Token validation:", validation);

      // Get user profile
      const profile = await client.authEffect.getProfile({
        token: session.token
      });
      console.log("User profile:", profile);

      // Update profile
      const updatedProfile = await client.authEffect.updateProfile({
        token: session.token,
        name: "John Smith"
      });
      console.log("Updated profile:", updatedProfile);

      // Get user sessions
      const sessions = await client.authEffect.getSessions({
        token: session.token
      });
      console.log("User sessions:", sessions);

      // Refresh token (if refreshToken is available)
      if (session.refreshToken) {
        const refreshResult = await client.authEffect.refreshToken({
          refreshToken: session.refreshToken
        });
        console.log("Token refreshed:", refreshResult);
      }

      // Logout
      const logoutResult = await client.authEffect.logout({
        token: session.token
      });
      console.log("Logout result:", logoutResult);

    } catch (error) {
      console.error("Authentication flow failed:", error);
      
      // Handle authentication-specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'UNAUTHORIZED':
            console.log("Authentication required - please log in");
            break;
          case 'FORBIDDEN':
            console.log("Access denied - insufficient permissions");
            break;
          case 'BAD_REQUEST':
            console.log("Invalid input - please check your data");
            break;
          default:
            console.log("Authentication error:", error);
        }
      }
    }
  },

  /**
   * Login flow with error handling (Future)
   */
  async loginFlow(client: EffectRouterClient) {
    try {
      const loginResult = await client.authEffect.login({
        email: "user@example.com",
        password: "securepassword123"
      });
      
      console.log("Login successful:", loginResult);
      return loginResult.session.token;
      
    } catch (error) {
      console.error("Login failed:", error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'UNAUTHORIZED') {
          console.log("Invalid credentials - please check email and password");
        }
      }
      
      throw error;
    }
  },

  /**
   * Session management examples (Future)
   */
  async sessionManagement(client: EffectRouterClient, token: string) {
    try {
      // Get all user sessions
      const sessions = await client.authEffect.getSessions({ token });
      console.log("Active sessions:", sessions);

      // Revoke a specific session (if there are multiple)
      if (sessions.sessions.length > 1) {
        const sessionToRevoke = sessions.sessions[1];
        if (sessionToRevoke) {
          await client.authEffect.revokeSession({
            token,
            sessionId: sessionToRevoke.id
          });
          console.log("Session revoked successfully");
        }
      }

    } catch (error) {
      console.error("Session management failed:", error);
    }
  }
};

/**
 * Advanced usage patterns and best practices (Future)
 */
export const advancedExamples = {
  /**
   * Combining multiple Effect endpoints in a workflow (Future)
   */
  async workflowExample(client: EffectRouterClient) {
    try {
      // Step 1: Authenticate user
      const loginResult = await client.authEffect.login({
        email: "user@example.com",
        password: "securepassword123"
      });

      const token = loginResult.session.token;

      // Step 2: Get user profile
      const profile = await client.authEffect.getProfile({ token });
      console.log(`Welcome back, ${profile.name}!`);

      // Step 3: Get user's todos
      const todos = await client.todoEffect.getAll();
      console.log(`You have ${todos.length} todos`);

      // Step 4: Create a personalized todo
      const personalTodo = await client.todoEffect.create({
        text: `Welcome back, ${profile.name}! Complete your tasks.`
      });

      // Step 5: Get updated statistics
      const stats = await client.todoEffect.getStats();
      console.log("Updated statistics:", stats);

      return {
        user: profile,
        todos: todos.length,
        stats,
        welcomeTodo: personalTodo
      };

    } catch (error) {
      console.error("Workflow failed:", error);
      throw error;
    }
  },

  /**
   * Error recovery and retry patterns (Future)
   */
  async errorRecoveryExample(client: EffectRouterClient): Promise<Array<{ id: number; text: string; completed: boolean; createdAt: Date }>> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const todos = await client.todoEffect.getAll();
        console.log("Successfully retrieved todos:", todos.length);
        return todos;

      } catch (error) {
        attempt++;
        console.log(`Attempt ${attempt} failed:`, error);

        if (attempt >= maxRetries) {
          console.error("Max retries reached, giving up");
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = 2 ** attempt * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached due to the throw above, but TypeScript needs it
    throw new Error("Unexpected end of retry loop");
  },

  /**
   * Batch operations with error handling (Future)
   */
  async batchOperationsExample(client: EffectRouterClient) {
    const todoTexts = [
      "Learn Effect.ts",
      "Implement oRPC integration",
      "Write comprehensive tests",
      "Deploy to production"
    ];

    const results = [];
    const errors = [];

    // Create todos one by one with individual error handling
    for (const text of todoTexts) {
      try {
        const todo = await client.todoEffect.create({ text });
        results.push(todo);
        console.log(`Created todo: ${text}`);
      } catch (error) {
        errors.push({ text, error });
        console.error(`Failed to create todo "${text}":`, error);
      }
    }

    console.log(`Batch operation completed: ${results.length} successful, ${errors.length} failed`);
    
    return { results, errors };
  }
};

/**
 * Type-safe client configuration examples
 */
export const clientConfigExamples = {
  /**
   * Example of creating a typed client with proper error handling
   */
  createTypedClient() {
    // This would be the actual client creation in a real application
    // const client = createClient<AppRouter>({
    //   baseURL: "http://localhost:3000",
    //   headers: {
    //     "Content-Type": "application/json"
    //   }
    // });

    // return client;
    console.log("Client configuration example");
  },

  /**
   * Example of client middleware for authentication
   */
  withAuthMiddleware(token: string) {
    // Example of how to add authentication to all requests
    // const authenticatedClient = client.use((req) => {
    //   req.headers.Authorization = `Bearer ${token}`;
    //   return req;
    // });

    // return authenticatedClient;
    console.log("Auth middleware example with token:", token);
  }
};

/**
 * Testing examples for Effect-based endpoints
 */
export const testingExamples = {
  /**
   * Example unit test for Effect endpoint
   */
  async testTodoCreation() {
    // This would be a real test in a testing framework
    // const mockClient = createMockClient<AppRouter>();
    
    // mockClient.todoEffect.create.mockResolvedValue({
    //   id: 1,
    //   text: "Test todo",
    //   completed: false,
    //   createdAt: new Date()
    // });

    // const result = await mockClient.todoEffect.create({ text: "Test todo" });
    // expect(result.text).toBe("Test todo");
    // expect(result.completed).toBe(false);

    console.log("Unit test example for todo creation");
  },

  /**
   * Example integration test
   */
  async testAuthenticationFlow() {
    // This would be a real integration test
    // const testClient = createTestClient();
    
    // const registerResult = await testClient.authEffect.register({
    //   email: "test@example.com",
    //   password: "testpassword123",
    //   name: "Test User"
    // });

    // expect(registerResult.user.email).toBe("test@example.com");
    // expect(registerResult.session.token).toBeDefined();

    console.log("Integration test example for authentication");
  }
};
