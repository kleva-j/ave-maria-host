# AV-Daily Domain Layer

The domain layer contains the core business logic, entities, value objects, and domain services for the AV-Daily savings platform. This layer is framework-agnostic and represents the heart of the application's business rules.

## Architecture

This domain layer follows **Clean Architecture** and **Domain-Driven Design (DDD)** principles:

- **Entities**: Core business objects with identity and lifecycle
- **Value Objects**: Immutable objects representing domain concepts
- **Domain Services**: Business logic that doesn't naturally fit in entities
- **Repository Interfaces**: Abstractions for data persistence
- **Port Interfaces**: Abstractions for external services

## Directory Structure

```
packages/domain/
├── src/
│   ├── entities/          # Domain entities
│   │   ├── savings-plan.ts
│   │   └── transaction.ts
│   ├── value-objects/     # Immutable value objects
│   │   ├── money.ts
│   │   ├── plan-id.ts
│   │   ├── user-id.ts
│   │   ├── transaction-id.ts
│   │   └── plan-progress.ts
│   ├── services/          # Domain services
│   │   ├── transaction-processing-service.ts
│   │   └── transaction-validation-service.ts
│   ├── repositories/      # Repository interfaces
│   │   ├── savings-repository.ts
│   │   ├── transaction-repository.ts
│   │   └── wallet-repository.ts
│   ├── ports/            # External service interfaces
│   │   ├── payment-service.ts
│   │   └── notification-service.ts
│   └── index.ts          # Public API
├── docs/                 # Documentation
│   ├── transaction-processing.md
│   └── transaction-validation.md
└── package.json
```

## Key Concepts

### Entities

**Entities** are objects with a unique identity that persists over time.

- **SavingsPlan**: Represents a user's savings plan with business rules
- **Transaction**: Represents financial transactions in the system

### Value Objects

**Value Objects** are immutable objects defined by their attributes.

- **Money**: Monetary amounts with currency
- **PlanId, UserId, TransactionId**: Unique identifiers
- **PlanProgress**: Progress tracking for savings plans

### Domain Services

**Domain Services** contain business logic that doesn't naturally belong to a single entity.

- **Transaction Processing**: Handles transaction lifecycle and state management
- **Transaction Validation**: Enforces business rules and constraints

## Installation

```bash
pnpm install
```

## Usage

### Importing

```typescript
import {
  // Entities
  SavingsPlan,
  Transaction,
  
  // Value Objects
  Money,
  PlanId,
  UserId,
  
  // Services
  processContribution,
  validateContribution,
  
  // Repositories (interfaces)
  SavingsRepository,
  TransactionRepository,
  
  // Ports (interfaces)
  PaymentService,
  NotificationService
} from "@host/domain";
```



### Creating a Savings Plan

```typescript
const plan = SavingsPlan.create(
  userId,
  "Emergency Fund",
  Money.fromNumber(1000, "NGN"), // Daily amount
  90, // Cycle duration in days
  Money.fromNumber(90000, "NGN"), // Target amount
  true, // Auto-save enabled
  "09:00", // Auto-save time
  0.05 // 5% annual interest rate
);

console.log(plan.id); // PlanId
console.log(plan.targetAmount); // Money(90000, "NGN")
console.log(plan.status); // "active"
```

### Processing a Contribution

```typescript
// 1. Create transaction
const transaction = Transaction.createContribution(
  userId,
  planId,
  Money.fromNumber(1000, "NGN"),
  "wallet",
  "txn-ref-123"
);

// 2. Validate
const validation = validateContribution(
  userId,
  planId,
  transaction.amount,
  "wallet",
  plan,
  walletBalance
);

if (!validation.isValid) {
  console.error(validation.errors);
  return;
}

// 3. Process
const result = processContribution(transaction, plan);

if (result.success) {
  // Save updated entities
  await savingsRepository.update(result.updatedPlan);
  await transactionRepository.save(result.transaction);
}
```

