import {
  timestamp,
  boolean,
  integer,
  varchar,
  pgTable,
  jsonb,
  index,
  text,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    // AV-Daily specific fields
    phoneNumber: varchar("phone_number", { length: 20 }).unique(),
    phoneVerified: boolean("phone_verified").default(false),
    dateOfBirth: date("date_of_birth"),
    // KYC tier system: 0 = Unverified, 1 = Basic (Tier 1), 2 = Full (Tier 2)
    kycTier: integer("kyc_tier").default(0).notNull(),
    kycStatus: varchar("kyc_status", { length: 20 })
      .default("pending")
      .notNull(), // pending, approved, rejected, under_review
    kycData: jsonb("kyc_data"), // Store KYC verification data
    kycVerifiedAt: timestamp("kyc_verified_at"),
    // Biometric authentication
    biometricEnabled: boolean("biometric_enabled").default(false),
    biometricPublicKey: text("biometric_public_key"), // Store public key for biometric verification
    // Account status
    isActive: boolean("is_active").default(true).notNull(),
    isSuspended: boolean("is_suspended").default(false),
    suspendedAt: timestamp("suspended_at"),
    suspensionReason: text("suspension_reason"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("user_email_idx").on(table.email),
    index("user_phone_idx").on(table.phoneNumber),
    index("user_kyc_tier_idx").on(table.kycTier),
    index("user_kyc_status_idx").on(table.kycStatus),
    index("user_is_active_idx").on(table.isActive),
  ]
);

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    refreshToken: text("refresh_token").unique(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    deviceId: varchar("device_id", { length: 255 }),
    lastActivityAt: timestamp("last_activity_at"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_idx").on(table.userId),
    index("session_token_idx").on(table.token),
    index("session_expires_at_idx").on(table.expiresAt),
  ]
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("account_user_idx").on(table.userId),
    index("account_provider_idx").on(table.providerId),
  ]
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index("verification_expires_at_idx").on(table.expiresAt),
  ]
);

// KYC verification records
export const kycVerification = pgTable(
  "kyc_verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tier: integer("tier").notNull(), // 1 or 2
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    // Tier 1 fields
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    dateOfBirth: date("date_of_birth"),
    address: text("address"),
    // Tier 2 fields
    governmentIdType: varchar("government_id_type", { length: 50 }), // NIN, BVN, Passport, etc.
    governmentIdNumber: varchar("government_id_number", { length: 100 }),
    governmentIdImage: text("government_id_image"), // URL to stored image
    selfieImage: text("selfie_image"), // URL to selfie for verification
    // Verification metadata
    verificationData: jsonb("verification_data"), // Store additional verification data
    verifiedBy: uuid("verified_by"), // Admin user who verified
    verifiedAt: timestamp("verified_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("kyc_verification_user_idx").on(table.userId),
    index("kyc_verification_status_idx").on(table.status),
    index("kyc_verification_tier_idx").on(table.tier),
  ]
);

// Phone verification OTP records
export const phoneVerification = pgTable(
  "phone_verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    otp: varchar("otp", { length: 6 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    verified: boolean("verified").default(false),
    attempts: integer("attempts").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("phone_verification_phone_idx").on(table.phoneNumber),
    index("phone_verification_expires_at_idx").on(table.expiresAt),
  ]
);

// Biometric authentication records
export const biometricAuth = pgTable(
  "biometric_auth",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 255 }).notNull(),
    deviceName: varchar("device_name", { length: 255 }),
    publicKey: text("public_key").notNull(),
    isActive: boolean("is_active").default(true),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("biometric_auth_user_idx").on(table.userId),
    index("biometric_auth_device_idx").on(table.deviceId),
    index("biometric_auth_is_active_idx").on(table.isActive),
  ]
);
