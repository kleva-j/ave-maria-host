import type { BrandedSessionId } from "@host/shared";

import { UserIdSchema, SessionIdSchema } from "@host/shared";
import { Schema } from "effect";

export const SessionId = SessionIdSchema;
export type SessionId = typeof SessionId.Type;

/**
 * Session entity representing a user session
 */
export class Session extends Schema.Class<Session>("Session")({
  id: SessionIdSchema.annotations({
    description: "Unique identifier for the session",
  }),
  expiresAt: Schema.Date.annotations({
    description: "When the session expires",
  }),
  token: Schema.String.annotations({
    description: "Session token",
  }),
  refreshToken: Schema.NullOr(Schema.String).annotations({
    description: "Refresh token",
  }),
  refreshTokenExpiresAt: Schema.NullOr(Schema.Date).annotations({
    description: "When the refresh token expires",
  }),
  createdAt: Schema.Date.annotations({
    description: "When the session was created",
  }),
  updatedAt: Schema.Date.annotations({
    description: "When the session was last updated",
  }),
  ipAddress: Schema.NullOr(Schema.String).annotations({
    description: "IP address of the client",
  }),
  userAgent: Schema.NullOr(Schema.String).annotations({
    description: "User agent of the client",
  }),
  deviceId: Schema.NullOr(Schema.String).annotations({
    description: "Device ID of the client",
  }),
  lastActivityAt: Schema.NullOr(Schema.Date).annotations({
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
    id: BrandedSessionId;
    expiresAt: Date;
    token: string;
    refreshToken?: string | null;
    refreshTokenExpiresAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceId?: string | null;
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
