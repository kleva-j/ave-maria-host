import type { DeviceId, SessionId } from "@host/shared";

import { Schema } from "effect";
import {
  IpAddressSchema,
  UserAgentSchema,
  SessionIdSchema,
  DeviceIdSchema,
  UserIdSchema,
  TokenSchema,
  DateSchema,
} from "@host/shared";

/**
 * Session entity representing a user session
 */
export class Session extends Schema.Class<Session>("Session")({
  id: SessionIdSchema.annotations({
    description: "Unique identifier for the session",
  }),
  expiresAt: DateSchema.annotations({
    description: "When the session expires",
  }),
  token: TokenSchema.annotations({
    description: "Session token",
  }),
  refreshToken: Schema.NullOr(TokenSchema).annotations({
    description: "Refresh token",
  }),
  refreshTokenExpiresAt: Schema.NullOr(DateSchema).annotations({
    description: "When the refresh token expires",
  }),
  createdAt: DateSchema.annotations({
    description: "When the session was created",
  }),
  updatedAt: DateSchema.annotations({
    description: "When the session was last updated",
  }),
  ipAddress: Schema.NullOr(IpAddressSchema).annotations({
    description: "IP address of the client",
  }),
  userAgent: Schema.NullOr(UserAgentSchema).annotations({
    description: "User agent of the client",
  }),
  deviceId: Schema.NullOr(DeviceIdSchema).annotations({
    description: "Device ID of the client",
  }),
  lastActivityAt: Schema.NullOr(DateSchema).annotations({
    description: "When the last activity occurred",
  }),
  userId: UserIdSchema.annotations({
    description: "ID of the user who owns the session",
  }),
}) {
  /**
   * Create a new Session instance
   */
  static create(params: {
    id: SessionId;
    expiresAt: Date;
    token: string;
    refreshToken?: string | null;
    refreshTokenExpiresAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceId: DeviceId | null;
    lastActivityAt?: Date | null;
    userId: typeof UserIdSchema.Type;
  }): Session {
    return new Session({
      id: params.id,
      expiresAt: params.expiresAt,
      token: params.token,
      refreshToken: params.refreshToken ?? null,
      refreshTokenExpiresAt: params.refreshTokenExpiresAt ?? null,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      deviceId: params.deviceId ?? null,
      lastActivityAt: params.lastActivityAt ?? null,
      userId: params.userId,
    });
  }
}
