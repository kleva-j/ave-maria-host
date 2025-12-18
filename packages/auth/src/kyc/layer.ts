import type { KycVerificationResult } from "./service";
import type { AuditService } from "@host/api";
import type { User } from "../auth/types";

import { DEFAULT_KYC_LIMITS, KycService } from "./service";
import { user, kycVerification, db } from "@host/db";
import { Effect, Layer, Context } from "effect";
import { eq, and, desc } from "drizzle-orm";

import {
  InsufficientKycTierError as InsufficientKyc,
  UserNotFoundError as UserNotFound,
  KycVerificationError as KycError,
} from "../auth/errors";

/**
 * File storage service interface for document uploads
 */
export interface FileStorageService {
  readonly uploadFile: (
    key: string,
    data: Buffer,
    mimeType: string
  ) => Effect.Effect<string, Error>; // Returns URL

  readonly deleteFile: (key: string) => Effect.Effect<void, Error>;

  readonly getSignedUrl: (
    key: string,
    expiresIn?: number
  ) => Effect.Effect<string, Error>;
}

export const FileStorageService = Context.GenericTag<FileStorageService>(
  "@host/auth/FileStorageService"
);

/**
 * Document verification service interface
 */
export interface DocumentVerificationService {
  readonly verifyGovernmentId: (
    documentUrl: string,
    idType: string,
    idNumber: string
  ) => Effect.Effect<
    {
      verified: boolean;
      confidence: number;
      extractedData: Record<string, unknown>;
    },
    Error
  >;

  readonly verifySelfie: (
    selfieUrl: string,
    idPhotoUrl: string
  ) => Effect.Effect<
    { verified: boolean; confidence: number; matchScore: number },
    Error
  >;
}

export const DocumentVerificationService =
  Context.GenericTag<DocumentVerificationService>(
    "@host/auth/DocumentVerificationService"
  );

/**
 * Context tag for AuditService dependency
 */
const AuditServiceContext = Context.GenericTag<AuditService>(
  "@host/api/AuditService"
);

/**
 * Live implementation of KycService using Drizzle ORM
 */
