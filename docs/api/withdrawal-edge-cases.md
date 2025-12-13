# Withdrawal API Documentation

## Overview

The withdrawal system implements comprehensive edge case handling to ensure secure and reliable fund withdrawals from savings plans. This document describes the new error types, validation logic, and client integration patterns.

## Withdrawal Endpoint

### `WithdrawFromPlan`

Processes a withdrawal from a completed or matured savings plan with comprehensive validations.

**Payload:**
```typescript
{
  planId: string;
  amount: number;
  destination: "wallet" | "bank_account";
  bankAccountId?: string;
  reason?: string; // Optional audit trail field
}
```

**Success Response:**
```typescript
{
  transactionId: string;
  status: "success" | "pending" | "failed";
  message: string;
}
```

## Error Types

### WithdrawalLimitError

Returned when a withdrawal exceeds configured daily, weekly, or monthly limits.

**Structure:**
```typescript
{
  _tag: "WithdrawalLimitError";
  period: "daily" | "weekly" | "monthly";
  limit: number;
  current: number;
  limitType: "count" | "amount";
}
```

**Example:**
```json
{
  "_tag": "WithdrawalLimitError",
  "period": "daily",
  "limit": 5,
  "current": 5,
  "limitType": "count"
}
```

**Client Handling:**
```typescript
if (error._tag === "WithdrawalLimitError") {
  const { period, limit, current, limitType } = error;
  if (limitType === "count") {
    showError(`Daily withdrawal limit reached (${current}/${limit} withdrawals)`);
  } else {
    showError(`Daily amount limit reached`);
  }
}
```

### MinimumBalanceError

Returned when a withdrawal would violate the plan's minimum balance requirement.

**Structure:**
```typescript
{
  _tag: "MinimumBalanceError";
  planId: string;
  requestedAmount: number;
  currentBalance: number;
  minimumBalance: number;
  currency: string;
}
```

**Example:**
```json
{
  "_tag": "MinimumBalanceError",
  "planId": "550e8400-e29b-41d4-a716-446655440000",
  "requestedAmount": 50000,
  "currentBalance": 51000,
  "minimumBalance": 1000,
  "currency": "NGN"
}
```

**Client Handling:**
```typescript
if (error._tag === "MinimumBalanceError") {
  const maxWithdrawable = error.currentBalance - error.minimumBalance;
  showError(
    `Minimum balance of ${formatCurrency(error.minimumBalance, error.currency)} required. ` +
    `Maximum withdrawable: ${formatCurrency(maxWithdrawable, error.currency)}`
  );
}
```

### ConcurrentWithdrawalError

Returned when a concurrent withdrawal is detected (optimistic locking conflict).

**Structure:**
```typescript
{
  _tag: "ConcurrentWithdrawalError";
  planId: string;
  message: string;
}
```

**Example:**
```json
{
  "_tag": "ConcurrentWithdrawalError",
  "planId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Concurrent modification detected. Expected version 5, but found 6. Please retry."
}
```

**Client Handling:**
```typescript
if (error._tag === "ConcurrentWithdrawalError") {
  showError("Another withdrawal is in progress. Please retry in a moment.", {
    retry: true,
    retryDelay: 2000
  });
}
```

## Withdrawal Limits

**Daily Limits:**
- Maximum 5 withdrawals OR
- Maximum ₦100,000 total amount

**Weekly Limits:**
- Maximum 15 withdrawals OR
- Maximum ₦500,000 total amount

**Monthly Limits:**
- Maximum 30 withdrawals OR
- Maximum ₦2,000,000 total amount

**Note:** Limits are enforced based on whichever threshold is reached first.

## Validation Flow

The withdrawal process performs validations in the following order:

1. **Plan Ownership** - Verify user owns the plan
2. **Pending Withdrawals** - Check for existing pending transactions
3. **Plan Eligibility**  - Verify plan is completed/matured or eligible for early withdrawal
4. **Withdrawal Limits** - Enforce daily/weekly/monthly limits (count and amount)
5. **Minimum Balance** - Ensure withdrawal respects minimum balance requirement
6. **Sufficient Funds** - Verify plan has enough balance
7. **Concurrency Control** - Check version hasn't changed (optimistic locking)

## Best Practices

### Error Handling

Always handle specific error types before falling back to generic errors:

```typescript
try {
  const result = await client.withdrawFromPlan(payload);
  showSuccess(`Withdrawal successful: ${result.transactionId}`);
} catch (error) {
  // Handle specific errors
  if (error._tag === "WithdrawalLimitError") {
    handleLimitError(error);
  } else if (error._tag === "MinimumBalanceError") {
    handleMinBalanceError(error);
  } else if (error._tag === "ConcurrentWithdrawalError") {
    // Auto-retry after brief delay
    setTimeout(() => retryWithdrawal(payload), 2000);
  } else {
    // Generic error handling
    showError(error.message || "Withdrawal failed");
  }
}
```

### Retry Logic

For concurrent withdrawal errors, implement exponential backoff:

```typescript
async function withdrawWithRetry(payload, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.withdrawFromPlan(payload);
    } catch (error) {
      if (error._tag === "ConcurrentWithdrawalError" && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### User Feedback

Provide clear, actionable feedback for each error type:

- **Limit Exceeded**: Show when limits reset (next day/week/month)
- **Minimum Balance**: Display maximum withdrawable amount
- **Concurrent Error**: Indicate retry is automatic or suggest manual retry

## Migration Guide

If you're updating an existing integration:

1. **Update Error Handling** - Add handlers for new error types
2. **Test Limit Scenarios** - Verify your app handles limit errors gracefully
3. **Implement Retry Logic** - Add automatic retry for concurrent errors
4. **Update UI** - Display helpful messages for each error type

## Related Documentation

- [Savings Plans API](/docs/api/savings-plans.md)
- [Transaction API](/docs/api/transactions.md)
- [Error Codes Reference](/docs/api/errors.md)
