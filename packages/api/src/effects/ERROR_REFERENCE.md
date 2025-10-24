# Effect.ts Error Types and Hierarchy Reference

This document provides comprehensive documentation for all custom error types, error construction patterns, handling strategies, and propagation patterns in the Effect.ts integration.

## Table of Contents

- [Error Hierarchy Overview](#error-hierarchy-overview)
- [Base Error Classes](#base-error-classes)
- [Specific Error Types](#specific-error-types)
- [Error Construction Patterns](#error-construction-patterns)
- [Error Handling Strategies](#error-handling-strategies)
- [Error Propagation and Transformation](#error-propagation-and-transformation)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

## Error Hierarchy Overview

The Effect.ts integration uses a structured error hierarchy based on Effect's tagged error system. All errors extend from tagged error classes and include timestamp tracking for debugging.

```
ApplicationError (Union Type)
├── AppError (Abstract Base)
├── ValidationError
├── NotFoundError
├── UnauthorizedError
├── ForbiddenError
├── DatabaseError
├── AuthError
├── NetworkError
├── BusinessLogicError
└── ConfigError
```

### Error Type Union

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

## Base Error Classes

### `AppError` (Abstract Base Class)

Abstract base class for all application errors. **Do not instantiate directly.**

```typescript
abstract class AppError extends Data.TaggedError("AppError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Human-readable error description
- `cause`: Optional underlying cause of the error
- `timestamp`: Automatically set creation timestamp
- `_tag`: Always "AppError" (inherited from TaggedError)

**Usage:**
```typescript
// ❌ Don't use AppError directly
throw new AppError({ message: "Something went wrong" });

// ✅ Use specific error types instead
throw new ValidationError({ message: "Invalid input", field: "email", value: "invalid" });
```

## Specific Error Types

### `ValidationError`

Used for input validation failures and data format errors.

```typescript
class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly field: string;
  readonly value: unknown;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Description of validation failure
- `field`: Name of the field that failed validation
- `value`: The invalid value that caused the failure
- `timestamp`: Error creation time
- `_tag`: "ValidationError"

**Construction Examples:**

```typescript
// Email validation failure
throw new ValidationError({
  message: "Email format is invalid",
  field: "email",
  value: "not-an-email"
});

// Required field missing
throw new ValidationError({
  message: "Username is required",
  field: "username",
  value: undefined
});

// Number range validation
throw new ValidationError({
  message: "Age must be between 18 and 120",
  field: "age",
  value: 150
});

// JSON parsing error
throw new ValidationError({
  message: "Invalid JSON format in configuration",
  field: "config",
  value: "{ invalid json"
});
```

**Handling Patterns:**

```typescript
// Basic error handling
Effect.catchTag("ValidationError", (error) => {
  console.error(`Validation failed for ${error.field}: ${error.message}`);
  return Effect.succeed({ 
    error: "Invalid input", 
    field: error.field,
    details: error.message 
  });
})

// Field-specific handling
Effect.catchTag("ValidationError", (error) => {
  switch (error.field) {
    case "email":
      return Effect.succeed({ error: "Please enter a valid email address" });
    case "password":
      return Effect.succeed({ error: "Password must be at least 8 characters" });
    default:
      return Effect.succeed({ error: `Invalid ${error.field}` });
  }
})
```

### `NotFoundError`

Used when requested resources or entities cannot be found.

```typescript
class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
  readonly resource: string;
  readonly id: string;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Human-readable error message
- `resource`: Type of resource that was not found (e.g., "User", "Order")
- `id`: Identifier of the missing resource
- `timestamp`: Error creation time
- `_tag`: "NotFoundError"

**Construction Examples:**

```typescript
// User not found
throw new NotFoundError({
  message: "User not found",
  resource: "User",
  id: "user-123"
});

// Order not found
throw new NotFoundError({
  message: "Order does not exist or has been deleted",
  resource: "Order",
  id: "order-456"
});

// File not found
throw new NotFoundError({
  message: "Configuration file not found",
  resource: "ConfigFile",
  id: "/etc/app/config.json"
});
```

**Handling Patterns:**

```typescript
// Return appropriate HTTP status
Effect.catchTag("NotFoundError", (error) => {
  return Effect.succeed({ 
    status: 404,
    error: `${error.resource} with ID ${error.id} not found` 
  });
})

// Resource-specific handling
Effect.catchTag("NotFoundError", (error) => {
  switch (error.resource) {
    case "User":
      return Effect.succeed({ error: "User account not found", redirectTo: "/signup" });
    case "Order":
      return Effect.succeed({ error: "Order not found", redirectTo: "/orders" });
    default:
      return Effect.succeed({ error: "Resource not found" });
  }
})
```

### `UnauthorizedError`

Used for authentication failures when user credentials are missing or invalid.

```typescript
class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string;
  readonly action: string;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Human-readable error message
- `action`: The action that required authentication
- `timestamp`: Error creation time
- `_tag`: "UnauthorizedError"

**Construction Examples:**

```typescript
// Missing authentication
throw new UnauthorizedError({
  message: "Authentication required",
  action: "access_user_profile"
});

// Invalid token
throw new UnauthorizedError({
  message: "Invalid or expired authentication token",
  action: "update_user_settings"
});

// Session expired
throw new UnauthorizedError({
  message: "Session has expired, please log in again",
  action: "create_order"
});
```

**Handling Patterns:**

```typescript
// Redirect to login
Effect.catchTag("UnauthorizedError", (error) => {
  return Effect.succeed({ 
    status: 401,
    error: "Please log in to continue", 
    redirectTo: "/login",
    returnUrl: `/action/${error.action}`
  });
})

// Action-specific messages
Effect.catchTag("UnauthorizedError", (error) => {
  const actionMessages = {
    "access_user_profile": "Please log in to view your profile",
    "create_order": "Please log in to place an order",
    "update_settings": "Please log in to update your settings"
  };
  
  return Effect.succeed({
    error: actionMessages[error.action] || "Authentication required",
    action: "login_required"
  });
})
```

### `ForbiddenError`

Used for authorization failures when authenticated users lack permissions.

```typescript
class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string;
  readonly resource: string;
  readonly action: string;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Human-readable error message
- `resource`: The resource that access was denied to
- `action`: The action that was not permitted
- `timestamp`: Error creation time
- `_tag`: "ForbiddenError"

**Construction Examples:**

```typescript
// Admin action denied
throw new ForbiddenError({
  message: "Insufficient permissions for admin actions",
  resource: "AdminPanel",
  action: "delete_user"
});

// Resource access denied
throw new ForbiddenError({
  message: "You don't have permission to modify this order",
  resource: "Order",
  action: "update"
});

// Feature access denied
throw new ForbiddenError({
  message: "Premium feature requires subscription",
  resource: "PremiumFeature",
  action: "access"
});
```

**Handling Patterns:**

```typescript
// Permission-based responses
Effect.catchTag("ForbiddenError", (error) => {
  return Effect.succeed({ 
    status: 403,
    error: `Access denied: cannot ${error.action} on ${error.resource}`,
    requiredPermission: `${error.resource}:${error.action}`
  });
})

// Resource-specific handling
Effect.catchTag("ForbiddenError", (error) => {
  switch (error.resource) {
    case "AdminPanel":
      return Effect.succeed({ 
        error: "Admin privileges required", 
        contactSupport: true 
      });
    case "PremiumFeature":
      return Effect.succeed({ 
        error: "Upgrade to premium to access this feature", 
        upgradeUrl: "/upgrade" 
      });
    default:
      return Effect.succeed({ error: "Access denied" });
  }
})
```

### `DatabaseError`

Used for database operation failures including connection, query, and transaction errors.

```typescript
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly operation: string;
  readonly cause?: unknown;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Human-readable error message
- `operation`: The database operation that failed
- `cause`: Optional underlying database error
- `timestamp`: Error creation time
- `_tag`: "DatabaseError"

**Construction Examples:**

```typescript
// Connection timeout
throw new DatabaseError({
  message: "Database connection timeout",
  operation: "connect",
  cause: originalConnectionError
});

// Query failure
throw new DatabaseError({
  message: "Failed to execute user query",
  operation: "findUser",
  cause: sqlError
});

// Transaction rollback
throw new DatabaseError({
  message: "Transaction failed and was rolled back",
  operation: "createOrderWithItems",
  cause: transactionError
});

// Constraint violation
throw new DatabaseError({
  message: "Unique constraint violation on email field",
  operation: "createUser",
  cause: constraintError
});
```

**Handling Patterns:**

```typescript
// Retry on connection errors
Effect.catchTag("DatabaseError", (error) => {
  if (error.message.includes("connection") || error.message.includes("timeout")) {
    // Retry the operation
    return Effect.fail(error);
  }
  
  console.error(`Database ${error.operation} failed:`, error.cause);
  return Effect.succeed({ error: "Database temporarily unavailable" });
})

// Operation-specific handling
Effect.catchTag("DatabaseError", (error) => {
  switch (error.operation) {
    case "createUser":
      if (error.message.includes("unique constraint")) {
        return Effect.succeed({ error: "Email address already exists" });
      }
      break;
    case "findUser":
      return Effect.succeed({ error: "Unable to retrieve user data" });
    case "updateUser":
      return Effect.succeed({ error: "Unable to save changes" });
  }
  
  return Effect.succeed({ error: "Database operation failed" });
})
```

### `AuthError`

Used for authentication service failures with categorized error types.

```typescript
class AuthError extends Data.TaggedError("AuthError")<{
  readonly message: string;
  readonly type: AuthErrorType;
  readonly timestamp: Date;
}>
```

**AuthErrorType Values:**
- `"InvalidToken"`: JWT token is malformed or invalid
- `"SessionExpired"`: User session has expired
- `"UserNotFound"`: User account doesn't exist
- `"InvalidCredentials"`: Login credentials are incorrect

**Properties:**
- `message`: Human-readable error message
- `type`: Categorized authentication error type
- `timestamp`: Error creation time
- `_tag`: "AuthError"

**Construction Examples:**

```typescript
// Expired token
throw new AuthError({
  message: "JWT token has expired",
  type: "SessionExpired"
});

// Invalid credentials
throw new AuthError({
  message: "Email or password is incorrect",
  type: "InvalidCredentials"
});

// Malformed token
throw new AuthError({
  message: "Authentication token is malformed",
  type: "InvalidToken"
});

// User not found during auth
throw new AuthError({
  message: "User account not found",
  type: "UserNotFound"
});
```

**Handling Patterns:**

```typescript
// Type-based handling
Effect.catchTag("AuthError", (error) => {
  switch (error.type) {
    case "SessionExpired":
      return Effect.succeed({ 
        error: "Session expired", 
        action: "refresh_token",
        redirectTo: "/login"
      });
    case "InvalidToken":
      return Effect.succeed({ 
        error: "Invalid authentication", 
        action: "login_required" 
      });
    case "InvalidCredentials":
      return Effect.succeed({ 
        error: "Invalid email or password",
        action: "retry_login"
      });
    case "UserNotFound":
      return Effect.succeed({ 
        error: "Account not found",
        action: "signup_suggested"
      });
    default:
      return Effect.succeed({ error: "Authentication failed" });
  }
})

// Automatic token refresh on expiry
Effect.catchTag("AuthError", (error) => {
  if (error.type === "SessionExpired") {
    return pipe(
      refreshAuthToken(),
      Effect.flatMap(() => retryOriginalOperation()),
      Effect.catchAll(() => Effect.succeed({ error: "Please log in again" }))
    );
  }
  
  return Effect.succeed({ error: error.message });
})
```

### `NetworkError`

Used for external service communication failures and HTTP request errors.

```typescript
class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly url: string;
  readonly status?: number;
  readonly cause?: unknown;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Human-readable error message
- `url`: The URL that was being accessed
- `status`: Optional HTTP status code from failed request
- `cause`: Optional underlying network error
- `timestamp`: Error creation time
- `_tag`: "NetworkError"

**Construction Examples:**

```typescript
// Service unavailable
throw new NetworkError({
  message: "External service is unavailable",
  url: "https://api.external.com/data",
  status: 503,
  cause: fetchError
});

// Timeout error
throw new NetworkError({
  message: "Request timeout after 30 seconds",
  url: "https://slow-api.com/endpoint",
  cause: timeoutError
});

// Connection refused
throw new NetworkError({
  message: "Connection refused by server",
  url: "https://api.partner.com/webhook",
  status: undefined,
  cause: connectionError
});

// Rate limit exceeded
throw new NetworkError({
  message: "API rate limit exceeded",
  url: "https://api.service.com/users",
  status: 429,
  cause: rateLimitError
});
```

**Handling Patterns:**

```typescript
// Status code based handling
Effect.catchTag("NetworkError", (error) => {
  if (error.status) {
    switch (true) {
      case error.status >= 500:
        // Server errors - retry
        return Effect.fail(error);
      case error.status === 429:
        // Rate limit - wait and retry
        return pipe(
          Effect.sleep(Duration.seconds(60)),
          Effect.flatMap(() => Effect.fail(error))
        );
      case error.status === 404:
        return Effect.succeed({ error: "External resource not found" });
      case error.status >= 400:
        return Effect.succeed({ error: "Invalid request to external service" });
    }
  }
  
  return Effect.succeed({ error: "External service unavailable" });
})

// URL-based handling
Effect.catchTag("NetworkError", (error) => {
  if (error.url.includes("payment-gateway")) {
    return Effect.succeed({ 
      error: "Payment service temporarily unavailable",
      retryAfter: 300 
    });
  }
  
  if (error.url.includes("notification-service")) {
    // Log but don't fail the main operation
    console.warn("Notification service failed:", error.message);
    return Effect.succeed({ notificationFailed: true });
  }
  
  return Effect.succeed({ error: "External service error" });
})
```

### `BusinessLogicError`

Used for domain-specific business rule violations and workflow errors.

```typescript
class BusinessLogicError extends Data.TaggedError("BusinessLogicError")<{
  readonly message: string;
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: Date;
}>
```

**Properties:**
- `message`: Human-readable error description
- `code`: Machine-readable error code for programmatic handling
- `context`: Optional additional context about the error
- `timestamp`: Error creation time
- `_tag`: "BusinessLogicError"

**Construction Examples:**

```typescript
// Order state violation
throw new BusinessLogicError({
  message: "Cannot cancel order after shipping",
  code: "ORDER_ALREADY_SHIPPED",
  context: { 
    orderId: "order-123", 
    status: "shipped",
    shippedAt: "2024-01-15T10:30:00Z"
  }
});

// Insufficient inventory
throw new BusinessLogicError({
  message: "Insufficient inventory for requested quantity",
  code: "INSUFFICIENT_INVENTORY",
  context: { 
    productId: "prod-456", 
    requested: 10, 
    available: 3 
  }
});

// Account limits exceeded
throw new BusinessLogicError({
  message: "Monthly transaction limit exceeded",
  code: "TRANSACTION_LIMIT_EXCEEDED",
  context: { 
    userId: "user-789", 
    currentAmount: 5000, 
    limit: 4500,
    period: "2024-01"
  }
});

// Workflow violation
throw new BusinessLogicError({
  message: "Cannot approve order without payment confirmation",
  code: "PAYMENT_NOT_CONFIRMED",
  context: { 
    orderId: "order-321", 
    paymentStatus: "pending" 
  }
});
```

**Handling Patterns:**

```typescript
// Code-based handling
Effect.catchTag("BusinessLogicError", (error) => {
  switch (error.code) {
    case "ORDER_ALREADY_SHIPPED":
      return Effect.succeed({ 
        error: "This order has already been shipped and cannot be modified",
        allowedActions: ["track", "return"]
      });
    case "INSUFFICIENT_INVENTORY":
      return Effect.succeed({ 
        error: `Only ${error.context?.available} items available`,
        suggestedQuantity: error.context?.available
      });
    case "TRANSACTION_LIMIT_EXCEEDED":
      return Effect.succeed({ 
        error: "Monthly limit reached",
        currentLimit: error.context?.limit,
        upgradeOptions: true
      });
    default:
      return Effect.succeed({ 
        error: error.message,
        code: error.code 
      });
  }
})

// Context-aware handling
Effect.catchTag("BusinessLogicError", (error) => {
  return Effect.succeed({ 
    error: error.message, 
    code: error.code,
    context: error.context,
    timestamp: error.timestamp,
    canRetry: ["INSUFFICIENT_INVENTORY", "TRANSACTION_LIMIT_EXCEEDED"].includes(error.code)
  });
})
```

### `ConfigError`

Used for configuration validation failures and setup errors.

```typescript
class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly field?: string;
}>
```

**Properties:**
- `message`: Human-readable error message
- `field`: Optional field name that caused the error
- `_tag`: "ConfigError"

**Construction Examples:**

```typescript
// Missing required config
throw new ConfigError({
  message: "Database URL is required but not provided",
  field: "database.url"
});

// Invalid config format
throw new ConfigError({
  message: "Port must be a number between 1 and 65535",
  field: "server.port"
});

// Environment variable missing
throw new ConfigError({
  message: "JWT_SECRET environment variable is not set",
  field: "auth.jwtSecret"
});
```

**Handling Patterns:**

```typescript
// Configuration startup validation
Effect.catchTag("ConfigError", (error) => {
  console.error(`Configuration error: ${error.message}`);
  if (error.field) {
    console.error(`Field: ${error.field}`);
  }
  
  // In startup context, this should terminate the application
  return Effect.fail(new Error(`Invalid configuration: ${error.message}`));
})
```

## Error Construction Patterns

### Basic Construction

```typescript
// Simple error with required fields
const error = new ValidationError({
  message: "Email is required",
  field: "email",
  value: undefined
});

// Error with optional cause
const dbError = new DatabaseError({
  message: "Connection failed",
  operation: "connect",
  cause: originalError
});
```

### Factory Functions

```typescript
// Create factory functions for common errors
const createValidationError = (field: string, value: unknown, reason: string) =>
  new ValidationError({
    message: `${field} ${reason}`,
    field,
    value
  });

const createNotFoundError = (resource: string, id: string) =>
  new NotFoundError({
    message: `${resource} not found`,
    resource,
    id
  });

// Usage
throw createValidationError("email", "invalid-email", "must be a valid email address");
throw createNotFoundError("User", "user-123");
```

### Error Transformation

```typescript
// Transform generic errors to specific types
const mapToValidationError = (error: unknown, field: string, value: unknown) => {
  if (error instanceof Error) {
    return new ValidationError({
      message: error.message,
      field,
      value
    });
  }
  
  return new ValidationError({
    message: "Validation failed",
    field,
    value
  });
};

// Transform Promise rejections
const fromPromiseWithValidation = <T>(
  promise: () => Promise<T>,
  field: string,
  value: unknown
) => Effect.tryPromise({
  try: promise,
  catch: (error) => mapToValidationError(error, field, value)
});
```

## Error Handling Strategies

### Tag-Based Error Handling

```typescript
// Handle specific error types
const handleUserOperation = (effect: Effect<User, ApplicationError>) => pipe(
  effect,
  Effect.catchTag("NotFoundError", (error) => 
    Effect.succeed({ error: "User not found", userId: error.id })
  ),
  Effect.catchTag("ValidationError", (error) => 
    Effect.succeed({ error: "Invalid input", field: error.field })
  ),
  Effect.catchTag("DatabaseError", (error) => {
    console.error("Database error:", error);
    return Effect.succeed({ error: "Database temporarily unavailable" });
  })
);
```

### Multiple Error Handling

```typescript
// Handle multiple error types with same logic
const handleCommonErrors = <A>(effect: Effect<A, ApplicationError>) => pipe(
  effect,
  Effect.catchTags({
    NotFoundError: (error) => Effect.succeed({ 
      status: 404, 
      error: `${error.resource} not found` 
    }),
    UnauthorizedError: (error) => Effect.succeed({ 
      status: 401, 
      error: "Authentication required" 
    }),
    ForbiddenError: (error) => Effect.succeed({ 
      status: 403, 
      error: "Access denied" 
    })
  })
);
```

### Conditional Error Handling

```typescript
// Handle errors based on conditions
const handleNetworkError = (error: NetworkError) => {
  // Retry on server errors
  if (error.status && error.status >= 500) {
    return Effect.fail(error); // Let retry logic handle it
  }
  
  // Don't retry on client errors
  if (error.status && error.status >= 400 && error.status < 500) {
    return Effect.succeed({ error: "Invalid request" });
  }
  
  // Handle network connectivity issues
  return Effect.succeed({ error: "Network unavailable" });
};

const robustNetworkCall = (url: string) => pipe(
  fromNetworkPromise(() => fetch(url), url),
  Effect.catchTag("NetworkError", handleNetworkError),
  withRetry({ maxRetries: 3 })
);
```

### Error Recovery Chains

```typescript
// Chain multiple recovery strategies
const getUserWithFallbacks = (userId: string) => pipe(
  // Try primary database
  fetchUserFromPrimary(userId),
  Effect.catchTag("DatabaseError", () => 
    // Fallback to replica database
    fetchUserFromReplica(userId)
  ),
  Effect.catchTag("NotFoundError", () => 
    // Fallback to cache
    fetchUserFromCache(userId)
  ),
  Effect.catchAll(() => 
    // Final fallback to default user
    Effect.succeed({ id: userId, name: "Unknown User" })
  )
);
```

## Error Propagation and Transformation

### Error Context Enrichment

```typescript
// Add context to errors as they propagate
const enrichError = <E extends ApplicationError>(
  error: E,
  context: Record<string, unknown>
): E => {
  if (error._tag === "BusinessLogicError") {
    return new BusinessLogicError({
      ...error,
      context: { ...error.context, ...context }
    }) as E;
  }
  
  return error;
};

const processOrderWithContext = (orderId: string) => pipe(
  processOrder(orderId),
  Effect.mapError((error) => enrichError(error, { orderId, timestamp: new Date() }))
);
```

### Error Transformation Chains

```typescript
// Transform errors through processing pipeline
const transformDatabaseError = (error: DatabaseError): ValidationError | NetworkError => {
  if (error.message.includes("constraint")) {
    return new ValidationError({
      message: "Data validation failed",
      field: "database_constraint",
      value: error.operation
    });
  }
  
  if (error.message.includes("connection")) {
    return new NetworkError({
      message: "Database connection failed",
      url: "database://localhost",
      cause: error.cause
    });
  }
  
  return new ValidationError({
    message: error.message,
    field: "database",
    value: error.operation
  });
};

const processWithTransformation = (effect: Effect<Data, DatabaseError>) => pipe(
  effect,
  Effect.mapError(transformDatabaseError)
);
```

### Error Aggregation

```typescript
// Collect multiple errors
const validateUserData = (userData: unknown) => {
  const errors: ValidationError[] = [];
  
  return pipe(
    Effect.all([
      validateEmail(userData.email).pipe(
        Effect.catchTag("ValidationError", (error) => {
          errors.push(error);
          return Effect.succeed(null);
        })
      ),
      validateAge(userData.age).pipe(
        Effect.catchTag("ValidationError", (error) => {
          errors.push(error);
          return Effect.succeed(null);
        })
      )
    ]),
    Effect.flatMap(() => {
      if (errors.length > 0) {
        return Effect.fail(new BusinessLogicError({
          message: "Multiple validation errors",
          code: "VALIDATION_ERRORS",
          context: { errors: errors.map(e => ({ field: e.field, message: e.message })) }
        }));
      }
      
      return Effect.succeed(userData);
    })
  );
};
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// ❌ Generic error
throw new Error("Something went wrong");

// ✅ Specific error type
throw new ValidationError({
  message: "Email format is invalid",
  field: "email",
  value: userInput.email
});
```

### 2. Include Relevant Context

```typescript
// ❌ Minimal context
throw new DatabaseError({
  message: "Query failed",
  operation: "query"
});

// ✅ Rich context
throw new DatabaseError({
  message: "User query failed due to connection timeout",
  operation: "findUserById",
  cause: originalError
});
```

### 3. Use Consistent Error Codes

```typescript
// Define error codes as constants
const ERROR_CODES = {
  INSUFFICIENT_INVENTORY: "INSUFFICIENT_INVENTORY",
  ORDER_ALREADY_SHIPPED: "ORDER_ALREADY_SHIPPED",
  PAYMENT_NOT_CONFIRMED: "PAYMENT_NOT_CONFIRMED"
} as const;

// Use in error construction
throw new BusinessLogicError({
  message: "Cannot cancel shipped order",
  code: ERROR_CODES.ORDER_ALREADY_SHIPPED,
  context: { orderId, status: "shipped" }
});
```

### 4. Handle Errors at Appropriate Levels

```typescript
// Handle technical errors at service level
const userService = {
  findUser: (id: string) => pipe(
    fromDatabasePromise(() => db.user.findUnique({ where: { id } }), "findUser"),
    Effect.catchTag("DatabaseError", (error) => {
      console.error("Database error in findUser:", error);
      return Effect.fail(new NotFoundError({
        message: "User not found",
        resource: "User",
        id
      }));
    })
  )
};

// Handle business errors at application level
const getUserProfile = (userId: string) => pipe(
  userService.findUser(userId),
  Effect.catchTag("NotFoundError", (error) => 
    Effect.succeed({ error: "User profile not found", redirectTo: "/signup" })
  )
);
```

### 5. Provide Recovery Suggestions

```typescript
// Include actionable information in error responses
Effect.catchTag("BusinessLogicError", (error) => {
  switch (error.code) {
    case "INSUFFICIENT_INVENTORY":
      return Effect.succeed({
        error: error.message,
        suggestions: [
          "Reduce quantity",
          "Check back later",
          "Contact support for special orders"
        ],
        availableQuantity: error.context?.available
      });
    
    case "TRANSACTION_LIMIT_EXCEEDED":
      return Effect.succeed({
        error: error.message,
        suggestions: [
          "Upgrade account",
          "Wait until next month",
          "Split into smaller transactions"
        ],
        upgradeUrl: "/upgrade"
      });
  }
})
```

## Common Patterns

### API Error Response Pattern

```typescript
const createApiResponse = <T>(effect: Effect<T, ApplicationError>) => pipe(
  effect,
  Effect.map((data) => ({ success: true, data })),
  Effect.catchAll((error) => {
    const baseResponse = {
      success: false,
      error: error.message,
      timestamp: error.timestamp,
      errorType: error._tag
    };
    
    switch (error._tag) {
      case "ValidationError":
        return Effect.succeed({
          ...baseResponse,
          status: 400,
          field: error.field,
          value: error.value
        });
      
      case "NotFoundError":
        return Effect.succeed({
          ...baseResponse,
          status: 404,
          resource: error.resource,
          id: error.id
        });
      
      case "UnauthorizedError":
        return Effect.succeed({
          ...baseResponse,
          status: 401,
          action: error.action
        });
      
      default:
        return Effect.succeed({
          ...baseResponse,
          status: 500
        });
    }
  })
);
```

### Logging Pattern

```typescript
const withErrorLogging = <A, E extends ApplicationError, R>(
  effect: Effect<A, E, R>,
  context: string
) => pipe(
  effect,
  Effect.tapError((error) => 
    Effect.sync(() => {
      console.error(`[${context}] ${error._tag}: ${error.message}`, {
        timestamp: error.timestamp,
        context,
        error: error._tag === "DatabaseError" ? {
          operation: error.operation,
          cause: error.cause
        } : error._tag === "NetworkError" ? {
          url: error.url,
          status: error.status
        } : {}
      });
    })
  )
);

// Usage
const fetchUserWithLogging = (id: string) => pipe(
  fetchUserFromAPI(id),
  withErrorLogging(`fetchUser:${id}`)
);
```

### Validation Chain Pattern

```typescript
const validateUserInput = (input: unknown) => pipe(
  Effect.succeed(input),
  Effect.flatMap((data) => validateInput(data, isObject, "userData")),
  Effect.flatMap((data) => validateInput(data.email, isString, "email")),
  Effect.flatMap((email) => validateEmail(email)),
  Effect.flatMap(() => validateInput(input.age, isNumber, "age")),
  Effect.flatMap((age) => validateAge(age)),
  Effect.map(() => input as ValidUserData)
);
```

This comprehensive error reference provides the foundation for robust error handling throughout the Effect.ts integration. Use these patterns and examples to build reliable, maintainable error handling in your applications.
