# Effect.ts Utilities Documentation

This document provides comprehensive documentation for all utility functions in the Effect.ts integration library.

## Promise Integration Utilities

### `fromPromise<A>(promise, mapError?)`

Converts a Promise-returning function to an Effect with optional error mapping.

**Parameters:**
- `promise: () => Promise<A>` - Function that returns a Promise
- `mapError?: (error: unknown) => ApplicationError` - Optional error mapper

**Returns:** `Effect.Effect<A, ApplicationError>`

**Examples:**
```typescript
// Basic conversion
const fetchData = fromPromise(() => fetch('/api/data').then(r => r.json()));

// With custom error mapping
const fetchUser = fromPromise(
  () => fetch('/api/user').then(r => r.json()),
  (error) => new NetworkError({
    message: `API request failed: ${error}`,
    url: '/api/user',
    cause: error
  })
);
```

### `fromPromiseWith<A, E>(promise, errorMapper)`

Converts a Promise with a specific error mapper for type-safe error handling.

**Parameters:**
- `promise: () => Promise<A>` - Function that returns a Promise
- `errorMapper: (error: unknown) => E` - Function to map errors to specific type

**Returns:** `Effect.Effect<A, E>`

**Examples:**
```typescript
// Always map to ValidationError
const parseJSON = fromPromiseWith(
  () => JSON.parse(jsonString),
  (error) => new ValidationError({
    message: `JSON parse failed: ${error}`,
    field: 'json',
    value: jsonString
  })
);
```

### `fromDatabasePromise<A>(promise, operation)`

Specialized converter for database operations that maps errors to `DatabaseError`.

**Parameters:**
- `promise: () => Promise<A>` - Database operation Promise
- `operation: string` - Name of the database operation

**Returns:** `Effect.Effect<A, DatabaseError>`

**Examples:**
```typescript
const findUser = fromDatabasePromise(
  () => db.user.findUnique({ where: { id } }),
  'findUser'
);

const createOrder = fromDatabasePromise(
  () => db.order.create({ data: orderData }),
  'createOrder'
);
```

### `fromNetworkPromise<A>(promise, url)`

Specialized converter for network requests that maps errors to `NetworkError`.

**Parameters:**
- `promise: () => Promise<A>` - Network request Promise
- `url: string` - URL being accessed

**Returns:** `Effect.Effect<A, NetworkError>`

**Examples:**
```typescript
const fetchExternalAPI = fromNetworkPromise(
  () => fetch('https://api.external.com/data').then(r => r.json()),
  'https://api.external.com/data'
);
```

## Validation Utilities

### `validateInput<T>(input, validator, field)`

Type-safe input validation with structured error reporting.

**Parameters:**
- `input: unknown` - Input to validate
- `validator: (input: unknown) => input is T` - Type guard function
- `field: string` - Field name for error reporting

**Returns:** `Effect.Effect<T, ValidationError>`

**Examples:**
```typescript
// Email validation
const isEmail = (input: unknown): input is string => 
  typeof input === 'string' && /\S+@\S+\.\S+/.test(input);

const validateEmail = (email: unknown) =>
  validateInput(email, isEmail, 'email');

// Object validation
const isUser = (input: unknown): input is User =>
  typeof input === 'object' && input !== null && 'id' in input;

const validateUser = (user: unknown) =>
  validateInput(user, isUser, 'user');
```

### `parseJSON<T>(jsonString, field?)`

Safe JSON parsing with validation error handling.

**Parameters:**
- `jsonString: string` - JSON string to parse
- `field?: string` - Field name for error reporting (default: "json")

**Returns:** `Effect.Effect<T, ValidationError>`

**Examples:**
```typescript
// Basic JSON parsing
const parseConfig = parseJSON<Config>(configString, 'config');

// Parse API response
const parseResponse = parseJSON<ApiResponse>(responseBody, 'apiResponse');
```

### `parseNumber(value, field)`

Safe number parsing with validation.

**Parameters:**
- `value: string | number` - Value to parse as number
- `field: string` - Field name for error reporting

**Returns:** `Effect.Effect<number, ValidationError>`

**Examples:**
```typescript
const parseAge = (ageString: string) => parseNumber(ageString, 'age');
const parsePrice = (priceInput: unknown) => parseNumber(priceInput, 'price');
```

### `parseDate(value, field)`

Safe date parsing with validation.

**Parameters:**
- `value: string | Date` - Value to parse as Date
- `field: string` - Field name for error reporting

