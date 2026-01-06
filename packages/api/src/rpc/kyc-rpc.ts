/**
 * @fileoverview KYC (Know Your Customer) RPC Endpoints
 *
 * This module provides RPC endpoints for KYC verification using @effect/rpc.
 * It handles tiered KYC verification, document uploads, and verification workflows.
 *
 * ## Key Features:
 * - **Tiered KYC**: Support for Tier 1 (Basic) and Tier 2 (Full) verification
 * - **Document Upload**: Secure document upload and verification
 * - **Admin Operations**: KYC approval/rejection workflows
 * - **Compliance**: Audit trails and verification history
 *
 * ## Endpoints:
 * - SubmitTier1Kyc: Submit basic KYC information
 * - SubmitTier2Kyc: Submit full KYC with documents
 * - UploadKycDocument: Upload verification documents
 * - GetKycStatus: Get current KYC status
 * - GetKycLimits: Get tier-based limits
 * - ApproveKyc: Admin approval of KYC (admin only)
 * - RejectKyc: Admin rejection of KYC (admin only)
 * - GetPendingVerifications: Get pending KYC verifications (admin only)
 */

import type { KycTier } from "@host/shared";
import type { Layer } from "effect";

import { Effect, Schema, DateTime } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

// Import auth middleware for user context
import { AuthMiddleware, CurrentUser } from "./auth-rpc";

// Import KYC service
import { KycService } from "@host/auth";

import {
  KycGovernmentIdNumberSchema,
  KycGovernmentIdTypeSchema,
  DocumentTypeSchema,
  PhoneNumberSchema,
  DocumentIdSchema,
  FirstNameSchema,
  KycStatusSchema,
  UrlStringSchema,
  DateTimeSchema,
  LastNameSchema,
  KycTierSchema,
  AddressSchema,
  BooleanSchema,
  UserIdSchema,
  DateSchema,
} from "@host/shared";

// ============================================================================
// Payload Classes
// ============================================================================

/**
 * Submit Tier 1 KYC Payload (Basic verification)
 */
export class SubmitTier1KycPayload extends Schema.Class<SubmitTier1KycPayload>(
  "SubmitTier1KycPayload"
)({
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
  dateOfBirth: DateSchema,
  address: AddressSchema,
}) {}

/**
 * Submit Tier 2 KYC Payload (Full verification)
 */
export class SubmitTier2KycPayload extends Schema.Class<SubmitTier2KycPayload>(
  "SubmitTier2KycPayload"
)({
  // Tier 1 data (required for Tier 2)
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
  dateOfBirth: DateSchema,
  address: AddressSchema,
  // Tier 2 specific data
  governmentIdType: KycGovernmentIdTypeSchema,
  governmentIdNumber: KycGovernmentIdNumberSchema,
  governmentIdImage: UrlStringSchema, // URL to uploaded document
  selfieImage: UrlStringSchema, // URL to uploaded selfie
}) {}

/**
 * Upload KYC Document Payload
 */
export class UploadKycDocumentPayload extends Schema.Class<UploadKycDocumentPayload>(
  "UploadKycDocumentPayload"
)({
  documentType: DocumentTypeSchema,
  fileName: Schema.String,
  mimeType: Schema.String,
  fileData: Schema.String, // Base64 encoded file data
}) {}

/**
 * Get KYC Status Payload
 */
export class GetKycStatusPayload extends Schema.Class<GetKycStatusPayload>(
  "GetKycStatusPayload"
)({
  userId: Schema.optional(UserIdSchema), // Optional - defaults to current user
}) {}

/**
 * Get KYC Limits Payload
 */
export class GetKycLimitsPayload extends Schema.Class<GetKycLimitsPayload>(
  "GetKycLimitsPayload"
)({
  tier: Schema.optional(KycTierSchema), // Optional - defaults to current user's tier
}) {}

/**
 * Approve KYC Payload (Admin only)
 */
export class ApproveKycPayload extends Schema.Class<ApproveKycPayload>(
  "ApproveKycPayload"
)({
  userId: UserIdSchema,
  tier: KycTierSchema,
  notes: Schema.optional(Schema.String),
}) {}

/**
 * Reject KYC Payload (Admin only)
 */
export class RejectKycPayload extends Schema.Class<RejectKycPayload>(
  "RejectKycPayload"
)({
  userId: UserIdSchema,
  tier: KycTierSchema,
  reason: Schema.String.pipe(Schema.minLength(10)),
  notes: Schema.optional(Schema.String),
}) {}

