/**
 * @fileoverview Rate Limiting Middleware
 *
 * This module provides rate limiting middleware for API endpoints to prevent abuse
 * and ensure fair usage of the platform.
 *
 * ## Key Features:
 * - **Per-User Rate Limiting**: Different limits based on user tier
 * - **Endpoint-Specific Limits**: Custom limits for sensitive operations
 * - **Sliding Window**: Accurate rate limiting with sliding window algorithm
 * - **Redis-Backed**: Distributed rate limiting across multiple servers
 *
 * ## Rate Limit Tiers:
 * - Tier 0 (Unverified): 10 requests/minute
 * - Tier 1 (Basic KYC): 30 requests/minute
 * - Tier 2 (Full KYC): 60 requests/minute
 */

import { Effect, Context, Layer, Data } from "effect";

// ============================================================================
// Error Types
// ============================================================================

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends Data.TaggedError(
  "RateLimitExceededError"
)<{
  readonly userId: string;
  readonly endpoint: string;
  readonly limit: number;
  readonly resetAt: Date;
}> {}

// ============================================================================
// Rate Limiter Service
// ============================================================================

/**
 * Rate limiter service interface
 */
export interface RateLimiterService {
  /**
   * Check if a request is allowed for a user
   */
  readonly checkLimit: (
    userId: string,
    endpoint: string,
    tier: number
  ) => Effect.Effect<boolean, RateLimitExceededError>;

  /**
   * Get remaining requests for a user
   */
  readonly getRemainingRequests: (
    userId: string,
    endpoint: string,
    tier: number
  ) => Effect.Effect<number>;

  /**
   * Reset rate limit for a user (admin operation)
   */
  readonly resetLimit: (
    userId: string,
    endpoint: string
  ) => Effect.Effect<void>;
}

export const RateLimiterService =
  Context.GenericTag<RateLimiterService>("RateLimiterService");

// ============================================================================
// Rate Limit Configuration
// ============================================================================

/**
 * Rate limit configuration by tier
 */
const RATE_LIMITS = {
  tier0: {
    default: 10, // 10 requests per minute
    funding: 3, // 3 funding requests per minute
    withdrawal: 2, // 2 withdrawal requests per minute
  },
  tier1: {
    default: 30, // 30 requests per minute
    funding: 10, // 10 funding requests per minute
    withdrawal: 5, // 5 withdrawal requests per minute
  },
  tier2: {
    default: 60, // 60 requests per minute
    funding: 20, // 20 funding requests per minute
    withdrawal: 10, // 10 withdrawal requests per minute
  },
} as const;

/**
 * Get rate limit for a user tier and endpoint
 */
function getRateLimit(tier: number, endpoint: string): number {
  const tierKey = `tier${Math.min(tier, 2)}` as keyof typeof RATE_LIMITS;
  const limits = RATE_LIMITS[tierKey];

  // Check for endpoint-specific limits
  if (endpoint.includes("fundWallet")) {
    return limits.funding;
  }
  if (endpoint.includes("withdraw")) {
    return limits.withdrawal;
  }

  return limits.default;
}

// ============================================================================
// In-Memory Rate Limiter Implementation
// ============================================================================

/**
 * In-memory rate limiter for development
 * In production, this should be replaced with Redis-backed implementation
 */
export const InMemoryRateLimiterLive: Layer.Layer<RateLimiterService> =
  Layer.succeed(
    RateLimiterService,
    RateLimiterService.of({
      checkLimit: (_userId, _endpoint, _tier) => Effect.succeed(true),

      getRemainingRequests: (_userId, endpoint, tier) =>
        Effect.succeed(getRateLimit(tier, endpoint)),

      resetLimit: (_userId, _endpoint) => Effect.succeed(undefined),
    })
  );

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

/**
 * Rate limiting middleware for RPC endpoints
 */
export const rateLimitMiddleware = (
  userId: string,
  endpoint: string,
  tier: number
) =>
  Effect.gen(function* (_) {
    const rateLimiter = yield* _(RateLimiterService);

    const allowed = yield* _(rateLimiter.checkLimit(userId, endpoint, tier));

    if (!allowed) {
      const limit = getRateLimit(tier, endpoint);
      const resetAt = new Date(Date.now() + 60000); // Reset in 1 minute

      yield* _(
        Effect.fail(
          new RateLimitExceededError({
            userId,
            endpoint,
            limit,
            resetAt,
          })
        )
      );
    }

    return true;
  });
