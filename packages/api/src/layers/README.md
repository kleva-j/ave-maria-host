# AV-Daily Layer Composition

This directory contains the complete layer composition for the AV-Daily application using Effect-TS dependency injection.

## Overview

The layer composition follows clean architecture principles with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│          Main Application Layer         │
│  (Environment-specific configuration)   │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼────────┐
│   API Layer    │    │  Config Layer   │
│  (Controllers) │    │ (Environment)   │
└───────┬────────┘    └─────────────────┘
        │
┌───────▼────────────┐
│ Application Layer  │
│   (Use Cases)      │
└───────┬────────────┘
        │
┌───────▼──────────────┐
│ Infrastructure Layer │
│ (Repositories, etc.) │
└──────────────────────┘
```

## Layer Hierarchy

### 1. Infrastructure Layer (`infrastructure-layer.ts`)

The infrastructure layer provides concrete implementations of external services:

- **Database Repositories**: Drizzle ORM implementations
  - `DrizzleSavingsRepository`
  - `DrizzleTransactionRepository`
  - `DrizzleWalletRepository`

- **Payment Gateways**: Payment service implementations
  - `PaystackPaymentService`
  - `FlutterwavePaymentService`

- **Notification Services**: Communication services
  - SMS notifications (Twilio)
  - Push notifications (Firebase)
  - Email notifications

- **Caching & Analytics**: Performance and insights
  - `CacheService` (Redis)
  - `AnalyticsService`

**Usage:**
```typescript
import { InfrastructureLayer } from "@host/api/layers";

const program = Effect.gen(function* (_) {
  const savingsRepo = yield* _(SavingsRepository);
  const paymentService = yield* _(PaymentGatewayPort);
  // Use services...
});

await Effect.runPromise(
  Effect.provide(program, InfrastructureLayer)
);
```

### 2. Application Layer (`application-layer.ts`)

The application layer provides use cases that orchestrate domain logic:

- **Savings Use Cases**
  - `CreateSavingsPlanUseCase`
  - `UpdateSavingsPlanUseCase`
  - `GetSavingsPlanUseCase`

- **Contribution Use Cases**
  - `ProcessContributionUseCase`
  - `ValidateContributionUseCase`
  - `AutoSaveUseCase`

- **Wallet Use Cases**
  - `FundWalletUseCase`
  - `WithdrawFundsUseCase`
  - `GetWalletBalanceUseCase`

- **Analytics Use Cases**
  - `GetSavingsAnalyticsUseCase`
  - `GenerateProgressReportUseCase`
  - `CalculateRewardsUseCase`

**Usage:**
```typescript
import { ApplicationLayer } from "@host/api/layers";

const program = Effect.gen(function* (_) {
  const createPlan = yield* _(CreateSavingsPlanUseCase);
  const result = yield* _(createPlan.execute({
    userId: "user-123",
    planName: "Emergency Fund",
    dailyAmount: 100,
    currency: "NGN",
    cycleDuration: 30
  }));
  return result;
});

await Effect.runPromise(
  Effect.provide(program, ApplicationLayer)
);
```

### 3. API Layer (`api-layer.ts`)

The API layer provides controllers and middleware:

- **Controllers** (RPC Handlers)
  - `SavingsController`
  - `WalletController`
  - `AnalyticsController`
  - `AuthController`

- **Middleware**
  - `AuthMiddleware` - JWT authentication
  - `RateLimitingMiddleware` - Request throttling
  - `LoggingMiddleware` - Request/response logging
  - `ErrorHandlingMiddleware` - Centralized error handling
  - `AuditLoggingMiddleware` - Security audit logs

**Usage:**
```typescript
import { ApiLayer } from "@host/api/layers";
import { integrateWithHono } from "@host/api";
import { Hono } from "hono";

const app = new Hono();
integrateWithHono(app, ApiLayer);
```

### 4. Main Layer (`main-layer.ts`)

The main layer combines everything with environment-specific configuration:

- **Configuration Management**
  - Environment variables
  - Database configuration
  - Payment gateway credentials
  - Redis configuration
  - CORS settings

- **Lifecycle Management**
  - Startup procedures
  - Health checks
  - Graceful shutdown
  - Signal handling

**Usage:**
```typescript
import { initializeApplication } from "@host/api/layers";

// Initialize complete application
const runtime = await initializeApplication();

