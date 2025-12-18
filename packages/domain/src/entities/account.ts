import { Schema } from "effect";
import { UserIdSchema } from "@host/shared";

// Define AccountId brand (internal ID)
export const AccountId = Schema.UUID.pipe(Schema.brand("AccountId"));
export type AccountId = typeof AccountId.Type;

/**
 * Account entity representing a linked authentication account (e.g. Google, OAuth)
 */
export class Account extends Schema.Class<Account>("Account")({
  id: AccountId.annotations({
    description: "Unique identifier for the account relation",
  }),
  accountId: Schema.String.annotations({
    description: "Account ID from the provider",
  }),
  providerId: Schema.String.annotations({
    description: "ID of the provider (e.g. 'google')",
  }),
  userId: UserIdSchema.annotations({
    description: "ID of the user who owns the account",
  }),
  accessToken: Schema.NullOr(Schema.String).annotations({
    description: "Access token",
  }),
  refreshToken: Schema.NullOr(Schema.String).annotations({
    description: "Refresh token",
  }),
  idToken: Schema.NullOr(Schema.String).annotations({
    description: "ID token",
  }),
  accessTokenExpiresAt: Schema.NullOr(Schema.Date).annotations({
    description: "When the access token expires",
  }),
  refreshTokenExpiresAt: Schema.NullOr(Schema.Date).annotations({
    description: "When the refresh token expires",
  }),
  scope: Schema.NullOr(Schema.String).annotations({
    description: "Granted scopes",
  }),
  password: Schema.NullOr(Schema.String).annotations({
    description: "Hashed password (if applicable)",
  }),
  createdAt: Schema.Date.annotations({
    description: "When the account was created",
  }),
  updatedAt: Schema.Date.annotations({
    description: "When the account was last updated",
  }),
}) {
  /**
   * Create a new Account instance
   */
  static create(params: {
    id: AccountId;
    accountId: string;
    providerId: string;
    userId: typeof UserIdSchema.Type;
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    refreshTokenExpiresAt?: Date | null;
    scope?: string | null;
    password?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Account {
    return new Account({
      id: params.id,
      accountId: params.accountId,
      providerId: params.providerId,
      userId: params.userId,
      accessToken: params.accessToken ?? null,
      refreshToken: params.refreshToken ?? null,
      idToken: params.idToken ?? null,
      accessTokenExpiresAt: params.accessTokenExpiresAt ?? null,
      refreshTokenExpiresAt: params.refreshTokenExpiresAt ?? null,
      scope: params.scope ?? null,
      password: params.password ?? null,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }
}
