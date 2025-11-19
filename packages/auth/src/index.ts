import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "@host/db";

import * as schema from "@host/db/schema/auth";
// @ts-ignore
const corsOrigin = process.env.CORS_ORIGIN || "";
const trustedOrigins = [corsOrigin, "mybettertapp://", "exp://"];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins,
  emailAndPassword: { enabled: true },
  // Session configuration with refresh token support
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      httpOnly: true,
      secure: true,
    },
    // Enable refresh tokens
    useSecureCookies: true,
    generateId: () => crypto.randomUUID(),
  },
  // User fields configuration for AV-Daily
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
        unique: true,
      },
      phoneVerified: {
        type: "boolean",
        defaultValue: false,
      },
      dateOfBirth: {
        type: "date",
        required: false,
      },
      kycTier: {
        type: "number",
        defaultValue: 0,
      },
      kycStatus: {
        type: "string",
        defaultValue: "pending",
      },
      kycVerifiedAt: {
        type: "date",
        required: false,
      },
      biometricEnabled: {
        type: "boolean",
        defaultValue: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
      },
      isSuspended: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
  plugins: [expo()],
});

// Export Effect-based authentication services
export * from "./effects";
