# Transaction Processing Service Documentation

## Overview

The Transaction Processing Service provides core business logic for processing financial transactions in the AV-Daily savings platform. It handles contributions, withdrawals, auto-save operations, interest calculations, and transaction reversals.

## Table of Contents

- [Processing Result Interface](#processing-result-interface)
- [Core Functions](#core-functions)
  - [processContribution](#processcontribution)
  - [processWithdrawal](#processwithdrawal)
  - [processAutoSave](#processautosave)
  - [calculateAndProcessInterest](#calculateandprocessinterest)
  - [processReversal](#processreversal)
- [Business Rules](#business-rules)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Processing Result Interface

### `ProcessingResult`

Represents the outcome of a transaction processing operation.

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `success` | `boolean` | Yes | Indicates whether the transaction was processed successfully |
| `transaction` | `Transaction` | Yes | The transaction entity after processing (completed, failed, or cancelled) |
| `updatedPlan` | `SavingsPlan` | No | The updated savings plan if the transaction affected a plan |
| `message` | `string` | Yes | Human-readable message describing the processing outcome |
| `actualAmount` | `Money` | No | The actual amount processed (may differ due to penalties) |

**Example:**

```typescript
const result: ProcessingResult = {
  success: true,
  transaction: completedTransaction,
  updatedPlan: updatedSavingsPlan,
  message: "Contribution processed successfully"
};
```



## Core Functions

### processContribution

Processes user contributions to their savings plans.

**Signature:**

```typescript
function processContribution(
  transaction: Transaction,
  plan: SavingsPlan
): ProcessingResult
```

**Parameters:**

- `transaction` - The pending contribution transaction to process. Must be a credit transaction with type "contribution"
- `plan` - The savings plan to which the contribution will be applied. Must be in "active" status

**Returns:** `ProcessingResult` with success status and updated entities

**Business Rules:**

- Transaction must be a credit transaction of type "contribution"
- Transaction must be in "pending" status
- Contribution amount must match the plan's daily amount
- Plan must be in "active" status
- If contribution reaches target amount, plan is automatically completed

**Side Effects:**

- Updates the savings plan's current amount
- Increments contribution streak counter
- Increments total contributions counter
- May change plan status to "completed" if target is reached
- Updates transaction status to "completed" or "failed"

**Throws:**

- `Error` - If transaction type is not "contribution" or not a credit transaction
- `Error` - If transaction is not in "pending" status

**Example:**

```typescript
const transaction = Transaction.createContribution(
  userId,
  planId,
  Money.fromNumber(1000, "NGN"),
  "wallet",
  "ref-123"
);

const result = processContribution(transaction, savingsPlan);

if (result.success) {
  console.log(result.message); // "Contribution processed successfully"
  console.log(result.updatedPlan.currentAmount); // Updated balance
} else {
  console.error(result.message); // Error message
}
```



### processWithdrawal

Processes withdrawal requests from savings plans or wallets.

**Signature:**

```typescript
function processWithdrawal(
  transaction: Transaction,
  plan?: SavingsPlan
): ProcessingResult
```

**Parameters:**

- `transaction` - The pending withdrawal transaction to process. Must be a debit transaction with type "withdrawal"
- `plan` - Optional. The savings plan from which to withdraw. If not provided, treats as a wallet withdrawal

**Returns:** `ProcessingResult` with success status, updated entities, and actual withdrawal amount

**Business Rules:**

- Transaction must be a debit transaction of type "withdrawal"
- Transaction must be in "pending" status
- For plan withdrawals:
  - Plan must be completed OR matured OR eligible for early withdrawal
  - Early withdrawals incur a 5% penalty
  - Withdrawal amount cannot exceed available balance
- For wallet withdrawals (no plan): No additional restrictions

**Early Withdrawal Penalty:**

When a user withdraws from an active plan before maturity:
- 5% penalty is deducted from the withdrawal amount
- User receives: withdrawal amount - penalty
- A separate penalty transaction should be created

**Side Effects:**

- Updates the savings plan's current amount (if plan provided)
- Updates transaction status to "completed" or "failed"
- May trigger penalty transaction creation

**Throws:**

- `Error` - If transaction type is not "withdrawal" or not a debit transaction
- `Error` - If transaction is not in "pending" status

**Example:**

```typescript
// Regular withdrawal from completed plan
const transaction = Transaction.createWithdrawal(
  userId,
  Money.fromNumber(50000, "NGN"),
  "ref-456",
  planId,
  "Withdrawal from completed savings"
);

const result = processWithdrawal(transaction, completedPlan);

if (result.success) {
  console.log(result.actualAmount); // Full amount
}

// Early withdrawal with penalty
const earlyResult = processWithdrawal(transaction, activePlan);

if (earlyResult.success) {
  console.log(earlyResult.actualAmount); // Amount minus 5% penalty
}
```



### processAutoSave

Processes automated daily contributions to savings plans.

**Signature:**

```typescript
function processAutoSave(
  transaction: Transaction,
  plan: SavingsPlan,
  walletBalance: Money
): ProcessingResult
```

**Parameters:**

- `transaction` - The pending auto-save transaction to process. Must be of type "auto_save"
- `plan` - The savings plan configured for auto-save. Must have `autoSaveEnabled: true`
- `walletBalance` - The user's current wallet balance for verification

**Returns:** `ProcessingResult` with success status and updated entities

**Auto-Save Mechanism:**

Auto-save allows users to set up automatic daily contributions at a specific time. The system checks:
1. Is it the configured auto-save time? (within 5-minute window)
2. Does the user have sufficient wallet balance?
3. Is the plan still active and accepting contributions?

**Business Rules:**

- Transaction must be of type "auto_save"
- Transaction must be in "pending" status
- Current time must be within 5 minutes of plan's auto-save time
- Wallet balance must be sufficient for the contribution amount
- Plan must be in "active" status with auto-save enabled
- Contribution amount must match plan's daily amount

**Failure Scenarios:**

- Not auto-save time: Transaction fails with "Not auto-save time" message
- Insufficient balance: Transaction fails with "Insufficient wallet balance" message
- Plan validation fails: Delegates to contribution processing which handles errors

**Side Effects:**

- Deducts amount from user's wallet (external to this function)
- Updates savings plan via contribution processing
- Updates transaction status

**Throws:**

- `Error` - If transaction type is not "auto_save"
- `Error` - If transaction is not in "pending" status

**Example:**

```typescript
// User has auto-save configured for 09:00 daily
const autoSaveTransaction = Transaction.createAutoSave(
  userId,
  planId,
  Money.fromNumber(1000, "NGN"),
  "auto-ref-789"
);

const userWalletBalance = Money.fromNumber(5000, "NGN");

const result = processAutoSave(
  autoSaveTransaction,
  savingsPlan,
  userWalletBalance
);

if (result.success) {
  console.log("Auto-save successful");
  // Deduct from wallet, update plan
} else {
  console.log(result.message); 
  // "Insufficient wallet balance" or "Not auto-save time"
  // Retry later or notify user
}
```



### calculateAndProcessInterest

Calculates and creates interest transactions for completed savings plans.

**Signature:**

```typescript
function calculateAndProcessInterest(
  plan: SavingsPlan,
  userId: UserId
): Transaction | null
```

**Parameters:**

- `plan` - The savings plan to calculate interest for. Must be in "completed" status
- `userId` - The user ID for creating the interest transaction

**Returns:** `Transaction | null` - A completed interest transaction, or `null` if no interest is due

**Business Rules:**

- Plan must be in "completed" status
- Plan must have a non-zero interest rate
- Interest earned must be greater than zero
- Interest is calculated using simple interest formula based on:
  - Current amount in the plan
  - Interest rate (annual percentage)
  - Days elapsed since plan start date

**Interest Calculation:**

```
yearlyInterest = currentAmount × interestRate
dailyInterest = yearlyInterest / 365
totalInterest = dailyInterest × daysElapsed
```

**Returns `null` when:**

- Plan is not completed
- Interest rate is 0
- Calculated interest is 0

**Example:**

```typescript
const completedPlan = savingsPlan.complete();

const interestTransaction = calculateAndProcessInterest(
  completedPlan,
  userId
);

if (interestTransaction) {
  console.log(`Interest earned: ${interestTransaction.amount.format()}`);
  // Save the interest transaction
  // Credit user's wallet or plan balance
} else {
  console.log("No interest to process");
}
```



### processReversal

Creates and processes a reversal transaction for failed or disputed payments.

**Signature:**

```typescript
function processReversal(
  originalTransaction: Transaction,
  reason: string
): Transaction
```

**Parameters:**

- `originalTransaction` - The completed transaction to reverse. Must be in "completed" status
- `reason` - Human-readable reason for the reversal (e.g., "Payment gateway failure")

**Returns:** `Transaction` - A completed reversal transaction with opposite type

**Business Rules:**

- Original transaction must be in "completed" status
- Reversal transaction type is opposite of original:
  - Credit transaction → Withdrawal reversal
  - Debit transaction → Contribution reversal
- Reversal amount equals original transaction amount
- Reversal transaction is immediately marked as completed
- Metadata includes original transaction ID and reversal reason

**Use Cases:**

- Payment gateway failures after initial success
- Disputed transactions requiring refund
- System errors requiring transaction rollback
- Fraud detection and prevention

**Metadata Included:**

```typescript
{
  originalTransactionId: string,
  reversalReason: string,
  isReversal: true
}
```

**Throws:**

- `Error` - If original transaction is not in "completed" status

**Example:**

```typescript
// Original contribution succeeded but payment gateway failed
const originalTransaction = completedContribution;

const reversalTransaction = processReversal(
  originalTransaction,
  "Payment gateway failure - funds not received"
);

console.log(reversalTransaction.type); // "withdrawal"
console.log(reversalTransaction.status); // "completed"
console.log(reversalTransaction.reference); // "reversal-ref-123"

// Apply reversal to user's account
// Deduct from plan balance
// Credit back to original payment source
```



## Business Rules

### Transaction Status Flow

```
pending → completed (success)
pending → failed (validation/processing error)
pending → cancelled (user action)
```

### Contribution Rules

1. **Amount Validation**: Contribution must match plan's daily amount exactly
2. **Plan Status**: Plan must be in "active" status
3. **Target Limit**: Cannot contribute beyond target amount
4. **Streak Tracking**: Each successful contribution increments the streak
5. **Auto-Completion**: Plan automatically completes when target is reached

### Withdrawal Rules

1. **Eligibility**:
   - Plan is completed, OR
   - Plan has reached maturity date, OR
   - Plan is active with balance (early withdrawal with penalty)

2. **Early Withdrawal Penalty**: 5% of withdrawal amount
3. **Balance Check**: Cannot withdraw more than available balance
4. **Minimum Amount**: Platform-defined minimum withdrawal amount

### Auto-Save Rules

1. **Timing**: Must be within 5-minute window of configured time
2. **Balance**: Wallet must have sufficient funds
3. **Plan Status**: Plan must be active with auto-save enabled
4. **Frequency**: Once per day at configured time

### Interest Calculation

1. **Eligibility**: Only for completed plans with non-zero interest rate
2. **Formula**: Simple interest based on days elapsed
3. **Rate**: Annual percentage rate divided by 365 days
4. **Timing**: Calculated when plan is completed

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| "Invalid transaction type" | Wrong transaction type for operation | Use correct transaction creation method |
| "Can only process pending transactions" | Transaction already processed | Check transaction status before processing |
| "Plan cannot accept this contribution" | Plan inactive or amount mismatch | Verify plan status and amount |
| "Insufficient wallet balance" | Not enough funds for auto-save | Top up wallet or disable auto-save |
| "Not auto-save time" | Outside configured time window | Wait for next auto-save window |
| "Withdrawal not allowed" | Plan not eligible for withdrawal | Wait for maturity or accept penalty |

### Error Response Pattern

```typescript
{
  success: false,
  transaction: failedTransaction, // with status "failed"
  updatedPlan: originalPlan, // unchanged
  message: "Descriptive error message"
}
```



## Examples

### Complete Contribution Flow

```typescript
import { 
  processContribution, 
  Transaction, 
  SavingsPlan, 
  Money 
} from "@host/domain";

// 1. Create a contribution transaction
const transaction = Transaction.createContribution(
  userId,
  planId,
  Money.fromNumber(1000, "NGN"),
  "wallet",
  "txn-ref-12345"
);

// 2. Get the user's savings plan
const plan = await savingsRepository.findById(planId);

// 3. Process the contribution
const result = processContribution(transaction, plan);

// 4. Handle the result
if (result.success) {
  // Save updated entities
  await transactionRepository.save(result.transaction);
  await savingsRepository.update(result.updatedPlan);
  
  // Deduct from wallet
  await walletRepository.debit(userId, transaction.amount);
  
  // Notify user
  await notificationService.send(userId, {
    title: "Contribution Successful",
    body: result.message
  });
} else {
  // Handle failure
  await transactionRepository.save(result.transaction);
  console.error(result.message);
}
```

### Complete Withdrawal Flow with Penalty

```typescript
// 1. Create withdrawal transaction
const withdrawalTxn = Transaction.createWithdrawal(
  userId,
  Money.fromNumber(25000, "NGN"),
  "withdrawal-ref-789",
  planId,
  "Early withdrawal"
);

// 2. Get the savings plan
const plan = await savingsRepository.findById(planId);

// 3. Check if early withdrawal (optional - for UI warning)
if (plan.canEarlyWithdraw() && !plan.canWithdraw()) {
  const penalty = plan.calculateEarlyWithdrawalPenalty();
  console.warn(`Early withdrawal penalty: ${penalty.format()}`);
}

// 4. Process withdrawal
const result = processWithdrawal(withdrawalTxn, plan);

// 5. Handle result
if (result.success) {
  // Save entities
  await transactionRepository.save(result.transaction);
  if (result.updatedPlan) {
    await savingsRepository.update(result.updatedPlan);
  }
  
  // Credit user's wallet with actual amount (after penalty)
  await walletRepository.credit(userId, result.actualAmount);
  
  console.log(`Withdrawn: ${result.actualAmount.format()}`);
}
```

### Auto-Save Scheduled Job

```typescript
// Scheduled job that runs every minute
async function processAutoSaveJobs() {
  // 1. Find all plans due for auto-save
  const plansForAutoSave = await savingsRepository.findPlansForAutoSave();
  
  for (const plan of plansForAutoSave) {
    try {
      // 2. Get user's wallet balance
      const walletBalance = await walletRepository.getBalance(plan.userId);
      
      // 3. Create auto-save transaction
      const transaction = Transaction.createAutoSave(
        plan.userId,
        plan.id,
        plan.dailyAmount,
        `auto-save-${plan.id.value}-${Date.now()}`
      );
      
      // 4. Process auto-save
      const result = processAutoSave(transaction, plan, walletBalance);
      
      // 5. Handle result
      if (result.success) {
        await transactionRepository.save(result.transaction);
        await savingsRepository.update(result.updatedPlan);
        await walletRepository.debit(plan.userId, plan.dailyAmount);
        
        await notificationService.send(plan.userId, {
          title: "Auto-Save Successful",
          body: `${plan.dailyAmount.format()} saved to ${plan.planName}`
        });
      } else {
        // Log failure but don't notify user for every failure
        console.log(`Auto-save failed for plan ${plan.id.value}: ${result.message}`);
        await transactionRepository.save(result.transaction);
      }
    } catch (error) {
      console.error(`Error processing auto-save for plan ${plan.id.value}:`, error);
    }
  }
}
```

### Interest Calculation on Plan Completion

```typescript
// When a plan is completed
async function onPlanCompleted(plan: SavingsPlan) {
  // 1. Calculate and process interest
  const interestTransaction = calculateAndProcessInterest(plan, plan.userId);
  
  if (interestTransaction) {
    // 2. Save interest transaction
    await transactionRepository.save(interestTransaction);
    
    // 3. Credit interest to user's wallet
    await walletRepository.credit(plan.userId, interestTransaction.amount);
    
    // 4. Notify user
    await notificationService.send(plan.userId, {
      title: "Interest Earned!",
      body: `You earned ${interestTransaction.amount.format()} in interest on ${plan.planName}`
    });
    
    console.log(`Interest processed: ${interestTransaction.amount.format()}`);
  }
}
```

### Transaction Reversal

```typescript
// Handle payment gateway webhook indicating failure
async function handlePaymentFailure(webhookData: any) {
  // 1. Find the original transaction
  const originalTxn = await transactionRepository.findByReference(
    webhookData.reference
  );
  
  if (!originalTxn || !originalTxn.isCompleted()) {
    return; // Nothing to reverse
  }
  
  // 2. Create reversal
  const reversalTxn = processReversal(
    originalTxn,
    `Payment gateway failure: ${webhookData.failureReason}`
  );
  
  // 3. Save reversal transaction
  await transactionRepository.save(reversalTxn);
  
  // 4. Reverse the effects
  if (originalTxn.planId) {
    const plan = await savingsRepository.findById(originalTxn.planId);
    
    // Deduct the amount that was added
    const updatedPlan = new SavingsPlan(
      plan.id,
      plan.userId,
      plan.planName,
      plan.dailyAmount,
      plan.cycleDuration,
      plan.targetAmount,
      plan.currentAmount.subtract(originalTxn.amount),
      plan.autoSaveEnabled,
      plan.autoSaveTime,
      plan.status,
      plan.startDate,
      plan.endDate,
      plan.interestRate,
      Math.max(0, plan.contributionStreak - 1),
      Math.max(0, plan.totalContributions - 1),
      plan.createdAt,
      new Date()
    );
    
    await savingsRepository.update(updatedPlan);
  }
  
  // 5. Notify user
  await notificationService.send(originalTxn.userId, {
    title: "Transaction Reversed",
    body: "Your recent transaction was reversed due to payment failure"
  });
}
```

## See Also

- [Transaction Validation Service](./transaction-validation.md)
- [Savings Plan Entity](./savings-plan.md)
- [Transaction Entity](./transaction.md)
- [Money Value Object](./money.md)