/**
 * Get Pending Verifications Payload (Admin only)
 */
export class GetPendingVerificationsPayload extends Schema.Class<GetPendingVerificationsPayload>(
  "GetPendingVerificationsPayload"
)({
  tier: Schema.optional(KycTierSchema),
  limit: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.between(1, 100))
  ),
  offset: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.nonNegative())
  ),
}) {}

// ============================================================================
// Response Classes
// ============================================================================

/**
 * KYC Verification Result
 */
export class KycVerificationResult extends Schema.Class<KycVerificationResult>(
  "KycVerificationResult"
)({
  status: KycStatusSchema,
  tier: KycTierSchema,
  verifiedAt: Schema.optional(DateTimeSchema),
  rejectionReason: Schema.optional(Schema.String),
  reviewNotes: Schema.optional(Schema.String),
}) {}

/**
 * Document Upload Result
 */
export class DocumentUploadResult extends Schema.Class<DocumentUploadResult>(
  "DocumentUploadResult"
)({
  documentId: DocumentIdSchema,
  url: UrlStringSchema,
  uploadedAt: DateTimeSchema,
  verified: BooleanSchema,
}) {}

/**
 * KYC Limits
 */
export class KycLimits extends Schema.Class<KycLimits>("KycLimits")({
  tier: KycTierSchema,
  dailyTransactionLimit: Schema.Number.pipe(Schema.nonNegative()),
  monthlyTransactionLimit: Schema.Number.pipe(Schema.nonNegative()),
  maxSavingsPlans: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  canJoinGroups: Schema.Boolean,
  canCreateGroups: Schema.Boolean,
  withdrawalLimit: Schema.Number.pipe(Schema.nonNegative()),
  requiresApproval: Schema.Boolean,
}) {}

/**
 * Submit KYC Response
 */
export class SubmitKycResponse extends Schema.Class<SubmitKycResponse>(
  "SubmitKycResponse"
)({
  result: KycVerificationResult,
  message: Schema.String,
  nextSteps: Schema.Array(Schema.String),
}) {}

/**
 * Get KYC Status Response
 */
export class GetKycStatusResponse extends Schema.Class<GetKycStatusResponse>(
  "GetKycStatusResponse"
)({
  result: KycVerificationResult,
  limits: KycLimits,
  upgradeRecommendations: Schema.optional(
    Schema.Array(
      Schema.Struct({
        tier: KycTierSchema,
        benefits: Schema.Array(Schema.String),
        requirements: Schema.Array(Schema.String),
      })
    )
  ),
}) {}

/**
 * Get Pending Verifications Response
 */
export class GetPendingVerificationsResponse extends Schema.Class<GetPendingVerificationsResponse>(
  "GetPendingVerificationsResponse"
)({
  verifications: Schema.Array(
    Schema.Struct({
      userId: UserIdSchema,
      result: KycVerificationResult,
      submittedAt: DateTimeSchema,
      userInfo: Schema.Struct({
        name: Schema.String,
        email: Schema.String,
        phoneNumber: Schema.optional(PhoneNumberSchema),
      }),
    })
  ),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  hasMore: Schema.Boolean,
}) {}

// ============================================================================
// Error Types
// ============================================================================

/**
 * KYC verification error
 */
