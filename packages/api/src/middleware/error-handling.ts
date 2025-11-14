/**
 * @fileoverview Error Handling Middleware
 *
 * This module provides comprehensive error handling for API endpoints.
 * It maps domain errors to appropriate HTTP responses and ensures consistent
 * error formatting across the API.
 *
 * ## Key Features:
 * - **Error Mapping**: Maps domain errors to HTTP status codes
 * - **Error Formatting**: Consistent error response format
 * - **Error Logging**: Automatic error logging with context
 * - **Security**: Sanitizes error messages to prevent information leakage
 */

import { Effect } from "effect";

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response format
 */
export interface ErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly code: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Map domain errors to HTTP status codes
 */
export function getStatusCode(error: unknown): number {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    switch (error._tag) {
      case "InsufficientFundsError":
        return 400;
      case "PlanNotFoundError":
        return 404;
      case "InvalidKycTierError":
        return 403;
      case "PaymentGatewayError":
        return 502;
      case "ValidationError":
        return 400;
      case "DatabaseError":
        return 500;
      case "AuthenticationError":
        return 401;
      case "AuthorizationError":
        return 403;
      case "RateLimitExceededError":
        return 429;
      default:
        return 500;
    }
  }
  return 500;
}

/**
 * Get error code from domain error
 */
export function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    return error._tag as string;
  }
  return "INTERNAL_SERVER_ERROR";
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if ("_tag" in error) {
      // Provide default messages for known error types
      switch (error._tag) {
        case "InsufficientFundsError":
          return "Insufficient funds to complete this operation";
        case "PlanNotFoundError":
          return "Savings plan not found";
        case "InvalidKycTierError":
          return "Your KYC tier does not allow this operation";
        case "PaymentGatewayError":
          return "Payment gateway error occurred";
        case "ValidationError":
          return "Validation error occurred";
        case "DatabaseError":
          return "Database error occurred";
        case "AuthenticationError":
          return "Authentication failed";
        case "AuthorizationError":
          return "You are not authorized to perform this action";
        case "RateLimitExceededError":
          return "Rate limit exceeded. Please try again later";
        default:
          return "An unexpected error occurred";
      }
    }
  }
  return "An unexpected error occurred";
}

/**
 * Get error details (sanitized for security)
 */
export function getErrorDetails(error: unknown): Record<string, unknown> | undefined {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const details: Record<string, unknown> = {};
    const errorObj = error as Record<string, unknown>;

    // Only include safe fields in error details
    if ("field" in errorObj) {
      details.field = errorObj["field"];
    }
    if ("available" in errorObj && "required" in errorObj) {
      details.available = errorObj["available"];
      details.required = errorObj["required"];
    }
    if ("requiredTier" in errorObj && "currentTier" in errorObj) {
      details.requiredTier = errorObj["requiredTier"];
      details.currentTier = errorObj["currentTier"];
    }
    if ("limit" in errorObj && "resetAt" in errorObj) {
      details.limit = errorObj["limit"];
      details.resetAt = errorObj["resetAt"];
    }

    return Object.keys(details).length > 0 ? details : undefined;
  }
  return undefined;
}

/**
 * Format error as standard error response
 */
export function formatErrorResponse(error: unknown): ErrorResponse {
  const details = getErrorDetails(error);
  return {
    error: getErrorCode(error),
    message: getErrorMessage(error),
    code: getErrorCode(error),
    statusCode: getStatusCode(error),
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
}

/**
 * Error handling effect that catches and formats errors
 */
export const handleError = <A, E>(effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.catchAll((error) => {
      const errorResponse = formatErrorResponse(error);
      console.error("API Error:", errorResponse);
      return Effect.fail(errorResponse);
    })
  );

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context: {
    userId?: string;
    endpoint?: string;
    payload?: unknown;
  }
): void {
  const errorResponse = formatErrorResponse(error);
  console.error("API Error:", {
    ...errorResponse,
    context,
  });
}
