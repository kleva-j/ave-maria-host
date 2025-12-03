import type { UserRepository } from "@host/domain";

import { Schema, Effect, Context, Layer } from "effect";
import { User, UserId } from "@host/domain";

import {
  type FinancialError,
  UserNotFoundError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for getting a user profile
 */
export const GetUserProfileInput = Schema.Struct({
  userId: Schema.UUID,
});

export type GetUserProfileInput = typeof GetUserProfileInput.Type;

/**
 * Output from getting a user profile
 */
export interface GetUserProfileOutput {
  readonly user: User;
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
  readonly isAccountActive: boolean;
  readonly hasKycTier1: boolean;
  readonly hasKycTier2: boolean;
}

/**
 * Use case for retrieving a user profile by ID
 * Returns enriched user data with computed properties
 */
export interface GetUserProfileUseCase {
  readonly execute: (
    input: GetUserProfileInput
  ) => Effect.Effect<GetUserProfileOutput, FinancialError>;
}

export const GetUserProfileUseCase = Context.GenericTag<GetUserProfileUseCase>(
  "@app/GetUserProfileUseCase"
);

/**
 * Live implementation of GetUserProfileUseCase
 */
export const GetUserProfileUseCaseLive = Layer.effect(
  GetUserProfileUseCase,
  Effect.gen(function* () {
    const userRepo = yield* Effect.serviceOption(
      Context.GenericTag<UserRepository>("@domain/UserRepository")
    );

    if (userRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "UserRepository not available",
        })
      );
    }

    const userRepository = userRepo.value;

    return {
      execute: (input: GetUserProfileInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            GetUserProfileInput
          )(input).pipe(
            Effect.mapError(
              (error) =>
                new ValidationError({
                  field: "input",
                  message: `Invalid input: ${error}`,
                  value: input,
                })
            )
          );

          // Create value object
          const userId = UserId.fromString(validatedInput.userId);

          // Retrieve the user
          const user = yield* userRepository.findById(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findById",
                  table: "user",
                  message: error.message || "Failed to fetch user",
                })
            )
          );

          if (!user) {
            return yield* Effect.fail(
              new UserNotFoundError({
                userId: validatedInput.userId,
              })
            );
          }

          // Return enriched user data
          return {
            user,
            isEmailVerified: user.isEmailVerified(),
            isPhoneVerified: user.isPhoneVerified(),
            isAccountActive: user.isAccountActive(),
            hasKycTier1: user.hasKycTier(1),
            hasKycTier2: user.hasKycTier(2),
          };
        }),
    };
  })
);