**Returns:** `Effect.Effect<Date, ValidationError>`

**Examples:**
```typescript
const parseBirthDate = (dateString: string) => parseDate(dateString, 'birthDate');
const parseCreatedAt = (timestamp: unknown) => parseDate(timestamp, 'createdAt');
```

## Array Processing Utilities

### `mapEffect<A, B, E, R>(array, f)`

Map over an array with Effect computations, executing all in parallel.

**Parameters:**
- `array: readonly A[]` - Array to map over
- `f: (item: A, index: number) => Effect.Effect<B, E, R>` - Mapping function

**Returns:** `Effect.Effect<readonly B[], E, R>`

**Examples:**
```typescript
// Fetch multiple users
const fetchUsers = (userIds: string[]) =>
  mapEffect(userIds, (id) => fetchUserFromAPI(id));

// Validate multiple inputs
const validateInputs = (inputs: unknown[]) =>
  mapEffect(inputs, (input, index) => 
    validateInput(input, isValidInput, `input[${index}]`)
  );
```

### `filterEffect<A, E, R>(array, predicate)`

Filter an array with Effect-based predicates.

**Parameters:**
- `array: readonly A[]` - Array to filter
- `predicate: (item: A, index: number) => Effect.Effect<boolean, E, R>` - Filter predicate

**Returns:** `Effect.Effect<readonly A[], E, R>`

**Examples:**
```typescript
// Filter users by active status
const filterActiveUsers = (users: User[]) =>
  filterEffect(users, (user) => checkUserActive(user.id));

// Filter valid configurations
const filterValidConfigs = (configs: Config[]) =>
  filterEffect(configs, (config) => validateConfig(config));
```

## Control Flow Utilities

### `when<A, E, R>(condition, effect)`

Conditionally execute an Effect based on a boolean condition.

**Parameters:**
- `condition: boolean` - Whether to execute the Effect
- `effect: Effect.Effect<A, E, R>` - Effect to execute conditionally

**Returns:** `Effect.Effect<A | undefined, E, R>`

**Examples:**
```typescript
// Conditional user update
const maybeUpdateUser = (shouldUpdate: boolean, userId: string, data: UserData) =>
  when(shouldUpdate, updateUser(userId, data));

// Conditional logging
const maybeLog = (isDebug: boolean, message: string) =>
  when(isDebug, Effect.sync(() => console.log(message)));
```

### `unless<A, E, R>(condition, effect)`

Execute an Effect unless a condition is true (negated `when`).

**Parameters:**
- `condition: boolean` - Condition to negate
- `effect: Effect.Effect<A, E, R>` - Effect to execute unless condition is true

**Returns:** `Effect.Effect<A | undefined, E, R>`

**Examples:**
```typescript
// Skip cache unless expired
const skipCacheUnlessExpired = (isExpired: boolean, fetchFresh: Effect.Effect<Data, Error>) =>
  unless(isExpired, fetchFresh);
```

## Side Effect Utilities

### `tapLog(message)`

Add logging side effect to an Effect pipeline.

**Parameters:**
- `message: string` - Message to log

**Returns:** `(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>`

**Examples:**
```typescript
// Add logging to pipeline
pipe(
  fetchUserData(userId),
  tapLog('Fetching user data'),
  Effect.map(processUserData),
  tapLog('Processing complete')
);
```

### `tapError(onError)`

Add error handling side effect without changing the error.

**Parameters:**
- `onError: (error: E) => Effect.Effect<void, never, R>` - Error handler

**Returns:** `(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>`

**Examples:**
```typescript
// Log errors without handling them
pipe(
  riskyOperation(),
  tapError((error) => 
    Effect.sync(() => console.error('Operation failed:', error))
  )
);
```

## Resource Management

### `bracket<A, B, E1, E2, R1, R2>(acquire, use, release)`

Resource acquisition and cleanup pattern ensuring proper resource management.

**Parameters:**
- `acquire: Effect.Effect<A, E1, R1>` - Acquire resource
- `use: (resource: A) => Effect.Effect<B, E2, R2>` - Use resource
- `release: (resource: A) => Effect.Effect<void, never, R1>` - Release resource

**Returns:** `Effect.Effect<B, E1 | E2, R1 | R2>`

