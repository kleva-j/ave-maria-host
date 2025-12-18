import type { AuthContext } from "../auth/types";
import type { KycService } from "./service";
import type {
  InsufficientKycTierError,
  UserNotFoundError,
} from "../auth/errors";

import { Effect, Context } from "effect";

/**
 * KYC tier requirements for different operations
 */
export const KYC_TIER_REQUIREMENTS = {
  // Tier 0 (Unverified) - Very limited access
  CREATE_BASIC_SAVINGS_PLAN: 0,
  VIEW_PROFILE: 0,

  // Tier 1 (Basic KYC) - Standard operations
  CREATE_SAVINGS_PLAN: 1,
  MAKE_CONTRIBUTION: 1,
  JOIN_GROUP: 1,
  WITHDRAW_SMALL: 1, // Up to ₦20,000
  VIEW_ANALYTICS: 1,

  // Tier 2 (Full KYC) - Advanced operations
  CREATE_GROUP: 2,
  WITHDRAW_LARGE: 2, // Above ₦20,000
  LARGE_TRANSACTIONS: 2, // Above ₦50,000
  ADMIN_OPERATIONS: 2,
} as const;

export type KycOperation = keyof typeof KYC_TIER_REQUIREMENTS;

/**
 * KYC middleware context
 */
export interface KycMiddlewareContext {
  readonly kycService: KycService;
}

export const KycMiddlewareContext = Context.GenericTag<KycMiddlewareContext>(
  "@host/auth/KycMiddlewareContext"
);

/**
 * Check if user has required KYC tier for an operation
 */
export const requireKycTier =
  (operation: KycOperation, amount?: number) => (authContext: AuthContext) =>
    Effect.gen(function* (_) {
      const { kycService } = yield* _(KycMiddlewareContext);
      const requiredTier = KYC_TIER_REQUIREMENTS[operation];

      // Special handling for amount-based operations
      if (operation === "WITHDRAW_SMALL" && amount && amount > 20000) {
        return yield* _(
          kycService.checkKycTier(
            authContext.user.id,
            KYC_TIER_REQUIREMENTS.WITHDRAW_LARGE,
            "withdraw_large"
          )
        );
      }

      if (operation === "LARGE_TRANSACTIONS" && amount && amount <= 50000) {
        return yield* _(
          kycService.checkKycTier(
            authContext.user.id,
            KYC_TIER_REQUIREMENTS.MAKE_CONTRIBUTION,
            "make_contribution"
          )
        );
      }

      return yield* _(
        kycService.checkKycTier(
          authContext.user.id,
          requiredTier,
          operation.toLowerCase()
        )
      );
    });

/**
 * Middleware to enforce KYC tier requirements
 */
export const withKycTierCheck =
  <A, E>(operation: KycOperation, amount?: number) =>
  (
    effect: Effect.Effect<A, E, AuthContext>
  ): Effect.Effect<
    A,
    E | InsufficientKycTierError | UserNotFoundError,
    AuthContext | KycMiddlewareContext
  > =>
    Effect.gen(function* (_) {
      // const authContext = yield* _(Effect.context<AuthContext>());

      // Check KYC tier requirement
      yield* _(requireKycTier(operation, amount)(authContext));

      // If check passes, execute the original effect
      return yield* _(effect);
    });

/**
 * Get user's current KYC limits
 */
export const getUserKycLimits = (userId: string) =>
  Effect.gen(function* (_) {
    const { kycService } = yield* _(KycMiddlewareContext);
    const kycStatus = yield* _(kycService.getKycStatus(userId));
    return yield* _(kycService.getKycLimits(kycStatus.tier));
  });

/**
 * Check if a specific operation is allowed for the user
 */
export const isOperationAllowed = (
  userId: string,
  operation:
    | "create_savings_plan"
    | "join_group"
    | "create_group"
    | "withdraw"
    | "large_transaction",
  amount?: number
) =>
  Effect.gen(function* (_) {
    const { kycService } = yield* _(KycMiddlewareContext);
    return yield* _(kycService.isOperationAllowed(userId, operation, amount));
  });

/**
 * Validate transaction amount against KYC limits
 */
export const validateTransactionAmount = (
  userId: string,
  amount: number,
  transactionType: "daily" | "monthly" | "withdrawal"
) =>
  Effect.gen(function* (_) {
    const limits = yield* _(getUserKycLimits(userId));

    switch (transactionType) {
      case "daily":
        if (amount > limits.dailyTransactionLimit) {
          return {
            allowed: false,
            reason: `Amount exceeds daily limit of ₦${limits.dailyTransactionLimit.toLocaleString()}`,
            limit: limits.dailyTransactionLimit,
          };
        }
        break;
      case "monthly":
        if (amount > limits.monthlyTransactionLimit) {
          return {
            allowed: false,
            reason: `Amount exceeds monthly limit of ₦${limits.monthlyTransactionLimit.toLocaleString()}`,
            limit: limits.monthlyTransactionLimit,
          };
        }
        break;
      case "withdrawal":
        if (amount > limits.withdrawalLimit) {
          return {
            allowed: false,
            reason: `Amount exceeds withdrawal limit of ₦${limits.withdrawalLimit.toLocaleString()}`,
            limit: limits.withdrawalLimit,
          };
        }
        break;
    }

    return {
      allowed: true,
      reason: "Transaction amount is within limits",
      limit: 0,
    };
  });

/**
 * Get KYC upgrade recommendations for a user
 */
export const getKycUpgradeRecommendations = (userId: string) =>
  Effect.gen(function* (_) {
    const { kycService } = yield* _(KycMiddlewareContext);
    const kycStatus = yield* _(kycService.getKycStatus(userId));
    const currentLimits = yield* _(kycService.getKycLimits(kycStatus.tier));

    const recommendations = [];

    if (kycStatus.tier === 0) {
      recommendations.push({
        tier: 1,
        benefits: [
          "Create savings plans",
          "Join savings groups",
          "Daily transactions up to ₦50,000",
          "Withdrawals up to ₦20,000",
        ],
        requirements: [
          "Provide personal information",
          "Verify address",
          "Phone number verification",
        ],
      });
    }

    if (kycStatus.tier <= 1) {
      recommendations.push({
        tier: 2,
        benefits: [
          "Create savings groups",
          "Daily transactions up to ₦500,000",
          "Withdrawals up to ₦200,000",
          "Access to premium features",
        ],
        requirements: [
          "Government-issued ID verification",
          "Biometric verification (selfie)",
          "Enhanced due diligence",
        ],
      });
    }

    return {
      currentTier: kycStatus.tier,
      currentLimits,
      recommendations,
    };
  });
