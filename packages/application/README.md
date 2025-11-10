# Application Layer - Use Cases

This package contains the application layer use cases for the AV-Daily savings platform. The application layer orchestrates domain entities and coordinates business workflows while remaining independent of infrastructure concerns.

## Architecture Overview

The application layer follows **Clean Architecture** principles:

- **Use Cases**: Orchestrate domain logic to fulfill specific application requirements
- **Ports**: Define interfaces for external services (payment gateways, notifications)
- **Effect-TS**: Functional error handling with typed effects
- **Repository Pattern**: Abstract data access through domain interfaces

## Package Structure

```
packages/application/
├── src/
│   ├── use-cases/
│   │   ├── savings/          # Savings plan management
│   │   ├── contributions/    # Contribution processing
│   │   ├── wallet/          # Wallet operations
│   │   └── analytics/       # Analytics and reporting
│   ├── ports/               # External service interfaces
│   └── services/            # Application services
├── package.json
└── README.md
```

## Use Cases Implemented

### 1. Savings Plan Management (`use-cases/savings/`)

#### CreateSavingsPlanUseCase
Creates a new savings plan with validation and wallet balance checks.

**Input:**
- `userId`: User identifier (UUID)
- `planName`: Name of the savings plan (1-100 characters)
- `dailyAmount`: Daily contribution amount
- `currency`: Currency code (NGN, USD, EUR)
- `cycleDuration`: Plan duration in days (7-365)
- `targetAmount`: Optional target amount
- `autoSaveEnabled`: Enable automatic contributions
- `autoSaveTime`: Time for auto-save (HH:mm format)
- `interestRate`: Interest rate (0-1)

**Output:**
- `plan`: Created SavingsPlan entity

**Business Rules:**
- User must have sufficient wallet balance for first contribution
- Plan name must be unique per user
- Cycle duration between 7-365 days
- Interest rate between 0-100%

**Errors:**
- `ValidationError`: Invalid input parameters
- `InsufficientFundsError`: Insufficient wallet balance
- `DatabaseError`: Repository operation failed

---

#### GetSavingsPlanUseCase
Retrieves a savings plan by ID with ownership verification.

**Input:**
- `userId`: User identifier
- `planId`: Plan identifier

**Output:**
- `plan`: SavingsPlan entity

**Business Rules:**
- User must own the plan
- Plan must exist

**Errors:**
- `PlanNotFoundError`: Plan doesn't exist
- `AuthorizationError`: User doesn't own the plan
- `DatabaseError`: Repository operation failed

---

#### UpdateSavingsPlanUseCase
Updates savings plan status and settings.

**Input:**
- `userId`: User identifier
- `planId`: Plan identifier
- `action`: Action to perform (pause, resume, cancel, update_autosave)
- `autoSaveEnabled`: Optional auto-save flag
- `autoSaveTime`: Optional auto-save time

**Output:**
- `plan`: Updated SavingsPlan entity

**Supported Actions:**
- `pause`: Pause an active plan
- `resume`: Resume a paused plan
- `cancel`: Cancel a plan
- `update_autosave`: Update auto-save settings

**Errors:**
- `InvalidPlanStateError`: Invalid state transition
- `AuthorizationError`: User doesn't own the plan
- `DatabaseError`: Repository operation failed

---

### 2. Contribution Processing (`use-cases/contributions/`)

#### ProcessContributionUseCase
Processes a contribution to a savings plan with wallet integration.

**Input:**
- `userId`: User identifier
- `planId`: Plan identifier
- `amount`: Contribution amount
- `source`: Payment source (wallet, bank_transfer, debit_card)
- `reference`: Optional transaction reference

**Output:**
- `transaction`: Completed Transaction entity
- `newPlanBalance`: Updated plan balance
- `newWalletBalance`: Updated wallet balance (if source is wallet)

**Business Rules:**
- Contribution amount must match daily amount
- Plan must be active
- Wallet must have sufficient balance (if source is wallet)
- Cannot exceed target amount

**Errors:**
- `InvalidContributionError`: Invalid contribution amount or plan status
- `InsufficientFundsError`: Insufficient wallet balance
- `AuthorizationError`: User doesn't own the plan
- `DatabaseError`: Repository operation failed

---

#### AutoSaveUseCase
Processes scheduled auto-save contributions for all eligible plans.

**Input:** None (runs periodically)

**Output:**
- `processedCount`: Number of plans processed
- `successfulTransactions`: List of successful transactions
- `failedTransactions`: List of failed transactions with reasons

**Business Rules:**
- Only processes plans with auto-save enabled
- Checks if current time matches auto-save time
- Requires sufficient wallet balance
- Automatically debits wallet and updates plan

**Errors:**
- `DatabaseError`: Repository operation failed

---

#### ValidateContributionUseCase
Pre-flight validation for contributions without modifying data.

**Input:**
- `userId`: User identifier
- `planId`: Plan identifier
- `amount`: Contribution amount
- `source`: Payment source

**Output:**
- `isValid`: Whether contribution is valid
- `errors`: List of validation errors
- `warnings`: List of warnings
- `expectedAmount`: Expected contribution amount
- `availableBalance`: Available wallet balance (if source is wallet)

