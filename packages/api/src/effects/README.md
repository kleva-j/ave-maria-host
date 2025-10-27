# Effect.ts oRPC Integration

This directory contains a comprehensive Effect.ts integration for oRPC that enables type-safe, composable API endpoints with structured error handling and service injection.

## 🚀 Quick Start

### 1. Basic Effect Procedure

```typescript
import { effectProcedure } from "@host/api/effects";
import { z } from "zod";

// Create an Effect-based endpoint
const getUserProcedure = effectProcedure()
  .input(z.object({ id: z.string() }))
  .handler(({ input }) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const users = yield* _(
        db.query("SELECT * FROM users WHERE id = $1", [input.id])
      );

      if (users.length === 0) {
        yield* _(
          Effect.fail(
            new NotFoundError({
              message: "User not found",
              resource: "User",
              id: input.id,
            })
          )
        );
      }

      return users[0];
    })
  );
```

### 2. Integration with oRPC Router

```typescript
import { effectToPromiseHandler } from "@host/api/effects";
import { publicProcedure } from "@host/api";

// Convert Effect handler to Promise-based oRPC handler
const userRouter = {
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(
      effectToPromiseHandler(({ input }) => getUserEffect(input.id), AppLayer)
    ),
};
```

## 📁 File Structure

```
packages/api/src/effects/
├── index.ts              # Main exports
├── orpc.ts              # oRPC integration utilities
├── errors.ts            # Error type definitions
├── utils.ts             # Utility functions
├── recovery.ts          # Error recovery patterns
├── migration.ts         # Promise-to-Effect migration utilities
└── README.md           # This file

examples/
├── effect-usage.ts      # Client usage examples
├── effect-router-demo.ts # Router integration demo
└── ...

routers/
├── todo-effect.ts       # Effect-based todo router (demo)
├── auth-effect.ts       # Effect-based auth router (demo)
└── ...
```

## 🔧 Core Components

### Effect Procedures

- **`effectProcedure()`**: Factory for creating Effect-based oRPC procedures
- **`effectProcedure().input(schema)`**: Add input validation
- **`effectProcedure().handler(fn)`**: Define the Effect-based handler

### Error Handling

- **`ApplicationError`**: Union type of all application errors
- **`ValidationError`**: Input validation failures
- **`NotFoundError`**: Resource not found
- **`UnauthorizedError`**: Authentication required
- **`ForbiddenError`**: Access denied
- **`DatabaseError`**: Database operation failures
- **`AuthError`**: Authentication service errors
- **`NetworkError`**: External service errors
- **`BusinessLogicError`**: Domain rule violations

### Conversion Utilities

- **`effectToPromiseHandler`**: Convert Effect handler to Promise-based oRPC handler
- **`promiseToEffectHandler`**: Convert Promise handler to Effect-based handler
- **`createEffectRouter`**: Create router from Effect procedures (experimental)

### Migration Utilities

- **`wrapPromiseHandler`**: Wrap existing Promise handlers with Effect patterns
- **`migrateRouter`**: Migrate entire routers from Promise to Effect
- **`validateMigration`**: Test migration correctness

## 🎯 Usage Patterns

### 1. Service Injection

```typescript
const getUserEffect = (id: string) =>
  Effect.gen(function* (_) {
    // Inject services using Effect's dependency injection
    const db = yield* _(DatabaseService);
    const auth = yield* _(AuthService);
    const config = yield* _(AppConfigService);

    // Use services in your business logic
    const user = yield* _(db.findUser(id));
    return user;
  });
```

### 2. Error Recovery

```typescript
const getUserWithFallback = (id: string) =>
  pipe(
    getUserEffect(id),
    Effect.catchTag("NotFoundError", () =>
      Effect.succeed({ id, name: "Unknown User" })
    ),
    Effect.retry(Schedule.exponential("100 millis"))
  );
```

### 3. Parallel Operations

```typescript
const getUserStats = (id: string) =>
  Effect.gen(function* (_) {
    const [user, posts, comments] = yield* _(
      Effect.all([
        getUserEffect(id),
        getUserPostsEffect(id),
        getUserCommentsEffect(id),
      ])
    );

    return { user, posts: posts.length, comments: comments.length };
  });
```

## 🔄 Migration Strategy

### Phase 1: Parallel Implementation

- Keep existing Promise-based endpoints
- Add new Effect-based endpoints (e.g., `todoEffect`)
- Both versions work simultaneously

### Phase 2: Gradual Migration

- Migrate clients to use Effect endpoints
- Monitor and compare behavior
- Fix any issues found

### Phase 3: Cleanup

- Remove old Promise-based endpoints
- Update documentation and examples

### Example Migration

```typescript
// Before (Promise-based)
const oldRouter = {
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const user = await db.user.findUnique({ where: { id: input.id } });
      if (!user) throw new Error("User not found");
      return user;
    }),
};

// After (Effect-based, converted to Promise for oRPC)
const newRouter = {
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(
      effectToPromiseHandler(({ input }) => getUserEffect(input.id), AppLayer)
    ),
};
```

## 🧪 Testing

### Unit Testing Effect Handlers

```typescript
import { Effect, Layer } from "effect";
import { describe, it, expect } from "vitest";

describe("getUserEffect", () => {
  it("should return user when found", async () => {
    const mockDb = {
      findUser: (id: string) => Effect.succeed({ id, name: "John" }),
    };

    const TestLayer = Layer.succeed(DatabaseService, mockDb);

    const result = await Effect.runPromise(
      Effect.provide(getUserEffect("123"), TestLayer)
    );

    expect(result.name).toBe("John");
  });

  it("should fail with NotFoundError when user not found", async () => {
    const mockDb = {
      findUser: (id: string) =>
        Effect.fail(
          new NotFoundError({
            message: "User not found",
            resource: "User",
            id,
          })
        ),
    };

    const TestLayer = Layer.succeed(DatabaseService, mockDb);

    await expect(
      Effect.runPromise(Effect.provide(getUserEffect("999"), TestLayer))
    ).rejects.toThrow("User not found");
  });
});
```

## 🚨 Current Limitations

1. **Missing Service Implementations**: `DatabaseService` and `AuthService` need to be implemented
2. **Type Compatibility**: Some type mismatches between Effect and oRPC type systems
3. **Layer Configuration**: Proper Effect layers need to be set up for dependency injection

## 🛠 Next Steps

1. **Implement Services**: Create `DatabaseService` and `AuthService` implementations
2. **Create App Layer**: Set up proper Effect layer composition
3. **Fix Type Issues**: Resolve remaining TypeScript compatibility issues
4. **Add Integration Tests**: Test the full Effect-oRPC integration
5. **Performance Testing**: Benchmark Effect vs Promise performance
6. **Documentation**: Add more examples and best practices

## 📚 Resources

- [Effect.ts Documentation](https://effect.website/)
- [oRPC Documentation](https://orpc.io/)
- [Better-T-Stack Documentation](https://better-t-stack.com/)

## 🤝 Contributing

When adding new Effect-based endpoints:

1. Follow the established error handling patterns
2. Use proper service injection with Effect layers
3. Add comprehensive tests
4. Update documentation and examples
5. Ensure backward compatibility with existing Promise-based endpoints

## 📄 License

This integration follows the same license as the Better-T-Stack project.
