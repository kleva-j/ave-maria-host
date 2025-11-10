# Application Layer - Quick Reference

## Use Cases Summary

### Savings Management
| Use Case | Purpose | Key Inputs | Key Outputs |
|----------|---------|------------|-------------|
| `CreateSavingsPlanUseCase` | Create new savings plan | userId, planName, dailyAmount, cycleDuration | plan |
| `GetSavingsPlanUseCase` | Retrieve savings plan | userId, planId | plan |
| `UpdateSavingsPlanUseCase` | Update plan status/settings | userId, planId, action | plan |

### Contributions
| Use Case | Purpose | Key Inputs | Key Outputs |
|----------|---------|------------|-------------|
| `ProcessContributionUseCase` | Process contribution | userId, planId, amount, source | transaction, newPlanBalance, newWalletBalance |
| `AutoSaveUseCase` | Auto-save processing | none | processedCount, successfulTransactions, failedTransactions |
| `ValidateContributionUseCase` | Pre-flight validation | userId, planId, amount, source | isValid, errors, warnings |

### Wallet Operations
| Use Case | Purpose | Key Inputs | Key Outputs |
|----------|---------|------------|-------------|
| `FundWalletUseCase` | Fund wallet | userId, amount, paymentMethod | transaction, newBalance, paymentReference |
| `WithdrawFundsUseCase` | Withdraw funds | userId, amount, bankAccountId | transaction, newBalance, estimatedArrival |
| `GetWalletBalanceUseCase` | Get balance | userId, includeTransactionSummary | balance, currency, transactionSummary |

### Analytics
| Use Case | Purpose | Key Inputs | Key Outputs |
|----------|---------|------------|-------------|
| `GetSavingsAnalyticsUseCase` | Get analytics | userId, period | totalSaved, streaks, insights |
| `GenerateProgressReportUseCase` | Generate report | userId, planId | progress, milestones, recommendations |
| `CalculateRewardsUseCase` | Calculate rewards | userId | points, tier, badges, achievements |

---

## Common Error Types

| Error | When It Occurs | HTTP Status |
|-------|----------------|-------------|
| `ValidationError` | Invalid input parameters | 400 |
| `InsufficientFundsError` | Insufficient balance | 400 |
| `PlanNotFoundError` | Plan doesn't exist | 404 |
| `AuthorizationError` | User doesn't own resource | 403 |
| `InvalidContributionError` | Invalid contribution | 400 |
| `InvalidPlanStateError` | Invalid state transition | 400 |
| `PaymentGatewayError` | Payment processing failed | 502 |
| `DatabaseError` | Database operation failed | 500 |
| `UserNotFoundError` | User/wallet not found | 404 |

---

## Business Rules Quick Reference

### Savings Plans
- Plan name: 1-100 characters
- Cycle duration: 7-365 days
- Interest rate: 0-100%
- Daily amount must be positive
- Target amount optional (defaults to dailyAmount × cycleDuration)

### Contributions
- Must match daily amount exactly
- Plan must be active
- Cannot exceed target amount
- Wallet must have sufficient balance (if source is wallet)

### Wallet Operations
- Minimum withdrawal: varies by currency
- Withdrawal processing: 1-3 business days
- Payment methods: wallet, bank_transfer, debit_card

### Rewards & Gamification
- 1 point per contribution
- 100 points per completed plan
- 50 points per week of streak
- Tiers: Bronze (0), Silver (500), Gold (1000), Platinum (2500), Diamond (5000)

---

## Effect-TS Patterns

### Basic Use Case Execution
```typescript
const result = yield* useCase.execute(input);
```

### Error Handling
```typescript
const result = yield* useCase.execute(input).pipe(
  Effect.catchTag("InsufficientFundsError", (error) => {
    // Handle insufficient funds
  }),
  Effect.catchTag("ValidationError", (error) => {
    // Handle validation error
  })
);
```

### Repository Error Mapping
```typescript
yield* repository.operation().pipe(
  Effect.mapError((error) =>
    new DatabaseError({
      operation: "operation_name",
      table: "table_name",
      message: error.message || "Default message",
    })
  )
);
```

---

## File Structure

