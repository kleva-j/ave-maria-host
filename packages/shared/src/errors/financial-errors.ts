// Financial Error Definitions using Effect-TS Tagged Errors
// These errors represent all possible failure scenarios in the AV-Daily financial system

import { Data } from "effect";

/**
 * Error thrown when a user has insufficient funds for an operation
 * Used in wallet operations, contributions, and withdrawals
 */
export class InsufficientFundsError extends Data.TaggedError(
  "InsufficientFundsError"
)<{
  readonly available: number;
  readonly required: number;
  readonly currency: string;
}> {}

/**
 * Error thrown when a savings plan cannot be found
 * Used in plan retrieval, updates, and contribution operations
 */
export class PlanNotFoundError extends Data.TaggedError("PlanNotFoundError")<{
  readonly planId: string;
}> {}

/**
 * Error thrown when a user's KYC tier is insufficient for an operation
 * Used to enforce tiered access control based on verification level
 */
export class InvalidKycTierError extends Data.TaggedError(
  "InvalidKycTierError"
)<{
  readonly requiredTier: number;
  readonly currentTier: number;
  readonly operation: string;
}> {}

/**
 * Error thrown when payment gateway operations fail
 * Wraps errors from external payment providers (Paystack, Flutterwave)
 */
export class PaymentGatewayError extends Data.TaggedError(
  "PaymentGatewayError"
)<{
  readonly provider: string;
  readonly code: string;
  readonly message: string;
}> {}

/**
 * Error thrown when input validation fails
 * Used for schema validation failures and business rule violations
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}> {}

/**
 * Error thrown when database operations fail
 * Wraps database-level errors from Drizzle ORM operations
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly operation: string;
  readonly table: string;
  readonly message: string;
}> {}

/**
 * Error thrown when a transaction cannot be found
 * Used in transaction history and status queries
 */
export class TransactionNotFoundError extends Data.TaggedError(
  "TransactionNotFoundError"
)<{
  readonly transactionId: string;
}> {}

/**
 * Error thrown when a wallet operation fails
 * Used for wallet-specific errors not covered by other error types
 */
export class WalletOperationError extends Data.TaggedError(
  "WalletOperationError"
)<{
  readonly operation: string;
  readonly reason: string;
  readonly walletId?: string;
}> {}

/**
 * Error thrown when a transaction operation fails
 * Used for transaction-specific errors not covered by other error types
 */
export class TransactionOperationError extends Data.TaggedError(
  "TransactionOperationError"
)<{
  readonly operation: string;
  readonly reason: string;
  readonly transactionId?: string;
}> {}

/**
 * Error thrown when a bank account operation fails
 * Used for bank account-specific errors not covered by other error types
 */
export class BankAccountOperationError extends Data.TaggedError(
  "BankAccountOperationError"
)<{
  readonly operation: string;
  readonly reason: string;
  readonly bankAccountId?: string;
}> {}

/**
 * Error thrown when a user's wallet cannot be found
 * Used when quering for a user's wallet before crediting or withdrawing
 */
export class WalletNotFoundError extends Data.TaggedError(
  "WalletNotFoundError"
)<{
  readonly userId: string;
  readonly operation: string;
}> {}

/**
 * Error thrown when a bank account cannot be found
 * Used when quering for a bank account before crediting or withdrawing
 */
export class BankAccountNotFoundError extends Data.TaggedError(
  "BankAccountNotFoundError"
)<{
  readonly bankAccountId: string;
  readonly operation: string;
}> {}

/**
 * Error thrown when an Ajo/Esusu group operation fails
 * Used for group-specific errors like invalid member operations
 */
export class GroupOperationError extends Data.TaggedError(
  "GroupOperationError"
)<{
  readonly groupId: string;
  readonly operation: string;
  readonly reason: string;
}> {}

/**
 * Error thrown when a user is not found
 * Used in user lookup operations across the system
 */
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string;
}> {}

/**
 * Error thrown when authentication or authorization fails
 * Used for access control and permission checks
 */
export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly userId: string;
  readonly resource: string;
  readonly action: string;
}> {}

/**
 * Error thrown when a contribution violates plan rules
 * Used to enforce contribution amount, timing, and frequency rules
 */
export class InvalidContributionError extends Data.TaggedError(
  "InvalidContributionError"
)<{
  readonly planId: string;
  readonly reason: string;
  readonly expectedAmount?: number;
  readonly providedAmount?: number;
}> {}

/**
 * Error thrown when a withdrawal is not allowed
 * Used to enforce withdrawal restrictions based on plan maturity
 */
export class WithdrawalNotAllowedError extends Data.TaggedError(
  "WithdrawalNotAllowedError"
)<{
  readonly planId: string;
  readonly reason: string;
  readonly maturityDate?: Date;
}> {}

