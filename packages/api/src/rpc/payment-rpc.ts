/**
 * @fileoverview Payment RPC Endpoints
 */

import type { Layer } from "effect";

import { Effect, Schema, DateTime } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

import { AuthMiddleware, CurrentUser } from "./auth-rpc";

// Shared Schemas
import {
  LinkBankAccountOutputSchema,
  VerifyPaymentOutputSchema,
  LinkBankAccountSchema,
  VerifyPaymentSchema,
  PaymentStatusEnum,
} from "@host/shared";

// Use Cases
import {
  GetPaymentMethodsUseCase,
  LinkBankAccountUseCase,
} from "@host/application";

// ============================================================================
// Payloads
// ============================================================================

export class LinkBankAccountPayload extends LinkBankAccountSchema {}
export class VerifyPaymentPayload extends VerifyPaymentSchema {}
export class GetPaymentMethodsPayload extends Schema.Class<GetPaymentMethodsPayload>(
  "GetPaymentMethodsPayload"
)({}) {}

// ============================================================================
// Responses
// ============================================================================

export class LinkBankAccountResponse extends LinkBankAccountOutputSchema {}
export class VerifyPaymentResponse extends VerifyPaymentOutputSchema {}

export class GetPaymentMethodsResponse extends Schema.Class<GetPaymentMethodsResponse>(
  "GetPaymentMethodsResponse"
)({
  methods: Schema.Array(Schema.Any),
}) {}

// ============================================================================
// Errors
// ============================================================================

export class PaymentRpcError extends Schema.TaggedError<PaymentRpcError>()(
  "PaymentRpcError",
  {
    message: Schema.String,
    code: Schema.optional(Schema.String),
  }
) {}

export const PaymentRpcErrors = Schema.Union(PaymentRpcError);

// ============================================================================
// RPC Group
// ============================================================================

export class PaymentRpcs extends RpcGroup.make(
  Rpc.make("LinkBankAccount", {
    payload: LinkBankAccountPayload,
    success: LinkBankAccountResponse,
    error: PaymentRpcErrors,
  }).middleware(AuthMiddleware),

  Rpc.make("VerifyPayment", {
    payload: VerifyPaymentPayload,
    success: VerifyPaymentResponse,
    error: PaymentRpcErrors,
  }).middleware(AuthMiddleware),

  Rpc.make("GetPaymentMethods", {
    payload: GetPaymentMethodsPayload,
    success: GetPaymentMethodsResponse,
    error: PaymentRpcErrors,
  }).middleware(AuthMiddleware)
) {}

// ============================================================================
// Handler Implementation
// ============================================================================

/**
 * @description
 * This layer provides the implementation for the payment RPC handlers.
 * Integrates with application use cases and payment services
 */
export const PaymentHandlersLive: Layer.Layer<
  | Rpc.Handler<"GetPaymentMethods">
  | Rpc.Handler<"LinkBankAccount">
  | Rpc.Handler<"VerifyPayment">,
  never,
  GetPaymentMethodsUseCase | LinkBankAccountUseCase | AuthMiddleware
> = PaymentRpcs.toLayer({
  /**
   * @description
   * Handles the LinkBankAccount RPC endpoint
   * @param payload The payload containing the bank account details
   * @returns The response containing the linked bank account details
   */
  LinkBankAccount: (payload) =>
    Effect.gen(function* () {
      const useCase = yield* LinkBankAccountUseCase;
      const currentUser = yield* CurrentUser;

      return yield* useCase
        .execute({ ...payload, userId: currentUser.id })
        .pipe(
          Effect.map((output) => new LinkBankAccountResponse(output)),
          Effect.mapError(
            (error) =>
              new PaymentRpcError({
                message: error?.message || "Failed to link bank account",
                code: error?._tag,
              })
          )
        );
    }),

  /**
   * @description
   * Handles the VerifyPayment RPC endpoint
   * @param payload The payload containing the payment details
   * @returns The response containing the payment details
   */
  VerifyPayment: (payload) =>
    Effect.gen(function* () {
      return yield* Effect.succeed(
        new VerifyPaymentResponse({
          verified: true,
          status: PaymentStatusEnum.SUCCESS,
          amount: 0,
          reference: payload.reference,
          paidAt: DateTime.unsafeMake(new Date()),
          message: "Verified (Mock)",
        })
      );
    }),

  /**
   * @description
   * Handles the GetPaymentMethods RPC endpoint
   * @param _payload The payload containing the user ID
   * @returns The response containing the payment methods
   */
  GetPaymentMethods: (_payload) =>
    Effect.gen(function* () {
      const useCase = yield* GetPaymentMethodsUseCase;
      const currentUser = yield* CurrentUser;

      const result = yield* useCase.execute({ userId: currentUser.id }).pipe(
        Effect.mapError(
          (error) =>
            new PaymentRpcError({
              message: error?.message || "Failed to get payment methods",
            })
        )
      );

      return new GetPaymentMethodsResponse({ methods: [...result.methods] });
    }),
});