// Application is ready to handle requests
```

## Environment-Specific Layers

Each layer has environment-specific variants:

### Development Layers
- Enhanced logging and debugging
- Relaxed validation
- Development-friendly error messages
- Hot reload support

```typescript
import { DevMainLayer } from "@host/api/layers";
```

### Production Layers
- Production-grade error handling
- Performance optimizations
- Enhanced security measures
- Resource pooling

```typescript
import { ProdMainLayer } from "@host/api/layers";
```

### Test Layers
- Fast, isolated execution
- In-memory implementations
- Deterministic behavior
- No external dependencies

```typescript
import { TestMainLayer } from "@host/api/layers";
```

## Complete Application Setup

### Basic Setup

```typescript
import { createAppRuntime } from "@host/api/layers";

// Create runtime for current environment
const runtime = await createAppRuntime();

// Use runtime to execute effects
const result = await runtime.runPromise(myEffect);
```

### Full Application Initialization

```typescript
import { initializeApplication } from "@host/api/layers";

// Initialize with all startup procedures
const runtime = await initializeApplication();

// Graceful shutdown handlers are automatically registered
// Application is ready to handle requests
```

### Custom Layer Composition

```typescript
import {
  InfrastructureLayer,
  ApplicationLayer,
  ApiLayer,
  ConfigLayer
} from "@host/api/layers";
import { Layer } from "effect";

// Create custom layer composition
const CustomLayer = Layer.mergeAll(
  ConfigLayer,
  InfrastructureLayer,
  ApplicationLayer,
  ApiLayer,
  // Add custom layers here
);

const runtime = await ManagedRuntime.make(CustomLayer);
```

## Integration with Hono Server

```typescript
import { Hono } from "hono";
import { integrateWithHono } from "@host/api";
import { ApiLayer } from "@host/api/layers";

const app = new Hono();

// Integrate Effect RPC with Hono
integrateWithHono(app, ApiLayer);

// Start server
export default {
  fetch: app.fetch,
  port: 3000,
};
```

## Health Checks

```typescript
import { healthCheck } from "@host/api/layers";

// Perform health check
const health = await runtime.runPromise(healthCheck);

console.log(health);
// {
//   status: "healthy",
//   timestamp: "2024-01-01T00:00:00.000Z",
//   environment: "production",
//   services: {
//     database: true,
//     redis: true,
//     payment: true,
//     notifications: true
//   },
//   version: "1.0.0"
// }
```

## Graceful Shutdown

```typescript
import { gracefulShutdown } from "@host/api/layers";

// Shutdown runtime gracefully
await gracefulShutdown(runtime, "SIGTERM");
```

## Testing

```typescript
import { TestMainLayer } from "@host/api/layers";
import { Effect, ManagedRuntime } from "effect";

describe("My Feature", () => {
  let runtime: ManagedRuntime.ManagedRuntime<any, never>;

  beforeAll(async () => {
    runtime = await ManagedRuntime.make(TestMainLayer);
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it("should work", async () => {
    const result = await runtime.runPromise(myEffect);
    expect(result).toBe(expected);
  });
});
```

## Best Practices

1. **Use Environment-Specific Layers**: Always use the appropriate layer for your environment (Dev, Prod, Test)

2. **Proper Resource Management**: Use `ManagedRuntime` to ensure resources are properly cleaned up

3. **Graceful Shutdown**: Always register shutdown handlers for production deployments

4. **Health Checks**: Implement health check endpoints using the provided `healthCheck` effect

5. **Layer Composition**: Compose layers from bottom-up (Infrastructure → Application → API)

6. **Testing**: Use `TestMainLayer` for isolated, fast tests

7. **Configuration**: Use environment variables for all configuration, never hardcode secrets

## Troubleshooting

### Missing Dependencies

If you get errors about missing services, ensure you're providing the correct layer:

```typescript
// ❌ Wrong - missing infrastructure
Effect.provide(myEffect, ApplicationLayer)

// ✅ Correct - includes infrastructure
Effect.provide(myEffect, MainLayer)
```

### Configuration Errors

If configuration fails to load, check your environment variables:

```bash
# Required environment variables
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
PAYSTACK_SECRET_KEY=sk_...
REDIS_URL=redis://localhost:6379
```

### Runtime Initialization Failures

If runtime initialization fails, check the logs for specific errors:

```typescript
try {
  const runtime = await initializeApplication();
} catch (error) {
  console.error("Failed to initialize:", error);
  // Check specific service failures
}
```

## Related Documentation

- [Effect-TS Documentation](https://effect.website/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Injection with Effect](https://effect.website/docs/guides/context-management/services)