/**
 * Error thrown when a plan state transition is invalid
 * Used to enforce valid state machine transitions (active -> paused, etc.)
 */
export class InvalidPlanStateError extends Data.TaggedError(
  "InvalidPlanStateError"
)<{
  readonly planId: string;
  readonly currentState: string;
  readonly attemptedState: string;
  readonly reason: string;
}> {}

/**
 * Error thrown when notification delivery fails
 * Used for SMS, push notification, and email delivery failures
 */
export class NotificationError extends Data.TaggedError("NotificationError")<{
  readonly channel: string;
  readonly recipient: string;
  readonly message: string;
}> {}

/**
 * Error thrown when external service integration fails
 * Generic error for third-party service failures
 */
export class ExternalServiceError extends Data.TaggedError(
  "ExternalServiceError"
)<{
  readonly service: string;
  readonly operation: string;
  readonly message: string;
}> {}

/**
 * Error thrown when rate limiting is triggered
 * Used to prevent abuse and ensure fair usage
 */
export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly resource: string;
  readonly limit: number;
  readonly resetAt: Date;
}> {}

/**
 * Error thrown when a duplicate resource is detected
 * Used to prevent duplicate plan names, group names, etc.
 */
export class DuplicateResourceError extends Data.TaggedError(
  "DuplicateResourceError"
)<{
  readonly resourceType: string;
  readonly identifier: string;
}> {}

/**
 * Error thrown when a business rule is violated
 * Generic error for domain-level business rule violations
 */
export class BusinessRuleViolationError extends Data.TaggedError(
  "BusinessRuleViolationError"
)<{
  readonly rule: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

/**
 * Error thrown when a withdrawal exceeds configured limits
 * Used to enforce daily/weekly/monthly withdrawal limits
 */
export class WithdrawalLimitExceededError extends Data.TaggedError(
  "WithdrawalLimitExceededError"
)<{
  readonly period: "daily" | "weekly" | "monthly";
  readonly limit: number;
  readonly current: number;
  readonly limitType: "count" | "amount";
}> {}

/**
 * Error thrown when a withdrawal would violate minimum balance requirements
 * Used to ensure plans maintain required minimum balances
 */
export class MinimumBalanceViolationError extends Data.TaggedError(
  "MinimumBalanceViolationError"
)<{
  readonly planId: string;
  readonly requestedAmount: number;
  readonly currentBalance: number;
  readonly minimumBalance: number;
  readonly currency: string;
}> {}

/**
 * Error thrown when a concurrent withdrawal is detected
 * Used to prevent race conditions in withdrawal processing
 */
export class ConcurrentWithdrawalError extends Data.TaggedError(
  "ConcurrentWithdrawalError"
)<{
  readonly planId: string;
  readonly expectedVersion: number;
  readonly actualVersion: number;
}> {}

/**
 * Error thrown when funds are on hold and not yet available for withdrawal
 * Used to enforce hold periods for recent deposits
 */
export class FundsOnHoldError extends Data.TaggedError("FundsOnHoldError")<{
  readonly heldAmount: number;
  readonly availableAmount: number;
  readonly releaseDate: Date;
  readonly currency: string;
}> {}

/**
 * Error thrown when a withdrawal violates compliance rules (e.g., KYC limits)
 */
export class ComplianceViolationError extends Data.TaggedError(
  "ComplianceViolationError"
)<{
  readonly userId: string;
  readonly reason: string;
  readonly limitAmount: number;
  readonly requestedAmount: number;
  readonly kycTier: string;
  readonly currency: string;
}> {}

/**
 * Error/Warning thrown when a withdrawal has tax implications
 * This can be informational or used to block until acknowledged
 */
export class TaxWarningError extends Data.TaggedError("TaxWarningError")<{
  readonly amount: number;
  readonly threshold: number;
  readonly message: string;
  readonly currency: string;
}> {}

/**
 * Union type representing all possible financial errors in the system
 * Use this type for comprehensive error handling in Effect pipelines
 */
export type FinancialError =
  | MinimumBalanceViolationError
  | WithdrawalLimitExceededError
  | BusinessRuleViolationError
  | ConcurrentWithdrawalError
  | WithdrawalNotAllowedError
  | TransactionOperationError
  | BankAccountOperationError
  | BankAccountNotFoundError
  | TransactionNotFoundError
  | ComplianceViolationError
  | InvalidContributionError
  | InsufficientFundsError
  | DuplicateResourceError
  | InvalidPlanStateError
  | ExternalServiceError
  | WalletOperationError
  | InvalidKycTierError
  | PaymentGatewayError
  | GroupOperationError
  | WalletNotFoundError
  | AuthorizationError
  | UserNotFoundError
  | PlanNotFoundError
  | NotificationError
  | FundsOnHoldError
  | TaxWarningError
  | ValidationError
  | RateLimitError
  | DatabaseError;
