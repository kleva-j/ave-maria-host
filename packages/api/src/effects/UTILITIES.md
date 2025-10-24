# Effect.ts Utilities API Reference

This document provides comprehensive documentation for all utility functions, helpers, and types in the Effect.ts integration library.

## Table of Contents

- [Promise Conversion Utilities](#promise-conversion-utilities)
- [Retry and Recovery Utilities](#retry-and-recovery-utilities)
- [Validation Utilities](#validation-utilities)
- [Array Processing Utilities](#array-processing-utilities)
- [Conditional Execution Utilities](#conditional-execution-utilities)
- [Side Effect Utilities](#side-effect-utilities)
- [Resource Management Utilities](#resource-management-utilities)
- [Performance Utilities](#performance-utilities)
- [Configuration and Setup](#configuration-and-setup)

## Promise Conversion Utilities

### `fromPromise<A>(promise: () => Promise<A>, mapError?: (error: unknown) => ApplicationError): Effect<A, ApplicationError>`

Converts a Promise-returning function to an Effect with automatic error mapping.

**Parameters:**

- `promise`: Function that returns a Promise
- `mapError`: Optional function to map caught errors to ApplicationError types

**Returns:** Effect that represents the Promise operation

**Examples:**

```typescript
// Basic Promise conversion
const fetchUser = fromPromise(() => fetch("/api/user").then((r) => r.json()));

// With custom error mapping
const fetchUserWithMapping = fromPromise(
  () => fetch("/api/user").then((r) => r.json()),
  (error) =>
    new NetworkError({
      message: `Failed to fetch user: ${error}`,
      url: "/api/user",
      cause: error,
    })
);

// File system operations
const readFile = fromPromise(
  () => fs.readFile("config.json", "utf8"),
  (error) =>
    new ValidationError({
      message: "Failed to read config file",
      field: "config",
      value: "config.json",
    })
);
```

### `fromPromiseWith<A, E extends ApplicationError>(promise: () => Promise<A>, errorMapper: (error: unknown) => E): Effect<A, E>`

Converts a Promise to an Effect with a specific error mapper for more precise error handling.

**Parameters:**

- `promise`: Function that returns a Promise
- `errorMapper`: Function to map any caught error to a specific ApplicationError type

**Returns:** Effect with the specified error type

**Examples:**

```typescript
// Map all errors to ValidationError
const parseConfig = fromPromiseWith(
  () => JSON.parse(configString),
  (error) =>
    new ValidationError({
      message: `Invalid JSON config: ${error}`,
      field: "config",
      value: configString,
    })
);

// Map all errors to DatabaseError
const queryUser = fromPromiseWith(
  () => db.user.findUnique({ where: { id } }),
  (error) =>
    new DatabaseError({
      message: `Query failed: ${error}`,
      operation: "findUser",
      cause: error,
    })
);
```

### `fromDatabasePromise<A>(promise: () => Promise<A>, operation: string): Effect<A, DatabaseError>`

Specialized Promise converter for database operations with automatic DatabaseError mapping.

**Parameters:**

- `promise`: Function that returns a database Promise
- `operation`: Name of the database operation for error context

**Returns:** Effect with DatabaseError on failure

**Example:**

```typescript
const findUser = (id: string) =>
  fromDatabasePromise(() => db.user.findUnique({ where: { id } }), "findUser");

const createUser = (data: UserData) =>
  fromDatabasePromise(() => db.user.create({ data }), "createUser");
```

### `fromNetworkPromise<A>(promise: () => Promise<A>, url: string): Effect<A, NetworkError>`

Specialized Promise converter for network operations with automatic NetworkError mapping.

**Parameters:**

- `promise`: Function that returns a network Promise
- `url`: URL being accessed for error context

**Returns:** Effect with NetworkError on failure

**Example:**

```typescript
const fetchExternalData = (url: string) =>
  fromNetworkPromise(() => fetch(url).then((r) => r.json()), url);

const uploadFile = (file: File, url: string) =>
  fromNetworkPromise(() => fetch(url, { method: "POST", body: file }), url);
```

## Retry and Recovery Utilities

### `withRetry(config?: Partial<RetryConfig>): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>`

Adds exponential backoff retry logic to an Effect. This is a curried function designed for use in pipes.

**Parameters:**

- `config`: Optional retry configuration object

**RetryConfig Interface:**

```typescript
interface RetryConfig {
  maxRetries: number; // Maximum retry attempts (default: 3)
  initialDelay: Duration; // Initial delay (default: 100ms)
  maxDelay: Duration; // Maximum delay (default: 5s)
  backoffFactor: number; // Backoff multiplier (default: 2)
}
```

**Returns:** Function that takes an Effect and returns a retrying Effect

**Examples:**

```typescript
// Basic retry with defaults
pipe(fetchUserFromAPI(userId), withRetry());

// Custom retry configuration
pipe(
  fetchUserFromAPI(userId),
  withRetry({
    maxRetries: 5,
    initialDelay: Duration.millis(200),
    backoffFactor: 1.5,
  })
);

// Retry database operations
pipe(
  fromDatabasePromise(() => db.user.findUnique({ where: { id } }), "findUser"),
  withRetry({ maxRetries: 2 })
);
```

### `withRetryWhen<A, E, R>(effect: Effect<A, E, R>, predicate: (error: E) => boolean, config?: Partial<RetryConfig>): Effect<A, E, R>`

Retries an Effect only when specific error conditions are met.

**Parameters:**

- `effect`: The Effect to retry
- `predicate`: Function that returns true if the error should trigger a retry
- `config`: Optional retry configuration

**Returns:** Effect that retries on matching errors

**Examples:**

```typescript
// Only retry on network errors with 5xx status codes
const retryOnServerErrors = withRetryWhen(
  fetchExternalData(url),
  (error) =>
    error._tag === "NetworkError" &&
    error.status !== undefined &&
    error.status >= 500,
  { maxRetries: 3 }
);

// Only retry on specific database errors
const retryOnConnectionErrors = withRetryWhen(
  databaseOperation,
  (error) =>
    error._tag === "DatabaseError" && error.message.includes("connection"),
  { maxRetries: 5, initialDelay: Duration.seconds(1) }
);
```

### `withFallback<A>(fallback: A): <E, R>(effect: Effect<A, E, R>) => Effect<A, never, R>`

Provides a fallback value when an Effect fails, resulting in a never-failing Effect.

**Parameters:**

- `fallback`: The default value to use when the Effect fails

**Returns:** Function that takes an Effect and returns a never-failing Effect

**Examples:**

```typescript
// Fallback to default user when fetch fails
pipe(
  fetchUserFromAPI(userId),
  withFallback({ id: userId, name: "Unknown User", email: "" })
);

// Fallback to empty array when fetching list fails
pipe(fetchUserList(), withFallback([]));

// Fallback to cached data
pipe(fetchFreshData(), withFallback(cachedData));
```

### `withFallbackEffect<A, E, R, R2>(effect: Effect<A, E, R>, fallbackEffect: Effect<A, never, R2>): Effect<A, never, R | R2>`

Provides a fallback Effect when the primary Effect fails, allowing for dynamic fallback computation.

**Parameters:**

- `effect`: The primary Effect to try
- `fallbackEffect`: The Effect to run if the primary fails

**Returns:** Effect that tries the primary, then the fallback

**Examples:**

```typescript
// Fallback to cache when API fails
const getUserData = withFallbackEffect(
  fetchUserFromAPI(userId),
  fetchUserFromCache(userId)
);

// Fallback to secondary service
const getExternalData = withFallbackEffect(
  fetchFromPrimaryService(url),
  fetchFromSecondaryService(url)
);

// Fallback with computation
const getProcessedData = withFallbackEffect(
  fetchProcessedData(id),
  pipe(fetchRawData(id), Effect.map(processData))
);
```

### `withTimeout<A, E, R>(effect: Effect<A, E, R>, duration: Duration, fallback?: A): Effect<A, E | "TimeoutError", R>`

Adds timeout behavior to an Effect with optional fallback value.

**Parameters:**

- `effect`: The Effect to add timeout to
- `duration`: Maximum time to wait for completion
- `fallback`: Optional fallback value to use on timeout

**Returns:** Effect with timeout behavior

**Examples:**

```typescript
// Timeout with error
const fetchWithTimeout = withTimeout(
  fetchUserFromAPI(userId),
  Duration.seconds(5)
);

// Timeout with fallback value
const fetchWithFallback = withTimeout(
  fetchUserFromAPI(userId),
  Duration.seconds(5),
  { id: userId, name: "Timeout User" }
);

// Database query with timeout
const queryWithTimeout = withTimeout(
  fromDatabasePromise(() => db.complexQuery(), "complexQuery"),
  Duration.seconds(30)
);
```

### `createCircuitBreaker(maxFailures?: number, resetTimeout?: Duration): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E | "CircuitBreakerOpen", R>`

Creates a circuit breaker that prevents cascading failures by tracking failure counts.

**Parameters:**

- `maxFailures`: Number of failures before opening the circuit (default: 5)
- `resetTimeout`: Time to wait before allowing requests again (default: 30s)

**Returns:** Function that wraps Effects with circuit breaker behavior

**Circuit Breaker States:**

- **Closed**: Normal operation, requests pass through
- **Open**: Circuit is open, requests fail immediately with "CircuitBreakerOpen"
- **Half-Open**: Testing if service has recovered (simplified implementation)

**Examples:**

```typescript
// Create circuit breaker for external API
const apiCircuitBreaker = createCircuitBreaker(3, Duration.seconds(60));

const fetchExternalData = (url: string) => {
  return apiCircuitBreaker(
    fromNetworkPromise(() => fetch(url).then((r) => r.json()), url)
  );
};

// Create circuit breaker for database
const dbCircuitBreaker = createCircuitBreaker(5, Duration.seconds(30));

const queryDatabase = (query: string) => {
  return dbCircuitBreaker(
    fromDatabasePromise(() => db.query(query), "customQuery")
  );
};

// Handle circuit breaker open state
pipe(
  fetchExternalData("https://api.example.com/data"),
  Effect.catchTag("CircuitBreakerOpen", () =>
    Effect.succeed({ error: "Service temporarily unavailable" })
  )
);
```

## Validation Utilities

### `validateInput<T>(input: unknown, validator: (input: unknown) => input is T, field: string): Effect<T, ValidationError>`

Validates input using a type predicate function and returns a ValidationError on failure.

**Parameters:**

- `input`: The value to validate
- `validator`: Type predicate function that returns true if input is valid
- `field`: Field name for error context

**Returns:** Effect with validated value or ValidationError

**Example:**

```typescript
const isString = (input: unknown): input is string => typeof input === "string";
const isNumber = (input: unknown): input is number => typeof input === "number";

const validateUserName = (input: unknown) =>
  validateInput(input, isString, "userName");

const validateAge = (input: unknown) => validateInput(input, isNumber, "age");
```

### `parseJSON<T>(jsonString: string, field?: string): Effect<T, ValidationError>`

Safely parses JSON string with ValidationError on parse failure.

**Parameters:**

- `jsonString`: JSON string to parse
- `field`: Field name for error context (default: "json")

**Returns:** Effect with parsed value or ValidationError

**Example:**

```typescript
const parseConfig = (configString: string) =>
  parseJSON<AppConfig>(configString, "appConfig");

const parseUserData = (userJson: string) =>
  parseJSON<User>(userJson, "userData");
```

### `parseNumber(value: string | number, field: string): Effect<number, ValidationError>`

Safely converts string or number to number with ValidationError on failure.

**Parameters:**

- `value`: String or number to convert
- `field`: Field name for error context

**Returns:** Effect with number or ValidationError

**Example:**

```typescript
const parseUserId = (id: string) => parseNumber(id, "userId");
const parsePrice = (price: string) => parseNumber(price, "price");
```

### `parseDate(value: string | Date, field: string): Effect<Date, ValidationError>`

Safely converts string or Date to Date with ValidationError on failure.

**Parameters:**

- `value`: String or Date to convert
- `field`: Field name for error context

**Returns:** Effect with Date or ValidationError

**Example:**

```typescript
const parseBirthDate = (date: string) => parseDate(date, "birthDate");
const parseCreatedAt = (timestamp: string) => parseDate(timestamp, "createdAt");
```

## Array Processing Utilities

### `mapEffect<A, B, E, R>(array: readonly A[], f: (item: A, index: number) => Effect<B, E, R>): Effect<readonly B[], E, R>`

Maps over an array with an Effect-returning function, collecting all results.

**Parameters:**

- `array`: Array to map over
- `f`: Function that transforms each item to an Effect

**Returns:** Effect with array of transformed values

**Example:**

```typescript
const fetchUserDetails = (userIds: string[]) =>
  mapEffect(userIds, (id, index) => fetchUserFromAPI(id));

const validateInputs = (inputs: unknown[]) =>
  mapEffect(inputs, (input, index) =>
    validateInput(input, isString, `input[${index}]`)
  );
```

### `filterEffect<A, E, R>(array: readonly A[], predicate: (item: A, index: number) => Effect<boolean, E, R>): Effect<readonly A[], E, R>`

Filters an array using an Effect-returning predicate function.

**Parameters:**

- `array`: Array to filter
- `predicate`: Effect-returning predicate function

**Returns:** Effect with filtered array

**Example:**

```typescript
const filterActiveUsers = (users: User[]) =>
  filterEffect(users, (user) => checkUserActive(user.id));

const filterValidEmails = (emails: string[]) =>
  filterEffect(emails, (email) =>
    validateEmail(email).pipe(
      Effect.map(() => true),
      Effect.catchAll(() => Effect.succeed(false))
    )
  );
```

## Conditional Execution Utilities

### `when<A, E, R>(condition: boolean, effect: Effect<A, E, R>): Effect<A | undefined, E, R>`

Conditionally executes an Effect based on a boolean condition.

**Parameters:**

- `condition`: Boolean condition to check
- `effect`: Effect to execute if condition is true

**Returns:** Effect with result or undefined

**Example:**

```typescript
const conditionalUpdate = (shouldUpdate: boolean, data: UpdateData) =>
  when(shouldUpdate, updateDatabase(data));

const optionalNotification = (notify: boolean, message: string) =>
  when(notify, sendNotification(message));
```

### `unless<A, E, R>(condition: boolean, effect: Effect<A, E, R>): Effect<A | undefined, E, R>`

Conditionally executes an Effect when condition is false (opposite of `when`).

**Parameters:**

- `condition`: Boolean condition to check
- `effect`: Effect to execute if condition is false

**Returns:** Effect with result or undefined

**Example:**

```typescript
const skipCache = (useCache: boolean, fetchFn: Effect<Data, Error>) =>
  unless(useCache, fetchFn);
```

## Side Effect Utilities

### `tapLog<A, E, R>(message: string): (effect: Effect<A, E, R>) => Effect<A, E, R>`

Adds logging side effect to an Effect without changing its result.

**Parameters:**

- `message`: Message to log

**Returns:** Function that adds logging to an Effect

**Example:**

```typescript
pipe(
  fetchUserFromAPI(userId),
  tapLog("Fetching user data"),
  Effect.map(processUser),
  tapLog("User data processed")
);
```

### `tapError<A, E, R>(onError: (error: E) => Effect<void, never, R>): (effect: Effect<A, E, R>) => Effect<A, E, R>`

Adds error handling side effect without changing the error propagation.

**Parameters:**

- `onError`: Function to handle errors as side effect

**Returns:** Function that adds error handling to an Effect

**Example:**

```typescript
pipe(
  fetchUserFromAPI(userId),
  tapError((error) => Effect.sync(() => console.error("Fetch failed:", error)))
);
```

## Resource Management Utilities

### `bracket<A, B, E1, E2, R1, R2>(acquire: Effect<A, E1, R1>, use: (resource: A) => Effect<B, E2, R2>, release: (resource: A) => Effect<void, never, R1>): Effect<B, E1 | E2, R1 | R2>`

Provides resource acquisition and cleanup pattern with guaranteed cleanup.

**Parameters:**

- `acquire`: Effect to acquire the resource
- `use`: Function to use the resource
- `release`: Function to release the resource (always called)

**Returns:** Effect with resource management

**Example:**

```typescript
const withDatabaseConnection = <A>(
  use: (db: Database) => Effect<A, DatabaseError>
) => bracket(acquireConnection(), use, (db) => Effect.sync(() => db.close()));

const withFileHandle = <A>(
  filename: string,
  use: (file: FileHandle) => Effect<A, Error>
) =>
  bracket(openFile(filename), use, (file) => Effect.sync(() => file.close()));
```

## Performance Utilities

### `memoize<A, E, R>(effect: Effect<A, E, R>): Effect<A, E, R>`

Caches the result of an Effect to avoid repeated computation.

**Parameters:**

- `effect`: Effect to memoize

**Returns:** Memoized Effect that caches its result

**Example:**

```typescript
const expensiveComputation = memoize(
  Effect.sync(() => {
    // Expensive calculation
    return heavyCalculation();
  })
);

const cachedUserFetch = memoize(fetchUserFromAPI(userId));
```

### `debounce<A, E, R>(effect: Effect<A, E, R>, delay: number): Effect<A, E, R>`

Delays Effect execution by the specified amount.

**Parameters:**

- `effect`: Effect to debounce
- `delay`: Delay in milliseconds

**Returns:** Debounced Effect

**Example:**

```typescript
const debouncedSearch = debounce(
  searchUsers(query),
  300 // 300ms delay
);
```

### `throttle<A, E, R>(effect: Effect<A, E, R>, interval: number): Effect<A, E, R>`

Limits Effect execution frequency to the specified interval.

**Parameters:**

- `effect`: Effect to throttle
- `interval`: Minimum interval between executions in milliseconds

**Returns:** Throttled Effect

**Example:**

```typescript
const throttledApiCall = throttle(
  fetchExternalData(url),
  1000 // Max once per second
);
```

## Configuration and Setup

### Default Retry Configuration

```typescript
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: Duration.millis(100),
  maxDelay: Duration.seconds(5),
  backoffFactor: 2,
};
```

### Type Definitions

```typescript
// Core configuration interfaces
interface RetryConfig {
  readonly maxRetries: number;
  readonly initialDelay: Duration.Duration;
  readonly maxDelay: Duration.Duration;
  readonly backoffFactor: number;
}

// Circuit breaker state
interface CircuitBreakerState {
  readonly failures: number;
  readonly lastFailure?: Date;
  readonly state: "closed" | "open" | "half-open";
}
```

## Usage Patterns

### Combining Utilities

```typescript
// Comprehensive error handling with retry, fallback, and timeout
const robustApiCall = (url: string) =>
  pipe(
    fromNetworkPromise(() => fetch(url).then((r) => r.json()), url),
    withTimeout(Duration.seconds(10)),
    withRetry({ maxRetries: 3, initialDelay: Duration.millis(500) }),
    withFallback({ error: "Service unavailable", data: null })
  );

// Database operation with circuit breaker and logging
const dbCircuitBreaker = createCircuitBreaker(5, Duration.seconds(30));

const safeDbQuery = (query: string) =>
  pipe(
    fromDatabasePromise(() => db.query(query), "customQuery"),
    dbCircuitBreaker,
    tapLog(`Executing query: ${query}`),
    tapError((error) =>
      Effect.sync(() => console.error("Query failed:", error))
    )
  );
```

### Migration from Promises

```typescript
// Before: Promise-based code
const fetchUserData = async (id: string) => {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return { id, name: "Unknown" };
  }
};

// After: Effect-based code
const fetchUserData = (id: string) =>
  pipe(
    fromPromise(() => fetch(`/api/users/${id}`).then((r) => r.json())),
    withRetry({ maxRetries: 3 }),
    tapError((error) =>
      Effect.sync(() => console.error("Failed to fetch user:", error))
    ),
    withFallback({ id, name: "Unknown" })
  );
```
