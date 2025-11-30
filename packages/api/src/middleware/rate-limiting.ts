/**
 * @fileoverview Rate Limiting Configuration
 *
 * This module provides rate limiting configuration constants and helper functions
 * for use with the RedisRateLimiterService from the infrastructure package.
 *
 * ## Rate Limit Tiers:
 * - Tier 0 (Unverified): 10 requests/minute
 * - Tier 1 (Basic KYC): 30 requests/minute
 * - Tier 2 (Full KYC): 60 requests/minute
 *
 * ## Usage:
 * Use these constants with RedisRateLimiterService from @host/infrastructure
 * to implement rate limiting for various endpoints.
 */

// ============================================================================
// Rate Limit Configuration
// ============================================================================

/**
 * Rate limit configuration by tier
 */
export const RATE_LIMITS = {
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
export function getRateLimit(tier: number, endpoint: string): number {
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
// Email Verification Rate Limiting
// ============================================================================

/**
 * Email verification specific rate limits
 * Prevents email bombing attacks
 */
export const EMAIL_VERIFICATION_LIMITS = {
  requestsPerHour: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Helper to create rate limit key for email verification
 */
export function createEmailVerificationRateLimitKey(email: string): string {
  return `email:verification:${email.toLowerCase()}`;
}
