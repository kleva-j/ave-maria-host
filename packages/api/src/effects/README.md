# Effect.ts Integration Library

This library provides a comprehensive foundation for using Effect.ts in the Better-T-Stack application. It includes error handling, retry mechanisms, utility functions, and configuration management built on top of Effect.ts.

## Overview

Effect.ts is a powerful library for building robust, type-safe applications with functional programming patterns. This integration provides:

- **Structured Error Handling**: Tagged errors with detailed context
- **Retry Mechanisms**: Configurable retry logic with exponential backoff
- **Fallback Strategies**: Graceful degradation patterns
- **Promise Integration**: Seamless migration from Promise-based code
- **Utility Functions**: Common patterns and helpers
- **Configuration Management**: Type-safe configuration interfaces

## Core Modules

### 1. Core Types and Configuration (`core.ts`)

Defines the foundational types and configuration interfaces for the application.

#### Configuration Interfaces

- `DatabaseConfig`: Database connection settings
- `AuthConfig`: Authentication and JWT configuration
- `ServerConfig`: HTTP server and CORS settings
- `LoggingConfig`: Logging level and format configuration
- `AppConfig`: Combined application configuration

#### Service Context Tags

- `AppConfigService`: Context tag for dependency injection of application configuration

### 2. Error Hierarchy (`errors.ts`)

Comprehensive error types using Effect.ts tagged errors for type-safe error handling.

#### Base Error Types

- `AppError`: Abstract base class for all application errors
- `ValidationError`: Input validation failures
- `NotFoundError`: Missing resource errors
- `UnauthorizedError`: Authentication failures
- `ForbiddenError`: Authorization failures
- `DatabaseError`: Database operation failures
- `AuthError`: Authentication service errors
- `NetworkError`: External service communication errors
- `BusinessLogicError`: Domain-specific business rule violations
- `ConfigError`: Configuration-related errors

#### Error Features

- **Timestamp Tracking**: All errors include creation timestamps
- **Structured Context**: Errors carry relevant context information
- **Type Safety**: Union type `ApplicationError` for comprehensive error handling
- **Cause Chaining**: Support for error cause tracking

### 3. Recovery Patterns (`recovery.ts`)

Resilience patterns for handling failures and building robust applications.

#### Retry Mechanisms

- `withRetry()`: Exponential backoff retry with configurable parameters
- `withRetryWhen()`: Conditional retry based on error predicates
- `RetryConfig`: Configuration interface for retry behavior

#### Fallback Strategies

- `withFallback()`: Provide default values on failure
- `withFallbackEffect()`: Fallback to alternative Effect computations
- `withTimeout()`: Timeout handling with optional fallback values

#### Circuit Breaker

- `createCircuitBreaker()`: Prevent cascading failures with circuit breaker pattern
- Configurable failure thresholds and reset timeouts
- State tracking (closed, open, half-open)

#### Bulkhead Pattern

- `withBulkhead()`: Resource isolation (simplified implementation)

### 4. Utility Functions (`utils.ts`)

Common patterns and helper functions for Effect.ts development.

#### Promise Integration

- `fromPromise()`: Convert Promises to Effects with error mapping
- `fromPromiseWith()`: Convert Promises with custom error mappers
- `fromDatabasePromise()`: Database-specific Promise conversion
- `fromNetworkPromise()`: Network request Promise conversion

#### Validation Utilities

- `validateInput()`: Type-safe input validation
- `parseJSON()`: Safe JSON parsing with error handling
- `parseNumber()`: Safe number parsing and validation
- `parseDate()`: Safe date parsing and validation

#### Array Processing

- `mapEffect()`: Map over arrays with Effect computations
- `filterEffect()`: Filter arrays with Effect predicates

#### Control Flow

- `when()`: Conditional Effect execution
- `unless()`: Negated conditional execution

#### Side Effects

- `tapLog()`: Logging side effects
- `tapError()`: Error handling side effects

#### Resource Management

- `bracket()`: Resource acquisition and cleanup patterns
- `memoize()`: Effect memoization (simplified)

#### Timing

- `debounce()`: Debounced Effect execution
- `throttle()`: Throttled Effect execution

## Usage Examples

### Basic Error Handling

```typescript
import { Effect, pipe } from "effect";
import { ValidationError, parseJSON, parseNumber } from "./effects";

const validateUser = (input: unknown) => {
  return pipe(
    parseJSON<{ name: string; age: string }>(JSON.stringify(input)),
    Effect.flatMap(({ name, age }) =>
      pipe(
        parseNumber(age, "age"),
        Effect.map((parsedAge) => ({ name, age: parsedAge }))
      )
    )
  );
};
```

### Retry with Fallback

```typescript
import { Effect, pipe } from "effect";
import { withRetry, withFallback, fromDatabasePromise } from "./effects";

const fetchUser = (userId: string) => {
  return pipe(
    fromDatabasePromise(
      () => db.user.findUnique({ where: { id: userId } }),
      "fetchUser"
    ),
    withRetry({ maxRetries: 3, initialDelay: Duration.millis(100) }),
    withFallback({ id: userId, name: "Unknown User" })
  );
};
```

