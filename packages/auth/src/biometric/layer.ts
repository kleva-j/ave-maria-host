import type { BiometricChallenge, Session, User } from "../auth/types";
import type { BiometricType } from "@host/shared";

import { DEFAULT_BIOMETRIC_CONFIG, BiometricService } from "./service";
import { user, biometricAuth, session, db } from "@host/db";
import { eq, and, desc, count } from "drizzle-orm";
import { ChallengeIdSchema } from "@host/shared";
import { Effect, Layer, Context } from "effect";

import * as crypto from "node:crypto";

import {
  BiometricAuthError as BiometricError,
  UserNotFoundError as UserNotFound,
  AccountSuspendedError,
} from "../auth/errors";

/**
 * Cryptographic service for biometric operations
 */
export interface CryptoService {
  readonly generateChallenge: () => Effect.Effect<string, never>;
  readonly verifySignature: (
    publicKey: string,
    signature: string,
    challenge: string
  ) => Effect.Effect<boolean, Error>;
  readonly generateDeviceFingerprint: (
    deviceInfo: Record<string, string>
  ) => Effect.Effect<string, never>;
}

export const CryptoService = Context.GenericTag<CryptoService>(
  "@host/auth/CryptoService"
);

/**
 * In-memory challenge store (in production, use Redis)
 */
const challengeStore = new Map<string, BiometricChallenge>();

/**
 * Live implementation of BiometricService using Drizzle ORM
 */