**Validation Checks:**
- Plan status is active
- Contribution amount matches daily amount
- Won't exceed target amount
- Sufficient wallet balance (if applicable)
- Contribution streak status

**Errors:**
- `AuthorizationError`: User doesn't own the plan
- `DatabaseError`: Repository operation failed

---

### 3. Wallet Management (`use-cases/wallet/`)

#### FundWalletUseCase
Funds a wallet through payment gateway integration.

**Input:**
- `userId`: User identifier
- `amount`: Funding amount
- `currency`: Currency code
- `paymentMethod`: Payment method (bank_transfer, debit_card)
- `paymentReference`: Optional payment reference
- `metadata`: Optional metadata

**Output:**
- `transaction`: Completed Transaction entity
- `newBalance`: Updated wallet balance
- `paymentReference`: Payment gateway reference

**Business Rules:**
- Integrates with payment gateway (Paystack/Flutterwave)
- Creates transaction record
- Credits wallet on successful payment
- Completes transaction

**Errors:**
- `PaymentGatewayError`: Payment processing failed
- `DatabaseError`: Repository operation failed

---

#### WithdrawFundsUseCase
Withdraws funds from wallet to bank account.

**Input:**
- `userId`: User identifier
- `amount`: Withdrawal amount
- `currency`: Currency code
- `bankAccountId`: Bank account identifier
- `reason`: Optional withdrawal reason
- `metadata`: Optional metadata

**Output:**
- `transaction`: Completed Transaction entity
- `newBalance`: Updated wallet balance
- `estimatedArrival`: Estimated arrival date
- `withdrawalReference`: Withdrawal reference

**Business Rules:**
- Validates sufficient balance
- Debits wallet
- Processes withdrawal through payment gateway
- Rolls back on failure
- Estimated arrival: 1-3 business days

**Errors:**
- `InsufficientFundsError`: Insufficient wallet balance
- `PaymentGatewayError`: Payment processing failed
- `DatabaseError`: Repository operation failed

---

#### GetWalletBalanceUseCase
Retrieves wallet balance with optional transaction summary.

**Input:**
- `userId`: User identifier
- `includeTransactionSummary`: Optional flag for summary
- `summaryStartDate`: Optional start date for summary
- `summaryEndDate`: Optional end date for summary

**Output:**
- `balance`: Current balance
- `currency`: Currency code
- `isActive`: Wallet active status
- `lastUpdated`: Last update timestamp
- `transactionSummary`: Optional transaction summary
  - `totalCredits`: Total credit amount
  - `totalDebits`: Total debit amount
  - `transactionCount`: Number of transactions
  - `netChange`: Net change in balance

**Errors:**
- `UserNotFoundError`: Wallet not found
- `DatabaseError`: Repository operation failed

---

### 4. Analytics & Reporting (`use-cases/analytics/`)

#### GetSavingsAnalyticsUseCase
Provides comprehensive savings statistics and insights.

**Input:**
- `userId`: User identifier
- `period`: Optional period filter (week, month, quarter, year, all)

**Output:**
- `totalSaved`: Total amount saved across all plans
- `activePlansCount`: Number of active plans
- `completedPlansCount`: Number of completed plans
- `currentStreak`: Current contribution streak (days)
- `longestStreak`: Longest contribution streak (days)
- `averageDailyContribution`: Average daily contribution amount
- `totalContributions`: Total number of contributions
- `savingsRate`: Average progress percentage across active plans
- `projectedCompletion`: Projected completion date for nearest plan
- `topPerformingPlan`: Best performing plan details
- `insights`: Personalized insights and recommendations

**Insights Generated:**
- Contribution streak achievements
- Completed plans count
- Progress tracking
- Plan focus recommendations
- Projected monthly savings

**Errors:**
- `DatabaseError`: Repository operation failed

---

#### GenerateProgressReportUseCase
Generates detailed progress report for a savings plan.

**Input:**
- `userId`: User identifier
- `planId`: Plan identifier
- `includeTransactionHistory`: Optional flag for transaction history

**Output:**
- `planId`: Plan identifier
- `planName`: Plan name
- `status`: Plan status
- `currentAmount`: Current saved amount
- `targetAmount`: Target amount
- `dailyAmount`: Daily contribution amount
- `progressPercentage`: Progress percentage
- `daysElapsed`: Days since plan start
- `daysRemaining`: Days until completion
- `contributionStreak`: Current streak
- `totalContributions`: Total contributions made
- `averageContributionPerDay`: Average daily contribution
- `interestEarned`: Interest earned
- `projectedCompletionDate`: Projected completion date
- `isOnTrack`: Whether plan is on track
- `performanceScore`: Performance score (0-100)
- `milestones`: Milestone achievements (25%, 50%, 75%, 100%)
- `transactionHistory`: Optional transaction history
- `recommendations`: Personalized recommendations

**Performance Score Calculation:**
- 50% based on consistency (streak / cycle duration)
- 50% based on progress percentage

