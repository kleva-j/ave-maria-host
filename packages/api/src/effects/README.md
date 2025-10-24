# Effect.ts Integration Documentation

This directory contains comprehensive documentation for the Effect.ts integration in the Better-T-Stack project. Effect.ts provides functional programming patterns, robust error handling, dependency injection, and type-safe async operations.

## Documentation Overview

### 📚 Core Documentation

- **[UTILITIES.md](./UTILITIES.md)** - Complete API reference for all utility functions, helpers, and types
- **[ERROR_REFERENCE.md](./ERROR_REFERENCE.md)** - Comprehensive guide to error types, hierarchy, and handling patterns
- **[SERVICES.md](./SERVICES.md)** - Service interfaces, dependency injection, and layer composition
- **[INTEGRATION_PATTERNS.md](./INTEGRATION_PATTERNS.md)** - Hono middleware, oRPC integration, and migration guides
- **[BEST_PRACTICES.md](./BEST_PRACTICES.md)** - Performance optimization, debugging, and production deployment

### 🚀 Quick Start

```typescript
import { Effect, pipe, withRetry, withFallback, fromPromise } from "@host/api/effects";

// Convert Promise to Effect with retry and fallback
const fetchUser = (id: string) => pipe(
  fromPromise(() => fetch(`/api/users/${id}`).then(r => r.json())),
  withRetry({ maxRetries: 3 }),
  withFallback({ id, name: "Unknown User" })
);

// Use services with dependency injection
const createUser = (userData: CreateUserData) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    const auth = yield* _(AuthService);
    const logger = yield* _(LoggingService);
    
    // Hash password
    const hashedPassword = yield* _(auth.hashPassword(userData.password));
    
    // Create user in database
    const result = yield* _(db.execute(
      "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
      [userData.id, userData.email, userData.name, hashedPassword]
    ));
    
    // Log success
    yield* _(logger.info("User created", { userId: userData.id }));
    
    return { userId: userData.id, created: true };
  });
```

## Key Features

### 🛡️ Structured Error Handling
- Tagged errors with detailed context
- Type-safe error propagation
- Comprehensive error recovery patterns
- Automatic error logging and monitoring

### 🔄 Retry and Recovery
- Exponential backoff retry logic
- Circuit breaker patterns
- Fallback strategies
- Timeout handling

### 🏗️ Service Architecture
- Dependency injection with Effect Context
- Layer-based service composition
- Resource management and cleanup
- Mock services for testing

### 🔌 Framework Integration
- Hono middleware for Effect programs
- oRPC type-safe API integration
- Promise-to-Effect migration utilities
- Testing framework integration

### ⚡ Performance Optimization
- Concurrent execution patterns
- Connection pooling
- Caching and memoization
- Resource lifecycle management

## Architecture Overview

```
Effect.ts Integration
├── Core Types & Configuration (core.ts)
├── Error Hierarchy (errors.ts)
├── Utility Functions (utils.ts)
├── Recovery Patterns (recovery.ts)
└── Service Interfaces
    ├── DatabaseService
    ├── AuthService
    ├── LoggingService
    └── ConfigService
```

## Getting Started

### 1. Installation
Effect.ts is already installed and configured in the project. Import from the effects module:

```typescript
import { Effect, DatabaseService, AuthService } from "@host/api/effects";
```

### 2. Basic Usage
Start with simple Effect programs and gradually adopt more advanced patterns:

```typescript
// Simple Effect program
const getUser = (id: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    const user = yield* _(db.queryOne<User>("SELECT * FROM users WHERE id = ?", [id]));
    
    if (!user) {
      yield* _(Effect.fail(new NotFoundError({
        message: "User not found",
        resource: "User",
        id
      })));
    }
    
    return user;
  });
```

### 3. Error Handling
Use typed errors for robust error handling:

```typescript
const handleUserOperation = (userId: string) => pipe(
  getUser(userId),
  Effect.catchTag("NotFoundError", () => 
    Effect.succeed({ error: "User not found" })
  ),
  Effect.catchTag("DatabaseError", (error) => {
    console.error("Database error:", error);
    return Effect.succeed({ error: "Service unavailable" });
  })
);
```

### 4. Service Integration
Use services through dependency injection:

```typescript
const userService = {
  authenticate: (credentials: LoginCredentials) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);
      const logger = yield* _(LoggingService);
      
      const result = yield* _(auth.authenticateUser(credentials));
      yield* _(logger.info("User authenticated", { userId: result.userId }));
      
      return result;
    })
};
```

## Migration Strategy

### From Promise-based Code
Use the migration utilities to gradually adopt Effect.ts:

```typescript
// Before: Promise-based
const fetchUserData = async (id: string) => {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error;
  }
};

// After: Effect-based
const fetchUserData = (id: string) => pipe(
  fromPromise(() => fetch(`/api/users/${id}`).then(r => r.json())),
  withRetry({ maxRetries: 3 }),
  Effect.tapError((error) => 
    Effect.sync(() => console.error("Failed to fetch user:", error))
  )
);
```

## Testing

Use the provided test utilities for Effect programs:

```typescript
import { runTest, TestRuntime } from "@host/api/effects/testing";

describe("UserService", () => {
  it("should create user successfully", async () => {
    const result = await runTest(
      userService.createUser({
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
        password: "password123"
      })
    );
    
    expect(result.userId).toBe("test-user");
  });
});
```

## Production Considerations

### Environment Configuration
Configure services for production environments:

```typescript
const ProductionLayer = Layer.mergeAll(
  DatabaseLive.pipe(Layer.provide(ProductionConfigLayer)),
  AuthLive.pipe(Layer.provide(ProductionConfigLayer)),
  LoggingLive.pipe(Layer.provide(ProductionConfigLayer))
);
```

### Monitoring and Health Checks
Implement comprehensive health monitoring:

```typescript
const healthCheck = () =>
  Effect.gen(function* (_) {
    const [dbHealth, authHealth] = yield* _(Effect.all([
      DatabaseService.pipe(Effect.flatMap(db => db.healthCheck())),
      AuthService.pipe(Effect.flatMap(auth => auth.healthCheck()))
    ]));
    
    return {
      status: dbHealth.status === "healthy" && authHealth.status === "healthy" 
        ? "healthy" 
        : "unhealthy",
      services: { database: dbHealth, auth: authHealth }
    };
  });
```

## Next Steps

1. **Read the Documentation**: Start with [UTILITIES.md](./UTILITIES.md) for the API reference
2. **Understand Errors**: Review [ERROR_REFERENCE.md](./ERROR_REFERENCE.md) for error handling patterns
3. **Learn Services**: Study [SERVICES.md](./SERVICES.md) for dependency injection patterns
4. **Integration**: Follow [INTEGRATION_PATTERNS.md](./INTEGRATION_PATTERNS.md) for framework integration
5. **Best Practices**: Apply [BEST_PRACTICES.md](./BEST_PRACTICES.md) for production-ready code

## Support and Resources

- **Effect.ts Official Documentation**: https://effect.website/
- **Better-T-Stack Documentation**: See project README
- **Internal Examples**: Check the `examples.ts` file for usage patterns

---

This Effect.ts integration provides a solid foundation for building robust, type-safe, and maintainable applications in the Better-T-Stack ecosystem.
