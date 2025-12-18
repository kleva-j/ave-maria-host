import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "@host/db";

import {
  generateVerificationEmailHtml,
  generateVerificationEmailText,
} from "@host/shared";

import * as schema from "@host/db/schema/auth";

type SendVerificationEmailParams = {
  user: { email: string; name: string };
  url: string;
  token: string;
};

const corsOrigin = process.env["CORS_ORIGIN"] || "";
const trustedOrigins = [corsOrigin, "mybettertapp://", "exp://"];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Require email verification
    sendVerificationEmail: async (params: SendVerificationEmailParams) => {
      const { user, url, token } = params;
      // Use Resend SDK directly to avoid complex module dependencies
      try {
        const fromEmail = process.env["EMAIL_FROM"] || "onboarding@resend.dev";
        const appUrl = process.env["APP_URL"] || "http://localhost:3001";
        const verificationUrl = `${appUrl}/verify-email?token=${token}`;
        const fromName = process.env["EMAIL_FROM_NAME"] || "AV-Daily";

        const { Resend } = await import("resend");
        const resend = new Resend(process.env["RESEND_API_KEY"]);

        // Send verification email
        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: user.email,
          subject: "Verify your email address",
          html: generateVerificationEmailHtml(
            user.name || "User",
            verificationUrl
          ),
          text: generateVerificationEmailText(
            user.name || "User",
            verificationUrl
          ),
        });

        if (result.error) {
          console.error(
            `[Email Verification] Failed to send email:`,
            result.error
          );
          throw new Error(
            `Failed to send verification email: ${result.error.message}`
          );
        }

        console.log(`[Email Verification] Sent to: ${user.email}`);
      } catch (error) {
        console.error(`[Email Verification] Error:`, error);

        // In development, log the verification URL as fallback
        if (process.env["NODE_ENV"] !== "production") {
          console.log(`[Email Verification] Fallback URL: ${url}`);
          console.log(`[Email Verification] Token: ${token}`);
        }

        // Re-throw to let Better-Auth know the email failed
        throw error;
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true, // Auto-send verification email on registration
    autoSignInAfterVerification: true, // Auto-login after verification
  },
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
      phoneNumber: { type: "string", required: false, unique: true },
      biometricEnabled: { type: "boolean", defaultValue: false },
      phoneVerified: { type: "boolean", defaultValue: false },
      kycStatus: { type: "string", defaultValue: "pending" },
      isSuspended: { type: "boolean", defaultValue: false },
      isActive: { type: "boolean", defaultValue: true },
      kycVerifiedAt: { type: "date", required: false },
      dateOfBirth: { type: "date", required: false },
      kycTier: { type: "number", defaultValue: 0 },
    },
  },
  plugins: [expo()],
});

export type { User, Session } from "better-auth/types";

// Re-export all authorization services and types
export * from "./authorization";

// Re-export all biometric services and types
export * from "./biometric";

// Re-export all effects services and types
export * from "./effects";

// Re-export all auth services and types
export * from "./auth";

// Re-export all KYC services and types
export * from "./kyc";