**Errors:**
- `PlanNotFoundError`: Plan doesn't exist
- `AuthorizationError`: User doesn't own the plan
- `DatabaseError`: Repository operation failed

---

#### CalculateRewardsUseCase
Calculates user rewards and gamification features.

**Input:**
- `userId`: User identifier

**Output:**
- `totalPoints`: Total reward points earned
- `currentTier`: Current reward tier (bronze, silver, gold, platinum, diamond)
- `nextTier`: Next reward tier
- `pointsToNextTier`: Points needed for next tier
- `badges`: Earned badges
- `newBadges`: Newly earned badges
- `achievements`: List of achievements
- `streakBonus`: Bonus points from streaks
- `completionBonus`: Bonus points from completed plans
- `consistencyBonus`: Bonus points from consistency
- `recommendations`: Recommendations for earning more rewards

**Reward Tiers:**
- Bronze: 0-499 points
- Silver: 500-999 points
- Gold: 1000-2499 points
- Platinum: 2500-4999 points
- Diamond: 5000+ points

**Badges Available:**
- First Step: Made first contribution
- Week Warrior: 7-day streak
- Monthly Master: 30-day streak
- Quarterly Champion: 90-day streak
- Annual Legend: 365-day streak
- Goal Achiever: First plan completed
- Savings Pro: 5 plans completed
- Savings Master: 10 plans completed
- Savings Champion: Saved over 100,000
- Consistent Saver: 30 consecutive days
- Goal Crusher: Exceeded target by 20%
- Early Bird: Contributions before 9 AM for 7 days
- Night Owl: Contributions after 9 PM for 7 days

**Points System:**
- 1 point per contribution
- 100 points per completed plan
- 50 points per week of streak
- 25 points per 10-day average consistency

**Errors:**
- `DatabaseError`: Repository operation failed

---

## Error Handling

All use cases use **Effect-TS** for functional error handling with typed effects.

### Error Mapping Strategy

Repository errors (`RepositoryError`) are mapped to application-level errors (`DatabaseError`) to maintain clean architecture:

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

### Financial Error Types

All use cases return `FinancialError` which is a union of:

- `ValidationError`: Input validation failures
- `InsufficientFundsError`: Insufficient balance
- `PlanNotFoundError`: Plan not found
- `AuthorizationError`: Authorization failures
- `InvalidContributionError`: Invalid contribution
- `InvalidPlanStateError`: Invalid state transition
- `PaymentGatewayError`: Payment gateway failures
- `DatabaseError`: Database operation failures
- `UserNotFoundError`: User not found
- `WithdrawalNotAllowedError`: Withdrawal not allowed
- `NotificationError`: Notification failures
- `ExternalServiceError`: External service failures
- `RateLimitError`: Rate limit exceeded
- `DuplicateResourceError`: Duplicate resource
- `BusinessRuleViolationError`: Business rule violations

---

## Ports (External Service Interfaces)

### PaymentGatewayPort

Interface for payment gateway integration (Paystack, Flutterwave).

```typescript
interface PaymentGatewayPort {
  readonly processPayment: (
    userId: string,
    amount: number,
    currency: string,
    method: string,
    reference?: string
  ) => Effect.Effect<
    { reference: string; status: string },
    PaymentGatewayError
  >;
}
```

**Future Ports:**
- `NotificationPort`: SMS, Push, Email notifications
- `KYCVerificationPort`: KYC verification services
- `AnalyticsPort`: Analytics tracking
- `CachePort`: Caching services

---

## Usage Example

```typescript
import { CreateSavingsPlanUseCase } from "@host/application";
import { Effect } from "effect";

// Get the use case from the layer
const createPlan = yield* CreateSavingsPlanUseCase;

// Execute the use case
const result = yield* createPlan.execute({
  userId: "user-uuid",
  planName: "Emergency Fund",
  dailyAmount: 1000,
  currency: "NGN",
  cycleDuration: 90,
  targetAmount: 90000,
  autoSaveEnabled: true,
  autoSaveTime: "09:00",
  interestRate: 0.05,
});

// Handle success
console.log("Plan created:", result.plan);
```

---

## Testing Guidelines

### Unit Testing
- Test use case logic in isolation
- Mock repository dependencies
- Test all error scenarios
- Verify business rule enforcement

### Integration Testing
- Test with real repository implementations
- Verify database transactions
- Test error handling and rollbacks
- Validate end-to-end workflows

---

## Dependencies

- `@host/domain`: Domain entities and repository interfaces
- `@host/shared`: Shared errors and types
- `effect`: Functional effect system
- `@effect/schema`: Schema validation

---

## Next Steps

1. **Infrastructure Layer**: Implement repository adapters for PostgreSQL with Drizzle ORM
2. **API Layer**: Create oRPC endpoints that consume these use cases
3. **Testing**: Write comprehensive unit and integration tests
4. **Documentation**: Add JSDoc comments and usage examples

---

## Contributing

When adding new use cases:

1. Follow the existing structure and patterns
2. Use Effect-TS for error handling
3. Map repository errors to application errors
4. Add comprehensive input validation
5. Document business rules and error scenarios
6. Export from appropriate index files

---

## License

Private - AV-Daily Platform