### Working with Money

```typescript
const amount1 = Money.fromNumber(1000, "NGN");
const amount2 = Money.fromNumber(500, "NGN");

// Arithmetic operations
const total = amount1.add(amount2); // Money(1500, "NGN")
const difference = amount1.subtract(amount2); // Money(500, "NGN")
const doubled = amount1.multiply(2); // Money(2000, "NGN")

// Comparisons
amount1.isGreaterThan(amount2); // true
amount1.equals(amount2); // false

// Formatting
amount1.format(); // "₦1,000.00"
amount1.toString(); // "1000 NGN"
```

### Calculating Plan Progress

```typescript
const progress = plan.calculateProgress();

console.log(progress.progressPercentage); // 45.5
console.log(progress.daysRemaining); // 45
console.log(progress.contributionStreak); // 45
console.log(progress.isTargetReached()); // false

const remaining = progress.getRemainingAmount();
console.log(remaining.format()); // "₦49,000.00"

const dailyRequired = progress.getRequiredDailyContribution();
console.log(dailyRequired.format()); // "₦1,088.89"
```

## Business Rules

### Savings Plans

- **Daily Amount**: Fixed amount contributed each day
- **Cycle Duration**: 7-365 days
- **Target Amount**: Optional, calculated from daily amount × duration if not provided
- **Auto-Save**: Optional automated daily contributions
- **Interest Rate**: 0-100% annual rate (0-1 decimal)
- **Status Flow**: active → paused/completed/cancelled

### Transactions

- **Types**: contribution, withdrawal, interest, penalty, wallet_funding, auto_save
- **Status Flow**: pending → completed/failed/cancelled
- **Payment Sources**: wallet, bank_transfer, debit_card

### Contributions

- Must match plan's daily amount
- Plan must be active
- Cannot exceed target amount
- Minimum: ₦10, Maximum: ₦50,000

### Withdrawals

- **Regular**: From completed or matured plans
- **Early**: From active plans with 5% penalty
- Minimum: ₦100
- Cannot exceed available balance

### Transaction Limits (KYC-based)

| Tier | Daily Limit | Monthly Limit | Single Transaction |
|------|-------------|---------------|-------------------|
| 0 (Unverified) | ₦5,000 | ₦50,000 | ₦2,000 |
| 1 (Basic KYC) | ₦50,000 | ₦500,000 | ₦20,000 |
| 2 (Full KYC) | ₦500,000 | ₦5,000,000 | ₦200,000 |



## API Reference

### Entities

#### SavingsPlan

```typescript
class SavingsPlan {
  // Factory method
  static create(
    userId: UserId,
    planName: string,
    dailyAmount: Money,
    cycleDuration: number,
    targetAmount?: Money,
    autoSaveEnabled?: boolean,
    autoSaveTime?: string,
    interestRate?: number
  ): SavingsPlan;
  
  // Business methods
  canMakeContribution(amount: Money): boolean;
  makeContribution(amount: Money): SavingsPlan;
  calculateProgress(): PlanProgress;
  canWithdraw(): boolean;
  canEarlyWithdraw(): boolean;
  calculateEarlyWithdrawalPenalty(): Money;
  calculateInterestEarned(): Money;
  pause(): SavingsPlan;
  resume(): SavingsPlan;
  complete(): SavingsPlan;
  cancel(): SavingsPlan;
  updateAutoSave(enabled: boolean, time?: string): SavingsPlan;
  isAutoSaveTime(): boolean;
}
```

#### Transaction

