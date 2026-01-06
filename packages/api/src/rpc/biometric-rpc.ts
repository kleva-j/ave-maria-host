/**
 * @fileoverview Biometric Authentication RPC Endpoints
 *
 * This module provides RPC endpoints for biometric authentication using @effect/rpc.
 * It handles device registration, challenge generation, and biometric verification.
 *
 * ## Key Features:
 * - **Device Registration**: Register biometric devices securely
 * - **Challenge-Response**: Secure challenge-based authentication
 * - **Multi-Biometric**: Support for fingerprint, face, and other biometric types
 * - **Device Management**: Enable/disable devices and manage device lifecycle
 *
 * ## Endpoints:
 * - RegisterBiometricDevice: Register a new biometric device
 * - GenerateBiometricChallenge: Generate authentication challenge
 * - VerifyBiometric: Verify biometric authentication response
 * - AuthenticateWithBiometric: Complete biometric authentication flow
 * - GetUserDevices: Get all registered devices for user
 * - DisableBiometricDevice: Disable a biometric device
 * - UpdateBiometricDevice: Update device information
 */

import type { BiometricDevice } from "@host/shared";
import type { Layer } from "effect";

import { Effect, Schema, DateTime } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

// Import auth middleware for user context
import { AuthMiddleware, CurrentUser } from "./auth-rpc";

// Import biometric service
import { BiometricService } from "@host/auth";

import {
  BiometricDeviceIdSchema,
  BiometricTypeSchema,
  ChallengeIdSchema,
  FirstNameSchema,
  DeviceIdSchema,
  DateTimeSchema,
  BooleanSchema,
  UserIdSchema,
  EmailSchema,
  TokenSchema,
} from "@host/shared";

// ============================================================================
// Payload Classes
// ============================================================================

/**
 * Register Biometric Device Payload
 */
export class RegisterBiometricDevicePayload extends Schema.Class<RegisterBiometricDevicePayload>(
  "RegisterBiometricDevicePayload"
)({
  deviceId: DeviceIdSchema,
  deviceName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  biometricType: BiometricTypeSchema,
  publicKey: Schema.String.pipe(Schema.minLength(1)),
  enrollmentData: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
}) {}

/**
 * Generate Biometric Challenge Payload
 */
export class GenerateBiometricChallengePayload extends Schema.Class<GenerateBiometricChallengePayload>(
  "GenerateBiometricChallengePayload"
)({
  deviceId: DeviceIdSchema,
}) {}

/**
 * Verify Biometric Payload
 */
export class VerifyBiometricPayload extends Schema.Class<VerifyBiometricPayload>(
  "VerifyBiometricPayload"
)({
  deviceId: DeviceIdSchema,
  signature: Schema.String.pipe(Schema.minLength(1)),
  challenge: Schema.String.pipe(Schema.minLength(1)),
}) {}

/**
 * Authenticate With Biometric Payload
 */
export class AuthenticateWithBiometricPayload extends Schema.Class<AuthenticateWithBiometricPayload>(
  "AuthenticateWithBiometricPayload"
)({
  userId: UserIdSchema,
  deviceId: DeviceIdSchema,
  signature: Schema.String.pipe(Schema.minLength(1)),
  challenge: Schema.String.pipe(Schema.minLength(1)),
}) {}

/**
 * Get User Devices Payload
 */
export class GetUserDevicesPayload extends Schema.Class<GetUserDevicesPayload>(
  "GetUserDevicesPayload"
)({
  userId: Schema.optional(UserIdSchema), // Optional - defaults to current user
}) {}

/**
 * Disable Biometric Device Payload
 */
export class DisableBiometricDevicePayload extends Schema.Class<DisableBiometricDevicePayload>(
  "DisableBiometricDevicePayload"
)({
  deviceId: DeviceIdSchema,
}) {}

/**
 * Update Biometric Device Payload
 */
export class UpdateBiometricDevicePayload extends Schema.Class<UpdateBiometricDevicePayload>(
  "UpdateBiometricDevicePayload"
)({
  deviceId: DeviceIdSchema,
  deviceName: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
  ),
  isActive: Schema.optional(Schema.Boolean),
}) {}

// ============================================================================
// Response Classes
// ============================================================================

/**
 * Biometric Device Response
 */
