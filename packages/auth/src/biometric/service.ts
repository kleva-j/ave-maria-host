import type { Effect } from "effect";
import type {
  BiometricRegistration,
  BiometricAuthRequest,
  BiometricAuthResult,
  BiometricChallenge,
  BiometricDevice,
  BiometricType,
  AuthContext,
  DeviceId,
  UserId,
} from "@host/shared";

import type {
  AccountSuspendedError,
  BiometricAuthError,
  UserNotFoundError,
} from "../auth/errors";

import { BiometricTypeSchema, BiometricTypeEnum } from "@host/shared";
import { Context } from "effect";

/**
 * Biometric service interface providing secure biometric authentication
 */
export interface BiometricService {
  // readonly testMethod: () => Effect.Effect<void, never>;
  /**
   * Register a new biometric device for a user
   */
  readonly registerDevice: (
    enrollment: BiometricRegistration
  ) => Effect.Effect<BiometricDevice, BiometricAuthError | UserNotFoundError>;

  /**
   * Generate a challenge for biometric authentication
   */
  readonly generateChallenge: (
    userId: UserId,
    deviceId: DeviceId
  ) => Effect.Effect<
    BiometricChallenge,
    BiometricAuthError | UserNotFoundError
  >;

  /**
   * Verify biometric authentication response
   */
  readonly verifyBiometric: (
    request: BiometricAuthRequest
  ) => Effect.Effect<
    BiometricAuthResult,
    BiometricAuthError | UserNotFoundError | AccountSuspendedError
  >;

  /**
   * Authenticate user using biometric and return auth context
   */
  readonly authenticateWithBiometric: (
    request: BiometricAuthRequest
  ) => Effect.Effect<
    AuthContext,
    BiometricAuthError | UserNotFoundError | AccountSuspendedError
  >;

  /**
   * Disable biometric authentication for a device
   */
  readonly disableDevice: (
    userId: UserId,
    deviceId: DeviceId
  ) => Effect.Effect<void, BiometricAuthError | UserNotFoundError>;

  /**
   * Get all registered biometric devices for a user
   */
  readonly getUserDevices: (
    userId: UserId
  ) => Effect.Effect<BiometricDevice[], UserNotFoundError>;

  /**
   * Update device information (name, status, etc.)
   */
  readonly updateDevice: (
    userId: UserId,
    deviceId: DeviceId,
    updates: Partial<Pick<BiometricDevice, "deviceName" | "isActive">>
  ) => Effect.Effect<BiometricDevice, BiometricAuthError | UserNotFoundError>;

  /**
   * Verify device ownership before sensitive operations
   */
  readonly verifyDeviceOwnership: (
    userId: UserId,
    deviceId: DeviceId
  ) => Effect.Effect<boolean, BiometricAuthError | UserNotFoundError>;

  /**
   * Get biometric authentication history for a user
   */
  readonly getAuthHistory: (
    userId: UserId,
    limit?: number,
    offset?: number
  ) => Effect.Effect<BiometricAuthResult[], UserNotFoundError>;

  /**
   * Revoke all biometric devices for a user (security measure)
   */
  readonly revokeAllDevices: (
    userId: UserId,
    reason?: string
  ) => Effect.Effect<void, UserNotFoundError>;

  /**
   * Check if biometric authentication is available for a user
   */
  readonly isBiometricAvailable: (
    userId: UserId
  ) => Effect.Effect<boolean, UserNotFoundError>;

  /**
   * Validate biometric public key format and security
   */
  readonly validatePublicKey: (
    publicKey: string,
    biometricType: BiometricType
  ) => Effect.Effect<boolean, BiometricAuthError>;

  /**
   * Generate secure device fingerprint
   */
  readonly generateDeviceFingerprint: (deviceInfo: {
    platform: string;
    model: string;
    osVersion: string;
    appVersion: string;
  }) => Effect.Effect<string, never>;
}

/**
 * Context tag for the BiometricService
 */
export const BiometricService = Context.GenericTag<BiometricService>(
  "@host/auth/BiometricService"
);

/**
 * Type alias for BiometricService dependency
 */
export type BiometricServiceDeps = typeof BiometricService.Service;

/**
 * Biometric security configuration
 */
export interface BiometricSecurityConfig {
  readonly challengeExpiryMinutes: number;
  readonly maxFailedAttempts: number;
  readonly lockoutDurationMinutes: number;
  readonly minConfidenceScore: number;
  readonly allowedBiometricTypes: BiometricType[];
  readonly requireDeviceBinding: boolean;
  readonly enableAntiSpoofing: boolean;
}

/**
 * Default biometric security configuration
 */
export const DEFAULT_BIOMETRIC_CONFIG: BiometricSecurityConfig = {
  challengeExpiryMinutes: 5,
  maxFailedAttempts: 3,
  lockoutDurationMinutes: 30,
  minConfidenceScore: 0.8,
  allowedBiometricTypes: [
    BiometricTypeSchema.make(BiometricTypeEnum.FINGERPRINT),
    BiometricTypeSchema.make(BiometricTypeEnum.FACE),
  ],
  requireDeviceBinding: true,
  enableAntiSpoofing: true,
};
