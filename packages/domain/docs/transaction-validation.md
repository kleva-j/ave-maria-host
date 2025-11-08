# Transaction Validation Service Documentation

## Overview

The Transaction Validation Service provides comprehensive validation logic for all financial transactions in the AV-Daily savings platform. It enforces business rules, validates amounts, checks limits, and ensures compliance with KYC (Know Your Customer) requirements.

## Table of Contents

- [Validation Result Interface](#validation-result-interface)
- [Core Functions](#core-functions)
  - [validateContribution](#validatecontribution)
  - [validateWithdrawal](#validatewithdrawal)
  - [validateWalletFunding](#validatewalletfunding)
  - [validateTransactionLimits](#validatetransactionlimits)
- [KYC Tiers and Limits](#kyc-tiers-and-limits)
- [Validation Rules](#validation-rules)
- [Examples](#examples)

## Validation Result Interface

### `ValidationResult`

Represents the outcome of a validation operation.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `isValid` | `boolean` | `true` if validation passed, `false` if validation failed |
| `errors` | `string[]` | Array of error messages describing validation failures |

**Example:**

```typescript
const result: ValidationResult = {
  isValid: false,
  errors: [
    "Insufficient wallet balance",
    "Minimum contribution amount is ₦10.00"
  ]
};
```



## Core Functions

### validateContribution

Validates a contribution transaction before processing.

**Signature:**

```typescript
function validateContribution(
  userId: UserId,
  planId: PlanId,
  amount: Money,
  source: PaymentSource,
  plan: SavingsPlan,
  walletBalance?: Money
): ValidationResult
```

**Parameters:**

- `userId` - The user making the contribution
- `planId` - The savings plan ID (for reference, not currently used in validation)
- `amount` - The contribution amount to validate
- `source` - Payment source: "wallet", "bank_transfer", or "debit_card"
- `plan` - The savings plan to validate against
- `walletBalance` - Optional. User's wallet balance (required if source is "wallet")

**Validation Checks:**

1. **Plan Ownership**: Verifies the plan belongs to the user
2. **Plan Status**: Ensures plan can accept contributions (active status, amount matches daily amount)
3. **Wallet Balance**: If using wallet, checks sufficient funds
4. **Minimum Amount**: Contribution must be at least ₦10
5. **Maximum Amount**: Contribution cannot exceed ₦50,000 per transaction

**Returns:** `ValidationResult` with validation status and error messages

**Example:**

```typescript
const result = validateContribution(
  userId,
  planId,
  Money.fromNumber(1000, "NGN"),
  "wallet",
  savingsPlan,
  walletBalance
);

if (!result.isValid) {
  console.error("Validation failed:", result.errors);
  // ["Insufficient wallet balance"]
}
```



### validateWithdrawal

Validates a withdrawal transaction before processing.

**Signature:**

```typescript
function validateWithdrawal(
  userId: UserId,
  amount: Money,
  plan?: SavingsPlan
): ValidationResult
```

**Parameters:**

- `userId` - The user requesting the withdrawal
- `amount` - The withdrawal amount to validate
- `plan` - Optional. The savings plan to withdraw from

**Validation Checks:**

1. **Plan Ownership**: If plan provided, verifies it belongs to the user
2. **Withdrawal Eligibility**: Checks if withdrawal is allowed (completed, matured, or early withdrawal eligible)
3. **Balance Check**: Ensures withdrawal amount doesn't exceed available balance
4. **Early Withdrawal Warning**: Adds warning message if early withdrawal penalty applies
5. **Minimum Amount**: Withdrawal must be at least ₦100

**Returns:** `ValidationResult` with validation status and error/warning messages

**Example:**

```typescript
const result = validateWithdrawal(
  userId,
  Money.fromNumber(5000, "NGN"),
  savingsPlan
);

if (!result.isValid) {
  console.error("Validation errors:", result.errors);
  // ["Withdrawal not allowed for this plan", "Minimum withdrawal amount is ₦100.00"]
}
```



### validateWalletFunding

Validates a wallet funding transaction before processing.

**Signature:**

```typescript
function validateWalletFunding(
  userId: UserId,
  amount: Money,
  source: PaymentSource
): ValidationResult
```

**Parameters:**

- `userId` - The user funding their wallet (for reference, not currently used)
- `amount` - The funding amount to validate
- `source` - Payment source: must be "bank_transfer" or "debit_card"

**Validation Checks:**

1. **Minimum Amount**: Funding must be at least ₦100
2. **Maximum Amount**: Funding cannot exceed ₦1,000,000 per transaction
3. **Valid Source**: Source must be "bank_transfer" or "debit_card" (wallet-to-wallet not allowed)

**Returns:** `ValidationResult` with validation status and error messages

**Example:**

```typescript
const result = validateWalletFunding(
  userId,
  Money.fromNumber(50, "NGN"),
  "bank_transfer"
);

if (!result.isValid) {
  console.error(result.errors);
  // ["Minimum funding amount is ₦100.00"]
}
```



### validateTransactionLimits

Validates transaction against user's KYC tier limits.

**Signature:**

```typescript
function validateTransactionLimits(
  userId: UserId,
  amount: Money,
  type: TransactionType,
  userKycTier: number,
  dailyTransactionTotal: Money,
  monthlyTransactionTotal: Money
): ValidationResult
```

**Parameters:**

- `userId` - The user making the transaction (for reference)
- `amount` - The transaction amount to validate
- `type` - Transaction type (for reference, not currently used in validation)
- `userKycTier` - User's KYC verification tier (0-2)
- `dailyTransactionTotal` - User's total transactions for today
- `monthlyTransactionTotal` - User's total transactions for this month

**Validation Checks:**

1. **Daily Limit**: Ensures daily total + new amount doesn't exceed tier limit
2. **Monthly Limit**: Ensures monthly total + new amount doesn't exceed tier limit
3. **Single Transaction Limit**: Ensures transaction amount doesn't exceed tier limit

**Returns:** `ValidationResult` with validation status and error messages

**Example:**

```typescript
const result = validateTransactionLimits(
  userId,
  Money.fromNumber(100000, "NGN"),
  "contribution",
  1, // Basic KYC
  Money.fromNumber(40000, "NGN"), // Already spent today
  Money.fromNumber(200000, "NGN") // Already spent this month
);

if (!result.isValid) {
  console.error(result.errors);
  // ["Daily transaction limit of ₦50,000.00 exceeded"]
}
```



## KYC Tiers and Limits

The platform enforces transaction limits based on user KYC (Know Your Customer) verification levels.

### Tier 0: Unverified

**Requirements:** None (default tier for new users)

| Limit Type | Amount (NGN) |
|------------|--------------|
| Daily Limit | ₦5,000 |
| Monthly Limit | ₦50,000 |
| Single Transaction | ₦2,000 |

**Use Case:** Trial users, minimal verification required

### Tier 1: Basic KYC

**Requirements:** 
- Phone number verification
- Email verification
- Basic identity information

| Limit Type | Amount (NGN) |
|------------|--------------|
| Daily Limit | ₦50,000 |
| Monthly Limit | ₦500,000 |
| Single Transaction | ₦20,000 |

**Use Case:** Regular users with basic verification

### Tier 2: Full KYC

**Requirements:**
- All Tier 1 requirements
- Government-issued ID verification
- Address verification
- Selfie verification

| Limit Type | Amount (NGN) |
|------------|--------------|
| Daily Limit | ₦500,000 |
| Monthly Limit | ₦5,000,000 |
| Single Transaction | ₦200,000 |

**Use Case:** Power users, high-value transactions

### Upgrading KYC Tier

Users can upgrade their KYC tier by:
1. Completing additional verification steps
2. Submitting required documents
3. Passing automated verification checks

**Benefits of Higher Tiers:**
- Higher transaction limits
- Access to premium features
- Lower transaction fees (future feature)
- Priority customer support



## Validation Rules

### Contribution Validation Rules

| Rule | Description | Error Message |
|------|-------------|---------------|
| Plan Ownership | Plan must belong to the user | "Plan does not belong to the user" |
| Plan Status | Plan must accept contributions | "Plan cannot accept this contribution amount or is not active" |
| Wallet Balance | Sufficient funds if using wallet | "Insufficient wallet balance" |
| Minimum Amount | At least ₦10 | "Minimum contribution amount is ₦10.00" |
| Maximum Amount | At most ₦50,000 | "Maximum contribution amount is ₦50,000.00" |

### Withdrawal Validation Rules

| Rule | Description | Error Message |
|------|-------------|---------------|
| Plan Ownership | Plan must belong to the user | "Plan does not belong to the user" |
| Withdrawal Eligibility | Plan must allow withdrawals | "Withdrawal not allowed for this plan" |
| Balance Check | Amount ≤ available balance | "Withdrawal amount exceeds available balance" |
| Early Withdrawal | Warning if penalty applies | "Early withdrawal penalty of ₦X.XX will be applied" |
| Minimum Amount | At least ₦100 | "Minimum withdrawal amount is ₦100.00" |

### Wallet Funding Validation Rules

| Rule | Description | Error Message |
|------|-------------|---------------|
| Minimum Amount | At least ₦100 | "Minimum funding amount is ₦100.00" |
| Maximum Amount | At most ₦1,000,000 | "Maximum funding amount per transaction is ₦1,000,000.00" |
| Valid Source | Must be bank_transfer or debit_card | "Invalid payment source for wallet funding" |

### Transaction Limit Validation Rules

| Rule | Description | Error Message |
|------|-------------|---------------|
| Daily Limit | Daily total + amount ≤ tier limit | "Daily transaction limit of ₦X.XX exceeded" |
| Monthly Limit | Monthly total + amount ≤ tier limit | "Monthly transaction limit of ₦X.XX exceeded" |
| Single Transaction | Amount ≤ tier single transaction limit | "Single transaction limit of ₦X.XX exceeded" |



## Examples

### Complete Contribution Validation

```typescript
import { 
  validateContribution,
  validateTransactionLimits 
} from "@host/domain";

async function validateAndProcessContribution(
  userId: UserId,
  planId: PlanId,
  amount: Money,
  source: PaymentSource
) {
  // 1. Get required data
  const plan = await savingsRepository.findById(planId);
  const walletBalance = source === "wallet" 
    ? await walletRepository.getBalance(userId)
    : undefined;
  
  // 2. Validate contribution
  const contributionValidation = validateContribution(
    userId,
    planId,
    amount,
    source,
    plan,
    walletBalance
  );
  
  if (!contributionValidation.isValid) {
    return {
      success: false,
      errors: contributionValidation.errors
    };
  }
  
  // 3. Get user's KYC tier and transaction totals
  const user = await userRepository.findById(userId);
  const dailyTotal = await transactionRepository.getDailyTransactionTotal(
    userId,
    new Date()
  );
  const monthlyTotal = await transactionRepository.getMonthlyTransactionTotal(
    userId,
    new Date().getFullYear(),
    new Date().getMonth() + 1
  );
  
  // 4. Validate transaction limits
  const limitsValidation = validateTransactionLimits(
    userId,
    amount,
    "contribution",
    user.kycTier,
    dailyTotal,
    monthlyTotal
  );
  
  if (!limitsValidation.isValid) {
    return {
      success: false,
      errors: limitsValidation.errors
    };
  }
  
  // 5. All validations passed
  return {
    success: true,
    errors: []
  };
}
```

### Withdrawal Validation with UI Feedback

```typescript
async function validateWithdrawalWithFeedback(
  userId: UserId,
  amount: Money,
  planId?: PlanId
) {
  const plan = planId 
    ? await savingsRepository.findById(planId)
    : undefined;
  
  const validation = validateWithdrawal(userId, amount, plan);
  
  if (!validation.isValid) {
    // Separate errors and warnings
    const errors = validation.errors.filter(
      e => !e.includes("penalty")
    );
    const warnings = validation.errors.filter(
      e => e.includes("penalty")
    );
    
    if (errors.length > 0) {
      // Show errors - block withdrawal
      showErrorDialog({
        title: "Withdrawal Not Allowed",
        message: errors.join("\n")
      });
      return false;
    }
    
    if (warnings.length > 0) {
      // Show warnings - allow with confirmation
      const confirmed = await showConfirmDialog({
        title: "Early Withdrawal Penalty",
        message: warnings.join("\n"),
        confirmText: "Proceed with Penalty",
        cancelText: "Cancel"
      });
      return confirmed;
    }
  }
  
  return true;
}
```

### Wallet Funding Validation

```typescript
async function validateWalletFundingRequest(
  userId: UserId,
  amount: Money,
  source: PaymentSource
) {
  // 1. Validate funding parameters
  const validation = validateWalletFunding(userId, amount, source);
  
  if (!validation.isValid) {
    throw new ValidationError(validation.errors);
  }
  
  // 2. Additional checks (external to validation service)
  
  // Check if payment source is verified
  const paymentMethods = await paymentService.getPaymentMethods(userId);
  const selectedMethod = paymentMethods.find(m => m.type === source);
  
  if (!selectedMethod || !selectedMethod.isActive) {
    throw new Error("Payment method not found or inactive");
  }
  
  // 3. Proceed with funding
  return {
    isValid: true,
    paymentMethod: selectedMethod
  };
}
```

### KYC Tier Limit Check

```typescript
async function checkUserLimits(userId: UserId) {
  const user = await userRepository.findById(userId);
  const today = new Date();
  
  // Get current usage
  const dailyTotal = await transactionRepository.getDailyTransactionTotal(
    userId,
    today
  );
  const monthlyTotal = await transactionRepository.getMonthlyTransactionTotal(
    userId,
    today.getFullYear(),
    today.getMonth() + 1
  );
  
  // Get limits for user's tier
  const limits = getTransactionLimitsForTier(user.kycTier);
  
  // Calculate remaining limits
  const dailyRemaining = limits.dailyLimit.subtract(dailyTotal);
  const monthlyRemaining = limits.monthlyLimit.subtract(monthlyTotal);
  
  return {
    tier: user.kycTier,
    limits: {
      daily: {
        limit: limits.dailyLimit,
        used: dailyTotal,
        remaining: dailyRemaining
      },
      monthly: {
        limit: limits.monthlyLimit,
        used: monthlyTotal,
        remaining: monthlyRemaining
      },
      singleTransaction: limits.singleTransactionLimit
    },
    canUpgrade: user.kycTier < 2
  };
}

function getTransactionLimitsForTier(tier: number) {
  switch (tier) {
    case 0:
      return {
        dailyLimit: Money.fromNumber(5000, "NGN"),
        monthlyLimit: Money.fromNumber(50000, "NGN"),
        singleTransactionLimit: Money.fromNumber(2000, "NGN")
      };
    case 1:
      return {
        dailyLimit: Money.fromNumber(50000, "NGN"),
        monthlyLimit: Money.fromNumber(500000, "NGN"),
        singleTransactionLimit: Money.fromNumber(20000, "NGN")
      };
    case 2:
      return {
        dailyLimit: Money.fromNumber(500000, "NGN"),
        monthlyLimit: Money.fromNumber(5000000, "NGN"),
        singleTransactionLimit: Money.fromNumber(200000, "NGN")
      };
    default:
      return {
        dailyLimit: Money.fromNumber(1000, "NGN"),
        monthlyLimit: Money.fromNumber(10000, "NGN"),
        singleTransactionLimit: Money.fromNumber(500, "NGN")
      };
  }
}
```

### Pre-Transaction Validation Flow

```typescript
async function preTransactionValidation(
  userId: UserId,
  transactionType: "contribution" | "withdrawal" | "wallet_funding",
  amount: Money,
  additionalParams: any
) {
  const validations: ValidationResult[] = [];
  
  // 1. Type-specific validation
  switch (transactionType) {
    case "contribution":
      validations.push(
        validateContribution(
          userId,
          additionalParams.planId,
          amount,
          additionalParams.source,
          additionalParams.plan,
          additionalParams.walletBalance
        )
      );
      break;
      
    case "withdrawal":
      validations.push(
        validateWithdrawal(
          userId,
          amount,
          additionalParams.plan
        )
      );
      break;
      
    case "wallet_funding":
      validations.push(
        validateWalletFunding(
          userId,
          amount,
          additionalParams.source
        )
      );
      break;
  }
  
  // 2. Transaction limits validation (for all types)
  const user = await userRepository.findById(userId);
  const dailyTotal = await transactionRepository.getDailyTransactionTotal(
    userId,
    new Date()
  );
  const monthlyTotal = await transactionRepository.getMonthlyTransactionTotal(
    userId,
    new Date().getFullYear(),
    new Date().getMonth() + 1
  );
  
  validations.push(
    validateTransactionLimits(
      userId,
      amount,
      transactionType,
      user.kycTier,
      dailyTotal,
      monthlyTotal
    )
  );
  
  // 3. Combine all validation results
  const allErrors = validations.flatMap(v => v.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}
```

## See Also

- [Transaction Processing Service](./transaction-processing.md)
- [KYC Verification Guide](./kyc-verification.md)
- [Transaction Limits Configuration](./transaction-limits.md)
- [Payment Sources](./payment-sources.md)