```typescript
class Transaction {
  // Factory methods
  static create(...): Transaction;
  static createContribution(...): Transaction;
  static createWithdrawal(...): Transaction;
  static createWalletFunding(...): Transaction;
  static createAutoSave(...): Transaction;
  
  // Status checks
  isCompleted(): boolean;
  isFailed(): boolean;
  isPending(): boolean;
  isCancelled(): boolean;
  canBeCancelled(): boolean;
  
  // Type checks
  isCredit(): boolean;
  isDebit(): boolean;
  isRelatedToSavingsPlan(): boolean;
  
  // State transitions
  complete(): Transaction;
  fail(reason: string): Transaction;
  cancel(): Transaction;
  
  // Utilities
  getProcessingTime(): number | null;
  getDisplayDescription(): string;
}
```

### Value Objects

#### Money

```typescript
class Money {
  constructor(value: number, currency: Currency);
  
  static fromNumber(value: number, currency?: Currency): Money;
  static zero(currency?: Currency): Money;
  
  equals(other: Money): boolean;
  add(other: Money): Money;
  subtract(other: Money): Money;
  multiply(factor: number): Money;
  isGreaterThan(other: Money): boolean;
  isGreaterThanOrEqual(other: Money): boolean;
  isLessThan(other: Money): boolean;
  isZero(): boolean;
  format(): string;
  toString(): string;
}
```

#### PlanProgress

```typescript
class PlanProgress {
  static calculate(
    currentAmount: Money,
    targetAmount: Money,
    cycleDuration: number,
    contributionStreak: number,
    totalContributions: number
  ): PlanProgress;
  
  isTargetReached(): boolean;
  isCycleComplete(): boolean;
  getRemainingAmount(): Money;
  getRequiredDailyContribution(): Money;
}
```

### Services

#### Transaction Processing

```typescript
// Process contribution
function processContribution(
  transaction: Transaction,
  plan: SavingsPlan
): ProcessingResult;

// Process withdrawal
function processWithdrawal(
  transaction: Transaction,
  plan?: SavingsPlan
): ProcessingResult;

// Process auto-save
function processAutoSave(
  transaction: Transaction,
  plan: SavingsPlan,
  walletBalance: Money
): ProcessingResult;

// Calculate interest
function calculateAndProcessInterest(
  plan: SavingsPlan,
  userId: UserId
): Transaction | null;

// Process reversal
function processReversal(
  originalTransaction: Transaction,
  reason: string
): Transaction;
```

#### Transaction Validation

```typescript
// Validate contribution
function validateContribution(
  userId: UserId,
  planId: PlanId,
  amount: Money,
  source: PaymentSource,
  plan: SavingsPlan,
  walletBalance?: Money
): ValidationResult;

// Validate withdrawal
function validateWithdrawal(
  userId: UserId,
  amount: Money,
  plan?: SavingsPlan
): ValidationResult;

// Validate wallet funding
function validateWalletFunding(
  userId: UserId,
  amount: Money,
  source: PaymentSource
): ValidationResult;

// Validate transaction limits
function validateTransactionLimits(
  userId: UserId,
  amount: Money,
  type: TransactionType,
  userKycTier: number,
  dailyTransactionTotal: Money,
  monthlyTransactionTotal: Money
): ValidationResult;
```



## Testing

### Running Tests

```bash
# Type checking
pnpm run check-types

# Unit tests (when implemented)
pnpm test

# Test coverage
pnpm test:coverage
```

### Example Test

```typescript
import { describe, it, expect } from "vitest";
import { Money, SavingsPlan, UserId } from "@host/domain";

describe("SavingsPlan", () => {
  it("should create a new savings plan", () => {
    const userId = UserId.generate();
    const plan = SavingsPlan.create(
      userId,
      "Test Plan",
      Money.fromNumber(1000, "NGN"),
      30
    );
    
    expect(plan.planName).toBe("Test Plan");
    expect(plan.status).toBe("active");
    expect(plan.currentAmount.value).toBe(0);
  });
  
  it("should process contribution correctly", () => {
    const userId = UserId.generate();
    const plan = SavingsPlan.create(
      userId,
      "Test Plan",
      Money.fromNumber(1000, "NGN"),
      30
    );
    
    const amount = Money.fromNumber(1000, "NGN");
    const updatedPlan = plan.makeContribution(amount);
    
    expect(updatedPlan.currentAmount.value).toBe(1000);
    expect(updatedPlan.contributionStreak).toBe(1);
    expect(updatedPlan.totalContributions).toBe(1);
  });
});
```