### Circuit Breaker Pattern

```typescript
import { Effect } from "effect";
import { createCircuitBreaker, fromNetworkPromise } from "./effects";

const circuitBreaker = createCircuitBreaker(5, Duration.seconds(30));

const fetchExternalData = (url: string) => {
  return circuitBreaker(
    fromNetworkPromise(() => fetch(url).then(res => res.json()), url)
  );
};
```

### Configuration Management

```typescript
import { Effect, Context } from "effect";
import { AppConfigService, type AppConfig } from "./effects";

const useDatabase = Effect.gen(function* (_) {
  const config = yield* _(AppConfigService);
  const connection = yield* _(connectToDatabase(config.database.url));
  return connection;
});

// Provide configuration
const program = Effect.provide(
  useDatabase,
  Layer.succeed(AppConfigService, {
    database: { url: "postgresql://...", maxConnections: 10 },
    auth: { jwtSecret: "secret", sessionTimeout: 3600 },
    // ... other config
  })
);
```

## Best Practices

### Error Handling

1. **Use Specific Error Types**: Choose the most specific error type for each failure case
2. **Include Context**: Provide relevant context in error messages and fields
3. **Chain Errors**: Use the `cause` field to maintain error chains
4. **Handle at Boundaries**: Catch and handle errors at appropriate application boundaries

### Retry Logic

1. **Configure Appropriately**: Set reasonable retry limits and delays
2. **Use Predicates**: Only retry on transient errors, not permanent failures
3. **Combine with Circuit Breakers**: Prevent retry storms with circuit breakers
4. **Monitor Metrics**: Track retry attempts and success rates

### Resource Management

1. **Use Bracket Pattern**: Ensure proper resource cleanup with `bracket()`
2. **Timeout Operations**: Set reasonable timeouts for external operations
3. **Implement Bulkheads**: Isolate resources to prevent cascading failures

### Performance

1. **Memoize Expensive Operations**: Cache results of expensive computations
2. **Use Throttling**: Prevent overwhelming external services
3. **Batch Operations**: Combine multiple operations when possible

## Migration Guide

### From Promise-based Code

1. **Wrap Promises**: Use `fromPromise()` or specific converters
2. **Map Errors**: Convert generic errors to typed application errors
3. **Add Retry Logic**: Enhance reliability with retry mechanisms
4. **Implement Fallbacks**: Provide graceful degradation

### From Callback-based Code

1. **Promisify First**: Convert callbacks to Promises, then to Effects
2. **Handle Errors**: Map callback errors to typed errors
3. **Add Context**: Include relevant context in error handling

## Testing

### Unit Testing Effects

```typescript
import { Effect } from "effect";
import { describe, it, expect } from "vitest";

describe("validateUser", () => {
  it("should validate correct input", async () => {
    const input = { name: "John", age: "25" };
    const result = await Effect.runPromise(validateUser(input));
    expect(result).toEqual({ name: "John", age: 25 });
  });

  it("should fail on invalid input", async () => {
    const input = { name: "John", age: "invalid" };
    const result = await Effect.runPromiseExit(validateUser(input));
    expect(result._tag).toBe("Failure");
  });
});
```

### Integration Testing

```typescript
import { Effect, Layer } from "effect";
import { TestConfigService } from "./test-utils";

const testProgram = Effect.provide(
  yourProgram,
  Layer.succeed(AppConfigService, testConfig)
);

const result = await Effect.runPromise(testProgram);
```

## Performance Considerations

1. **Effect Creation**: Effects are lazy and only execute when run
2. **Memory Usage**: Be mindful of memoization and caching strategies
3. **Concurrency**: Use `Effect.all()` for parallel execution
4. **Resource Pools**: Implement proper connection pooling for databases

## Troubleshooting

### Common Issues

1. **Type Errors**: Ensure proper generic type parameters
2. **Runtime Errors**: Check error handling and fallback strategies
3. **Performance**: Monitor retry attempts and circuit breaker states
4. **Memory Leaks**: Ensure proper resource cleanup

### Debugging

1. **Use `tapLog()`**: Add logging to trace execution flow
2. **Effect Tracing**: Enable Effect.ts tracing for debugging
3. **Error Context**: Include detailed context in error messages
4. **Metrics**: Implement metrics collection for monitoring

## Contributing

When adding new utilities:

1. **Follow Patterns**: Use existing patterns for consistency
2. **Add Documentation**: Include comprehensive JSDoc comments
3. **Write Tests**: Add unit tests for new functionality
4. **Update Examples**: Add usage examples to this README

## References

- [Effect.ts Documentation](https://effect.website/)
- [Effect.ts GitHub](https://github.com/Effect-TS/effect)
- [Functional Programming Patterns](https://effect.website/docs/guides/essentials/pipeline)
