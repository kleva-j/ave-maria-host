import type { PaymentMethod, PaymentError } from "@host/domain";

import { Effect, Schema, Context, Layer } from "effect";
import { PaymentService, UserId } from "@host/domain";
import { ValidationError } from "@host/shared";

// Define Output Schema locally or shared? Usually shared.
// But PaymentMethod definition is in PaymentService port.
// We should probably map it to a DTO.
// For now, let's just return the domain objects if compatible, or define a Schema.
// The user request didn't specify a shared schema for GetPaymentMethods, but likely needs one.
// I'll assume I should return generic JSON-serializable array.

export const GetPaymentMethodsInput = Schema.Struct({
  userId: UserId,
});

export type GetPaymentMethodsInput = typeof GetPaymentMethodsInput.Type;

export interface GetPaymentMethodsOutput {
  readonly methods: PaymentMethod[];
}

// Service Interface
export interface GetPaymentMethodsUseCase {
  readonly execute: (
    input: GetPaymentMethodsInput
  ) => Effect.Effect<GetPaymentMethodsOutput, PaymentError>;
}

// Service Tag
export const GetPaymentMethodsUseCase =
  Context.GenericTag<GetPaymentMethodsUseCase>("@app/GetPaymentMethodsUseCase");

// Live Implementation Layer
export const GetPaymentMethodsUseCaseLive = Layer.effect(
  GetPaymentMethodsUseCase,
  Effect.gen(function* () {
    const _paymentService = yield* Effect.serviceOption(PaymentService);

    if (_paymentService._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "Required services not available",
        })
      );
    }

    const paymentService = _paymentService.value;

    return {
      execute: (input: GetPaymentMethodsInput) =>
        Effect.gen(function* () {
          const methods = yield* paymentService.getPaymentMethods(
            UserId.fromString(input.userId)
          );
          return { methods };
        }),
    };
  })
);
