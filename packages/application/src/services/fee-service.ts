import type { KycTier } from "@host/shared";

import { Effect, Context, Layer } from "effect";
import {
  PaymentDestinationEnum,
  WITHDRAWAL_LIMITS,
  KycTierSchema,
  FeeTypeEnum,
  KycTierEnum,
} from "@host/shared";

/**
 * Fee calculation parameters
 */
export interface FeeCalculationParams {
  readonly amount: number;
  readonly destination: string;
  readonly userKycTier?: KycTier;
}

/**
 * KYC gate check result
 */
export interface KycGateCheck {
  readonly isAllowed: boolean;
  readonly requiredTier: number;
  readonly currentTier: number;
  readonly reason: string;
}

/**
 * Fee type
 */
export type FeeType = (typeof FeeTypeEnum)[keyof typeof FeeTypeEnum];

/**
 * Fee calculation result
 */
export interface FeeResult {
  readonly fee: number;
  readonly netAmount: number;
  readonly feeType: FeeType;
  readonly breakdown: {
    readonly baseFee: number;
    readonly percentageFee: number;
    readonly kycAdjustment: number;
  };
  readonly kycGatecheck?: KycGateCheck;
}

/**
 * KYC tier labels
 */
export const KYC_TIER_LABEL = {
  [KycTierSchema.make(KycTierEnum.UNVERIFIED)]: "UNVERIFIED",
  [KycTierSchema.make(KycTierEnum.BASIC)]: "BASIC",
  [KycTierSchema.make(KycTierEnum.FULL)]: "FULL",
} as const;

/**
 * KYC tier requirements by amount
 */
export const KYC_WITHDRAWAL_LIMITS = {
  UNVERIFIED: 0, // Unverified - no withdrawals allowed
  BASIC: 50_000, // Basic KYC - 50k NGN daily max
  FULL: 500_000, // Full KYC - 500k NGN daily max
} as const;

/**
 * Get required KYC tier for amount
 */
export const getKycRequirement = (amount: number): KycTier => {
  if (amount <= KYC_WITHDRAWAL_LIMITS.BASIC)
    return KycTierSchema.make(KycTierEnum.BASIC); // Basic KYC required
  if (amount <= KYC_WITHDRAWAL_LIMITS.FULL)
    return KycTierSchema.make(KycTierEnum.FULL); // Full KYC required
  return KycTierSchema.make(KycTierEnum.FULL); // Amounts above 500k require Full KYC
};

/**
 * FeeService handles calculation of withdrawal and processing fees
 */
export interface FeeService {
  /**
   * Calculate total fees for a withdrawal
   */
  readonly calculateFees: (
    params: FeeCalculationParams
  ) => Effect.Effect<FeeResult, never>;
}

export const FeeService = Context.GenericTag<FeeService>("@app/FeeService");

export const FeeServiceLive = Layer.succeed(
  FeeService,
  FeeService.of({
    calculateFees: (params: FeeCalculationParams) =>
      Effect.sync(() => {
        // Validate KYC requirements first
        const requiredTier = getKycRequirement(params.amount);
        const isAllowed =
          !params.userKycTier || params.userKycTier < requiredTier;

        if (!isAllowed) {
          return {
            fee: 0,
            netAmount: params.amount,
            feeType: "fixed",
            breakdown: { baseFee: 0, percentageFee: 0, kycAdjustment: 0 },
            kycGatecheck: {
              isAllowed: false,
              requiredTier,
              currentTier: params.userKycTier || 0,
              reason: `KYC Tier ${requiredTier} required for withdrawals above ${params.amount.toLocaleString()} NGN. Current tier: ${params.userKycTier || 0}`,
            },
          };
        }

        // Calculate base fees
        const baseFee =
          params.destination === PaymentDestinationEnum.BANK
            ? WITHDRAWAL_LIMITS.FEES.BANK_DESTINATION // 50 NGN
            : WITHDRAWAL_LIMITS.FEES.WALLET_DESTINATION; // 0 NGN

        // Calculate percentage fee for amounts above 10k
        const percentageFee =
          params.amount > 100_000 ? params.amount * 0.005 : 0; // 0.5%

        // Total fee calculation
        let totalFee = baseFee + percentageFee;

        // Apply fee caps for bank transfers
        if (params.destination === PaymentDestinationEnum.BANK) {
          totalFee = Math.min(totalFee, 2000); // Max 2000 NGN for bank transfers
        }

        const netAmount = Math.max(0, params.amount - totalFee);

        // Determine fee type for reporting
        const feeType: FeeResult["feeType"] =
          percentageFee > 0 ? FeeTypeEnum.HYBRID : FeeTypeEnum.FIXED;

        return {
          fee: totalFee,
          netAmount,
          feeType,
          breakdown: {
            baseFee,
            percentageFee,
            kycAdjustment: 0, // No adjustment when KYC is valid
          },
          kycGatecheck: {
            isAllowed: true,
            requiredTier: getKycRequirement(params.amount),
            currentTier: params.userKycTier || 0,
            reason: "KYC requirement met",
          },
        };
      }),
  })
);
