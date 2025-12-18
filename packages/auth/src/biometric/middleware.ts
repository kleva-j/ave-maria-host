import type { BiometricType, DeviceId, UserId } from "@host/shared";
import type { UserNotFoundError } from "../auth/errors";
import type { BiometricService } from "./service";
import type { AuthContext } from "../auth/types";

import { BiometricAuthError } from "../auth/errors";
import { Effect, Context } from "effect";

/**
 * Biometric middleware context
 */
export interface BiometricMiddlewareContext {
  readonly biometricService: BiometricService;
}

export const BiometricMiddlewareContext =
  Context.GenericTag<BiometricMiddlewareContext>(
    "@host/auth/BiometricMiddlewareContext"
  );

/**
 * Biometric authentication options
 */
export interface BiometricAuthOptions {
  readonly required?: boolean;
  readonly fallbackToPassword?: boolean;
  readonly allowedTypes?: BiometricType[];
  readonly maxAttempts?: number;
}

/**
 * Device registration options
 */
export interface DeviceRegistrationOptions {
  readonly deviceName: string;
  readonly biometricType: BiometricType;
  readonly requireExistingAuth?: boolean;
}

/**
 * Middleware to require biometric authentication
 */
export const requireBiometricAuth =
  (options: BiometricAuthOptions = {}) =>
  <A, E>(
    effect: Effect.Effect<A, E, AuthContext>
  ): Effect.Effect<
    A,
    E | BiometricAuthError | UserNotFoundError,
    AuthContext | BiometricMiddlewareContext
  > =>
    Effect.gen(function* (_) {
      const authContext = yield* _(Effect.context<AuthContext>());
      const { biometricService } = yield* _(BiometricMiddlewareContext);

      // Check if biometric is available for the user
      const isBiometricAvailable = yield* _(
        biometricService.isBiometricAvailable(authContext.user.id)
      );

      if (options.required && !isBiometricAvailable) {
        yield* _(
          Effect.fail(
            new BiometricAuthError({
              message: "Biometric authentication is required but not set up",
              userId: authContext.user.id,
              deviceId: authContext.session.deviceId || "unknown",
              reason: "biometric_not_setup",
            })
          )
        );
      }

      // If biometric is available and session doesn't have device ID, require re-auth
      if (isBiometricAvailable && !authContext.session.deviceId) {
        yield* _(
          Effect.fail(
            new BiometricAuthError({
              message: "Biometric re-authentication required",
              userId: authContext.user.id,
              deviceId: "unknown",
              reason: "biometric_reauth_required",
            })
          )
        );
      }

      // Execute the original effect
      return yield* _(effect);
    });

/**
 * Check if biometric authentication is available for a user
 */
export const checkBiometricAvailability = (userId: UserId) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);
    return yield* _(biometricService.isBiometricAvailable(userId));
  });

/**
 * Register a new biometric device
 */
export const registerBiometricDevice = (
  userId: UserId,
  deviceId: DeviceId,
  publicKey: string,
  options: DeviceRegistrationOptions
) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);

    // Validate public key format
    const isValidKey = yield* _(
      biometricService.validatePublicKey(publicKey, options.biometricType)
    );

    if (!isValidKey) {
      yield* _(
        Effect.fail(
          new BiometricAuthError({
            message: "Invalid public key format",
            userId,
            deviceId,
            reason: "invalid_public_key",
          })
        )
      );
    }

    // Register the device
    return yield* _(
      biometricService.registerDevice({
        userId,
        deviceId,
        deviceName: options.deviceName,
        biometricType: options.biometricType,
        publicKey,
        enrollmentData: {
          registeredAt: new Date().toISOString(),
          biometricType: options.biometricType,
        },
      })
    );
  });

/**
 * Generate biometric challenge for authentication
 */
export const generateBiometricChallenge = (
  userId: UserId,
  deviceId: DeviceId
) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);
    return yield* _(biometricService.generateChallenge(userId, deviceId));
  });

/**
 * Authenticate using biometric data
 */
export const authenticateWithBiometric = (
  userId: UserId,
  deviceId: DeviceId,
  signature: string,
  challenge: string
) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);

    return yield* _(
      biometricService.authenticateWithBiometric({
        userId,
        deviceId,
        signature,
        challenge,
      })
    );
  });

/**
 * Disable biometric authentication for a device
 */
export const disableBiometricDevice = (userId: UserId, deviceId: DeviceId) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);
    return yield* _(biometricService.disableDevice(userId, deviceId));
  });

/**
 * Get all biometric devices for a user
 */
export const getUserBiometricDevices = (userId: UserId) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);
    return yield* _(biometricService.getUserDevices(userId));
  });

/**
 * Revoke all biometric devices (security measure)
 */
export const revokeAllBiometricDevices = (userId: UserId, reason?: string) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);
    return yield* _(biometricService.revokeAllDevices(userId, reason));
  });

/**
 * Verify device ownership before sensitive operations
 */
export const verifyDeviceOwnership = (userId: UserId, deviceId: DeviceId) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);
    return yield* _(biometricService.verifyDeviceOwnership(userId, deviceId));
  });

/**
 * Generate secure device fingerprint
 */
export const generateDeviceFingerprint = (deviceInfo: {
  platform: string;
  model: string;
  osVersion: string;
  appVersion: string;
}) =>
  Effect.gen(function* (_) {
    const { biometricService } = yield* _(BiometricMiddlewareContext);
    return yield* _(biometricService.generateDeviceFingerprint(deviceInfo));
  });

/**
 * Biometric security policies
 */
export const BiometricSecurityPolicies = {
  /**
   * Require biometric for high-value transactions
   */
  requireForHighValueTransactions: (amount: number, threshold = 100000) =>
    requireBiometricAuth({
      required: amount >= threshold,
      fallbackToPassword: false,
    }),

  /**
   * Require biometric for sensitive operations
   */
  requireForSensitiveOperations: () =>
    requireBiometricAuth({ required: true, fallbackToPassword: false }),

  /**
   * Optional biometric with password fallback
   */
  optionalWithPasswordFallback: () =>
    requireBiometricAuth({ required: false, fallbackToPassword: true }),
};