**Examples:**
```typescript
// Database connection management
const withConnection = <T>(
  operation: (conn: Connection) => Effect.Effect<T, DatabaseError>
) =>
  bracket(
    acquireConnection(),
    operation,
    (conn) => Effect.sync(() => conn.close())
  );

// File handle management
const withFile = <T>(
  filename: string,
  operation: (file: FileHandle) => Effect.Effect<T, Error>
) =>
  bracket(
    Effect.tryPromise(() => fs.open(filename)),
    operation,
    (file) => Effect.sync(() => file.close())
  );
```

## Performance Utilities

### `memoize<A, E, R>(effect)`

Memoize an Effect to cache its result (simplified implementation).

**Parameters:**
- `effect: Effect.Effect<A, E, R>` - Effect to memoize

**Returns:** `Effect.Effect<A, E, R>`

**Examples:**
```typescript
// Memoize expensive computation
const expensiveComputation = memoize(
  Effect.sync(() => {
    // Heavy computation here
    return computeResult();
  })
);

// Memoize API call
const cachedUserFetch = memoize(fetchUserFromAPI(userId));
```

### `debounce<A, E, R>(effect, delay)`

Debounce Effect execution by adding a delay.

**Parameters:**
- `effect: Effect.Effect<A, E, R>` - Effect to debounce
- `delay: number` - Delay in milliseconds

**Returns:** `Effect.Effect<A, E, R>`

**Examples:**
```typescript
// Debounce search API calls
const debouncedSearch = (query: string) =>
  debounce(searchAPI(query), 300);

// Debounce save operations
const debouncedSave = (data: SaveData) =>
  debounce(saveToDatabase(data), 1000);
```

### `throttle<A, E, R>(effect, interval)`

Throttle Effect execution to limit frequency.

**Parameters:**
- `effect: Effect.Effect<A, E, R>` - Effect to throttle
- `interval: number` - Minimum interval between executions in milliseconds

**Returns:** `Effect.Effect<A, E, R>`

**Examples:**
```typescript
// Throttle analytics events
const throttledAnalytics = (event: AnalyticsEvent) =>
  throttle(sendAnalytics(event), 5000);

// Throttle status updates
const throttledStatusUpdate = (status: Status) =>
  throttle(updateStatus(status), 2000);
```

## Usage Patterns

### Combining Utilities

```typescript
// Complex data processing pipeline
const processUserData = (rawData: unknown[]) =>
  pipe(
    // Validate all inputs
    mapEffect(rawData, (data, index) => 
      validateInput(data, isUserData, `user[${index}]`)
    ),
    // Filter valid users
    Effect.flatMap((users) =>
      filterEffect(users, (user) => 
        Effect.succeed(user.isActive)
      )
    ),
    // Add logging
    tapLog('Processing user data'),
    // Add retry logic
    withRetry({ maxRetries: 3 }),
    // Add fallback
    withFallback([])
  );
```

### Error Handling Patterns

```typescript
// Comprehensive error handling
const robustDataFetch = (id: string) =>
  pipe(
    // Try primary source
    fromDatabasePromise(() => db.findById(id), 'findById'),
    // Retry on failure
    withRetry({ maxRetries: 2 }),
    // Fallback to cache
    Effect.catchTag('DatabaseError', () =>
      fromPromise(() => cache.get(id))
    ),
    // Final fallback
    withFallback({ id, data: null, source: 'fallback' }),
    // Log errors
    tapError((error) =>
      Effect.sync(() => console.error('Data fetch failed:', error))
    )
  );
```

### Resource Management Patterns

```typescript
// Database transaction with proper cleanup
const performTransaction = <T>(
  operations: (tx: Transaction) => Effect.Effect<T, DatabaseError>
) =>
  bracket(
    // Acquire transaction
    fromDatabasePromise(() => db.beginTransaction(), 'beginTransaction'),
    // Use transaction
    (tx) => pipe(
      operations(tx),
      Effect.tap(() => 
        fromDatabasePromise(() => tx.commit(), 'commit')
      )
    ),
    // Always rollback on error
    (tx) => Effect.sync(() => tx.rollback())
  );
```

## Best Practices

1. **Use Specific Converters**: Prefer `fromDatabasePromise` and `fromNetworkPromise` over generic `fromPromise`
2. **Validate Early**: Use validation utilities at system boundaries
3. **Handle Resources**: Always use `bracket` for resource management
4. **Add Context**: Include meaningful field names and operation names in errors
5. **Combine Patterns**: Use utilities together for robust error handling
6. **Performance**: Use memoization and throttling for expensive operations
7. **Logging**: Add `tapLog` and `tapError` for observability