export class KycVerificationRpcError extends Schema.TaggedError<KycVerificationRpcError>()(
  "KycVerificationRpcError",
  {
    userId: UserIdSchema,
    tier: KycTierSchema,
    message: Schema.String,
    reason: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Insufficient KYC tier error
 */
export class InsufficientKycTierRpcError extends Schema.TaggedError<InsufficientKycTierRpcError>()(
  "InsufficientKycTierRpcError",
  {
    userId: UserIdSchema,
    requiredTier: KycTierSchema,
    currentTier: KycTierSchema,
    operation: Schema.String,
    message: Schema.String,
  }
) {}

/**
 * Document upload error
 */
export class DocumentUploadRpcError extends Schema.TaggedError<DocumentUploadRpcError>()(
  "DocumentUploadRpcError",
  {
    documentType: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Union of all KYC-related errors
 */
export const KycRpcError = Schema.Union(
  KycVerificationRpcError,
  InsufficientKycTierRpcError,
  DocumentUploadRpcError
);

// ============================================================================
// RPC Group Definition
// ============================================================================

/**
 * KYC RPC group containing all KYC verification endpoints
 */
export class KycRpcs extends RpcGroup.make(
  /**
   * Submit Tier 1 KYC verification (Basic)
   */
  Rpc.make("SubmitTier1Kyc", {
    payload: SubmitTier1KycPayload,
    success: SubmitKycResponse,
    error: KycRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Submit Tier 2 KYC verification (Full)
   */
  Rpc.make("SubmitTier2Kyc", {
    payload: SubmitTier2KycPayload,
    success: SubmitKycResponse,
    error: KycRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Upload KYC document
   */
  Rpc.make("UploadKycDocument", {
    payload: UploadKycDocumentPayload,
    success: DocumentUploadResult,
    error: KycRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Get KYC status for user
   */
  Rpc.make("GetKycStatus", {
    payload: GetKycStatusPayload,
    success: GetKycStatusResponse,
    error: KycRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Get KYC limits for tier
   */
  Rpc.make("GetKycLimits", {
    payload: GetKycLimitsPayload,
    success: KycLimits,
    error: KycRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Approve KYC verification (Admin only)
   */
  Rpc.make("ApproveKyc", {
    payload: ApproveKycPayload,
    success: SubmitKycResponse,
    error: KycRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Reject KYC verification (Admin only)
   */
  Rpc.make("RejectKyc", {
    payload: RejectKycPayload,
    success: SubmitKycResponse,
    error: KycRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Get pending KYC verifications (Admin only)
   */
  Rpc.make("GetPendingVerifications", {
    payload: GetPendingVerificationsPayload,
    success: GetPendingVerificationsResponse,
    error: KycRpcError,
  }).middleware(AuthMiddleware)
) {}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map KYC service errors to RPC errors
 */
const mapKycErrorToRpcError = (
  error: any,
  operation: string
):
  | KycVerificationRpcError
  | InsufficientKycTierRpcError
  | DocumentUploadRpcError => {
  if (error._tag === "KycVerificationError") {
    return new KycVerificationRpcError({
      userId: error.userId || "unknown",
      tier: error.tier || 0,
      message: error.message || "KYC verification failed",
      reason: error.reason,
      cause: error,
    });
  }

  if (error._tag === "InsufficientKycTierError") {
    return new InsufficientKycTierRpcError({
      userId: error.userId || "unknown",
      requiredTier: error.requiredTier || 1,
      currentTier: error.currentTier || 0,
      operation: error.operation || operation,
      message: error.message || "Insufficient KYC tier",
    });
  }

  // Fallback for any other error
  return new KycVerificationRpcError({
    // Use a valid UUID string cast as UserId
    userId:
      error.userId || UserIdSchema.make("00000000-0000-0000-0000-000000000000"),
    tier: KycTierSchema.make(0),
    message: error.message || "KYC operation failed",
    cause: error,
  });
};

/**
 * Get next steps based on KYC status and tier
 */
const getNextSteps = (status: string, tier: number): string[] => {
  if (status === "under_review") {
    return [
      "Your KYC verification is under review",
      "You will be notified once the review is complete",
      "This process typically takes 1-3 business days",
    ];
  }

  if (status === "approved" && tier === 1) {
    return [
      "Congratulations! Your Tier 1 KYC is approved",
      "You can now create savings plans and join groups",
      "Consider upgrading to Tier 2 for higher limits and group creation",
    ];
  }

  if (status === "approved" && tier === 2) {
    return [
      "Congratulations! Your Tier 2 KYC is approved",
      "You now have access to all platform features",
      "Enjoy higher transaction limits and group creation capabilities",
    ];
  }

  if (status === "rejected") {
    return [
      "Your KYC verification was rejected",
      "Please review the rejection reason and resubmit with correct information",
      "Contact support if you need assistance",
    ];
  }

  return [
    "Complete your KYC verification to access more features",
    "Start with Tier 1 for basic access",
    "Upgrade to Tier 2 for full platform access",
  ];
};

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * Live implementation of KYC RPC handlers
 */
export const KycHandlersLive: Layer.Layer<
  | Rpc.Handler<"SubmitTier1Kyc">
  | Rpc.Handler<"SubmitTier2Kyc">
  | Rpc.Handler<"UploadKycDocument">
  | Rpc.Handler<"GetKycStatus">
  | Rpc.Handler<"GetKycLimits">
  | Rpc.Handler<"ApproveKyc">
  | Rpc.Handler<"RejectKyc">
  | Rpc.Handler<"GetPendingVerifications">,
  never,
  KycService | AuthMiddleware
> = KycRpcs.toLayer({
  /**
   * Submit Tier 1 KYC verification
   */
  SubmitTier1Kyc: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const kycService = yield* KycService;

      const result = yield* kycService
        .submitTier1Verification(currentUser.id, {
          firstName: payload.firstName,
          lastName: payload.lastName,
          dateOfBirth: payload.dateOfBirth,
          address: payload.address,
        })
        .pipe(
          Effect.mapError((error) =>
            mapKycErrorToRpcError(error, "SubmitTier1Kyc")
          )
        );

      return new SubmitKycResponse({
        result: new KycVerificationResult({
          status: result.status,
          tier: result.tier,
          verifiedAt: result.verifiedAt
            ? DateTime.unsafeFromDate(result.verifiedAt)
            : undefined,
          rejectionReason: result.rejectionReason,
          reviewNotes: result.reviewNotes,
        }),
        message: "Tier 1 KYC submitted successfully",
        nextSteps: getNextSteps(result.status, result.tier),
      });
    }),

  /**
   * Submit Tier 2 KYC verification
   */
  SubmitTier2Kyc: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const kycService = yield* KycService;

      const tier1Data = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        dateOfBirth: payload.dateOfBirth,
        address: payload.address,
      };

      const tier2Data = {
        governmentIdType: payload.governmentIdType,
        governmentIdNumber: payload.governmentIdNumber,
        governmentIdImage: payload.governmentIdImage,
        selfieImage: payload.selfieImage,
      };

      const result = yield* kycService
        .submitTier2Verification(currentUser.id, tier1Data, tier2Data)
        .pipe(
          Effect.mapError((error) =>
            mapKycErrorToRpcError(error, "SubmitTier2Kyc")
          )
        );

      return new SubmitKycResponse({
        result: new KycVerificationResult({
          status: result.status,
          tier: result.tier,
          verifiedAt: result.verifiedAt
            ? DateTime.unsafeFromDate(result.verifiedAt)
            : undefined,
          rejectionReason: result.rejectionReason,
          reviewNotes: result.reviewNotes,
        }),
        message: "Tier 2 KYC submitted successfully",
        nextSteps: getNextSteps(result.status, result.tier),
      });
    }),

  /**
   * Upload KYC document
   */
  UploadKycDocument: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const kycService = yield* KycService;

      // Decode base64 file data
      const fileData = Buffer.from(payload.fileData, "base64");

      const result = yield* kycService
        .uploadDocument(
          currentUser.id,
          payload.documentType,
          fileData,
          payload.fileName,
          payload.mimeType
        )
        .pipe(
          Effect.mapError(
            (error) =>
              new DocumentUploadRpcError({
                documentType: payload.documentType,
                message: error.message || "Document upload failed",
                cause: error,
              })
          )
        );

      return new DocumentUploadResult({
        documentId: result.documentId,
        url: result.url,
        uploadedAt: DateTime.unsafeFromDate(result.uploadedAt),
        verified: result.verified,
      });
    }),

  /**
   * Get KYC status
   */
  GetKycStatus: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const kycService = yield* KycService;

      const userId = payload.userId || currentUser.id;

      const result = yield* kycService
        .getKycStatus(userId)
        .pipe(
          Effect.mapError((error) =>
            mapKycErrorToRpcError(error, "GetKycStatus")
          )
        );

      const limits = yield* kycService.getKycLimits(result.tier);

      return new GetKycStatusResponse({
        result: new KycVerificationResult({
          status: result.status,
          tier: result.tier,
          verifiedAt: result.verifiedAt
            ? DateTime.unsafeFromDate(result.verifiedAt)
            : undefined,
          rejectionReason: result.rejectionReason,
          reviewNotes: result.reviewNotes,
        }),
        limits: new KycLimits({
          tier: limits.tier,
          dailyTransactionLimit: limits.dailyTransactionLimit,
          monthlyTransactionLimit: limits.monthlyTransactionLimit,
          maxSavingsPlans: limits.maxSavingsPlans,
          canJoinGroups: limits.canJoinGroups,
          canCreateGroups: limits.canCreateGroups,
          withdrawalLimit: limits.withdrawalLimit,
          requiresApproval: limits.requiresApproval,
        }),
        upgradeRecommendations:
          result.tier < 2
            ? [
                {
                  tier: (result.tier + 1) as KycTier,
                  benefits:
                    result.tier === 0
                      ? ["Create savings plans", "Join groups", "Higher limits"]
                      : ["Create groups", "Maximum limits", "Premium features"],
                  requirements:
                    result.tier === 0
                      ? [
                          "Personal information",
                          "Address verification",
                          "Phone verification",
                        ]
                      : [
                          "Government ID",
                          "Biometric verification",
                          "Enhanced due diligence",
                        ],
                },
              ]
            : undefined,
      });
    }),

  /**
   * Get KYC limits
   */
  GetKycLimits: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const kycService = yield* KycService;

      let tier = payload.tier;
      if (!tier) {
        const status = yield* kycService
          .getKycStatus(currentUser.id)
          .pipe(
            Effect.mapError((error) =>
              mapKycErrorToRpcError(error, "GetKycLimits")
            )
          );
        tier = status.tier;
      }

      const limits = yield* kycService.getKycLimits(tier);

      return new KycLimits({
        tier: limits.tier,
        dailyTransactionLimit: limits.dailyTransactionLimit,
        monthlyTransactionLimit: limits.monthlyTransactionLimit,
        maxSavingsPlans: limits.maxSavingsPlans,
        canJoinGroups: limits.canJoinGroups,
        canCreateGroups: limits.canCreateGroups,
        withdrawalLimit: limits.withdrawalLimit,
        requiresApproval: limits.requiresApproval,
      });
    }),

  /**
   * Approve KYC verification (Admin only)
   */
  ApproveKyc: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const kycService = yield* KycService;

      // TODO: Add admin role check here
      // This should be handled by authorization middleware

      const result = yield* kycService
        .approveKycVerification(
          payload.userId,
          payload.tier,
          currentUser.id,
          payload.notes
        )
        .pipe(
          Effect.mapError((error) => mapKycErrorToRpcError(error, "ApproveKyc"))
        );

      return new SubmitKycResponse({
        result: new KycVerificationResult({
          status: result.status,
          tier: result.tier,
          verifiedAt: result.verifiedAt
            ? DateTime.unsafeFromDate(result.verifiedAt)
            : undefined,
          rejectionReason: result.rejectionReason,
          reviewNotes: result.reviewNotes,
        }),
        message: `Tier ${payload.tier} KYC approved successfully`,
        nextSteps: getNextSteps(result.status, result.tier),
      });
    }),

  /**
   * Reject KYC verification (Admin only)
   */
  RejectKyc: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const kycService = yield* KycService;

      // TODO: Add admin role check here
      // This should be handled by authorization middleware

      const result = yield* kycService
        .rejectKycVerification(
          payload.userId,
          payload.tier,
          currentUser.id,
          payload.reason,
          payload.notes
        )
        .pipe(
          Effect.mapError((error) => mapKycErrorToRpcError(error, "RejectKyc"))
        );

      return new SubmitKycResponse({
        result: new KycVerificationResult({
          status: result.status,
          tier: result.tier,
          verifiedAt: result.verifiedAt
            ? DateTime.unsafeFromDate(result.verifiedAt)
            : undefined,
          rejectionReason: result.rejectionReason,
          reviewNotes: result.reviewNotes,
        }),
        message: `Tier ${payload.tier} KYC rejected`,
        nextSteps: getNextSteps(result.status, result.tier),
      });
    }),

  /**
   * Get pending KYC verifications (Admin only)
   */
  GetPendingVerifications: (payload) =>
    Effect.gen(function* () {
      const kycService = yield* KycService;

      // TODO: Add admin role check here
      // This should be handled by authorization middleware

      const verifications = yield* kycService
        .getPendingVerifications(
          payload.tier,
          payload.limit || 50,
          payload.offset || 0
        )
        .pipe(
          Effect.mapError((error) =>
            mapKycErrorToRpcError(error, "GetPendingVerifications")
          )
        );

      // TODO: Fetch user info for each verification
      // This would require a user service dependency

      return new GetPendingVerificationsResponse({
        verifications: verifications.map((v) => ({
          userId: UserIdSchema.make("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"), // TODO: Get from verification record
          result: new KycVerificationResult({
            status: v.status,
            tier: v.tier,
            verifiedAt: v.verifiedAt
              ? DateTime.unsafeFromDate(v.verifiedAt)
              : undefined,
            rejectionReason: v.rejectionReason,
            reviewNotes: v.reviewNotes,
          }),
          submittedAt: DateTime.unsafeNow(), // TODO: Get from verification record
          userInfo: {
            name: "Mock User", // TODO: Get from user service
            email: "mock@example.com", // TODO: Get from user service
            phoneNumber: undefined, // TODO: Get from user service
          },
        })),
        total: verifications.length,
        hasMore: verifications.length === (payload.limit || 50),
      });
    }),
});
