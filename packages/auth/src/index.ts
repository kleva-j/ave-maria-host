// import { polar, checkout, portal } from "@polar-sh/better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "@host/db";

// import { polarClient } from "./lib/payments";

import * as schema from "@host/db/schema/auth";

const corsOrigin = process.env.CORS_ORIGIN || "";
const trustedOrigins = [corsOrigin, "mybettertapp://", "exp://"];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins,
  emailAndPassword: { enabled: true },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      httpOnly: true,
      secure: true,
    },
  },
  plugins: [
    // polar({
    //   client: polarClient,
    //   createCustomerOnSignUp: true,
    //   enableCustomerPortal: true,
    //   use: [
    //     checkout({
    //       products: [
    //         {
    //           productId: "97a8bc83-6afc-4172-8024-57e430a0fa69",
    //           slug: "Basic-Plan", // Custom slug for easy reference in Checkout URL, e.g. /checkout/Basic-Plan
    //         },
    //       ],
    //       successUrl: process.env.POLAR_SUCCESS_URL,
    //       authenticatedUsersOnly: true,
    //     }),
    //     portal(),
    //   ],
    // }),
    expo(),
  ],
});

// Export Effect-based authentication services
export * from "./effects/index.js";