export class BiometricDeviceResponse extends Schema.Class<BiometricDeviceResponse>(
  "BiometricDeviceResponse"
)({
  id: BiometricDeviceIdSchema,
  userId: UserIdSchema,
  deviceId: DeviceIdSchema,
  deviceName: Schema.String,
  biometricType: BiometricTypeSchema,
  isActive: BooleanSchema,
  lastUsedAt: Schema.optional(DateTimeSchema),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
}) {}

/**
 * Biometric Challenge Response
 */
export class BiometricChallengeResponse extends Schema.Class<BiometricChallengeResponse>(
  "BiometricChallengeResponse"
)({
  challengeId: ChallengeIdSchema,
  challenge: Schema.String,
  expiresAt: DateTimeSchema,
  deviceId: DeviceIdSchema,
}) {}

/**
 * Biometric Verification Response
 */
export class BiometricVerificationResponse extends Schema.Class<BiometricVerificationResponse>(
  "BiometricVerificationResponse"
)({
  success: BooleanSchema,
  confidence: Schema.Number.pipe(Schema.between(0, 1)),
  deviceId: DeviceIdSchema,
  authenticatedAt: DateTimeSchema,
  challengeId: ChallengeIdSchema,
  message: Schema.String,
}) {}

/**
 * Biometric Authentication Response
 */
export class BiometricAuthenticationResponse extends Schema.Class<BiometricAuthenticationResponse>(
  "BiometricAuthenticationResponse"
)({
  success: BooleanSchema,
  user: Schema.optional(
    Schema.Struct({
      id: UserIdSchema,
      name: FirstNameSchema,
      email: EmailSchema,
    })
  ),
  session: Schema.optional(
    Schema.Struct({
      token: TokenSchema,
      expiresAt: DateTimeSchema,
    })
  ),
  confidence: Schema.Number.pipe(Schema.between(0, 1)),
  message: Schema.String,
}) {}

/**
 * Get User Devices Response
 */
export class GetUserDevicesResponse extends Schema.Class<GetUserDevicesResponse>(
  "GetUserDevicesResponse"
)({
  devices: Schema.Array(BiometricDeviceResponse),
  totalDevices: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  activeDevices: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
}) {}

/**
 * Device Operation Response
 */
export class DeviceOperationResponse extends Schema.Class<DeviceOperationResponse>(
  "DeviceOperationResponse"
)({
  success: BooleanSchema,
  message: Schema.String,
  device: Schema.optional(BiometricDeviceResponse),
}) {}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Biometric authentication error
 */
