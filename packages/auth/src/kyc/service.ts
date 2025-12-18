import type { KycTier1Data, KycTier2Data, User } from "../auth/types";
import type { KycVerificationStatus } from "@host/api";
import type { Effect } from "effect";
import type {
  InsufficientKycTierError,
  KycVerificationError,
  UserNotFoundError,
} from "../auth/errors";

import { Context } from "effect";

/**
 * KYC verification result
 */
export interface KycVerificationResult {
  readonly status: KycVerificationStatus;
  readonly tier: number;
  readonly verifiedAt?: Date;
  readonly rejectionReason?: string;
  readonly reviewNotes?: string;
}

/**
 * KYC limits based on tier
 */
export interface KycLimits {
  readonly tier: number;
  readonly dailyTransactionLimit: number;
  readonly monthlyTransactionLimit: number;
  readonly maxSavingsPlans: number;
  readonly canJoinGroups: boolean;
  readonly canCreateGroups: boolean;
  readonly withdrawalLimit: number;
  readonly requiresApproval: boolean;
}

/**
 * Document upload result
 */
export interface DocumentUploadResult {
  readonly documentId: string;
  readonly url: string;
  readonly uploadedAt: Date;
  readonly verified: boolean;
}

/**
 * KYC service interface providing tiered verification operations
 */
export interface KycService {
  /**
   * Submit KYC Tier 1 verification (Basic verification)
   * - Personal information
   * - Address verification
   * - Phone number verification
   */
  readonly submitTier1Verification: (
    userId: string,
    data: KycTier1Data
  ) => Effect.Effect<
    KycVerificationResult,
    KycVerificationError | UserNotFoundError
  >;

  /**
   * Submit KYC Tier 2 verification (Full verification)
   * - Government ID verification
   * - Biometric verification (selfie)
   * - Enhanced due diligence
   */
  readonly submitTier2Verification: (
    userId: string,
    tier1Data: KycTier1Data,
    tier2Data: KycTier2Data
  ) => Effect.Effect<
    KycVerificationResult,
    KycVerificationError | UserNotFoundError
  >;

  /**
   * Upload KYC document (ID, selfie, etc.)
   */
  readonly uploadDocument: (
    userId: string,
    documentType: "government_id" | "selfie" | "address_proof",
    fileData: Buffer,
    fileName: string,
    mimeType: string
  ) => Effect.Effect<DocumentUploadResult, KycVerificationError>;

  /**
   * Verify uploaded document
   */
  readonly verifyDocument: (
    documentId: string,
    verificationData: Record<string, unknown>
  ) => Effect.Effect<boolean, KycVerificationError>;

  /**
   * Get KYC status for a user
   */
  readonly getKycStatus: (
    userId: string
  ) => Effect.Effect<KycVerificationResult, UserNotFoundError>;

  /**
   * Get KYC limits for a specific tier
   */
  readonly getKycLimits: (tier: number) => Effect.Effect<KycLimits, never>;

  /**
   * Check if user meets required KYC tier for an operation
   */
  readonly checkKycTier: (
    userId: string,
    requiredTier: number,
    operation: string
  ) => Effect.Effect<boolean, InsufficientKycTierError | UserNotFoundError>;

  /**
   * Approve KYC verification (admin operation)
   */
  readonly approveKycVerification: (
    userId: string,
    tier: number,
    verifiedBy: string,
    notes?: string
  ) => Effect.Effect<
    KycVerificationResult,
    KycVerificationError | UserNotFoundError
  >;

  /**
   * Reject KYC verification (admin operation)
   */
  readonly rejectKycVerification: (
    userId: string,
    tier: number,
    rejectedBy: string,
    reason: string,
    notes?: string
  ) => Effect.Effect<
    KycVerificationResult,
    KycVerificationError | UserNotFoundError
  >;

  /**
   * Get all pending KYC verifications (admin operation)
   */
  readonly getPendingVerifications: (
    tier?: number,
    limit?: number,
    offset?: number
  ) => Effect.Effect<KycVerificationResult[], never>;

  /**
   * Update user KYC tier after successful verification
   */
  readonly updateUserKycTier: (
    userId: string,
    newTier: number,
    verificationId: string
  ) => Effect.Effect<User, UserNotFoundError | KycVerificationError>;

  /**
   * Check if operation is allowed for user's current KYC tier
   */
  readonly isOperationAllowed: (
    userId: string,
    operation:
      | "create_savings_plan"
      | "join_group"
      | "create_group"
      | "withdraw"
      | "large_transaction",
    amount?: number
  ) => Effect.Effect<boolean, UserNotFoundError>;

  /**
   * Get KYC verification history for a user
   */
  readonly getVerificationHistory: (
    userId: string
  ) => Effect.Effect<KycVerificationResult[], UserNotFoundError>;
}

/**
 * Context tag for the KycService
 */
export const KycService = Context.GenericTag<KycService>(
  "@host/auth/KycService"
);

/**
 * Type alias for KycService dependency
 */
export type KycServiceDeps = typeof KycService.Service;

/**
 * Default KYC limits configuration
 */
export const DEFAULT_KYC_LIMITS: Record<number, KycLimits> = {
  0: {
    tier: 0,
    dailyTransactionLimit: 0,
    monthlyTransactionLimit: 0,
    maxSavingsPlans: 0,
    canJoinGroups: false,
    canCreateGroups: false,
    withdrawalLimit: 0,
    requiresApproval: true,
  },
  1: {
    tier: 1,
    dailyTransactionLimit: 50000, // ₦50,000
    monthlyTransactionLimit: 200000, // ₦200,000
    maxSavingsPlans: 3,
    canJoinGroups: true,
    canCreateGroups: false,
    withdrawalLimit: 20000, // ₦20,000
    requiresApproval: false,
  },
  2: {
    tier: 2,
    dailyTransactionLimit: 500000, // ₦500,000
    monthlyTransactionLimit: 2000000, // ₦2,000,000
    maxSavingsPlans: 10,
    canJoinGroups: true,
    canCreateGroups: true,
    withdrawalLimit: 200000, // ₦200,000
    requiresApproval: false,
  },
};