## Design Patterns

### Immutability

All entities and value objects are immutable. State changes return new instances:

```typescript
const plan = SavingsPlan.create(...);
const updatedPlan = plan.makeContribution(amount); // Returns new instance
// plan remains unchanged
```

### Factory Methods

Entities use static factory methods for creation:

```typescript
// Good
const plan = SavingsPlan.create(...);
const transaction = Transaction.createContribution(...);

// Avoid
const plan = new SavingsPlan(...); // Constructor is public but factory is preferred
```

### Value Object Equality

Value objects implement value-based equality:

```typescript
const money1 = Money.fromNumber(1000, "NGN");
const money2 = Money.fromNumber(1000, "NGN");

money1 === money2; // false (different instances)
money1.equals(money2); // true (same value)
```

### Repository Pattern

Data access is abstracted through repository interfaces:

```typescript
interface SavingsRepository {
  save(plan: SavingsPlan): Effect<void, RepositoryError>;
  findById(id: PlanId): Effect<SavingsPlan | null, RepositoryError>;
  // ...
}

// Implementation is in infrastructure layer
```

### Dependency Inversion

Domain layer depends on abstractions (interfaces), not implementations:

```typescript
// Domain defines the interface
interface PaymentService {
  processPayment(...): Effect<PaymentResult, PaymentError>;
}

// Infrastructure provides the implementation
class PaystackPaymentService implements PaymentService {
  // Implementation details
}
```

## Best Practices

### 1. Keep Domain Logic Pure

Domain logic should be free from framework dependencies:

```typescript
// Good - Pure domain logic
class SavingsPlan {
  makeContribution(amount: Money): SavingsPlan {
    if (!this.canMakeContribution(amount)) {
      throw new Error("Invalid contribution");
    }
    return new SavingsPlan(...);
  }
}

// Bad - Framework dependency
class SavingsPlan {
  async makeContribution(amount: Money): Promise<SavingsPlan> {
    await database.save(...); // Don't do this!
    return new SavingsPlan(...);
  }
}
```

### 2. Use Value Objects for Domain Concepts

```typescript
// Good - Type-safe value object
const amount = Money.fromNumber(1000, "NGN");
plan.makeContribution(amount);

// Bad - Primitive obsession
plan.makeContribution(1000, "NGN");
```

### 3. Validate at Boundaries

```typescript
// Validate before processing
const validation = validateContribution(...);
if (!validation.isValid) {
  return { errors: validation.errors };
}

const result = processContribution(...);
```

### 4. Return New Instances

```typescript
// Good - Immutable
const updatedPlan = plan.makeContribution(amount);

// Bad - Mutation
plan.currentAmount += amount; // Don't mutate!
```

### 5. Use Descriptive Names

```typescript
// Good
plan.canMakeContribution(amount);
plan.calculateEarlyWithdrawalPenalty();

// Bad
plan.check(amount);
plan.calc();
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Transaction Processing Service](./docs/transaction-processing.md)
- [Transaction Validation Service](./docs/transaction-validation.md)

## Contributing

When adding new domain logic:

1. **Entities**: Add to `src/entities/`
2. **Value Objects**: Add to `src/value-objects/`
3. **Services**: Add to `src/services/`
4. **Repositories**: Add interfaces to `src/repositories/`
5. **Ports**: Add interfaces to `src/ports/`
6. **Tests**: Add tests alongside implementation
7. **Documentation**: Update relevant docs

## Dependencies

- `@effect/schema` - Schema validation and type safety
- `effect` - Functional effect system

## License

Private - AV-Daily Platform

## Support

For questions or issues, contact the development team.
