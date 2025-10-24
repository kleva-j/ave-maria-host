# Effect.ts Integration Patterns Guide

This guide provides comprehensive documentation for integrating Effect.ts with the Better-T-Stack components, including Hono middleware, oRPC integration, migration strategies, and testing patterns.

## Table of Contents

- [Hono Middleware Integration](#hono-middleware-integration)
- [oRPC Integration Patterns](#orpc-integration-patterns)
- [Migration from Promise-based Code](#migration-from-promise-based-code)
- [Testing Patterns and Utilities](#testing-patterns-and-utilities)
- [Error Handling Integration](#error-handling-integration)
- [Performance Optimization](#performance-optimization)
- [Production Deployment Patterns](#production-deployment-patterns)

## Hono Middleware Integration

### Effect Middleware for Hono

The Effect middleware enables running Effect programs within Hono request handlers with proper error handling and service injection.

#### Basic Effect Middleware

```typescript
import { Effect, Layer, Runtime } from "effect";
import type { MiddlewareHandler } from "hono";
import { AppLayer, type AppServices } from "./layers";

// Create Effect runtime for the application
const AppRuntime = Runtime.make(AppLayer);

// Effect middleware that runs Effect programs in Hono handlers
export const effectMiddleware = <E, A>(
  effect: Effect.Effect<A, E, AppServices>
): MiddlewareHandler => {
  return async (c, next) => {
    try {
      const result = await Runtime.runPromise(AppRuntime)(effect);
      
      // Set result in context for handler to use
      c.set('effectResult', result);
      await next();
    } catch (error) {
      // Handle Effect errors
      if (error instanceof Error && 'cause' in error) {
        const cause = error.cause as any;
        
        if (cause?._tag) {
          // Handle tagged errors
          return handleTaggedError(c, cause);
        }
      }
      
      // Handle unknown errors
      return c.json({ error: "Internal server error" }, 500);
    }
  };
};

// Tagged error handler
const handleTaggedError = (c: any, error: any) => {
  switch (error._tag) {
    case "ValidationError":
      return c.json({
        error: "Validation failed",
        field: error.field,
        message: error.message
      }, 400);
      
    case "NotFoundError":
      return c.json({
        error: `${error.resource} not found`,
        id: error.id
      }, 404);
      
    case "UnauthorizedError":
      return c.json({
        error: "Authentication required",
        action: error.action
      }, 401);
      
    case "ForbiddenError":
      return c.json({
        error: "Access denied",
        resource: error.resource,
        action: error.action
      }, 403);
      
    case "DatabaseError":
      console.error("Database error:", error);
      return c.json({
        error: "Database temporarily unavailable"
      }, 503);
      
    case "NetworkError":
      console.error("Network error:", error);
      return c.json({
        error: "External service unavailable"
      }, 502);
      
    default:
      console.error("Unknown error:", error);
      return c.json({
        error: "Internal server error"
      }, 500);
  }
};
```

#### Advanced Effect Middleware with Context

```typescript
// Enhanced middleware with request context injection
export const effectMiddlewareWithContext = <E, A>(
  effectFactory: (context: RequestContext) => Effect.Effect<A, E, AppServices>
): MiddlewareHandler => {
  return async (c, next) => {
    // Extract request context
    const requestContext: RequestContext = {
      requestId: c.get('requestId') || generateRequestId(),
      userId: c.get('userId'),
      clientIp: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
      method: c.req.method,
      path: c.req.path,
      timestamp: new Date()
    };
    
    try {
      const effect = effectFactory(requestContext);
      const result = await Runtime.runPromise(AppRuntime)(effect);
      
      c.set('effectResult', result);
      await next();
    } catch (error) {
      // Log error with context
      console.error("Effect middleware error:", {
        requestId: requestContext.requestId,
        path: requestContext.path,
        method: requestContext.method,
        error: error
      });
      
      return handleEffectError(c, error, requestContext);
    }
  };
};

interface RequestContext {
  requestId: string;
  userId?: string;
  clientIp: string;
  userAgent: string;
  method: string;
  path: string;
  timestamp: Date;
}
```

#### Usage Examples

```typescript
import { Hono } from "hono";
import { Effect } from "effect";

const app = new Hono();

// Simple Effect endpoint
app.get('/users/:id', 
  effectMiddleware(
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const logger = yield* _(LoggingService);
      
      const userId = c.req.param('id');
      
      yield* _(logger.info("Fetching user", { userId }));
      const user = yield* _(db.queryOne<User>(
        "SELECT * FROM users WHERE id = ?", 
        [userId]
      ));
      
      if (!user) {
        yield* _(Effect.fail(new NotFoundError({
          message: "User not found",
          resource: "User",
          id: userId
        })));
      }
      
      return user;
    })
  ),
  (c) => {
    const user = c.get('effectResult');
    return c.json({ user });
  }
);

// Effect endpoint with context
app.post('/users',
  effectMiddlewareWithContext((context) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const auth = yield* _(AuthService);
      const logger = yield* _(LoggingService);
      
      // Parse request body
      const body = yield* _(parseJSON<CreateUserData>(
        await c.req.text(),
        'requestBody'
      ));
      
      // Validate user data
      const validatedData = yield* _(validateUserData(body));
      
      // Hash password
      const hashedPassword = yield* _(auth.hashPassword(validatedData.password));
      
      // Create user
      const result = yield* _(db.execute(
        "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
        [validatedData.id, validatedData.email, validatedData.name, hashedPassword]
      ));
      
      // Log user creation
      yield* _(logger.info("User created", {
        userId: validatedData.id,
        requestId: context.requestId,
        clientIp: context.clientIp
      }));
      
      return { userId: validatedData.id, created: true };
    })
  ),
  (c) => {
    const result = c.get('effectResult');
    return c.json(result, 201);
  }
);
```

### Authentication Middleware

```typescript
// Effect-based authentication middleware
export const authMiddleware = (): MiddlewareHandler => {
  return effectMiddlewareWithContext((context) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);
      const logger = yield* _(LoggingService);
      
      // Extract token from Authorization header
      const authHeader = c.req.header('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        yield* _(Effect.fail(new UnauthorizedError({
          message: "Authorization header missing or invalid",
          action: "authenticate"
        })));
      }
      
      const token = authHeader.substring(7);
      
      // Validate token
      const payload = yield* _(auth.validateToken(token));
      
      // Log authentication
      yield* _(logger.debug("User authenticated", {
        userId: payload.userId,
        requestId: context.requestId
      }));
      
      // Set user context
      c.set('userId', payload.userId);
      c.set('tokenPayload', payload);
      
      return payload;
    })
  );
};

// Usage with protected routes
app.use('/api/protected/*', authMiddleware());

app.get('/api/protected/profile',
  effectMiddleware(
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const userId = c.get('userId');
      
      const user = yield* _(db.queryOne<User>(
        "SELECT id, email, name, created_at FROM users WHERE id = ?",
        [userId]
      ));
      
      return user;
    })
  ),
  (c) => {
    const user = c.get('effectResult');
    return c.json({ user });
  }
);
```

## oRPC Integration Patterns

### Effect-Compatible oRPC Router

```typescript
import { Effect, Layer } from "effect";
import { createRouter } from "@orpc/server";

// Create Effect-compatible oRPC router
export const createEffectRouter = <TServices>(
  layer: Layer.Layer<TServices>
) => {
  const runtime = Runtime.make(layer);
  
  return {
    // Create procedure that runs Effect programs
    procedure: <TInput, TOutput, TError>(
      effect: (input: TInput) => Effect.Effect<TOutput, TError, TServices>
    ) => ({
      handler: async (input: TInput) => {
        try {
          const result = await Runtime.runPromise(runtime)(effect(input));
          return { success: true, data: result };
        } catch (error) {
          // Convert Effect errors to oRPC errors
          if (error instanceof Error && 'cause' in error) {
            const cause = error.cause as any;
            
            if (cause?._tag) {
              return { success: false, error: mapEffectErrorToORPC(cause) };
            }
          }
          
          return { 
            success: false, 
            error: { code: "INTERNAL_ERROR", message: "Internal server error" }
          };
        }
      }
    }),
    
    // Create authenticated procedure
    authenticatedProcedure: <TInput, TOutput, TError>(
      effect: (input: TInput, userId: string) => Effect.Effect<TOutput, TError, TServices>
    ) => ({
      handler: async (input: TInput, context: { userId?: string }) => {
        if (!context.userId) {
          return {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Authentication required" }
          };
        }
        
        try {
          const result = await Runtime.runPromise(runtime)(
            effect(input, context.userId)
          );
          return { success: true, data: result };
        } catch (error) {
          return handleORPCError(error);
        }
      }
    })
  };
};

// Map Effect errors to oRPC error format
const mapEffectErrorToORPC = (error: any) => {
  switch (error._tag) {
    case "ValidationError":
      return {
        code: "BAD_REQUEST",
        message: error.message,
        field: error.field
      };
      
    case "NotFoundError":
      return {
        code: "NOT_FOUND",
        message: `${error.resource} not found`,
        resourceId: error.id
      };
      
    case "UnauthorizedError":
      return {
        code: "UNAUTHORIZED",
        message: error.message,
        action: error.action
      };
      
    case "ForbiddenError":
      return {
        code: "FORBIDDEN",
        message: error.message,
        resource: error.resource
      };
      
    case "DatabaseError":
      return {
        code: "INTERNAL_ERROR",
        message: "Database error occurred"
      };
      
    case "NetworkError":
      return {
        code: "SERVICE_UNAVAILABLE",
        message: "External service unavailable"
      };
      
    default:
      return {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      };
  }
};
```

### Type-Safe oRPC Procedures

```typescript
// Define input/output schemas
import { z } from "zod";

const CreateUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8)
});

const UserOutput = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date()
});

// Create router with Effect procedures
const effectRouter = createEffectRouter(AppLayer);

export const userRouter = createRouter({
  // Create user procedure
  createUser: effectRouter.procedure<
    z.infer<typeof CreateUserInput>,
    z.infer<typeof UserOutput>,
    ValidationError | DatabaseError
  >(
    (input) => Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const auth = yield* _(AuthService);
      const logger = yield* _(LoggingService);
      
      // Validate input
      const validatedInput = yield* _(validateInput(
        input,
        (data): data is z.infer<typeof CreateUserInput> => 
          CreateUserInput.safeParse(data).success,
        'createUserInput'
      ));
      
      // Check if user exists
      const existingUser = yield* _(db.queryOne<User>(
        "SELECT id FROM users WHERE email = ?",
        [validatedInput.email]
      ));
      
      if (existingUser) {
        yield* _(Effect.fail(new ValidationError({
          message: "Email already exists",
          field: "email",
          value: validatedInput.email
        })));
      }
      
      // Hash password
      const hashedPassword = yield* _(auth.hashPassword(validatedInput.password));
      
      // Create user
      const userId = generateId();
      yield* _(db.execute(
        "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        [userId, validatedInput.email, validatedInput.name, hashedPassword, new Date()]
      ));
      
      // Fetch created user
      const user = yield* _(db.queryOne<User>(
        "SELECT id, email, name, created_at FROM users WHERE id = ?",
        [userId]
      ));
      
      // Log user creation
      yield* _(logger.info("User created via oRPC", {
        userId,
        email: validatedInput.email
      }));
      
      return user!;
    })
  ),
  
  // Get user procedure (authenticated)
  getUser: effectRouter.authenticatedProcedure<
    { userId: string },
    z.infer<typeof UserOutput>,
    NotFoundError | DatabaseError
  >(
    (input, currentUserId) => Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const logger = yield* _(LoggingService);
      
      // Check if user can access this profile
      if (input.userId !== currentUserId) {
        yield* _(Effect.fail(new ForbiddenError({
          message: "Cannot access other user's profile",
          resource: "User",
          action: "read"
        })));
      }
      
      // Fetch user
      const user = yield* _(db.queryOne<User>(
        "SELECT id, email, name, created_at FROM users WHERE id = ?",
        [input.userId]
      ));
      
      if (!user) {
        yield* _(Effect.fail(new NotFoundError({
          message: "User not found",
          resource: "User",
          id: input.userId
        })));
      }
      
      yield* _(logger.debug("User profile accessed", {
        userId: input.userId,
        accessedBy: currentUserId
      }));
      
      return user;
    })
  ),
  
  // List users procedure with pagination
  listUsers: effectRouter.procedure<
    { page?: number; limit?: number },
    { users: z.infer<typeof UserOutput>[]; total: number; page: number },
    DatabaseError
  >(
    (input) => Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      
      const page = input.page || 1;
      const limit = Math.min(input.limit || 10, 100); // Max 100 per page
      const offset = (page - 1) * limit;
      
      // Get users with pagination
      const users = yield* _(db.query<User>(
        "SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset]
      ));
      
      // Get total count
      const countResult = yield* _(db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM users"
      ));
      
      return {
        users,
        total: countResult?.count || 0,
        page
      };
    })
  )
});
```

### Client-Side oRPC Integration

```typescript
// Client-side usage with Effect error handling
import { createClient } from "@orpc/client";

const client = createClient({
  baseURL: "http://localhost:3000/api",
  // Add authentication headers
  headers: () => ({
    Authorization: `Bearer ${getAuthToken()}`
  })
});

// Effect wrapper for oRPC calls
const fromORPCCall = <T>(
  call: () => Promise<{ success: boolean; data?: T; error?: any }>
): Effect.Effect<T, ApplicationError> => {
  return Effect.tryPromise({
    try: async () => {
      const result = await call();
      
      if (!result.success) {
        throw new Error(JSON.stringify(result.error));
      }
      
      return result.data!;
    },
    catch: (error) => {
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          return mapORPCErrorToEffect(errorData);
        } catch {
          return new NetworkError({
            message: error.message,
            url: "oRPC call"
          });
        }
      }
      
      return new NetworkError({
        message: "Unknown oRPC error",
        url: "oRPC call",
        cause: error
      });
    }
  });
};

// Map oRPC errors back to Effect errors
const mapORPCErrorToEffect = (error: any): ApplicationError => {
  switch (error.code) {
    case "BAD_REQUEST":
      return new ValidationError({
        message: error.message,
        field: error.field || "unknown",
        value: error.value
      });
      
    case "NOT_FOUND":
      return new NotFoundError({
        message: error.message,
        resource: "Resource",
        id: error.resourceId || "unknown"
      });
      
    case "UNAUTHORIZED":
      return new UnauthorizedError({
        message: error.message,
        action: error.action || "unknown"
      });
      
    case "FORBIDDEN":
      return new ForbiddenError({
        message: error.message,
        resource: error.resource || "Resource",
        action: error.action || "unknown"
      });
      
    default:
      return new NetworkError({
        message: error.message || "Service error",
        url: "oRPC service"
      });
  }
};

// Client service functions
export const UserClientService = {
  createUser: (userData: CreateUserData) =>
    fromORPCCall(() => client.userRouter.createUser(userData)),
    
  getUser: (userId: string) =>
    fromORPCCall(() => client.userRouter.getUser({ userId })),
    
  listUsers: (options: { page?: number; limit?: number } = {}) =>
    fromORPCCall(() => client.userRouter.listUsers(options))
};

// Usage in client application
const fetchUserProfile = (userId: string) => pipe(
  UserClientService.getUser(userId),
  withRetry({ maxRetries: 3 }),
  withFallback(null),
  Effect.tap(user => 
    Effect.sync(() => console.log("User profile loaded:", user))
  )
);
```

## Migration from Promise-based Code

### Step-by-Step Migration Strategy

#### 1. Identify Migration Candidates

```typescript
// Before: Promise-based database operations
class UserRepository {
  async findById(id: string): Promise<User | null> {
    try {
      const result = await db.query("SELECT * FROM users WHERE id = ?", [id]);
      return result[0] || null;
    } catch (error) {
      console.error("Database error:", error);
      throw new Error("Failed to find user");
    }
  }
  
  async create(userData: CreateUserData): Promise<User> {
    try {
      await db.execute(
        "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
        [userData.id, userData.email, userData.name]
      );
      
      const user = await this.findById(userData.id);
      return user!;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error("Email already exists");
      }
      throw new Error("Failed to create user");
    }
  }
}
```

#### 2. Create Effect Wrapper Functions

```typescript
// Migration step 1: Wrap existing functions with Effect
const UserRepositoryEffect = {
  findById: (id: string) => fromPromise(
    () => userRepository.findById(id),
    (error) => new DatabaseError({
      message: error instanceof Error ? error.message : "Database error",
      operation: "findById",
      cause: error
    })
  ),
  
  create: (userData: CreateUserData) => fromPromise(
    () => userRepository.create(userData),
    (error) => {
      if (error instanceof Error && error.message.includes("Email already exists")) {
        return new ValidationError({
          message: "Email already exists",
          field: "email",
          value: userData.email
        });
      }
      
      return new DatabaseError({
        message: error instanceof Error ? error.message : "Database error",
        operation: "create",
        cause: error
      });
    }
  )
};
```

#### 3. Gradual Service Migration

```typescript
// Migration step 2: Create Effect-native implementations
const UserService = {
  // Migrated to pure Effect
  findById: (id: string) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const logger = yield* _(LoggingService);
      
      yield* _(logger.debug("Finding user by ID", { userId: id }));
      
      const user = yield* _(db.queryOne<User>(
        "SELECT * FROM users WHERE id = ?",
        [id]
      ));
      
      if (user) {
        yield* _(logger.debug("User found", { userId: id }));
      } else {
        yield* _(logger.debug("User not found", { userId: id }));
      }
      
      return user;
    }),
  
  // Still using wrapper during migration
  create: UserRepositoryEffect.create,
  
  // Hybrid approach: Effect with Promise fallback
  findByEmail: (email: string) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      
      // Try Effect-based query first
      const user = yield* _(db.queryOne<User>(
        "SELECT * FROM users WHERE email = ?",
        [email]
      ).pipe(
        Effect.catchAll(() => 
          // Fallback to Promise-based method
          fromPromise(() => userRepository.findByEmail(email))
        )
      ));
      
      return user;
    })
};
```

#### 4. Complete Migration Examples

```typescript
// Before: Promise-based service
class OrderService {
  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Create order
      const orderId = generateId();
      await connection.execute(
        "INSERT INTO orders (id, user_id, status, created_at) VALUES (?, ?, ?, ?)",
        [orderId, userId, "pending", new Date()]
      );
      
      // Add order items
      for (const item of items) {
        await connection.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, item.productId, item.quantity, item.price]
        );
        
        // Update inventory
        await connection.execute(
          "UPDATE products SET inventory = inventory - ? WHERE id = ?",
          [item.quantity, item.productId]
        );
      }
      
      await connection.commit();
      
      // Fetch complete order
      const order = await this.findById(orderId);
      return order!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

// After: Effect-based service
const OrderServiceEffect = {
  createOrder: (userId: string, items: OrderItem[]) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const logger = yield* _(LoggingService);
      
      yield* _(logger.info("Creating order", { userId, itemCount: items.length }));
      
      const result = yield* _(db.transaction(
        Effect.gen(function* (_) {
          // Create order
          const orderId = generateId();
          yield* _(db.execute(
            "INSERT INTO orders (id, user_id, status, created_at) VALUES (?, ?, ?, ?)",
            [orderId, userId, "pending", new Date()]
          ));
          
          // Add order items and update inventory
          for (const item of items) {
            yield* _(db.execute(
              "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
              [orderId, item.productId, item.quantity, item.price]
            ));
            
            const updateResult = yield* _(db.execute(
              "UPDATE products SET inventory = inventory - ? WHERE id = ? AND inventory >= ?",
              [item.quantity, item.productId, item.quantity]
            ));
            
            if (updateResult.affectedRows === 0) {
              yield* _(Effect.fail(new BusinessLogicError({
                message: "Insufficient inventory",
                code: "INSUFFICIENT_INVENTORY",
                context: { productId: item.productId, requested: item.quantity }
              })));
            }
          }
          
          return orderId;
        })
      ));
      
      // Fetch complete order
      const order = yield* _(findOrderById(result));
      
      yield* _(logger.info("Order created successfully", { 
        orderId: result, 
        userId 
      }));
      
      return order;
    })
};
```

### Migration Utilities

```typescript
// Utility to gradually migrate Promise-based APIs
export const createMigrationWrapper = <TArgs extends any[], TReturn>(
  promiseImpl: (...args: TArgs) => Promise<TReturn>,
  effectImpl?: (...args: TArgs) => Effect.Effect<TReturn, ApplicationError>,
  useEffect = false
) => {
  return (...args: TArgs): Effect.Effect<TReturn, ApplicationError> => {
    if (useEffect && effectImpl) {
      return effectImpl(...args);
    }
    
    return fromPromise(
      () => promiseImpl(...args),
      (error) => new NetworkError({
        message: error instanceof Error ? error.message : "Migration wrapper error",
        url: "migration-wrapper",
        cause: error
      })
    );
  };
};

// Feature flag for gradual migration
const useEffectImplementation = (feature: string): boolean => {
  const flags = process.env.EFFECT_FEATURES?.split(',') || [];
  return flags.includes(feature) || flags.includes('all');
};

// Example usage
const UserServiceMigrated = {
  findById: createMigrationWrapper(
    // Promise implementation
    (id: string) => userRepository.findById(id),
    // Effect implementation
    (id: string) => Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      return yield* _(db.queryOne<User>("SELECT * FROM users WHERE id = ?", [id]));
    }),
    // Use Effect if feature flag is enabled
    useEffectImplementation('user-service')
  )
};
```

## Testing Patterns and Utilities

### Effect Testing Framework

```typescript
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Test runtime with mock services
const TestRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    MockDatabaseLayer,
    MockAuthLayer,
    MockLoggingLayer,
    MockConfigLayer
  )
);

// Test utilities
export const runTest = <A, E>(
  effect: Effect.Effect<A, E, AppServices>
): Promise<A> => TestRuntime.runPromise(effect);

export const runTestEither = <A, E>(
  effect: Effect.Effect<A, E, AppServices>
): Promise<Either<E, A>> => TestRuntime.runPromise(Effect.either(effect));

// Mock service implementations
const MockDatabaseLayer = Layer.succeed(DatabaseService, {
  query: <T>(sql: string, params?: unknown[]) => {
    // Mock implementation based on SQL
    if (sql.includes("SELECT * FROM users WHERE id = ?")) {
      const userId = params?.[0] as string;
      if (userId === "existing-user") {
        return Effect.succeed([{ 
          id: userId, 
          email: "test@example.com", 
          name: "Test User" 
        }] as T[]);
      }
      return Effect.succeed([] as T[]);
    }
    
    return Effect.succeed([] as T[]);
  },
  
  queryOne: <T>(sql: string, params?: unknown[]) => {
    if (sql.includes("SELECT * FROM users WHERE id = ?")) {
      const userId = params?.[0] as string;
      if (userId === "existing-user") {
        return Effect.succeed({ 
          id: userId, 
          email: "test@example.com", 
          name: "Test User" 
        } as T);
      }
    }
    return Effect.succeed(null);
  },
  
  execute: (sql: string, params?: unknown[]) => {
    if (sql.includes("INSERT INTO users")) {
      return Effect.succeed({ affectedRows: 1 });
    }
    if (sql.includes("UPDATE users")) {
      return Effect.succeed({ affectedRows: 1 });
    }
    return Effect.succeed({ affectedRows: 0 });
  },
  
  transaction: <T, E>(operation: Effect.Effect<T, E, DatabaseService>) => operation,
  
  withConnection: <T, E>(operation: (connection: any) => Effect.Effect<T, E>) =>
    operation({}),
    
  healthCheck: () => Effect.succeed({ status: "healthy" as const })
});

const MockAuthLayer = Layer.succeed(AuthService, {
  validateToken: (token: string) => {
    if (token === "valid-token") {
      return Effect.succeed({ userId: "test-user", exp: Date.now() + 3600000 });
    }
    return Effect.fail(new AuthError({
      message: "Invalid token",
      type: "InvalidToken"
    }));
  },
  
  generateToken: (payload: any) => Effect.succeed("mock-token"),
  
  refreshToken: (refreshToken: string) => Effect.succeed({
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token"
  }),
  
  createSession: (userId: string) => Effect.succeed({
    id: "mock-session",
    userId,
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresAt: new Date(Date.now() + 3600000)
  }),
  
  getSession: (sessionId: string) => Effect.succeed(null),
  revokeSession: (sessionId: string) => Effect.succeed(undefined),
  revokeAllSessions: (userId: string) => Effect.succeed({ revokedCount: 0 }),
  
  authenticateUser: (credentials: any) => {
    if (credentials.email === "test@example.com" && credentials.password === "password") {
      return Effect.succeed({
        userId: "test-user",
        user: { id: "test-user", email: credentials.email, name: "Test User" }
      });
    }
    return Effect.fail(new AuthError({
      message: "Invalid credentials",
      type: "InvalidCredentials"
    }));
  },
  
  validatePassword: (password: string, hash: string) => Effect.succeed(true),
  hashPassword: (password: string) => Effect.succeed("hashed-password")
});
```

### Test Examples

```typescript
describe("UserService", () => {
  describe("findById", () => {
    it("should return user when found", async () => {
      const result = await runTest(
        UserService.findById("existing-user")
      );
      
      expect(result).toEqual({
        id: "existing-user",
        email: "test@example.com",
        name: "Test User"
      });
    });
    
    it("should return null when user not found", async () => {
      const result = await runTest(
        UserService.findById("non-existent-user")
      );
      
      expect(result).toBeNull();
    });
  });
  
  describe("createUser", () => {
    it("should create user successfully", async () => {
      const userData = {
        id: "new-user",
        email: "new@example.com",
        name: "New User",
        password: "password123"
      };
      
      const result = await runTest(
        UserService.createUser(userData)
      );
      
      expect(result.userId).toBe("new-user");
      expect(result.created).toBe(true);
    });
    
    it("should handle validation errors", async () => {
      const userData = {
        id: "new-user",
        email: "invalid-email",
        name: "New User",
        password: "password123"
      };
      
      const result = await runTestEither(
        UserService.createUser(userData)
      );
      
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("ValidationError");
      }
    });
  });
});

// Integration tests with real services
describe("UserService Integration", () => {
  let testDb: TestDatabase;
  
  beforeEach(async () => {
    testDb = await createTestDatabase();
  });
  
  afterEach(async () => {
    await testDb.cleanup();
  });
  
  it("should create and retrieve user", async () => {
    const realRuntime = ManagedRuntime.make(
      Layer.mergeAll(
        createDatabaseLayer(testDb.connectionString),
        MockAuthLayer,
        MockLoggingLayer,
        MockConfigLayer
      )
    );
    
    const userData = {
      id: "integration-user",
      email: "integration@example.com",
      name: "Integration User",
      password: "password123"
    };
    
    // Create user
    const createResult = await realRuntime.runPromise(
      UserService.createUser(userData)
    );
    
    expect(createResult.userId).toBe("integration-user");
    
    // Retrieve user
    const user = await realRuntime.runPromise(
      UserService.findById("integration-user")
    );
    
    expect(user).toEqual({
      id: "integration-user",
      email: "integration@example.com",
      name: "Integration User",
      createdAt: expect.any(Date)
    });
  });
});
```

### Property-Based Testing

```typescript
import { fc } from "fast-check";

// Property-based tests for Effect programs
describe("UserService Properties", () => {
  it("should always return the same user for the same ID", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          const result1 = await runTest(UserService.findById(userId));
          const result2 = await runTest(UserService.findById(userId));
          
          expect(result1).toEqual(result2);
        }
      )
    );
  });
  
  it("should validate email format consistently", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 8 }),
        async (email, name, password) => {
          const userData = { id: generateId(), email, name, password };
          
          const result = await runTestEither(
            UserService.createUser(userData)
          );
          
          // Valid email should not fail with ValidationError on email field
          if (result._tag === "Left" && result.left._tag === "ValidationError") {
            expect(result.left.field).not.toBe("email");
          }
        }
      )
    );
  });
});
```

### Performance Testing

```typescript
// Performance testing utilities
const measureEffectPerformance = async <A, E>(
  effect: Effect.Effect<A, E, AppServices>,
  iterations = 100
): Promise<{ averageMs: number; minMs: number; maxMs: number }> => {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await runTest(effect);
    const end = performance.now();
    times.push(end - start);
  }
  
  return {
    averageMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times)
  };
};

describe("Performance Tests", () => {
  it("should find user within acceptable time", async () => {
    const performance = await measureEffectPerformance(
      UserService.findById("existing-user"),
      50
    );
    
    expect(performance.averageMs).toBeLessThan(10);
    expect(performance.maxMs).toBeLessThan(50);
  });
});
```

This comprehensive integration patterns guide provides the foundation for successfully integrating Effect.ts with all components of the Better-T-Stack application, ensuring type safety, error handling, and maintainability throughout the migration process.
