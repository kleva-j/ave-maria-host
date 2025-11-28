/**
 * @fileoverview Email Verification RPC Definitions (@effect/rpc)
 *
 * This module defines email verification RPC endpoints using native @effect/rpc.
 * It provides secure, type-safe email verification operations.
 */

import { Schema, Effect, Layer } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";
import { AuthService } from "@host/auth";

/**
 * Email verification request response
 */
export class EmailVerificationResponse extends Schema.Class<EmailVerificationResponse>(
  "EmailVerificationResponse"
)({
  success: Schema.Boolean,
  message: Schema.String,
  expiresAt: Schema.Date,
}) {}

/**
 * Email verification success response
 */
export class EmailVerifySuccessResponse extends Schema.Class<EmailVerifySuccessResponse>(
  "EmailVerifySuccessResponse"
)({
  success: Schema.Boolean,
  message: Schema.String,
}) {}

/**
 * Custom error types for email verification operations
 */
export class EmailVerificationError extends Schema.TaggedError<EmailVerificationError>()(
  "EmailVerificationError",
  {
    message: Schema.String,
    email: Schema.optional(Schema.String),
    reason: Schema.optional(Schema.String),
  }
) {}

export class EmailAlreadyVerifiedError extends Schema.TaggedError<EmailAlreadyVerifiedError>()(
  "EmailAlreadyVerifiedError",
  {
    message: Schema.String,
    email: Schema.String,
  }
) {}

export class EmailVerificationRateLimitError extends Schema.TaggedError<EmailVerificationRateLimitError>()(
  "EmailVerificationRateLimitError",
  {
    message: Schema.String,
    email: Schema.String,
    retryAfter: Schema.Date,
  }
) {}

export class InvalidTokenError extends Schema.TaggedError<InvalidTokenError>()(
  "InvalidTokenError",
  {
    message: Schema.String,
    token: Schema.optional(Schema.String),
  }
) {}

/**
 * Union of all email verification errors
 */
export const EmailVerificationRpcError = Schema.Union(
  EmailVerificationError,
  EmailAlreadyVerifiedError,
  EmailVerificationRateLimitError,
  InvalidTokenError
);

/**
 * Request payloads
 */
export class RequestEmailVerificationPayload extends Schema.Class<RequestEmailVerificationPayload>(
  "RequestEmailVerificationPayload"
)({
  email: Schema.String.pipe(
    Schema.filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), {
      message: () => "Invalid email format",
    })
  ),
}) {}

export class VerifyEmailPayload extends Schema.Class<VerifyEmailPayload>(
  "VerifyEmailPayload"
)({
  token: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Token is required" })
  ),
}) {}

export class ResendVerificationEmailPayload extends Schema.Class<ResendVerificationEmailPayload>(
  "ResendVerificationEmailPayload"
)({
  email: Schema.String.pipe(
    Schema.filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), {
      message: () => "Invalid email format",
    })
  ),
}) {}

/**
 * Email Verification RPC Group Definition
 *
 * This defines all email verification RPC endpoints using @effect/rpc patterns.
 */
export class EmailVerificationRpcs extends RpcGroup.make(
  /**
   * Request email verification
   * Sends a verification email to the user
   *
   * @example
   * ```typescript
   * const result = yield* client.RequestVerification({
   *   email: "user@example.com"
   * });
   * ```
   */
  Rpc.make("RequestVerification", {
    payload: RequestEmailVerificationPayload,
    success: EmailVerificationResponse,
    error: Schema.Union(EmailVerificationError, EmailAlreadyVerifiedError),
  }),

  /**
   * Verify email with token
   * Validates the verification token and marks email as verified
   *
   * @example
   * ```typescript
   * const result = yield* client.VerifyEmail({
   *   token: "verification-token-here"
   * });
   * ```
   */
  Rpc.make("VerifyEmail", {
    payload: VerifyEmailPayload,
    success: EmailVerifySuccessResponse,
    error: Schema.Union(InvalidTokenError, EmailVerificationError),
  }),

  /**
   * Resend verification email
   * Sends another verification email to the user
   *
   * @example
   * ```typescript
   * const result = yield* client.ResendVerification({
   *   email: "user@example.com"
   * });
   * ```
   */
  Rpc.make("ResendVerification", {
    payload: ResendVerificationEmailPayload,
    success: EmailVerificationResponse,
    error: Schema.Union(
      EmailVerificationError,
      EmailVerificationRateLimitError
    ),
  })
) {}

/**
 * Type helper for extracting types from the RPC group
 */
export type EmailVerificationRpcGroup = typeof EmailVerificationRpcs;

/**
 * Email Verification RPC handlers implementation
 * This provides the actual business logic for email verification operations
 */
export const EmailVerificationHandlersLive: Layer.Layer<
  | Rpc.Handler<"RequestVerification">
  | Rpc.Handler<"ResendVerification">
  | Rpc.Handler<"VerifyEmail">,
  never,
  AuthService
> = EmailVerificationRpcs.toLayer({
  /**
   * Request email verification handler
   */
  RequestVerification: ({ email }) =>
    Effect.gen(function* () {
      const authService = yield* AuthService;

      // Request email verification
      const result = yield* authService.requestEmailVerification(email).pipe(
        Effect.mapError((error) => {
          if (error._tag === "EmailAlreadyVerifiedError") {
            return new EmailAlreadyVerifiedError({
              message: error.message,
              email: error.email,
            });
          }
          return new EmailVerificationError({
            message: error.message,
            email: error.email,
            reason: error.reason,
          });
        })
      );

      return new EmailVerificationResponse({
        success: true,
        message: "Verification email sent successfully",
        expiresAt: result.expiresAt,
      });
    }),

  /**
   * Verify email handler
   */
  VerifyEmail: ({ token }) =>
    Effect.gen(function* () {
      const authService = yield* AuthService;

      // Verify email with token
      yield* authService.verifyEmail(token).pipe(
        Effect.mapError((error) => {
          if (error._tag === "InvalidTokenError") {
            return new InvalidTokenError({
              message: error.message,
              token: error.token,
            });
          }
          return new EmailVerificationError({
            message: error.message,
          });
        })
      );

      return new EmailVerifySuccessResponse({
        success: true,
        message: "Email verified successfully",
      });
    }),

  /**
   * Resend verification email handler
   */
  ResendVerification: ({ email }) =>
    Effect.gen(function* () {
      const authService = yield* AuthService;

      // Resend verification email
      yield* authService.resendVerificationEmail(email).pipe(
        Effect.mapError((error) => {
          if (error._tag === "EmailVerificationRateLimitError") {
            return new EmailVerificationRateLimitError({
              message: error.message,
              email: error.email,
              retryAfter: error.retryAfter,
            });
          }
          return new EmailVerificationError({
            message: error.message,
            email,
          });
        })
      );

      // Get expiration time (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      return new EmailVerificationResponse({
        success: true,
        message: "Verification email resent successfully",
        expiresAt,
      });
    }),
});

/**
 * Export the RPC group for use in the main server
 */
export default EmailVerificationRpcs;