export const BiometricServiceLive = Layer.effect(
  BiometricService,
  Effect.gen(function* (_) {
    const cryptoService = yield* _(CryptoService);

    return BiometricService.of({
      registerDevice: (enrollment) =>
        Effect.gen(function* (_) {
          // Check if user exists
          const existingUser = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(user)
                  .where(eq(user.id, enrollment.userId))
                  .limit(1),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to fetch user",
                  userId: enrollment.userId,
                  deviceId: enrollment.deviceId,
                  cause: error,
                }),
            })
          );

          if (existingUser.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId: enrollment.userId,
                })
              )
            );
          }

          // Check if device is already registered
          const existingDevice = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(biometricAuth)
                  .where(
                    and(
                      eq(biometricAuth.userId, enrollment.userId),
                      eq(biometricAuth.deviceId, enrollment.deviceId)
                    )
                  )
                  .limit(1),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to check existing device",
                  userId: enrollment.userId,
                  deviceId: enrollment.deviceId,
                  cause: error,
                }),
            })
          );

          if (existingDevice.length > 0) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Device already registered for this user",
                  userId: enrollment.userId,
                  deviceId: enrollment.deviceId,
                  reason: "device_already_exists",
                })
              )
            );
          }

          // Validate public key
          const isValidKey = yield* _(
            cryptoService
              .verifySignature(
                enrollment.publicKey,
                "test_signature",
                "test_challenge"
              )
              .pipe(Effect.catchAll(() => Effect.succeed(false)))
          );

          if (!isValidKey) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Invalid public key format",
                  userId: enrollment.userId,
                  deviceId: enrollment.deviceId,
                  reason: "invalid_public_key",
                })
              )
            );
          }

          // Create biometric device record
          const deviceId = crypto.randomUUID();
          const now = new Date();

          yield* _(
            Effect.tryPromise({
              try: () =>
                db.insert(biometricAuth).values({
                  id: deviceId,
                  userId: enrollment.userId,
                  deviceId: enrollment.deviceId,
                  deviceName: enrollment.deviceName,
                  publicKey: enrollment.publicKey,
                  isActive: true,
                  createdAt: now,
                  updatedAt: now,
                }),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to register biometric device",
                  userId: enrollment.userId,
                  deviceId: enrollment.deviceId,
                  cause: error,
                }),
            })
          );

          // Update user to enable biometric
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(user)
                  .set({ biometricEnabled: true, updatedAt: now })
                  .where(eq(user.id, enrollment.userId)),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to update user biometric status",
                  userId: enrollment.userId,
                  deviceId: enrollment.deviceId,
                  cause: error,
                }),
            })
          );

          return {
            id: deviceId,
            userId: enrollment.userId,
            deviceId: enrollment.deviceId,
            deviceName: enrollment.deviceName,
            biometricType: enrollment.biometricType,
            publicKey: enrollment.publicKey,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };
        }),

      generateChallenge: (userId, deviceId) =>
        Effect.gen(function* (_) {
          // Verify device exists and is active
          const device = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(biometricAuth)
                  .where(
                    and(
                      eq(biometricAuth.userId, userId),
                      eq(biometricAuth.deviceId, deviceId),
                      eq(biometricAuth.isActive, true)
                    )
                  )
                  .limit(1),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to fetch device",
                  userId,
                  deviceId,
                  cause: error,
                }),
            })
          );

          if (device.length === 0) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Device not found or inactive",
                  userId,
                  deviceId,
                  reason: "device_not_found",
                })
              )
            );
          }

          // Generate challenge
          const challenge = yield* _(cryptoService.generateChallenge());
          const challengeId = ChallengeIdSchema.make(crypto.randomUUID());
          const expiresAt = new Date(
            Date.now() +
              DEFAULT_BIOMETRIC_CONFIG.challengeExpiryMinutes * 60 * 1000
          );

          const biometricChallenge: BiometricChallenge = {
            challengeId,
            challenge,
            expiresAt,
            deviceId,
            userId,
          };

          // Store challenge (in production, use Redis with TTL)
          challengeStore.set(challengeId, biometricChallenge);

          // Clean up expired challenges
          setTimeout(
            () => {
              challengeStore.delete(challengeId);
            },
            DEFAULT_BIOMETRIC_CONFIG.challengeExpiryMinutes * 60 * 1000
          );

          return biometricChallenge;
        }),

      verifyBiometric: (request) =>
        Effect.gen(function* (_) {
          // Get stored challenge
          const storedChallenge = challengeStore.get(request.challenge);
          if (!storedChallenge) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Invalid or expired challenge",
                  userId: request.userId,
                  deviceId: request.deviceId,
                  reason: "invalid_challenge",
                })
              )
            );
          }

          // Verify challenge matches
          if (storedChallenge?.challenge !== request.challenge) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Challenge mismatch",
                  userId: request.userId,
                  deviceId: request.deviceId,
                  reason: "challenge_mismatch",
                })
              )
            );
          }

          // Get device public key
          const device = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(biometricAuth)
                  .where(
                    and(
                      eq(biometricAuth.userId, request.userId),
                      eq(biometricAuth.deviceId, request.deviceId),
                      eq(biometricAuth.isActive, true)
                    )
                  )
                  .limit(1),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to fetch device",
                  userId: request.userId,
                  deviceId: request.deviceId,
                  cause: error,
                }),
            })
          );

          if (device.length === 0) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Device not found or inactive",
                  userId: request.userId,
                  deviceId: request.deviceId,
                  reason: "device_not_found",
                })
              )
            );
          }

          const firstDeviceEntry = device[0];

          // Verify signature
          const isValidSignature = yield* _(
            cryptoService
              .verifySignature(
                firstDeviceEntry!.publicKey,
                request.signature,
                request.challenge
              )
              .pipe(Effect.catchAll(() => Effect.succeed(false)))
          );

          if (!isValidSignature) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Invalid biometric signature",
                  userId: request.userId,
                  deviceId: request.deviceId,
                  reason: "invalid_signature",
                })
              )
            );
          }

          // Update last used timestamp
          const now = new Date();
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(biometricAuth)
                  .set({
                    lastUsedAt: now,
                    updatedAt: now,
                  })
                  .where(eq(biometricAuth.id, device[0].id)),
              catch: () => {
                // Non-critical error, don't fail the authentication
              },
            }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
          );

          // Clean up used challenge
          challengeStore.delete(storedChallenge.challengeId);

          return {
            success: true,
            confidence: 0.95, // High confidence for valid signature
            deviceId: request.deviceId,
            authenticatedAt: now,
            challengeId: storedChallenge.challengeId,
          };
        }),

      authenticateWithBiometric: (request) =>
        Effect.gen(function* (_) {
          // Verify biometric first
          const authResult = yield* _(this.verifyBiometric(request));

          if (!authResult.success) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Biometric authentication failed",
                  userId: request.userId,
                  deviceId: request.deviceId,
                  reason: "authentication_failed",
                })
              )
            );
          }

          // Get user
          const userRecord = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(user)
                  .where(eq(user.id, request.userId))
                  .limit(1),
              catch: (error) =>
                new UserNotFound({
                  message: "Failed to fetch user",
                  userId: request.userId,
                  cause: error,
                }),
            })
          );

          if (userRecord.length === 0) {
            yield* _(
              Effect.fail(
                new UserNotFound({
                  message: "User not found",
                  userId: request.userId,
                })
              )
            );
          }

          const currentUser = userRecord[0];

          // Check if account is suspended
          if (currentUser.isSuspended) {
            yield* _(
              Effect.fail(
                new AccountSuspendedError({
                  message: "Account is suspended",
                  userId: request.userId,
                  suspendedAt: currentUser.suspendedAt || new Date(),
                  reason: currentUser.suspensionReason || "Account suspended",
                })
              )
            );
          }

          // Create session
          const sessionId = crypto.randomUUID();
          const token = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          const now = new Date();

          const newSession = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .insert(session)
                  .values({
                    id: sessionId,
                    token,
                    userId: request.userId,
                    expiresAt,
                    deviceId: request.deviceId,
                    createdAt: now,
                    updatedAt: now,
                    ipAddress: "0.0.0.0", // Would be provided by middleware
                    userAgent: "Biometric Auth", // Would be provided by middleware
                  })
                  .returning(),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to create session",
                  userId: request.userId,
                  deviceId: request.deviceId,
                  cause: error,
                }),
            })
          );

          return {
            user: currentUser as User,
            session: newSession[0] as Session,
          };
        }),

      disableDevice: (userId, deviceId) =>
        Effect.gen(function* (_) {
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(biometricAuth)
                  .set({
                    isActive: false,
                    updatedAt: new Date(),
                  })
                  .where(
                    and(
                      eq(biometricAuth.userId, userId),
                      eq(biometricAuth.deviceId, deviceId)
                    )
                  ),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to disable device",
                  userId,
                  deviceId,
                  cause: error,
                }),
            })
          );
        }),

      getUserDevices: (userId) =>
        Effect.gen(function* (_) {
          const devices = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(biometricAuth)
                  .where(eq(biometricAuth.userId, userId))
                  .orderBy(desc(biometricAuth.createdAt)),
              catch: (error) =>
                new UserNotFound({
                  message: "Failed to fetch user devices",
                  userId,
                  cause: error,
                }),
            })
          );

          return devices.map((device) => ({
            id: device.id,
            userId: device.userId,
            deviceId: device.deviceId,
            deviceName: device.deviceName || "Unknown Device",
            biometricType: "fingerprint" as BiometricType, // Default type
            publicKey: device.publicKey,
            isActive: device.isActive,
            lastUsedAt: device.lastUsedAt || undefined,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt,
          }));
        }),

      updateDevice: (userId, deviceId, updates) =>
        Effect.gen(function* (_) {
          const updatedDevices = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(biometricAuth)
                  .set({
                    ...updates,
                    updatedAt: new Date(),
                  })
                  .where(
                    and(
                      eq(biometricAuth.userId, userId),
                      eq(biometricAuth.deviceId, deviceId)
                    )
                  )
                  .returning(),
              catch: (error) =>
                new BiometricError({
                  message: "Failed to update device",
                  userId,
                  deviceId,
                  cause: error,
                }),
            })
          );

          if (updatedDevices.length === 0) {
            yield* _(
              Effect.fail(
                new BiometricError({
                  message: "Device not found",
                  userId,
                  deviceId,
                  reason: "device_not_found",
                })
              )
            );
          }

          const device = updatedDevices[0];
          return {
            id: device.id,
            userId: device.userId,
            deviceId: device.deviceId,
            deviceName: device.deviceName || "Unknown Device",
            biometricType: "fingerprint" as BiometricType,
            publicKey: device.publicKey,
            isActive: device.isActive,
            lastUsedAt: device.lastUsedAt || undefined,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt,
          };
        }),

      verifyDeviceOwnership: (userId, deviceId) =>
        Effect.gen(function* (_) {
          const device = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(biometricAuth)
                  .where(
                    and(
                      eq(biometricAuth.userId, userId),
                      eq(biometricAuth.deviceId, deviceId),
                      eq(biometricAuth.isActive, true)
                    )
                  )
                  .limit(1),
              catch: () => [],
            })
          );

          return device.length > 0;
        }),

      getAuthHistory: (userId, limit = 50, offset = 0) =>
        Effect.gen(function* (_) {
          // This would typically be stored in a separate auth_history table
          // For now, return mock data
          return [];
        }),

      revokeAllDevices: (userId, reason) =>
        Effect.gen(function* (_) {
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(biometricAuth)
                  .set({
                    isActive: false,
                    updatedAt: new Date(),
                  })
                  .where(eq(biometricAuth.userId, userId)),
              catch: (error) =>
                new UserNotFound({
                  message: "Failed to revoke devices",
                  userId,
                  cause: error,
                }),
            })
          );

          // Update user to disable biometric
          yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .update(user)
                  .set({ biometricEnabled: false, updatedAt: new Date() })
                  .where(eq(user.id, userId)),
              catch: () => {
                // Non-critical error
              },
            }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
          );
        }),

      isBiometricAvailable: (userId) =>
        Effect.gen(function* (_) {
          const deviceCount = yield* _(
            Effect.tryPromise({
              try: () =>
                db
                  .select({ count: count() })
                  .from(biometricAuth)
                  .where(
                    and(
                      eq(biometricAuth.userId, userId),
                      eq(biometricAuth.isActive, true)
                    )
                  ),
              catch: () => [{ count: 0 }],
            })
          );

          return deviceCount[0].count > 0;
        }),

      validatePublicKey: (publicKey, biometricType) =>
        Effect.gen(function* (_) {
          // Basic validation - in production, this would be more sophisticated
          if (!publicKey || publicKey.length < 32) {
            return false;
          }

          // Check if it's a valid base64 or PEM format
          try {
            const decoded = Buffer.from(publicKey, "base64");
            return decoded.length >= 32;
          } catch {
            return false;
          }
        }),

      generateDeviceFingerprint: (deviceInfo) =>
        Effect.gen(function* (_) {
          return yield* _(cryptoService.generateDeviceFingerprint(deviceInfo));
        }),
    });
  })
);
