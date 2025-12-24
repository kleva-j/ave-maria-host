/**
 * @fileoverview User Management RPC Endpoints
 *
 * This module provides RPC endpoints for user management using @effect/rpc.
 * It handles user profile operations, KYC status updates, and account management.
 *
 * ## Key Features:
 * - **Profile Management**: Get and update user profiles
 * - **KYC Operations**: Update KYC tier and status with validation
 * - **Account Management**: Suspend user accounts with audit trail
 *
 * ## Endpoints:
 * - GetUserProfile: Retrieve user profile with enriched data
 * - UpdateUserProfile: Update profile fields with validation
 * - UpdateKycStatus: Manage KYC tier/status with progression rules
 * - SuspendUserAccount: Suspend accounts with reason and audit
 */

import type { FinancialError } from "@host/shared";
import type { Layer } from "effect";

import { Effect, Schema, DateTime } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

// Import auth middleware for user context
import { AuthMiddleware } from "./auth-rpc";

import {
  PhoneNumberSchema,
  FirstNameSchema,
  KycStatusSchema,
  UrlStringSchema,
  DateTimeSchema,
  KycTierSchema,
  UserIdSchema,
  EmailSchema,
} from "@host/shared";

// Import use cases
import {
  SuspendUserAccountUseCase,
  UpdateUserProfileUseCase,
  UpdateKycStatusUseCase,
  GetUserProfileUseCase,
} from "@host/application";

// ============================================================================
// Payload Classes
// ============================================================================

/**
 * Get User Profile Payload
 */
export class GetUserProfilePayload extends Schema.Class<GetUserProfilePayload>(
  "GetUserProfilePayload"
)({
  userId: UserIdSchema,
}) {}

/**
 * Update User Profile Payload
 */
export class UpdateUserProfilePayload extends Schema.Class<UpdateUserProfilePayload>(
  "UpdateUserProfilePayload"
)({
  userId: UserIdSchema,
  name: FirstNameSchema,
  image: Schema.optional(Schema.NullOr(UrlStringSchema)),
  phoneNumber: Schema.optional(PhoneNumberSchema),
  dateOfBirth: Schema.optional(Schema.NullOr(DateTimeSchema)),
}) {}

/**
 * Update KYC Status Payload
 */
export class UpdateKycStatusPayload extends Schema.Class<UpdateKycStatusPayload>(
  "UpdateKycStatusPayload"
)({
  userId: UserIdSchema,
  tier: KycTierSchema,
  status: KycStatusSchema,
  kycData: Schema.optional(Schema.Unknown),
  adminUserId: UserIdSchema,
}) {}

/**
 * Suspend User Account Payload
 */
export class SuspendUserAccountPayload extends Schema.Class<SuspendUserAccountPayload>(
  "SuspendUserAccountPayload"
)({
  userId: UserIdSchema,
  reason: Schema.String.pipe(Schema.minLength(10)),
  adminUserId: UserIdSchema,
}) {}

// ============================================================================
// Response Classes
// ============================================================================

/**
 * User data for responses
 */
export class UserData extends Schema.Class<UserData>("UserData")({
  id: UserIdSchema,
  name: FirstNameSchema,
  email: EmailSchema,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(UrlStringSchema),
  phoneNumber: Schema.NullOr(PhoneNumberSchema),
  phoneVerified: Schema.Boolean,
  dateOfBirth: Schema.NullOr(DateTimeSchema),
  kycTier: KycTierSchema,
  kycStatus: KycStatusSchema,
  isActive: Schema.Boolean,
  isSuspended: Schema.Boolean,
  suspendedAt: Schema.NullOr(DateTimeSchema),
  suspensionReason: Schema.NullOr(Schema.String),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
}) {}

/**
 * Get User Profile Response
 */
export class GetUserProfileResponse extends Schema.Class<GetUserProfileResponse>(
  "GetUserProfileResponse"
)({
  user: UserData,
  isEmailVerified: Schema.Boolean,
  isPhoneVerified: Schema.Boolean,
  isAccountActive: Schema.Boolean,
  hasKycTier1: Schema.Boolean,
  hasKycTier2: Schema.Boolean,
}) {}

/**
 * Update User Profile Response
 */