```
packages/application/src/
├── use-cases/
│   ├── savings/
│   │   ├── create-savings-plan.ts
│   │   ├── get-savings-plan.ts
│   │   ├── update-savings-plan.ts
│   │   └── index.ts
│   ├── contributions/
│   │   ├── process-contribution.ts
│   │   ├── auto-save.ts
│   │   ├── validate-contribution.ts
│   │   └── index.ts
│   ├── wallet/
│   │   ├── fund-wallet.ts
│   │   ├── withdraw-funds.ts
│   │   ├── get-wallet-balance.ts
│   │   └── index.ts
│   ├── analytics/
│   │   ├── get-savings-analytics.ts
│   │   ├── generate-progress-report.ts
│   │   ├── calculate-rewards.ts
│   │   └── index.ts
│   └── index.ts
├── ports/
│   └── index.ts
├── services/
│   └── index.ts
└── index.ts
```

---

## Import Paths

```typescript
// Use cases
import {
  CreateSavingsPlanUseCase,
  GetSavingsPlanUseCase,
  UpdateSavingsPlanUseCase,
  ProcessContributionUseCase,
  AutoSaveUseCase,
  ValidateContributionUseCase,
  FundWalletUseCase,
  WithdrawFundsUseCase,
  GetWalletBalanceUseCase,
  GetSavingsAnalyticsUseCase,
  GenerateProgressReportUseCase,
  CalculateRewardsUseCase,
} from "@host/application";

// Ports
import { PaymentGatewayPort } from "@host/application";

// Errors
import {
  ValidationError,
  InsufficientFundsError,
  PlanNotFoundError,
  // ... other errors
} from "@host/shared";
```

---

## Layer Composition Example

```typescript
import { Layer } from "effect";
import {
  CreateSavingsPlanUseCaseLive,
  ProcessContributionUseCaseLive,
  FundWalletUseCaseLive,
} from "@host/application";

// Compose application layer
const ApplicationLayer = Layer.merge(
  CreateSavingsPlanUseCaseLive,
  ProcessContributionUseCaseLive,
  FundWalletUseCaseLive
);

// Provide infrastructure dependencies
const MainLayer = Layer.provide(
  ApplicationLayer,
  InfrastructureLayer
);
```

---

## Testing Patterns

### Mock Repository
```typescript
const mockSavingsRepo: SavingsRepository = {
  save: Effect.succeed(undefined),
  findById: Effect.succeed(mockPlan),
  findByUserId: Effect.succeed([mockPlan]),
  // ... other methods
};
```

### Test Use Case
```typescript
test("should create savings plan", async () => {
  const result = await Effect.runPromise(
    createPlanUseCase.execute({
      userId: "test-user",
      planName: "Test Plan",
      dailyAmount: 1000,
      currency: "NGN",
      cycleDuration: 30,
    })
  );
  
  expect(result.plan).toBeDefined();
  expect(result.plan.planName).toBe("Test Plan");
});
```

---

## Common Validation Rules

### UUID Validation
```typescript
Schema.UUID
```

### Amount Validation
```typescript
Schema.Number.pipe(Schema.positive())
```

### String Length
```typescript
Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
```

### Enum/Literal
```typescript
Schema.Literal("wallet", "bank_transfer", "debit_card")
```

### Time Format (HH:mm)
```typescript
Schema.String.pipe(Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
```

### Number Range
```typescript
Schema.Number.pipe(Schema.int(), Schema.between(7, 365))
```

---

## Performance Considerations

1. **Batch Operations**: Use `AutoSaveUseCase` for bulk processing
2. **Caching**: Consider caching analytics results
3. **Pagination**: Implement pagination for large result sets
4. **Async Processing**: Use background jobs for heavy operations
5. **Database Indexes**: Ensure proper indexing on frequently queried fields

---

## Security Checklist

- ✅ User ownership verification on all operations
- ✅ Input validation using Effect Schema
- ✅ Amount validation to prevent negative values
- ✅ Transaction atomicity for financial operations
- ✅ Error messages don't leak sensitive information
- ✅ Rate limiting (to be implemented at API layer)
- ✅ Audit logging (to be implemented)

---

## Next Implementation Steps

1. **Infrastructure Layer**
   - Drizzle ORM repository implementations
   - PostgreSQL database setup
   - Payment gateway adapters

2. **API Layer**
   - oRPC endpoint definitions
   - Request/response mapping
   - Authentication middleware

3. **Testing**
   - Unit tests for each use case
   - Integration tests with real database
   - E2E tests for critical flows

4. **Monitoring**
   - Error tracking
   - Performance metrics
   - Business metrics dashboard
