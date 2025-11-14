# API Router Configuration

This directory contains the router configuration for the AV-Daily API. The API uses **@effect/rpc** for type-safe RPC communication between client and server.

## Architecture Overview

The API follows a clean architecture pattern with the following layers:

```
┌────────────────────────────────────────────────────────┐
│                     Client Applications                │
│              (Web, Mobile, Admin Dashboard)            │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                      RPC Layer (@effect/rpc)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Savings    │  │    Wallet    │  │  Analytics   │  │
│  │     RPC      │  │     RPC      │  │     RPC      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Application Use Cases                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Create     │  │     Fund     │  │     Get      │  │
│  │   Savings    │  │    Wallet    │  │  Analytics   │  │
│  │     Plan     │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                      Domain Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Savings    │  │     Wallet   │  │ Transaction  │  │
│  │    Plan      │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────┘
```

## RPC Groups

The API is organized into the following RPC groups:

### 1. Savings RPC (`savings-rpc.ts`)

Handles all savings plan operations:

- `createPlan` - Create a new savings plan
- `getPlan` - Get a specific savings plan
- `listPlans` - List all user's savings plans
- `updatePlan` - Update an existing plan
- `changePlanStatus` - Pause, resume, or cancel a plan
- `makeContribution` - Make a contribution to a plan
- `getPlanProgress` - Get detailed progress information
- `withdrawFromPlan` - Withdraw funds from a completed plan

**Requirements Covered**: 3.1, 3.2, 3.3, 3.4, 3.5

### 2. Wallet RPC (`wallet-rpc.ts`)

Handles wallet and transaction operations:

- `getBalance` - Get current wallet balance
- `fundWallet` - Add funds to wallet
- `withdraw` - Withdraw funds to bank account
- `getTransactionHistory` - Get filtered transaction history
- `linkBankAccount` - Link a new bank account
- `verifyPayment` - Verify a payment transaction

**Requirements Covered**: 2.1, 2.2, 2.3, 2.4, 2.5

### 3. Analytics RPC (`analytics-rpc.ts`)

Handles analytics and reporting:

- `getSavingsAnalytics` - Get comprehensive savings analytics
- `generateProgressReport` - Generate detailed progress reports
- `calculateRewards` - Calculate available rewards and points
- `getSpendingInsights` - Get spending analysis
- `getAchievements` - Get user achievements and badges

**Requirements Covered**: 5.1, 5.2, 5.3, 5.4, 5.5

### 4. Auth RPC (`auth-rpc.ts`)

Handles authentication operations:

- `signIn` - User sign in
- `signUp` - User registration
- `signOut` - User sign out
- `getSession` - Get current session

**Requirements Covered**: 1.1, 1.2, 1.3, 1.4, 1.5

### 5. Todo RPC (`todo-rpc.ts`)

Example/demo endpoints (to be removed in production):

- `getAll` - Get all todos
- `create` - Create a new todo
- `toggle` - Toggle todo completion
- `delete` - Delete a todo

## Middleware

The API includes the following middleware:

### Authentication Middleware

- Validates JWT tokens
- Extracts user context
- Enforces authentication requirements
- Located in: `auth-rpc.ts`

### Rate Limiting Middleware

- Per-user rate limiting based on KYC tier
- Endpoint-specific limits for sensitive operations
- Sliding window algorithm
- Located in: `middleware/rate-limiting.ts`

### Error Handling Middleware

- Maps domain errors to HTTP status codes
- Provides consistent error formatting
- Sanitizes error messages for security
- Located in: `middleware/error-handling.ts`

### Logging Middleware

- Structured request/response logging
- Performance tracking
- Audit trail for financial operations
- Located in: `middleware/logging.ts`

## Type Safety

All endpoints use **Effect Schema** for:

- Input validation
- Output validation
- Type inference
- Runtime type checking

Example:

```typescript
export const createPlan = Rpc.effect({
  name: "savings/createPlan",
  payload: CreatePlanSchema,      // Input validation
  success: CreatePlanOutputSchema, // Output validation
  failure: Schema.Never,           // Error handling
});
```

## Error Handling

All endpoints use Effect-TS error handling with tagged errors:

- `InsufficientFundsError` - Not enough funds for operation
- `PlanNotFoundError` - Savings plan not found
- `InvalidKycTierError` - KYC tier insufficient for operation
- `PaymentGatewayError` - Payment gateway failure
- `ValidationError` - Input validation failure
- `DatabaseError` - Database operation failure
- `AuthenticationError` - Authentication failure
- `AuthorizationError` - Authorization failure
- `RateLimitExceededError` - Rate limit exceeded

## Server Integration

The RPC server is integrated with the Hono backend:

```typescript
// In apps/server/src/index.ts
import { integrateWithHono } from "@host/api/rpc/server";

const app = new Hono();

// Mount RPC endpoints at /rpc
integrateWithHono(app, AuthServiceLive, DatabaseServiceLive);
```

## Client Usage

Clients can use the type-safe RPC client:

```typescript
import { createRpcClient } from "@host/api/rpc/client";

const client = createRpcClient("http://localhost:3000/rpc");

// Type-safe API calls
const result = await client.savings.createPlan({
  planName: "Emergency Fund",
  dailyAmount: 100,
  cycleDuration: 30,
});
```

## Security Considerations

1. **Authentication**: All endpoints (except auth) require valid JWT token
2. **Authorization**: User can only access their own data
3. **Rate Limiting**: Prevents abuse and ensures fair usage
4. **Input Validation**: All inputs validated with Effect Schema
5. **Error Sanitization**: Error messages sanitized to prevent information leakage
6. **Audit Logging**: All financial operations logged for compliance

## Performance

- **Response Time**: < 2 seconds for all endpoints under normal load
- **Throughput**: Supports 100,000 concurrent daily transactions
- **Scalability**: Horizontal scaling with Redis-backed rate limiting
- **Caching**: Analytics data cached for improved performance

## Testing

Each RPC group should have corresponding tests:

- Unit tests for handlers
- Integration tests for use case integration
- End-to-end tests for complete flows

## Migration from oRPC

This API has been migrated from oRPC to @effect/rpc for:

- Better Effect-TS integration
- Native error handling
- Improved type safety
- Better performance

The legacy oRPC endpoints in `routers/index.ts` are kept for backward compatibility during migration.

## Future Enhancements

1. **GraphQL Support**: Add GraphQL layer on top of RPC
2. **WebSocket Support**: Real-time updates for balance changes
3. **Batch Operations**: Support for batch requests
4. **API Versioning**: Version management for breaking changes
5. **OpenAPI Documentation**: Auto-generated API documentation
