# RPC Migration Guide

## Issue Summary

The wallet, savings, and analytics RPC files were created using an incorrect API pattern. The `@effect/rpc` library uses a different API than initially implemented.

## Correct Pattern

Based on the working `todo-rpc.ts` file, here's the correct pattern:

### 1. Define Payload and Response Classes

```typescript
export class MyPayload extends Schema.Class<MyPayload>("MyPayload")({
  field1: Schema.String,
  field2: Schema.Number,
}) {}

export class MyResponse extends Schema.Class<MyResponse>("MyResponse")({
  result: Schema.String,
}) {}
```

### 2. Define Error Classes

```typescript
export class MyError extends Schema.TaggedError<MyError>()("MyError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}
```

### 3. Define RPC Group as a Class

```typescript
export class MyRpcs extends RpcGroup.make(
  Rpc.make("MyOperation", {
    payload: MyPayload,
    success: MyResponse,
    error: MyError,
  }),
  // ... more operations
) {}
```

### 4. Implement Handlers with toLayer

```typescript
export const MyHandlersLive: Layer.Layer<
  | Rpc.Handler<"MyOperation">
  | Rpc.Handler<"AnotherOperation">,
  never,
  MyService
> = MyRpcs.toLayer({
  MyOperation: (payload) =>
    Effect.gen(function* (_) {
      const service = yield* _(MyService);
      // Implementation
      return new MyResponse({ result: "success" });
    }),
  // ... more handlers
});
```

## What Needs to be Fixed

### 1. wallet-rpc.ts

**Current Issues:**
- Uses `Rpc.effect` instead of `Rpc.make`
- Uses `RpcGroup.make` with object syntax instead of class extension
- Uses `RpcGroup.handlers` instead of `toLayer`
- Handler signatures don't match the expected pattern

**Required Changes:**
1. ✅ Convert all Schema.Struct to Schema.Class for payloads and responses
2. ✅ Define proper error classes with Schema.TaggedError
3. ✅ Change RPC group to extend RpcGroup.make
4. ⚠️ Update handlers to use `toLayer` pattern
5. ⚠️ Remove context parameter from handlers (auth should be handled differently)
6. ⚠️ Fix use case integration to match actual use case outputs

### 2. savings-rpc.ts

**Same issues as wallet-rpc.ts**

**Required Changes:**
1. Convert all Schema.Struct to Schema.Class
2. Define proper error classes
3. Change RPC group to extend RpcGroup.make
4. Update handlers to use `toLayer` pattern
5. Fix use case integration

### 3. analytics-rpc.ts

**Same issues as wallet-rpc.ts and savings-rpc.ts**

**Required Changes:**
1. Convert all Schema.Struct to Schema.Class
2. Define proper error classes
3. Change RPC group to extend RpcGroup.make
4. Update handlers to use `toLayer` pattern
5. Fix use case integration

## Authentication Handling

The current implementation tries to use `AuthMiddleware` in handlers, but this doesn't match the RPC pattern. Authentication should be handled at a different layer:

### Option 1: RPC Server Middleware
Handle authentication in the RPC server before routing to handlers.

### Option 2: Service Layer
Create an authenticated service layer that wraps use cases with user context.

### Option 3: Context Propagation
Use Effect's Context to propagate user information through the effect chain.

## Use Case Integration Issues

The handlers currently assume use case outputs have specific properties that may not exist:

### Wallet Use Cases
- `GetWalletBalanceOutput` may not have `total`, `available`, `pending` properties
- `FundWalletOutput` may not have `transactionId`, `status`, `paymentUrl`, `reference`
- `WithdrawFundsOutput` may not have `transactionId`, `status`, `estimatedArrival`

**Solution:** Check actual use case output types and map them correctly to RPC response classes.

### Savings Use Cases
- `CreateSavingsPlanOutput` may not have `id` property
- `GetSavingsPlanOutput` may not have domain entity methods like `calculateProgress`
- Need to properly map domain entities to RPC response schemas

**Solution:** Review use case implementations and create proper mapping functions.

### Analytics Use Cases
- Output types may not match the expected schema structure
- Need to verify actual analytics use case outputs

**Solution:** Review analytics use case implementations and adjust response mapping.

## Recommended Approach

### Phase 1: Fix RPC Definitions (High Priority)
1. Update all three RPC files to use correct `@effect/rpc` API
2. Define proper Schema.Class for all payloads and responses
3. Use `toLayer` pattern for handlers

### Phase 2: Fix Use Case Integration (High Priority)
1. Review actual use case output types
2. Create mapping functions from use case outputs to RPC responses
3. Handle errors properly with tagged error classes

### Phase 3: Implement Authentication (Medium Priority)
1. Decide on authentication strategy (middleware, service layer, or context)
2. Implement user context propagation
3. Update handlers to use authenticated user information

### Phase 4: Testing (Medium Priority)
1. Create unit tests for each RPC handler
2. Create integration tests for complete flows
3. Test error handling and edge cases

### Phase 5: Documentation (Low Priority)
1. Update API documentation
2. Create client usage examples
3. Document error handling patterns

## Example: Complete Wallet RPC (Simplified)

```typescript
// Payload
export class GetBalancePayload extends Schema.Class<GetBalancePayload>(
  "GetBalancePayload"
)({}) {}

// Response
export class GetBalanceResponse extends Schema.Class<GetBalanceResponse>(
  "GetBalanceResponse"
)({
  balance: Schema.Number,
  currency: Schema.String,
}) {}

// Error
export class WalletError extends Schema.TaggedError<WalletError>()(
  "WalletError",
  {
    message: Schema.String,
  }
) {}

// RPC Group
export class WalletRpcs extends RpcGroup.make(
  Rpc.make("GetBalance", {
    payload: GetBalancePayload,
    success: GetBalanceResponse,
    error: WalletError,
  })
) {}

// Handlers
export const WalletHandlersLive: Layer.Layer<
  Rpc.Handler<"GetBalance">,
  never,
  GetWalletBalanceUseCase
> = WalletRpcs.toLayer({
  GetBalance: (_payload) =>
    Effect.gen(function* (_) {
      const useCase = yield* _(GetWalletBalanceUseCase);
      const result = yield* _(useCase.execute({ userId: "temp" }));
      
      return new GetBalanceResponse({
        balance: result.balance,
        currency: result.currency,
      });
    }),
});
```

## Next Steps

1. **Immediate**: Fix the RPC API usage in all three files
2. **Short-term**: Verify use case outputs and fix integration
3. **Medium-term**: Implement proper authentication
4. **Long-term**: Add comprehensive testing and documentation

## Resources

- Working example: `packages/api/src/rpc/todo-rpc.ts`
- Effect RPC docs: https://effect.website/docs/rpc
- Effect Schema docs: https://effect.website/docs/schema
