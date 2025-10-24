# Effect.ts Integration API Reference

## Overview

This API reference provides a complete overview of all types, functions, and utilities available in the Effect.ts integration library for Better-T-Stack.

## Table of Contents

- [Core Types](#core-types)
- [Error Types](#error-types)
- [Recovery Patterns](#recovery-patterns)
- [Utility Functions](#utility-functions)
- [Examples](#examples)

## Core Types

### Configuration Interfaces

#### `DatabaseConfig`
```typescript
interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections: number;
  readonly connectionTimeout: number;
}
```

#### `AuthConfig`
```typescript
interface AuthConfig {
  readonly jwtSecret: string;
  readonly sessionTimeout: number;
  readonly refreshTokenExpiry: number;
}
```

#### `ServerConfig`
```typescript
interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly cors: {
    readonly origins: readonly string[];
    readonly credentials: boolean;
  };
}
```

#### `LoggingConfig`
```typescript
interface LoggingConfig {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly format: "json" | "pretty";
  readonly enableCorrelationId: boolean;
}
```

#### `AppConfig`
```typescript
interface AppConfig {
  readonly database: DatabaseConfig;
  readonly auth: AuthConfig;
  readonly server: ServerConfig;
  readonly logging: LoggingConfig;
}
```

### Service Context

#### `AppConfigService`
```typescript
const AppConfigService: Context.Tag<AppConfig>
```

## Error Types

### Base Error

#### `AppError`
```typescript
abstract class AppError extends Data.TaggedError("AppError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly timestamp: Date;
}>
```

### Specific Error Types

#### `ValidationError`
```typescript
class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly field: string;
  readonly value: unknown;
  readonly timestamp: Date;
}>
```

#### `NotFoundError`
```typescript
class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
  readonly resource: string;
  readonly id: string;
  readonly timestamp: Date;
}>
```

#### `UnauthorizedError`
```typescript
class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string;
  readonly action: string;
  readonly timestamp: Date;
}>
```

#### `ForbiddenError`
```typescript
class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string;
  readonly resource: string;
  readonly action: string;
  readonly timestamp: Date;
}>
```

#### `DatabaseError`
```typescript
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly operation: string;
  readonly cause?: unknown;
  readonly timestamp: Date;
}>
```

#### `AuthError`
```typescript
class AuthError extends Data.TaggedError("AuthError")<{
  readonly message: string;
  readonly type: AuthErrorType;
  readonly timestamp: Date;
}>
```

#### `NetworkError`
```typescript
class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly url: string;
  readonly status?: number;
  readonly cause?: unknown;
  readonly timestamp: Date;
}>
```

#### `BusinessLogicError`
```typescript
class BusinessLogicError extends Data.TaggedError("BusinessLogicError")<{
  readonly message: string;
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: Date;
}>
```

#### `ConfigError`
```typescript
class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly field?: string;
}>
```

### Union Type

#### `ApplicationError`
```typescript
type ApplicationError = 
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | DatabaseError
  | AuthError
  | NetworkError
  | BusinessLogicError
  | ConfigError;
```

## Recovery Patterns

### Configuration

#### `RetryConfig`
```typescript
interface RetryConfig {
  readonly maxRetries: number;
  readonly initialDelay: Duration.Duration;
  readonly maxDelay: Duration.Duration;
  readonly backoffFactor: number;
}
```

#### `defaultRetryConfig`
```typescript
const defaultRetryConfig: RetryConfig
```

### Functions

#### `withRetry`
```typescript
const withRetry: (config?: Partial<RetryConfig>) => 
  <A, E extends ApplicationError, R>(effect: Effect.Effect<A, E, R>) => 
  Effect.Effect<A, E, R>
```

#### `withRetryWhen`
```typescript
const withRetryWhen: <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>,
  predicate: (error: E) => boolean,
  config?: Partial<RetryConfig>
) => Effect.Effect<A, E, R>
```

#### `withFallback`
```typescript
const withFallback: <A>(fallback: A) => 
  <E extends ApplicationError, R>(effect: Effect.Effect<A, E, R>) => 
  Effect.Effect<A, never, R>
```

#### `withFallbackEffect`
```typescript
const withFallbackEffect: <A, E extends ApplicationError, R, R2>(
  effect: Effect.Effect<A, E, R>,
  fallbackEffect: Effect.Effect<A, never, R2>
) => Effect.Effect<A, never, R | R2>
```

#### `withTimeout`
```typescript
const withTimeout: <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>,
  duration: Duration.Duration,
  fallback?: A
) => Effect.Effect<A, E | "TimeoutError", R>
```

#### `createCircuitBreaker`
```typescript
const createCircuitBreaker: (
  maxFailures?: number,
  resetTimeout?: Duration.Duration
) => <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<A, E | "CircuitBreakerOpen", R>
```

#### `withBulkhead`
```typescript
const withBulkhead: <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>,
  maxConcurrent: number
) => Effect.Effect<A, E | "BulkheadRejected", R>
```

## Utility Functions

### Promise Integration

#### `fromPromise`
```typescript
const fromPromise: <A>(
  promise: () => Promise<A>,
  mapError?: (error: unknown) => ApplicationError
) => Effect.Effect<A, ApplicationError>
```

#### `fromPromiseWith`
```typescript
const fromPromiseWith: <A, E extends ApplicationError>(
  promise: () => Promise<A>,
  errorMapper: (error: unknown) => E
) => Effect.Effect<A, E>
```

#### `fromDatabasePromise`
```typescript
const fromDatabasePromise: <A>(
  promise: () => Promise<A>,
  operation: string
) => Effect.Effect<A, DatabaseError>
```

#### `fromNetworkPromise`
```typescript
const fromNetworkPromise: <A>(
  promise: () => Promise<A>,
  url: string
) => Effect.Effect<A, NetworkError>
```

### Validation

#### `validateInput`
```typescript
const validateInput: <T>(
  input: unknown,
  validator: (input: unknown) => input is T,
  field: string
) => Effect.Effect<T, ValidationError>
```

#### `parseJSON`
```typescript
const parseJSON: <T = unknown>(
  jsonString: string,
  field?: string
) => Effect.Effect<T, ValidationError>
```

#### `parseNumber`
```typescript
const parseNumber: (
  value: string | number,
  field: string
) => Effect.Effect<number, ValidationError>
```

#### `parseDate`
```typescript
const parseDate: (
  value: string | Date,
  field: string
) => Effect.Effect<Date, ValidationError>
```

### Array Processing

#### `mapEffect`
```typescript
const mapEffect: <A, B, E, R>(
  array: readonly A[],
  f: (item: A, index: number) => Effect.Effect<B, E, R>
) => Effect.Effect<readonly B[], E, R>
```

#### `filterEffect`
```typescript
const filterEffect: <A, E, R>(
  array: readonly A[],
  predicate: (item: A, index: number) => Effect.Effect<boolean, E, R>
) => Effect.Effect<readonly A[], E, R>
```

### Control Flow

#### `when`
```typescript
const when: <A, E, R>(
  condition: boolean,
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<A | undefined, E, R>
```

#### `unless`
```typescript
const unless: <A, E, R>(
  condition: boolean,
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<A | undefined, E, R>
```

### Side Effects

#### `tapLog`
```typescript
const tapLog: <A, E, R>(message: string) => 
  (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
```

#### `tapError`
```typescript
const tapError: <A, E, R>(
  onError: (error: E) => Effect.Effect<void, never, R>
) => (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
```

### Resource Management

#### `bracket`
```typescript
const bracket: <A, B, E1, E2, R1, R2>(
  acquire: Effect.Effect<A, E1, R1>,
  use: (resource: A) => Effect.Effect<B, E2, R2>,
  release: (resource: A) => Effect.Effect<void, never, R1>
) => Effect.Effect<B, E1 | E2, R1 | R2>
```

### Performance

#### `memoize`
```typescript
const memoize: <A, E, R>(
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<A, E, R>
```

#### `debounce`
```typescript
const debounce: <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  delay: number
) => Effect.Effect<A, E, R>
```

#### `throttle`
```typescript
const throttle: <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  interval: number
) => Effect.Effect<A, E, R>
```

## Examples

The library includes comprehensive examples demonstrating:

- `validateUserInput` - Input validation with error handling
- `fetchUserFromDatabase` - Database operations with retry and fallback
- `fetchExternalData` - Network requests with error handling
- `processUserData` - Composing multiple Effects in parallel

## Re-exports

The library re-exports commonly used Effect.ts types for convenience:

```typescript
export { Effect, Context, Layer, Schedule, Duration, pipe } from "effect";
```

## Usage Patterns

### Basic Pipeline
```typescript
pipe(
  someEffect,
  withRetry({ maxRetries: 3 }),
  withFallback(defaultValue),
  tapLog("Operation completed")
)
```

### Error Handling
```typescript
Effect.catchTag("ValidationError", (error) => {
  // Handle validation error
})
```

### Resource Management
```typescript
bracket(
  acquireResource(),
  useResource,
  releaseResource
)
```

### Configuration Access
```typescript
Effect.gen(function* (_) {
  const config = yield* _(AppConfigService);
  // Use configuration
})
```