export const KycServiceLive = Layer.effect(
  KycService,
  Effect.gen(function* (_) {
    const fileStorage = yield* _(FileStorageService);
    const docVerification = yield* _(DocumentVerificationService);
    const auditService = yield* _(AuditServiceContext);

    return KycService.of({
      submitTier1Verification: (userId, data) =>
        Effect.gen(function* (_) {
          // Check if user exists
          const existingUser = yield* _(
            Effect.tryPromise({
              try: () =>
                db.select().from(user).where(eq(user.id, userId)).limit(1),
              catch: (error) =>
                new KycError({
                  message: "Failed to fetch user",
                  userId,
                  tier: 1,
                  cause: error,
                }),
            })
          );

          if (existingUser.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId,
                })
              )
            );
          }

          // Check if user already has Tier 1 or higher
          const currentUser = existingUser[0];
          if (currentUser.kycTier >= 1) {
            yield* _(
              Effect.fail(
                new KycError({
                  message: "User already has Tier 1 or higher KYC",
                  userId,
                  tier: 1,
                  reason: "already_verified",
                })
              )
            );
          }

          // Create KYC verification record
          const verificationId = crypto.randomUUID();
          yield* _(
            Effect.tryPromise({
              try: () =>
                db.insert(kycVerification).values({
                  id: verificationId,
                  userId,
                  tier: 1,
                  status: "under_review",
                  firstName: data.firstName,
                  lastName: data.lastName,
                  dateOfBirth: data.dateOfBirth,
                  address: data.address,
                  verificationData: {
                    submittedAt: new Date().toISOString(),
                    tier1Data: data,
                  },
                }),
              catch: (error) =>
                new KycError({
                  message: "Failed to create KYC verification record",
                  userId,
                  tier: 1,
                  cause: error,
                }),
            })
          );

          // Log KYC submission
          yield* _(
            auditService.logKycEvent(userId, "submit_tier1_kyc", 1, "success", {
              firstName: data.firstName,
              lastName: data.lastName,
              address: data.address,
            })
          );

          return {
            status: "under_review" as const,
            tier: 1,
            reviewNotes: "Tier 1 KYC submitted for review",
          };
        }),

      submitTier2Verification: (userId, tier1Data, tier2Data) =>
        Effect.gen(function* (_) {
          // Check if user exists and has Tier 1
          const existingUser = yield* _(
            Effect.tryPromise({
              try: () =>
                db.select().from(user).where(eq(user.id, userId)).limit(1),
              catch: (error) =>
                new KycError({
                  message: "Failed to fetch user",
                  userId,
                  tier: 2,
                  cause: error,
                }),
            })
          );

          if (existingUser.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId,
                })
              )
            );
          }

          const currentUser = existingUser[0];
          if (currentUser.kycTier < 1) {
            yield* _(
              Effect.fail(
                new KycError({
                  message: "User must complete Tier 1 KYC before Tier 2",
                  userId,
                  tier: 2,
                  reason: "tier1_required",
                })
              )
            );
          }

          if (currentUser.kycTier >= 2) {
            yield* _(
              Effect.fail(
                new KycError({
                  message: "User already has Tier 2 KYC",
                  userId,
                  tier: 2,
                  reason: "already_verified",
                })
              )
            );
          }

          // Create KYC verification record for Tier 2
          const verificationId = crypto.randomUUID();
          yield* _(
            Effect.tryPromise({
              try: () =>
                db.insert(kycVerification).values({
                  id: verificationId,
                  userId,
                  tier: 2,
                  status: "under_review",
                  firstName: tier1Data.firstName,
                  lastName: tier1Data.lastName,
                  dateOfBirth: tier1Data.dateOfBirth,
                  address: tier1Data.address,
                  governmentIdType: tier2Data.governmentIdType,
                  governmentIdNumber: tier2Data.governmentIdNumber,
                  governmentIdImage: tier2Data.governmentIdImage,
                  selfieImage: tier2Data.selfieImage,
                  verificationData: {
                    submittedAt: new Date().toISOString(),
                    tier1Data,
                    tier2Data,
                  },
                }),
              catch: (error) =>
                new KycError({
                  message: "Failed to create Tier 2 KYC verification record",
                  userId,
                  tier: 2,
                  cause: error,
                }),
            })
          );

          // Log KYC submission
          yield* _(
            auditService.logKycEvent(userId, "submit_tier2_kyc", 2, "success", {
              idType: tier2Data.governmentIdType,
              idNumber: tier2Data.governmentIdNumber,
              hasDocuments: true,
            })
          );

          return {
            status: "under_review" as const,
            tier: 2,
            reviewNotes: "Tier 2 KYC submitted for review",
          };
        }),

      uploadDocument: (userId, documentType, fileData, fileName, mimeType) =>
        Effect.gen(function* (_) {
          // Generate unique key for the file
          const fileKey = `kyc/${userId}/${documentType}/${Date.now()}-${fileName}`;

          // Upload file to storage
          const fileUrl = yield* _(
            fileStorage.uploadFile(fileKey, fileData, mimeType)
          );

          const documentId = crypto.randomUUID();

          return {
            documentId,
            url: fileUrl,
            uploadedAt: new Date(),
            verified: false,
          };
        }),

      verifyDocument: (documentId, verificationData) =>
        Effect.gen(function* (_) {
          // This would integrate with a document verification service
          // For now, return a mock verification result
          return true;
        }),

      getKycStatus: (userId) =>
        Effect.gen(function* (_) {
          const userRecord = yield* _(
            Effect.tryPromise({
              try: () =>
                db.select().from(user).where(eq(user.id, userId)).limit(1),
              catch: (error) =>
                new UserNotFound({
                  message: "Failed to fetch user",
                  userId,
                  cause: error,
                }),
            })
          );

          if (userRecord.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId,
                })
              )
            );
          }

          const currentUser = userRecord[0];

          return {
            status: currentUser.kycStatus as KycVerificationResult["status"],
            tier: currentUser.kycTier,
            verifiedAt: currentUser.kycVerifiedAt || undefined,
          };
        }),

      getKycLimits: (tier) =>
        Effect.succeed(DEFAULT_KYC_LIMITS[tier] || DEFAULT_KYC_LIMITS[0]),

      checkKycTier: (userId, requiredTier, operation) =>
        Effect.gen(function* (_) {
          const userRecord = yield* _(
            Effect.tryPromise({
              try: () =>
                db.select().from(user).where(eq(user.id, userId)).limit(1),
              catch: (error) =>
                new UserNotFound({
                  message: "Failed to fetch user",
                  userId,
                  cause: error,
                }),
            })
          );

          if (userRecord.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId,
                })
              )
            );
          }

          const currentUser = userRecord[0];

          if (currentUser.kycTier < requiredTier) {
            yield* _(
              Effect.fail(
                new InsufficientKyc({
                  message: `Operation '${operation}' requires KYC Tier ${requiredTier}, but user has Tier ${currentUser.kycTier}`,
                  userId,
                  requiredTier,
                  currentTier: currentUser.kycTier,
                  operation,
                })
              )
            );
          }

          return true;
        }),

      approveKycVerification: (userId, tier, verifiedBy, notes) =>
        Effect.gen(function* (_) {
          const now = new Date();

          // Update KYC verification record
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(kycVerification)
                  .set({
                    status: "approved",
                    verifiedBy,
                    verifiedAt: now,
                    verificationData: {
                      approvedAt: now.toISOString(),
                      approvedBy: verifiedBy,
                      notes,
                    },
                  })
                  .where(
                    and(
                      eq(kycVerification.userId, userId),
                      eq(kycVerification.tier, tier)
                    )
                  ),
              catch: (error) =>
                new KycError({
                  message: "Failed to approve KYC verification",
                  userId,
                  tier,
                  cause: error,
                }),
            })
          );

          // Update user's KYC tier
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(user)
                  .set({
                    kycTier: tier,
                    kycStatus: "approved",
                    kycVerifiedAt: now,
                    updatedAt: now,
                  })
                  .where(eq(user.id, userId)),
              catch: (error) =>
                new KycError({
                  message: "Failed to update user KYC tier",
                  userId,
                  tier,
                  cause: error,
                }),
            })
          );

          // Log KYC approval
          yield* _(
            auditService.logKycEvent(userId, "approve_kyc", tier, "success", {
              approvedBy: verifiedBy,
              notes,
            })
          );

          return {
            status: "approved" as const,
            tier,
            verifiedAt: now,
            reviewNotes: notes,
          };
        }),

      rejectKycVerification: (userId, tier, rejectedBy, reason, notes) =>
        Effect.gen(function* (_) {
          const now = new Date();

          // Update KYC verification record
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(kycVerification)
                  .set({
                    status: "rejected",
                    rejectionReason: reason,
                    verificationData: {
                      rejectedAt: now.toISOString(),
                      rejectedBy,
                      reason,
                      notes,
                    },
                  })
                  .where(
                    and(
                      eq(kycVerification.userId, userId),
                      eq(kycVerification.tier, tier)
                    )
                  ),
              catch: (error) =>
                new KycError({
                  message: "Failed to reject KYC verification",
                  userId,
                  tier,
                  cause: error,
                }),
            })
          );

          return {
            status: "rejected" as const,
            tier,
            rejectionReason: reason,
            reviewNotes: notes,
          };
        }),

      getPendingVerifications: (tier, limit = 50, offset = 0) =>
        Effect.gen(function* (_) {
          const query = db
            .select()
            .from(kycVerification)
            .where(eq(kycVerification.status, "pending"))
            .orderBy(desc(kycVerification.createdAt))
            .limit(limit)
            .offset(offset);

          if (tier !== undefined) {
            query.where(
              and(
                eq(kycVerification.status, "pending"),
                eq(kycVerification.tier, tier)
              )
            );
          }

          const verifications = yield* _(
            Effect.tryPromise({
              try: () => query,
              catch: () => [],
            })
          );

          return verifications.map((v) => ({
            status: v.status as KycVerificationResult["status"],
            tier: v.tier,
            verifiedAt: v.verifiedAt || undefined,
            rejectionReason: v.rejectionReason || undefined,
          }));
        }),

      updateUserKycTier: (userId, newTier, verificationId) =>
        Effect.gen(function* (_) {
          const now = new Date();

          const updatedUsers = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(user)
                  .set({
                    kycTier: newTier,
                    kycStatus: "approved",
                    kycVerifiedAt: now,
                    updatedAt: now,
                  })
                  .where(eq(user.id, userId))
                  .returning(),
              catch: (error) =>
                new KycError({
                  message: "Failed to update user KYC tier",
                  userId,
                  tier: newTier,
                  cause: error,
                }),
            })
          );

          if (updatedUsers.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId,
                })
              )
            );
          }

          return updatedUsers[0] as User;
        }),

      isOperationAllowed: (userId, operation, amount) =>
        Effect.gen(function* (_) {
          const userRecord = yield* _(
            Effect.tryPromise({
              try: () =>
                db.select().from(user).where(eq(user.id, userId)).limit(1),
              catch: (error) =>
                new UserNotFound({
                  message: "Failed to fetch user",
                  userId,
                  cause: error,
                }),
            })
          );

          if (userRecord.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId,
                })
              )
            );
          }

          const currentUser = userRecord[0];
          const limits = DEFAULT_KYC_LIMITS[currentUser.kycTier];

          switch (operation) {
            case "create_savings_plan":
              return true; // Basic operation allowed for all tiers
            case "join_group":
              return limits.canJoinGroups;
            case "create_group":
              return limits.canCreateGroups;
            case "withdraw":
              return amount ? amount <= limits.withdrawalLimit : true;
            case "large_transaction":
              return amount ? amount <= limits.dailyTransactionLimit : true;
            default:
              return false;
          }
        }),

      getVerificationHistory: (userId) =>
        Effect.gen(function* (_) {
          const verifications = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(kycVerification)
                  .where(eq(kycVerification.userId, userId))
                  .orderBy(desc(kycVerification.createdAt)),
              catch: (error) =>
                new UserNotFound({
                  message: "Failed to fetch verification history",
                  userId,
                  cause: error,
                }),
            })
          );

          return verifications.map((v) => ({
            status: v.status as KycVerificationResult["status"],
            tier: v.tier,
            verifiedAt: v.verifiedAt || undefined,
            rejectionReason: v.rejectionReason || undefined,
          }));
        }),
    });
  })
);
