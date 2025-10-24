# Effect.ts Services Documentation

This document provides comprehensive documentation for all Effect services, including service interfaces, methods, types, layer composition examples, and dependency injection patterns.

## Table of Contents

- [Service Architecture Overview](#service-architecture-overview)
- [Core Service Interfaces](#core-service-interfaces)
- [Database Services](#database-services)
- [Authentication Services](#authentication-services)
- [Logging Services](#logging-services)
- [Configuration Services](#configuration-services)
- [Service Layer Composition](#service-layer-composition)
- [Dependency Injection Patterns](#dependency-injection-patterns)
- [Service Implementation Examples](#service-implementation-examples)
- [Testing Services](#testing-services)

## Service Architecture Overview

The Effect.ts integration follows a service-oriented architecture where each major functionality is implemented as an Effect service. Services are composed using Effect layers and injected through the Effect context system.

### Service Design Principles

1. **Interface Segregation**: Each service has a focused, single-responsibility interface
2. **Dependency Injection**: Services declare their dependencies through Effect context
3. **Layer Composition**: Services are composed into layers for runtime configuration
4. **Error Handling**: All service methods use typed Effect error handling
5. **Resource Management**: Services handle resource acquisition and cleanup automatically

### Service Hierarchy

```
AppServices (Union Type)
├── DatabaseService     # Database operations and transactions
├── AuthService        # Authentication and session management
├── LoggingService     # Structured logging and monitoring
└── ConfigService      # Configuration management
```

## Core Service Interfaces

### Service Context Tags

All services use Effect's Context system for dependency injection:

```typescript
import { Context } from "effect";

// Service context tags for dependency injection
export const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService");
export const AuthService = Context.GenericTag<AuthService>("AuthService");
export const LoggingService = Context.GenericTag<LoggingService>("LoggingService");
export const ConfigService = Context.GenericTag<ConfigService>("ConfigService");

// Combined service context type
export type AppServices = 
  | DatabaseService
  | AuthService
  | LoggingService
  | ConfigService;
```

### Service Access Pattern

```typescript
// Accessing services in Effect computations
const useServices = Effect.gen(function* (_) {
  const db = yield* _(DatabaseService);
  const auth = yield* _(AuthService);
  const logger = yield* _(LoggingService);
  const config = yield* _(ConfigService);
  
  // Use services...
  const user = yield* _(db.findUser("user-123"));
  yield* _(logger.info("User found", { userId: user.id }));
  
  return user;
});
```

## Database Services

### `DatabaseService` Interface

Provides Effect-based database operations with automatic error handling and resource management.

```typescript
interface DatabaseService {
  // Basic query operations
  readonly query: <T>(
    sql: string, 
    params?: unknown[]
  ) => Effect.Effect<T[], DatabaseError>;
  
  readonly queryOne: <T>(
    sql: string, 
    params?: unknown[]
  ) => Effect.Effect<T | null, DatabaseError>;
  
  readonly execute: (
    sql: string, 
    params?: unknown[]
  ) => Effect.Effect<{ affectedRows: number }, DatabaseError>;
  
  // Transaction support
  readonly transaction: <T, E>(
    operation: Effect.Effect<T, E, DatabaseService>
  ) => Effect.Effect<T, DatabaseError | E>;
  
  // Connection management
  readonly withConnection: <T, E>(
    operation: (connection: Connection) => Effect.Effect<T, E>
  ) => Effect.Effect<T, DatabaseError | E>;
  
  // Health check
  readonly healthCheck: () => Effect.Effect<{ status: "healthy" | "unhealthy" }, DatabaseError>;
}
```

### Database Service Methods

#### `query<T>(sql: string, params?: unknown[]): Effect<T[], DatabaseError>`

Executes a SQL query and returns multiple results.

**Parameters:**
- `sql`: SQL query string with parameter placeholders
- `params`: Optional array of query parameters

**Returns:** Effect with array of query results or DatabaseError

**Examples:**

```typescript
// Basic query
const findAllUsers = () => 
  DatabaseService.pipe(
    Effect.flatMap(db => db.query<User>("SELECT * FROM users"))
  );

// Parameterized query
const findUsersByRole = (role: string) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.query<User>(
      "SELECT * FROM users WHERE role = ?", 
      [role]
    ))
  );

// Complex query with joins
const findUsersWithOrders = () =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.query<UserWithOrders>(`
      SELECT u.*, COUNT(o.id) as order_count 
      FROM users u 
      LEFT JOIN orders o ON u.id = o.user_id 
      GROUP BY u.id
    `))
  );
```

#### `queryOne<T>(sql: string, params?: unknown[]): Effect<T | null, DatabaseError>`

Executes a SQL query and returns a single result or null.

**Parameters:**
- `sql`: SQL query string with parameter placeholders
- `params`: Optional array of query parameters

**Returns:** Effect with single result, null, or DatabaseError

**Examples:**

```typescript
// Find single user
const findUserById = (id: string) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.queryOne<User>(
      "SELECT * FROM users WHERE id = ?", 
      [id]
    ))
  );

// Get user count
const getUserCount = () =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM users"
    )),
    Effect.map(result => result?.count ?? 0)
  );
```

#### `execute(sql: string, params?: unknown[]): Effect<{ affectedRows: number }, DatabaseError>`

Executes a SQL statement (INSERT, UPDATE, DELETE) and returns affected row count.

**Parameters:**
- `sql`: SQL statement string with parameter placeholders
- `params`: Optional array of statement parameters

**Returns:** Effect with affected rows count or DatabaseError

**Examples:**

```typescript
// Insert user
const createUser = (userData: CreateUserData) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.execute(
      "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
      [userData.id, userData.name, userData.email]
    ))
  );

// Update user
const updateUser = (id: string, updates: Partial<User>) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [updates.name, updates.email, id]
    ))
  );

// Delete user
const deleteUser = (id: string) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    ))
  );
```

#### `transaction<T, E>(operation: Effect<T, E, DatabaseService>): Effect<T, DatabaseError | E>`

Executes multiple database operations within a transaction with automatic rollback on failure.

**Parameters:**
- `operation`: Effect computation that uses DatabaseService within transaction

**Returns:** Effect with transaction result or DatabaseError

**Examples:**

```typescript
// Transfer money between accounts
const transferMoney = (fromId: string, toId: string, amount: number) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.transaction(
      Effect.gen(function* (_) {
        // Debit from source account
        const debitResult = yield* _(db.execute(
          "UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?",
          [amount, fromId, amount]
        ));
        
        if (debitResult.affectedRows === 0) {
          yield* _(Effect.fail(new BusinessLogicError({
            message: "Insufficient funds",
            code: "INSUFFICIENT_FUNDS",
            context: { fromId, amount }
          })));
        }
        
        // Credit to destination account
        yield* _(db.execute(
          "UPDATE accounts SET balance = balance + ? WHERE id = ?",
          [amount, toId]
        ));
        
        // Log transaction
        yield* _(db.execute(
          "INSERT INTO transactions (from_id, to_id, amount, type) VALUES (?, ?, ?, ?)",
          [fromId, toId, amount, "transfer"]
        ));
        
        return { success: true, amount };
      })
    ))
  );

// Create user with profile
const createUserWithProfile = (userData: UserData, profileData: ProfileData) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.transaction(
      Effect.gen(function* (_) {
        // Create user
        yield* _(db.execute(
          "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
          [userData.id, userData.email, userData.name]
        ));
        
        // Create profile
        yield* _(db.execute(
          "INSERT INTO profiles (user_id, bio, avatar_url) VALUES (?, ?, ?)",
          [userData.id, profileData.bio, profileData.avatarUrl]
        ));
        
        return { userId: userData.id };
      })
    ))
  );
```

#### `withConnection<T, E>(operation: (connection: Connection) => Effect<T, E>): Effect<T, DatabaseError | E>`

Provides a dedicated database connection for the operation with automatic cleanup.

**Parameters:**
- `operation`: Function that receives a connection and returns an Effect

**Returns:** Effect with operation result or DatabaseError

**Examples:**

```typescript
// Bulk insert with dedicated connection
const bulkInsertUsers = (users: User[]) =>
  DatabaseService.pipe(
    Effect.flatMap(db => db.withConnection(connection =>
      Effect.gen(function* (_) {
        // Prepare statement once
        const stmt = yield* _(Effect.sync(() => 
          connection.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)")
        ));
        
        // Execute for each user
        for (const user of users) {
          yield* _(Effect.tryPromise({
            try: () => stmt.execute([user.id, user.name, user.email]),
            catch: (error) => new DatabaseError({
              message: "Bulk insert failed",
              operation: "bulkInsertUsers",
              cause: error
            })
          }));
        }
        
        return { inserted: users.length };
      })
    ))
  );
```

### Database Error Types

```typescript
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly operation: string;
  readonly cause?: unknown;
  readonly timestamp: Date;
}>

// Common database error scenarios
const handleDatabaseError = (error: DatabaseError) => {
  switch (true) {
    case error.message.includes("connection"):
      return { type: "connection", retry: true };
    case error.message.includes("timeout"):
      return { type: "timeout", retry: true };
    case error.message.includes("constraint"):
      return { type: "constraint", retry: false };
    case error.message.includes("deadlock"):
      return { type: "deadlock", retry: true };
    default:
      return { type: "unknown", retry: false };
  }
};
```

## Authentication Services

### `AuthService` Interface

Provides Effect-based authentication operations including token validation, session management, and user authentication.

```typescript
interface AuthService {
  // Token operations
  readonly validateToken: (
    token: string
  ) => Effect.Effect<TokenPayload, AuthError>;
  
  readonly generateToken: (
    payload: TokenPayload
  ) => Effect.Effect<string, AuthError>;
  
  readonly refreshToken: (
    refreshToken: string
  ) => Effect.Effect<{ accessToken: string; refreshToken: string }, AuthError>;
  
  // Session management
  readonly createSession: (
    userId: string
  ) => Effect.Effect<Session, AuthError>;
  
  readonly getSession: (
    sessionId: string
  ) => Effect.Effect<Session | null, AuthError>;
  
  readonly revokeSession: (
    sessionId: string
  ) => Effect.Effect<void, AuthError>;
  
  readonly revokeAllSessions: (
    userId: string
  ) => Effect.Effect<{ revokedCount: number }, AuthError>;
  
  // User authentication
  readonly authenticateUser: (
    credentials: LoginCredentials
  ) => Effect.Effect<AuthResult, AuthError>;
  
  readonly validatePassword: (
    password: string,
    hashedPassword: string
  ) => Effect.Effect<boolean, AuthError>;
  
  readonly hashPassword: (
    password: string
  ) => Effect.Effect<string, AuthError>;
}
```

### Authentication Service Methods

#### `validateToken(token: string): Effect<TokenPayload, AuthError>`

Validates a JWT token and returns the payload if valid.

**Parameters:**
- `token`: JWT token string to validate

**Returns:** Effect with token payload or AuthError

**Examples:**

```typescript
// Validate access token
const validateAccessToken = (token: string) =>
  AuthService.pipe(
    Effect.flatMap(auth => auth.validateToken(token)),
    Effect.catchTag("AuthError", (error) => {
      switch (error.type) {
        case "InvalidToken":
          return Effect.fail(new UnauthorizedError({
            message: "Invalid access token",
            action: "token_validation"
          }));
        case "SessionExpired":
          return Effect.fail(new UnauthorizedError({
            message: "Token has expired",
            action: "token_refresh"
          }));
        default:
          return Effect.fail(error);
      }
    })
  );

// Extract user ID from token
const getUserIdFromToken = (token: string) =>
  AuthService.pipe(
    Effect.flatMap(auth => auth.validateToken(token)),
    Effect.map(payload => payload.userId)
  );
```

#### `createSession(userId: string): Effect<Session, AuthError>`

Creates a new user session with tokens.

**Parameters:**
- `userId`: ID of the user to create session for

**Returns:** Effect with session data or AuthError

**Examples:**

```typescript
// Create session after login
const loginUser = (credentials: LoginCredentials) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);
    
    // Authenticate user
    const authResult = yield* _(auth.authenticateUser(credentials));
    
    // Create session
    const session = yield* _(auth.createSession(authResult.userId));
    
    return {
      user: authResult.user,
      session: session,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    };
  });

// Create session with custom expiry
const createExtendedSession = (userId: string) =>
  AuthService.pipe(
    Effect.flatMap(auth => auth.createSession(userId)),
    Effect.tap(session => 
      LoggingService.pipe(
        Effect.flatMap(logger => logger.info("Extended session created", {
          userId,
          sessionId: session.id,
          expiresAt: session.expiresAt
        }))
      )
    )
  );
```

#### `authenticateUser(credentials: LoginCredentials): Effect<AuthResult, AuthError>`

Authenticates user credentials and returns user information.

**Parameters:**
- `credentials`: User login credentials (email/password)

**Returns:** Effect with authentication result or AuthError

**Examples:**

```typescript
// Basic user authentication
const authenticateLogin = (email: string, password: string) =>
  AuthService.pipe(
    Effect.flatMap(auth => auth.authenticateUser({ email, password })),
    Effect.catchTag("AuthError", (error) => {
      switch (error.type) {
        case "InvalidCredentials":
          return Effect.succeed({ 
            success: false, 
            error: "Invalid email or password" 
          });
        case "UserNotFound":
          return Effect.succeed({ 
            success: false, 
            error: "Account not found" 
          });
        default:
          return Effect.succeed({ 
            success: false, 
            error: "Authentication failed" 
          });
      }
    })
  );

// Authentication with rate limiting
const authenticateWithRateLimit = (credentials: LoginCredentials, clientIp: string) =>
  Effect.gen(function* (_) {
    const auth = yield* _(AuthService);
    
    // Check rate limit (simplified)
    const rateLimitOk = yield* _(checkRateLimit(clientIp));
    if (!rateLimitOk) {
      yield* _(Effect.fail(new AuthError({
        message: "Too many login attempts",
        type: "InvalidCredentials"
      })));
    }
    
    // Authenticate
    const result = yield* _(auth.authenticateUser(credentials));
    
    // Reset rate limit on success
    yield* _(resetRateLimit(clientIp));
    
    return result;
  });
```

### Authentication Error Types

```typescript
class AuthError extends Data.TaggedError("AuthError")<{
  readonly message: string;
  readonly type: AuthErrorType;
  readonly timestamp: Date;
}>

type AuthErrorType = 
  | "InvalidToken"
  | "SessionExpired" 
  | "UserNotFound"
  | "InvalidCredentials";

// Authentication error handling patterns
const handleAuthError = (error: AuthError) => {
  switch (error.type) {
    case "SessionExpired":
      return { action: "refresh_token", redirectTo: "/login" };
    case "InvalidToken":
      return { action: "login_required", redirectTo: "/login" };
    case "InvalidCredentials":
      return { action: "retry_login", message: "Invalid credentials" };
    case "UserNotFound":
      return { action: "signup_suggested", redirectTo: "/signup" };
  }
};
```

## Logging Services

### `LoggingService` Interface

Provides structured logging with correlation IDs, different log levels, and contextual information.

```typescript
interface LoggingService {
  // Basic logging methods
  readonly debug: (
    message: string, 
    context?: Record<string, unknown>
  ) => Effect.Effect<void, never>;
  
  readonly info: (
    message: string, 
    context?: Record<string, unknown>
  ) => Effect.Effect<void, never>;
  
  readonly warn: (
    message: string, 
    context?: Record<string, unknown>
  ) => Effect.Effect<void, never>;
  
  readonly error: (
    message: string, 
    context?: Record<string, unknown>
  ) => Effect.Effect<void, never>;
  
  // Structured logging
  readonly logWithCorrelationId: (
    level: LogLevel,
    message: string,
    correlationId: string,
    context?: Record<string, unknown>
  ) => Effect.Effect<void, never>;
  
  // Performance logging
  readonly logDuration: <T, E, R>(
    operation: string,
    effect: Effect.Effect<T, E, R>
  ) => Effect.Effect<T, E, R>;
  
  // Error logging
  readonly logError: (
    error: ApplicationError,
    context?: Record<string, unknown>
  ) => Effect.Effect<void, never>;
}

type LogLevel = "debug" | "info" | "warn" | "error";
```

### Logging Service Methods

#### Basic Logging Methods

```typescript
// Debug logging
const debugUserOperation = (userId: string, operation: string) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.debug("User operation started", {
      userId,
      operation,
      timestamp: new Date().toISOString()
    }))
  );

// Info logging
const logSuccessfulLogin = (userId: string, clientIp: string) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.info("User logged in successfully", {
      userId,
      clientIp,
      timestamp: new Date().toISOString()
    }))
  );

// Warning logging
const logSuspiciousActivity = (userId: string, activity: string) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.warn("Suspicious user activity detected", {
      userId,
      activity,
      severity: "medium",
      timestamp: new Date().toISOString()
    }))
  );

// Error logging
const logDatabaseError = (error: DatabaseError, context: Record<string, unknown>) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.error("Database operation failed", {
      error: error.message,
      operation: error.operation,
      cause: error.cause,
      ...context
    }))
  );
```

#### `logDuration<T, E, R>(operation: string, effect: Effect<T, E, R>): Effect<T, E, R>`

Logs the execution duration of an Effect operation.

**Parameters:**
- `operation`: Name of the operation being timed
- `effect`: Effect to measure and execute

**Returns:** Original Effect with duration logging side effect

**Examples:**

```typescript
// Log database query duration
const timedDatabaseQuery = <T>(query: string, params: unknown[]) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.logDuration(
      `database_query:${query.split(' ')[0].toLowerCase()}`,
      DatabaseService.pipe(
        Effect.flatMap(db => db.query<T>(query, params))
      )
    ))
  );

// Log API call duration
const timedApiCall = (url: string) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.logDuration(
      `api_call:${new URL(url).hostname}`,
      fromNetworkPromise(() => fetch(url).then(r => r.json()), url)
    ))
  );

// Log business operation duration
const timedOrderProcessing = (orderId: string) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.logDuration(
      "order_processing",
      processOrder(orderId)
    ))
  );
```

#### `logError(error: ApplicationError, context?: Record<string, unknown>): Effect<void, never>`

Logs application errors with structured context information.

**Parameters:**
- `error`: Application error to log
- `context`: Optional additional context

**Returns:** Effect that logs the error

**Examples:**

```typescript
// Log validation errors
const logValidationError = (error: ValidationError, requestId: string) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.logError(error, {
      requestId,
      field: error.field,
      value: error.value,
      userAgent: "Mozilla/5.0..."
    }))
  );

// Log business logic errors
const logBusinessError = (error: BusinessLogicError, userId: string) =>
  LoggingService.pipe(
    Effect.flatMap(logger => logger.logError(error, {
      userId,
      errorCode: error.code,
      businessContext: error.context
    }))
  );
```

## Configuration Services

### `ConfigService` Interface

Provides type-safe configuration management with validation and environment-specific settings.

```typescript
interface ConfigService {
  // Configuration access
  readonly getConfig: () => Effect.Effect<AppConfig, ConfigError>;
  
  readonly getDatabaseConfig: () => Effect.Effect<DatabaseConfig, ConfigError>;
  
  readonly getAuthConfig: () => Effect.Effect<AuthConfig, ConfigError>;
  
  readonly getServerConfig: () => Effect.Effect<ServerConfig, ConfigError>;
  
  readonly getLoggingConfig: () => Effect.Effect<LoggingConfig, ConfigError>;
  
  // Environment-specific config
  readonly getEnvironment: () => Effect.Effect<Environment, never>;
  
  readonly isProduction: () => Effect.Effect<boolean, never>;
  
  readonly isDevelopment: () => Effect.Effect<boolean, never>;
  
  // Configuration validation
  readonly validateConfig: (
    config: unknown
  ) => Effect.Effect<AppConfig, ConfigError>;
}

type Environment = "development" | "staging" | "production";
```

### Configuration Service Methods

```typescript
// Get complete application configuration
const getAppConfiguration = () =>
  ConfigService.pipe(
    Effect.flatMap(config => config.getConfig()),
    Effect.tap(appConfig => 
      LoggingService.pipe(
        Effect.flatMap(logger => logger.info("Configuration loaded", {
          environment: appConfig.environment,
          databaseUrl: appConfig.database.url.replace(/\/\/.*@/, "//***@"), // Mask credentials
          serverPort: appConfig.server.port
        }))
      )
    )
  );

// Environment-specific behavior
const getDatabaseConnectionString = () =>
  Effect.gen(function* (_) {
    const config = yield* _(ConfigService);
    const isProduction = yield* _(config.isProduction());
    const dbConfig = yield* _(config.getDatabaseConfig());
    
    if (isProduction) {
      // Use connection pooling in production
      return `${dbConfig.url}?pool=true&max_connections=${dbConfig.maxConnections}`;
    } else {
      // Simple connection for development
      return dbConfig.url;
    }
  });
```

## Service Layer Composition

### Layer Definition

Services are composed into layers that define how to construct and provide service instances.

```typescript
import { Layer } from "effect";

// Individual service layers
export const DatabaseLive: Layer.Layer<DatabaseService, ConfigError> = Layer.effect(
  DatabaseService,
  Effect.gen(function* (_) {
    const config = yield* _(ConfigService);
    const dbConfig = yield* _(config.getDatabaseConfig());
    
    // Create database connection pool
    const pool = yield* _(createConnectionPool(dbConfig));
    
    return {
      query: (sql, params) => executeQuery(pool, sql, params),
      queryOne: (sql, params) => executeQueryOne(pool, sql, params),
      execute: (sql, params) => executeStatement(pool, sql, params),
      transaction: (operation) => executeTransaction(pool, operation),
      withConnection: (operation) => withPoolConnection(pool, operation),
      healthCheck: () => checkPoolHealth(pool)
    };
  })
);

export const AuthLive: Layer.Layer<AuthService, ConfigError> = Layer.effect(
  AuthService,
  Effect.gen(function* (_) {
    const config = yield* _(ConfigService);
    const authConfig = yield* _(config.getAuthConfig());
    
    return {
      validateToken: (token) => validateJWT(token, authConfig.jwtSecret),
      generateToken: (payload) => generateJWT(payload, authConfig.jwtSecret),
      refreshToken: (refreshToken) => refreshJWT(refreshToken, authConfig),
      createSession: (userId) => createUserSession(userId, authConfig),
      getSession: (sessionId) => retrieveSession(sessionId),
      revokeSession: (sessionId) => invalidateSession(sessionId),
      revokeAllSessions: (userId) => invalidateAllUserSessions(userId),
      authenticateUser: (credentials) => authenticateCredentials(credentials),
      validatePassword: (password, hash) => verifyPassword(password, hash),
      hashPassword: (password) => hashUserPassword(password)
    };
  })
);

export const LoggingLive: Layer.Layer<LoggingService, ConfigError> = Layer.effect(
  LoggingService,
  Effect.gen(function* (_) {
    const config = yield* _(ConfigService);
    const loggingConfig = yield* _(config.getLoggingConfig());
    
    const logger = createLogger(loggingConfig);
    
    return {
      debug: (message, context) => logMessage(logger, "debug", message, context),
      info: (message, context) => logMessage(logger, "info", message, context),
      warn: (message, context) => logMessage(logger, "warn", message, context),
      error: (message, context) => logMessage(logger, "error", message, context),
      logWithCorrelationId: (level, message, correlationId, context) => 
        logWithCorrelation(logger, level, message, correlationId, context),
      logDuration: (operation, effect) => measureAndLog(logger, operation, effect),
      logError: (error, context) => logApplicationError(logger, error, context)
    };
  })
);

export const ConfigLive: Layer.Layer<ConfigService, ConfigError> = Layer.effect(
  ConfigService,
  Effect.gen(function* (_) {
    const config = yield* _(loadConfiguration());
    
    return {
      getConfig: () => Effect.succeed(config),
      getDatabaseConfig: () => Effect.succeed(config.database),
      getAuthConfig: () => Effect.succeed(config.auth),
      getServerConfig: () => Effect.succeed(config.server),
      getLoggingConfig: () => Effect.succeed(config.logging),
      getEnvironment: () => Effect.succeed(config.environment),
      isProduction: () => Effect.succeed(config.environment === "production"),
      isDevelopment: () => Effect.succeed(config.environment === "development"),
      validateConfig: (rawConfig) => validateAppConfig(rawConfig)
    };
  })
);
```

### Main Application Layer

```typescript
// Compose all services into main application layer
export const AppLayer: Layer.Layer<AppServices, ConfigError> = Layer.mergeAll(
  ConfigLive,
  DatabaseLive,
  AuthLive,
  LoggingLive
);

// Alternative composition with dependencies
export const AppLayerWithDependencies = pipe(
  ConfigLive,
  Layer.provide(DatabaseLive),
  Layer.provide(AuthLive),
  Layer.provide(LoggingLive)
);
```

## Dependency Injection Patterns

### Service Dependencies

```typescript
// Service that depends on other services
const UserService = {
  createUser: (userData: CreateUserData) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const auth = yield* _(AuthService);
      const logger = yield* _(LoggingService);
      
      // Validate user data
      const validatedData = yield* _(validateUserData(userData));
      
      // Hash password
      const hashedPassword = yield* _(auth.hashPassword(validatedData.password));
      
      // Create user in database
      const result = yield* _(db.execute(
        "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
        [validatedData.id, validatedData.email, validatedData.name, hashedPassword]
      ));
      
      // Log user creation
      yield* _(logger.info("User created successfully", {
        userId: validatedData.id,
        email: validatedData.email
      }));
      
      return { userId: validatedData.id, created: true };
    }),
    
  authenticateAndCreateSession: (credentials: LoginCredentials) =>
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);
      const logger = yield* _(LoggingService);
      
      // Authenticate user
      const authResult = yield* _(auth.authenticateUser(credentials));
      
      // Create session
      const session = yield* _(auth.createSession(authResult.userId));
      
      // Log successful login
      yield* _(logger.info("User session created", {
        userId: authResult.userId,
        sessionId: session.id
      }));
      
      return {
        user: authResult.user,
        session: session
      };
    })
};
```

### Context Propagation

```typescript
// Propagate services through Effect context
const processUserRequest = (userId: string, requestData: RequestData) =>
  Effect.gen(function* (_) {
    // All services are available through context
    const db = yield* _(DatabaseService);
    const logger = yield* _(LoggingService);
    
    // Start request processing
    yield* _(logger.info("Processing user request", { userId, requestId: requestData.id }));
    
    // Process in steps, each with access to services
    const user = yield* _(findUserWithLogging(userId));
    const result = yield* _(processRequestWithLogging(user, requestData));
    const saved = yield* _(saveResultWithLogging(result));
    
    return saved;
  });

// Helper functions that use services from context
const findUserWithLogging = (userId: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    const logger = yield* _(LoggingService);
    
    yield* _(logger.debug("Finding user", { userId }));
    const user = yield* _(db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]));
    
    if (!user) {
      yield* _(logger.warn("User not found", { userId }));
      yield* _(Effect.fail(new NotFoundError({
        message: "User not found",
        resource: "User",
        id: userId
      })));
    }
    
    yield* _(logger.debug("User found", { userId, userName: user.name }));
    return user;
  });
```

### Service Mocking for Testing

```typescript
// Mock service implementations for testing
export const MockDatabaseService: DatabaseService = {
  query: (sql, params) => Effect.succeed([]),
  queryOne: (sql, params) => Effect.succeed(null),
  execute: (sql, params) => Effect.succeed({ affectedRows: 1 }),
  transaction: (operation) => operation,
  withConnection: (operation) => operation(mockConnection),
  healthCheck: () => Effect.succeed({ status: "healthy" })
};

export const MockAuthService: AuthService = {
  validateToken: (token) => Effect.succeed({ userId: "test-user", exp: Date.now() + 3600000 }),
  generateToken: (payload) => Effect.succeed("mock-token"),
  refreshToken: (refreshToken) => Effect.succeed({ 
    accessToken: "new-access-token", 
    refreshToken: "new-refresh-token" 
  }),
  createSession: (userId) => Effect.succeed({
    id: "mock-session",
    userId,
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresAt: new Date(Date.now() + 3600000)
  }),
  getSession: (sessionId) => Effect.succeed(null),
  revokeSession: (sessionId) => Effect.succeed(undefined),
  revokeAllSessions: (userId) => Effect.succeed({ revokedCount: 0 }),
  authenticateUser: (credentials) => Effect.succeed({
    userId: "test-user",
    user: { id: "test-user", email: credentials.email, name: "Test User" }
  }),
  validatePassword: (password, hash) => Effect.succeed(true),
  hashPassword: (password) => Effect.succeed("hashed-password")
};

// Test layer with mocks
export const TestLayer: Layer.Layer<AppServices, never> = Layer.mergeAll(
  Layer.succeed(DatabaseService, MockDatabaseService),
  Layer.succeed(AuthService, MockAuthService),
  Layer.succeed(LoggingService, MockLoggingService),
  Layer.succeed(ConfigService, MockConfigService)
);
```

## Service Implementation Examples

### Complete Database Service Implementation

```typescript
import { Pool, createPool } from "mysql2/promise";

const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* (_) {
    const config = yield* _(ConfigService);
    const dbConfig = yield* _(config.getDatabaseConfig());
    
    // Create connection pool
    const pool = yield* _(Effect.tryPromise({
      try: () => createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        connectionLimit: dbConfig.maxConnections,
        acquireTimeout: dbConfig.connectionTimeout
      }),
      catch: (error) => new DatabaseError({
        message: "Failed to create database pool",
        operation: "createPool",
        cause: error
      })
    }));
    
    return {
      query: <T>(sql: string, params?: unknown[]) =>
        Effect.tryPromise({
          try: async () => {
            const [rows] = await pool.execute(sql, params);
            return rows as T[];
          },
          catch: (error) => new DatabaseError({
            message: `Query failed: ${error}`,
            operation: "query",
            cause: error
          })
        }),
        
      queryOne: <T>(sql: string, params?: unknown[]) =>
        Effect.tryPromise({
          try: async () => {
            const [rows] = await pool.execute(sql, params);
            const results = rows as T[];
            return results.length > 0 ? results[0] : null;
          },
          catch: (error) => new DatabaseError({
            message: `Query one failed: ${error}`,
            operation: "queryOne",
            cause: error
          })
        }),
        
      execute: (sql: string, params?: unknown[]) =>
        Effect.tryPromise({
          try: async () => {
            const [result] = await pool.execute(sql, params);
            return { affectedRows: (result as any).affectedRows };
          },
          catch: (error) => new DatabaseError({
            message: `Execute failed: ${error}`,
            operation: "execute",
            cause: error
          })
        }),
        
      transaction: <T, E>(operation: Effect.Effect<T, E, DatabaseService>) =>
        Effect.gen(function* (_) {
          const connection = yield* _(Effect.tryPromise({
            try: () => pool.getConnection(),
            catch: (error) => new DatabaseError({
              message: "Failed to get connection for transaction",
              operation: "transaction",
              cause: error
            })
          }));
          
          try {
            yield* _(Effect.tryPromise({
              try: () => connection.beginTransaction(),
              catch: (error) => new DatabaseError({
                message: "Failed to begin transaction",
                operation: "beginTransaction",
                cause: error
              })
            }));
            
            const result = yield* _(Effect.provide(
              operation,
              Layer.succeed(DatabaseService, createTransactionService(connection))
            ));
            
            yield* _(Effect.tryPromise({
              try: () => connection.commit(),
              catch: (error) => new DatabaseError({
                message: "Failed to commit transaction",
                operation: "commit",
                cause: error
              })
            }));
            
            return result;
          } catch (error) {
            yield* _(Effect.tryPromise({
              try: () => connection.rollback(),
              catch: () => {} // Ignore rollback errors
            }));
            
            yield* _(Effect.fail(error));
          } finally {
            connection.release();
          }
        }),
        
      withConnection: <T, E>(operation: (connection: Connection) => Effect.Effect<T, E>) =>
        Effect.gen(function* (_) {
          const connection = yield* _(Effect.tryPromise({
            try: () => pool.getConnection(),
            catch: (error) => new DatabaseError({
              message: "Failed to get connection",
              operation: "getConnection",
              cause: error
            })
          }));
          
          try {
            const result = yield* _(operation(connection));
            return result;
          } finally {
            connection.release();
          }
        }),
        
      healthCheck: () =>
        Effect.tryPromise({
          try: async () => {
            await pool.execute("SELECT 1");
            return { status: "healthy" as const };
          },
          catch: () => ({ status: "unhealthy" as const })
        })
    };
  })
);
```

## Testing Services

### Service Testing Patterns

```typescript
// Test individual service methods
describe("DatabaseService", () => {
  const TestRuntime = ManagedRuntime.make(TestLayer);
  
  it("should query users successfully", async () => {
    const result = await TestRuntime.runPromise(
      DatabaseService.pipe(
        Effect.flatMap(db => db.query<User>("SELECT * FROM users"))
      )
    );
    
    expect(result).toEqual([]);
  });
  
  it("should handle database errors", async () => {
    const mockDb = {
      ...MockDatabaseService,
      query: () => Effect.fail(new DatabaseError({
        message: "Connection failed",
        operation: "query"
      }))
    };
    
    const testLayer = Layer.succeed(DatabaseService, mockDb);
    
    const result = await TestRuntime.runPromise(
      Effect.provide(
        DatabaseService.pipe(
          Effect.flatMap(db => db.query("SELECT * FROM users")),
          Effect.either
        ),
        testLayer
      )
    );
    
    expect(result._tag).toBe("Left");
    expect(result.left._tag).toBe("DatabaseError");
  });
});

// Test service composition
describe("UserService", () => {
  it("should create user with all services", async () => {
    const result = await TestRuntime.runPromise(
      UserService.createUser({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        password: "password123"
      })
    );
    
    expect(result.userId).toBe("user-123");
    expect(result.created).toBe(true);
  });
});
```

This comprehensive service documentation provides the foundation for implementing and using Effect services throughout the Better-T-Stack application. The service-oriented architecture enables clean separation of concerns, testability, and maintainable dependency management.