export class BiometricAuthRpcError extends Schema.TaggedError<BiometricAuthRpcError>()(
  "BiometricAuthRpcError",
  {
    type: Schema.String,
    deviceId: Schema.optional(DeviceIdSchema),
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Biometric validation error
 */
export class BiometricValidationRpcError extends Schema.TaggedError<BiometricValidationRpcError>()(
  "BiometricValidationRpcError",
  {
    field: Schema.String,
    message: Schema.String,
    value: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Union of all biometric-related errors
 */
export const BiometricRpcError = Schema.Union(
  BiometricValidationRpcError,
  BiometricAuthRpcError
);

// ============================================================================
// RPC Group Definition
// ============================================================================

/**
 * Biometric RPC group containing all biometric authentication endpoints
 */
export class BiometricRpcs extends RpcGroup.make(
  /**
   * Register a new biometric device
   */
  Rpc.make("RegisterBiometricDevice", {
    payload: RegisterBiometricDevicePayload,
    success: BiometricDeviceResponse,
    error: BiometricRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Generate biometric authentication challenge
   */
  Rpc.make("GenerateBiometricChallenge", {
    payload: GenerateBiometricChallengePayload,
    success: BiometricChallengeResponse,
    error: BiometricRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Verify biometric authentication response
   */
  Rpc.make("VerifyBiometric", {
    payload: VerifyBiometricPayload,
    success: BiometricVerificationResponse,
    error: BiometricRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Authenticate user with biometric (returns auth context)
   */
  Rpc.make("AuthenticateWithBiometric", {
    payload: AuthenticateWithBiometricPayload,
    success: BiometricAuthenticationResponse,
    error: BiometricRpcError,
  }),

  /**
   * Get all registered biometric devices for user
   */
  Rpc.make("GetUserDevices", {
    payload: GetUserDevicesPayload,
    success: GetUserDevicesResponse,
    error: BiometricRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Disable a biometric device
   */
  Rpc.make("DisableBiometricDevice", {
    payload: DisableBiometricDevicePayload,
    success: DeviceOperationResponse,
    error: BiometricRpcError,
  }).middleware(AuthMiddleware),

  /**
   * Update biometric device information
   */
  Rpc.make("UpdateBiometricDevice", {
    payload: UpdateBiometricDevicePayload,
    success: DeviceOperationResponse,
    error: BiometricRpcError,
  }).middleware(AuthMiddleware)
) {}

/**
 * Map biometric service errors to RPC errors
 * Handles errors from BiometricService which include BiometricAuthError,
 * UserNotFoundError, and AccountSuspendedError from the auth package
 */
const mapBiometricErrorToRpcError = (
  error: any
): BiometricAuthRpcError | BiometricValidationRpcError => {
  // Handle auth-layer BiometricAuthError (separate from shared biometric errors)
  if (error._tag === "BiometricAuthError") {
    return new BiometricAuthRpcError({
      type: error.reason || "DEVICE_NOT_FOUND",
      deviceId: error.deviceId,
      message: error.message || "Biometric authentication failed",
      cause: error,
    });
  }

  // Handle BiometricValidationError  from shared package
  if (error._tag === "BiometricValidationError") {
    if (error.field) {
      // Return as validation error if field is present
      return new BiometricValidationRpcError({
        field: error.field,
        message: error.message || "Validation failed",
        value: error.context,
      });
    }
    // Otherwise return as auth error with type from error.type
    return new BiometricAuthRpcError({
      type: error.type || "OPERATION_ERROR",
      deviceId: error.context?.deviceId,
      message: error.message || "Biometric validation failed",
      cause: error,
    });
  }

  // Handle BiometricOperationError from shared package
  if (error._tag === "BiometricOperationError") {
    return new BiometricAuthRpcError({
      type: "OPERATION_ERROR",
      message: error.message || "Biometric operation failed",
      cause: error,
    });
  }

  // Handle UserNotFoundError
  if (error._tag === "UserNotFoundError") {
    return new BiometricValidationRpcError({
      field: "userId",
      message: error.message || "User not found",
      value: error.userId,
    });
  }

  // Handle AccountSuspendedError
  if (error._tag === "AccountSuspendedError") {
    return new BiometricValidationRpcError({
      field: "account",
      message: error.message || "Account is suspended",
      value: error.userId,
    });
  }

  // Fallback for any other error
  return new BiometricAuthRpcError({
    type: "OPERATION_ERROR",
    message: error.message || "Biometric operation failed",
    cause: error,
  });
};

/**
 * Map biometric device to response
 */
const mapDeviceToResponse = (
  device: BiometricDevice
): BiometricDeviceResponse => {
  return new BiometricDeviceResponse({
    id: device.id,
    userId: device.userId,
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    biometricType: device.biometricType,
    isActive: device.isActive,
    lastUsedAt: device.lastUsedAt
      ? DateTime.unsafeFromDate(device.lastUsedAt)
      : undefined,
    createdAt: DateTime.unsafeFromDate(device.createdAt),
    updatedAt: DateTime.unsafeFromDate(device.updatedAt),
  });
};

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * Live implementation of biometric RPC handlers
 */
export const BiometricHandlersLive: Layer.Layer<
  | Rpc.Handler<"RegisterBiometricDevice">
  | Rpc.Handler<"GenerateBiometricChallenge">
  | Rpc.Handler<"VerifyBiometric">
  | Rpc.Handler<"AuthenticateWithBiometric">
  | Rpc.Handler<"GetUserDevices">
  | Rpc.Handler<"DisableBiometricDevice">
  | Rpc.Handler<"UpdateBiometricDevice">,
  never,
  BiometricService | AuthMiddleware
> = BiometricRpcs.toLayer({
  /**
   * Register a new biometric device
   */
  RegisterBiometricDevice: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const biometricService = yield* BiometricService;

      const registration = {
        userId: currentUser.id,
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
        biometricType: payload.biometricType,
        publicKey: payload.publicKey,
        enrollmentData: payload.enrollmentData,
      };

      const device = yield* biometricService
        .registerDevice(registration)
        .pipe(Effect.mapError(mapBiometricErrorToRpcError));

      return mapDeviceToResponse(device);
    }),

  /**
   * Generate biometric authentication challenge
   */
  GenerateBiometricChallenge: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const biometricService = yield* BiometricService;

      const challenge = yield* biometricService
        .generateChallenge(currentUser.id, payload.deviceId)
        .pipe(Effect.mapError(mapBiometricErrorToRpcError));

      return new BiometricChallengeResponse({
        challengeId: challenge.challengeId,
        challenge: challenge.challenge,
        expiresAt: DateTime.unsafeFromDate(challenge.expiresAt),
        deviceId: challenge.deviceId,
      });
    }),

  /**
   * Verify biometric authentication response
   */
  VerifyBiometric: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const biometricService = yield* BiometricService;

      const request = {
        userId: currentUser.id,
        deviceId: payload.deviceId,
        signature: payload.signature,
        challenge: payload.challenge,
      };

      const result = yield* biometricService
        .verifyBiometric(request)
        .pipe(Effect.mapError(mapBiometricErrorToRpcError));

      return new BiometricVerificationResponse({
        success: result.success,
        confidence: result.confidence,
        deviceId: result.deviceId,
        authenticatedAt: DateTime.unsafeFromDate(result.authenticatedAt),
        challengeId: result.challengeId,
        message: result.success
          ? "Biometric verification successful"
          : "Biometric verification failed",
      });
    }),

  /**
   * Authenticate user with biometric
   */
  AuthenticateWithBiometric: (payload) =>
    Effect.gen(function* () {
      const biometricService = yield* BiometricService;

      const request = {
        userId: payload.userId,
        deviceId: payload.deviceId,
        signature: payload.signature,
        challenge: payload.challenge,
      };

      const authContext = yield* biometricService
        .authenticateWithBiometric(request)
        .pipe(Effect.mapError(mapBiometricErrorToRpcError));

      // TODO: Create session token for the authenticated user
      // This would require integration with the auth service

      return new BiometricAuthenticationResponse({
        success: true,
        user: {
          id: authContext.user.id,
          name: authContext.user.name,
          email: authContext.user.email,
        },
        session: {
          token: authContext.session.token,
          expiresAt: DateTime.unsafeFromDate(authContext.session.expiresAt),
        },
        confidence: 0.95, // TODO: Get from verification result
        message: "Biometric authentication successful",
      });
    }),

  /**
   * Get all registered biometric devices for user
   */
  GetUserDevices: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const biometricService = yield* BiometricService;

      const userId = payload.userId || currentUser.id;

      const devices = yield* biometricService
        .getUserDevices(userId)
        .pipe(Effect.mapError(mapBiometricErrorToRpcError));

      const activeDevices = devices.filter((device) => device.isActive);

      return new GetUserDevicesResponse({
        devices: devices.map(mapDeviceToResponse),
        totalDevices: devices.length,
        activeDevices: activeDevices.length,
      });
    }),

  /**
   * Disable a biometric device
   */
  DisableBiometricDevice: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const biometricService = yield* BiometricService;

      yield* biometricService
        .disableDevice(currentUser.id, payload.deviceId)
        .pipe(Effect.mapError(mapBiometricErrorToRpcError));

      return new DeviceOperationResponse({
        success: true,
        message: "Biometric device disabled successfully",
      });
    }),

  /**
   * Update biometric device information
   */
  UpdateBiometricDevice: (payload) =>
    Effect.gen(function* () {
      const currentUser = yield* CurrentUser;
      const biometricService = yield* BiometricService;

      const updates: any = {};
      if (payload.deviceName !== undefined) {
        updates.deviceName = payload.deviceName;
      }
      if (payload.isActive !== undefined) {
        updates.isActive = payload.isActive;
      }

      const device = yield* biometricService
        .updateDevice(currentUser.id, payload.deviceId, updates)
        .pipe(Effect.mapError(mapBiometricErrorToRpcError));

      return new DeviceOperationResponse({
        success: true,
        message: "Biometric device updated successfully",
        device: mapDeviceToResponse(device),
      });
    }),
});