export class UpdateUserProfileResponse extends Schema.Class<UpdateUserProfileResponse>(
  "UpdateUserProfileResponse"
)({
  user: UserData,
  updatedFields: Schema.Array(Schema.String),
  message: Schema.String,
}) {}

/**
 * Update KYC Status Response
 */
export class UpdateKycStatusResponse extends Schema.Class<UpdateKycStatusResponse>(
  "UpdateKycStatusResponse"
)({
  user: UserData,
  previousTier: KycTierSchema,
  newTier: KycTierSchema,
  previousStatus: KycStatusSchema,
  newStatus: KycStatusSchema,
  message: Schema.String,
}) {}

/**
 * Suspend User Account Response
 */
export class SuspendUserAccountResponse extends Schema.Class<SuspendUserAccountResponse>(
  "SuspendUserAccountResponse"
)({
  user: UserData,
  suspendedAt: DateTimeSchema,
  reason: Schema.String,
  message: Schema.String,
}) {}

// ============================================================================
// Error Types
// ============================================================================

/**
 * User not found error
 */
export class UserNotFoundRpcError extends Schema.TaggedError<UserNotFoundRpcError>()(
  "UserNotFoundRpcError",
  {
    userId: UserIdSchema,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * User validation error
 */
export class UserValidationRpcError extends Schema.TaggedError<UserValidationRpcError>()(
  "UserValidationRpcError",
  {
    field: Schema.String,
    message: Schema.String,
    value: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * User operation error
 */
export class UserOperationRpcError extends Schema.TaggedError<UserOperationRpcError>()(
  "UserOperationRpcError",
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Union of all user-related errors
 */
export const UserRpcError = Schema.Union(
  UserNotFoundRpcError,
  UserValidationRpcError,
  UserOperationRpcError
);

// ============================================================================
// RPC Group Definition
// ============================================================================

/**
 * User RPC group containing all user management endpoints
 */
export class UserRpcs extends RpcGroup.make(
  /**
   * Get user profile with enriched data
   */
  Rpc.make("GetUserProfile", {
    payload: GetUserProfilePayload,
    success: GetUserProfileResponse,
    error: UserRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Update user profile information
   */
  Rpc.make("UpdateUserProfile", {
    payload: UpdateUserProfilePayload,
    success: UpdateUserProfileResponse,
    error: UserRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Update user KYC status and tier
   */
  Rpc.make("UpdateKycStatus", {
    payload: UpdateKycStatusPayload,
    success: UpdateKycStatusResponse,
    error: UserRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Suspend user account
   */
  Rpc.make("SuspendUserAccount", {
    payload: SuspendUserAccountPayload,
    success: SuspendUserAccountResponse,
    error: UserRpcError,
  }).middleware(AuthMiddleware)
) {}

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * Helper to map domain User entity to RPC UserData
 */
const mapUserToData = (user: any): typeof UserData.Type => {
  return new UserData({
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    phoneNumber: user.phoneNumber,
    phoneVerified: user.phoneVerified,
    dateOfBirth: user.dateOfBirth
      ? DateTime.unsafeFromDate(user.dateOfBirth)
      : null,
    kycTier: user.kycTier,
    kycStatus: user.kycStatus,
    isActive: user.isActive,
    isSuspended: user.isSuspended,
    suspendedAt: user.suspendedAt
      ? DateTime.unsafeFromDate(user.suspendedAt)
      : null,
    suspensionReason: user.suspensionReason,
    createdAt: DateTime.unsafeFromDate(user.createdAt),
    updatedAt: DateTime.unsafeFromDate(user.updatedAt),
  });
};

/**
 * Helper to map application errors to RPC errors
 */
const mapErrorToRpcError = (
  error: FinancialError,
  operation: string
): UserNotFoundRpcError | UserValidationRpcError | UserOperationRpcError => {
  if (error._tag === "UserNotFoundError") {
    return new UserNotFoundRpcError({
      userId: (error as any).userId || "unknown",
      message: error.message || "User not found",
      cause: error,
    });
  }

  if (error._tag === "ValidationError") {
    return new UserValidationRpcError({
      field: (error as any).field || "unknown",
      message: error.message || "Validation failed",
      value: (error as any).value,
    });
  }

  if (error._tag === "DatabaseError") {
    return new UserOperationRpcError({
      operation,
      message: error.message || "Database operation failed",
      cause: error,
    });
  }

  // Fallback for any other error
  return new UserOperationRpcError({
    operation,
    message: error.message || "Operation failed",
    cause: error,
  });
};

/**
 * Live implementation of user RPC handlers
 * Integrates with application use cases
 */
export const UserHandlersLive: Layer.Layer<
  | Rpc.Handler<"GetUserProfile">
  | Rpc.Handler<"UpdateUserProfile">
  | Rpc.Handler<"UpdateKycStatus">
  | Rpc.Handler<"SuspendUserAccount">,
  never,
  | GetUserProfileUseCase
  | UpdateUserProfileUseCase
  | UpdateKycStatusUseCase
  | SuspendUserAccountUseCase
  | AuthMiddleware
> = UserRpcs.toLayer({
  /**
   * Get user profile with enriched data
   * Returns computed flags for email/phone verification and KYC status
   */
  GetUserProfile: (payload) =>
    Effect.gen(function* () {
      const getUserProfileUseCase = yield* GetUserProfileUseCase;

      const result = yield* getUserProfileUseCase
        .execute({ userId: payload.userId })
        .pipe(
          Effect.mapError((error) =>
            mapErrorToRpcError(error, "GetUserProfile")
          )
        );

      return new GetUserProfileResponse({
        user: mapUserToData(result.user),
        isEmailVerified: result.isEmailVerified,
        isPhoneVerified: result.isPhoneVerified,
        isAccountActive: result.isAccountActive,
        hasKycTier1: result.hasKycTier1,
        hasKycTier2: result.hasKycTier2,
      });
    }),

  /**
   * Update user profile information
   * Validates changes and tracks updated fields
   */
  UpdateUserProfile: (payload) =>
    Effect.gen(function* () {
      const updateUserProfileUseCase = yield* UpdateUserProfileUseCase;

      const result = yield* updateUserProfileUseCase
        .execute({
          userId: payload.userId,
          name: payload.name,
          image: payload.image,
          phoneNumber: payload.phoneNumber,
          dateOfBirth: payload.dateOfBirth
            ? DateTime.toDate(payload.dateOfBirth)
            : undefined,
        })
        .pipe(
          Effect.mapError((error) =>
            mapErrorToRpcError(error, "UpdateUserProfile")
          )
        );

      return new UpdateUserProfileResponse({
        user: mapUserToData(result.user),
        updatedFields: result.updatedFields,
        message: `Profile updated successfully. Updated fields: ${result.updatedFields.join(", ")}`,
      });
    }),

  /**
   * Update user KYC status and tier
   * Enforces tier progression rules and tracks changes
   */
  UpdateKycStatus: (payload) =>
    Effect.gen(function* () {
      const updateKycStatusUseCase = yield* UpdateKycStatusUseCase;

      const result = yield* updateKycStatusUseCase
        .execute({
          userId: payload.userId,
          tier: payload.tier,
          status: payload.status,
          kycData: payload.kycData,
          adminUserId: payload.adminUserId,
        })
        .pipe(
          Effect.mapError((error) =>
            mapErrorToRpcError(error, "UpdateKycStatus")
          )
        );

      return new UpdateKycStatusResponse({
        user: mapUserToData(result.user),
        previousTier: result.previousTier,
        newTier: result.newTier,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        message: `KYC status updated: Tier ${result.previousTier}→${result.newTier}, Status ${result.previousStatus}→${result.newStatus}`,
      });
    }),

  /**
   * Suspend user account
   * Validates suspension rules and creates audit trail
   */
  SuspendUserAccount: (payload) =>
    Effect.gen(function* () {
      const suspendUserAccountUseCase = yield* SuspendUserAccountUseCase;

      const result = yield* suspendUserAccountUseCase
        .execute({
          userId: payload.userId,
          reason: payload.reason,
          adminUserId: payload.adminUserId,
        })
        .pipe(
          Effect.mapError((error) =>
            mapErrorToRpcError(error, "SuspendUserAccount")
          )
        );

      return new SuspendUserAccountResponse({
        user: mapUserToData(result.user),
        suspendedAt: DateTime.unsafeFromDate(result.suspendedAt),
        reason: result.reason,
        message: `User account suspended successfully. Reason: ${result.reason}`,
      });
    }),
});
