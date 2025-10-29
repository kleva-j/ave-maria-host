# @effect/rpc Schema Definitions and RPC Groups

This directory contains the complete @effect/rpc implementation for the Better-T-Stack application. The migration from legacy oRPC + Effect adapters to native @effect/rpc is now complete.

## ✅ Task 11.2 Implementation Status

### Completed Features

#### 1. Effect Schema Conversion ✅
- **Converted all Zod schemas to Effect Schema** for type safety
- **Todo schemas**: `Todo`, `TodoStats`, `BulkTodoResult`, `DeleteTodoResult`
- **Auth schemas**: `User`, `Session`, `AuthResponse`, `TokenValidationResponse`
- **Payload schemas**: All input validation schemas using Effect Schema
- **Error schemas**: Comprehensive tagged error types using Effect Schema

#### 2. RPC Groups Definition ✅
- **TodoRpcs**: Complete RPC group with all todo operations
  - `GetAllTodos`, `GetTodoById`, `CreateTodo`, `UpdateTodo`, `DeleteTodo`
  - `BulkToggleTodos`, `GetTodoStats`
- **AuthRpcs**: Complete RPC group with all authentication operations
  - `Login`, `Register`, `ValidateToken`, `RefreshToken`
  - `GetProfile`, `UpdateProfile`, `Logout`
  - `GetSessions`, `RevokeSession`

#### 3. Error Types with Effect Schema ✅
- **Todo errors**: `TodoNotFoundError`, `TodoValidationError`, `TodoDatabaseError`
- **Auth errors**: `AuthenticationError`, `AuthValidationError`, `AuthorizationError`
- **Proper error unions** for comprehensive error handling
- **Tagged errors** using Effect Schema patterns

#### 4. Client and Server Type Definitions ✅
- **Server implementation**: Complete RPC handlers with Effect service integration
- **Client implementation**: Type-safe RPC client with authentication middleware
- **Type safety**: End-to-end type safety from schema to client
- **Service integration**: Proper dependency injection patterns

#### 5. Full Middleware Integration ✅
- **Authentication middleware**: Complete token validation and user context provision
- **Error handling**: Proper error mapping from auth service to RPC errors
- **Service dependencies**: Proper AuthService and DatabaseService integration
- **Header processing**: Authorization header extraction and validation
- **User mapping**: Conversion from auth service User to RPC User schema

## File Structure

```
packages/api/src/rpc/
├── index.ts          # Main exports and RPC group combinations
├── todo-rpc.ts       # Todo RPC definitions and handlers
├── auth-rpc.ts       # Authentication RPC definitions and handlers
├── server.ts         # Server-side integration and middleware
├── client.ts         # Client-side integration and utilities
└── README.md         # This documentation
```

## Key Features

### Type Safety
- **Effect Schema**: All schemas defined using Effect Schema instead of Zod
- **Tagged Errors**: Proper error types with Effect's tagged error system
- **End-to-end Types**: Type safety from server to client

### Error Handling
- **Structured Errors**: Comprehensive error types for different failure scenarios
- **Error Recovery**: Built-in error handling patterns
- **Error Propagation**: Native Effect error propagation

### Service Integration
- **Effect Services**: Seamless integration with DatabaseService and AuthService
- **Dependency Injection**: Proper service layer composition
- **Full Middleware Support**: Complete authentication middleware with token validation
- **Error Mapping**: Proper error conversion from service errors to RPC errors
- **User Context**: Automatic user context provision for protected endpoints

### Performance
- **Native Integration**: No adapter layer overhead
- **Efficient Serialization**: Native @effect/rpc serialization
- **Concurrent Operations**: Built-in support for concurrent RPC calls

## Middleware Implementation

### Authentication Middleware
The `AuthMiddlewareLive` provides complete authentication middleware that:

- **Extracts tokens** from Authorization headers (`Bearer <token>`)
- **Validates tokens** using the AuthService
- **Maps errors** from auth service errors to RPC-specific error types
- **Provides user context** to protected RPC endpoints
- **Handles edge cases** like missing headers, malformed tokens, expired sessions

```typescript
// The middleware automatically handles:
// - Missing Authorization header → AuthorizationError
// - Invalid header format → AuthValidationError  
// - Invalid/expired tokens → AuthenticationError
// - User not found → AuthenticationError

// Protected endpoints automatically receive user context:
export const protectedEndpoint = Rpc.make("GetProfile", {
  payload: {},
  success: User,
  error: AuthenticationError,
}).middleware(AuthMiddleware);
```

### Error Mapping
The middleware maps auth service errors to RPC errors:

- `InvalidTokenError` → `AuthenticationError` (type: "InvalidToken")
- `SessionExpiredError` → `AuthenticationError` (type: "SessionExpired") 
- `UserNotFoundError` → `AuthenticationError` (type: "UserNotFound")

## Usage Examples

### Server Integration
```typescript
import { AppRpcs, AuthHandlersLive, TodoHandlersLive } from "@host/api/rpc";

// Combine all RPC handlers
const rpcLayer = Layer.mergeAll(
  AuthHandlersLive,
  TodoHandlersLive,
  DatabaseServiceLive,
  AuthServiceLive
);
```

### Client Usage
```typescript
import { createRpcClient } from "@host/api/rpc";

const program = Effect.gen(function* (_) {
  const client = yield* _(createRpcClient("http://localhost:3000"));
  const todos = yield* _(client.GetAllTodos({}));
  return todos;
});
```

## Requirements Satisfied

- ✅ **Requirement 3.2**: Convert existing Zod schemas to Effect Schema for type safety
- ✅ **Requirement 5.2**: Define TodoRpcs and AuthRpcs groups using @effect/rpc patterns  
- ✅ **Requirement 8.1**: Create proper error types using Effect Schema tagged errors
- ✅ **All sub-requirements**: Implement client and server type definitions

## Migration Complete ✅

The migration from legacy oRPC + Effect adapters to native @effect/rpc is now complete:

1. ✅ **Legacy Code Removal**: All oRPC + Effect adapter code has been removed
2. ✅ **Server Integration**: Full RPC server integration with Effect services is implemented
3. ✅ **Client Integration**: Client-side integration for web and native apps is complete
4. ✅ **Application Migration**: All applications now use @effect/rpc
5. ✅ **Dependency Cleanup**: oRPC dependencies have been removed from all packages

The application now uses native @effect/rpc throughout, providing better performance, type safety, and maintainability compared to the previous oRPC + Effect adapter approach.
