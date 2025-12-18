import type { BiometricAuthId, DeviceId, UserId } from "@host/shared";

import { Schema } from "effect";
import {
  BiometricAuthIdSchema,
  DeviceIdSchema,
  UserIdSchema,
} from "@host/shared";

/**
 * BiometricAuth entity representing a registered biometric authenticator
 */
export class BiometricAuth extends Schema.Class<BiometricAuth>("BiometricAuth")(
  {
    id: BiometricAuthIdSchema.annotations({
      description: "Unique identifier for the biometric auth record",
    }),
    userId: UserIdSchema.annotations({
      description: "ID of the user",
    }),
    deviceId: DeviceIdSchema.annotations({
      description: "Device ID",
    }),
    deviceName: Schema.NullOr(Schema.String).annotations({
      description: "Device name",
    }),
    publicKey: Schema.String.annotations({
      description: "Public key for verification",
    }),
    isActive: Schema.NullOr(Schema.Boolean).annotations({
      description: "Whether the authenticator is active",
    }),
    lastUsedAt: Schema.NullOr(Schema.Date).annotations({
      description: "When the authenticator was last used",
    }),
    createdAt: Schema.Date.annotations({
      description: "When the record was created",
    }),
    updatedAt: Schema.Date.annotations({
      description: "When the record was last updated",
    }),
  }
) {
  /**
   * Create a new BiometricAuth instance
   */
  static create(params: {
    id: BiometricAuthId;
    userId: UserId;
    deviceId: DeviceId;
    deviceName?: string | null;
    publicKey: string;
    isActive?: boolean | null;
    lastUsedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): BiometricAuth {
    return new BiometricAuth({
      id: params.id,
      userId: params.userId,
      deviceId: params.deviceId,
      deviceName: params.deviceName ?? null,
      publicKey: params.publicKey,
      isActive: params.isActive ?? true,
      lastUsedAt: params.lastUsedAt ?? null,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }
}
